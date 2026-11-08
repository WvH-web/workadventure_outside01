'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../ops/hall-audio');
const dependency = createRequire(path.join(root, 'package.json'));
const { SignJWT, jwtVerify } = dependency('jose');
const { HallAudioController, ROOM_PATTERN } = require('../ops/hall-audio/controller.cjs');
const { createVerifier, createCodeVerifier } = require('../ops/hall-audio/auth.cjs');
const { loadConfig, publicConfig } = require('../ops/hall-audio/config.cjs');
const { createGatewayServer, clientIp } = require('../ops/hall-audio/server.cjs');
const { LiveKitMedia, permissions } = require('../ops/hall-audio/media.cjs');

const salt = Buffer.alloc(32, 7);
const syntheticCode = 'synthetic-test-only';
const hash = crypto.scryptSync(syntheticCode, salt, 64);
const testSecret = 'synthetic-test-secret-not-a-production-key';
const key = new TextEncoder().encode(testSecret);
const auth = { identifier: 'student-one@invalid.test', name: 'Testperson', tags: ['student'] };
const other = { identifier: 'student-two@invalid.test', name: 'Zweite Testperson', tags: ['student'] };
const point = { x: 110, y: 210 };

function config() {
  return loadConfig({ SECRET_KEY: testSecret, LIVEKIT_API_KEY: 'synthetic-api-key',
    LIVEKIT_API_SECRET: 'synthetic-api-secret-for-local-tests-only',
    LIVEKIT_HOST: 'wss://together.example.test', LIVEKIT_URL: 'http://livekit.invalid:7880',
    HALL_AUDIO_CODE_SALT: salt.toString('base64'), HALL_AUDIO_CODE_HASH: hash.toString('hex'),
    HALL_AUDIO_MAP_ID: 'https://together.example.test/_/global/maps.example.test/hall.tmj',
    HALL_AUDIO_MAP_URL: 'https://maps.example.test/hall.tmj', HALL_AUDIO_MAP_NAME: 'Grosse Halle',
    HALL_AUDIO_PODIUM_BOUNDS: JSON.stringify({ x: 100, y: 200, width: 64, height: 32 }),
    HALL_AUDIO_ORIGIN: 'https://together.example.test' });
}

async function fixture(options = {}) {
  let time = 1800000000000, serial = 0;
  const calls = [], rooms = new Set(), tokens = [];
  const media = {
    async cleanupOrphans(pattern) { calls.push(['orphans', pattern.source]); },
    async createRoom(room) { calls.push(['create', room]); rooms.add(room); },
    async retireRoom(room, identity) { calls.push(['retire', room, identity]); rooms.delete(room); },
    async issueToken(grant) { tokens.push(grant); calls.push(['token', grant]); return 'synthetic-' + tokens.length; },
    ...options.media,
  };
  const cfg = { ...config(), ...options.config };
  const controller = new HallAudioController({ config: cfg, media,
    verifyCode: options.verifyCode || createCodeVerifier(cfg), clock: () => time,
    randomId: () => (++serial).toString(16).padStart(32, '0') });
  await controller.initialize();
  const session = (actor = auth) => controller.newSession(actor, cfg.map.id).sessionId;
  return { controller, calls, rooms, tokens, config: cfg, session,
    advance: ms => { time += ms; }, clock: () => time };
}

test('widget browser lifecycle and compact/podium layouts', {
  skip: process.env.HALL_AUDIO_BROWSER_TEST !== '1', timeout: 60000,
}, async t => {
  const { chromium } = require(process.env.HALL_AUDIO_PLAYWRIGHT || 'playwright');
  const f = await fixture();
  const server = createGatewayServer({ config: f.config, controller: f.controller,
    verify: createVerifier(testSecret, { clock: f.clock }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = 'http://127.0.0.1:' + server.address().port;
  f.config.origin = origin;
  const browser = await chromium.launch({ headless: true,
    ...(!fs.existsSync(chromium.executablePath()) ? { channel: 'chrome' } : {}) });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 340, height: 220 } });
  const token = await new SignJWT({ identifier: auth.identifier, username: auth.name })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(f.clock() / 1000 + 3600).sign(key);
  await context.addInitScript(value => localStorage.setItem('authToken', value), token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('browser_error'));
  await page.route('**/iframe_api.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.mockPosition = {x: 0, y: 0}; window.widgetSizes = [];
    const site = {id: 'test-widget', url: location.href, size: new Proxy({}, {
      set(target, key, value) { target[key] = value; window.widgetSizes.push([key, value]); return true; }
    })};
    window.WA = {onInit: async () => {}, room: {id: ${JSON.stringify(f.config.map.id)}},
      player: {getPosition: async () => { if(window.rejectPosition) throw Error('position'); return window.mockPosition; }},
      ui: {website: {getAll: async () => [site], getById: async () => site}}};
  ` }));
  await page.route('**/castle-audio/vendor/livekit-client.umd.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.mediaEvents = {captures:0, stops:0, published:0, disconnected:0, audioAtConnect:[]};
    const events = {TrackSubscribed:'track', TrackUnsubscribed:'untrack', AudioPlaybackStatusChanged:'audio',
      Reconnecting:'reconnecting', Disconnected:'disconnected'};
    class Room {
      constructor() { this.handlers={}; this.canPlaybackAudio=false;
        this.localParticipant={publishTrack:async()=>{window.mediaEvents.published++;}}; }
      on(event, handler) { (this.handlers[event] ||= []).push(handler); return this; }
      async connect(url, token, options) {
        if(options?.autoSubscribe!==false) {
          window.mediaEvents.audioAtConnect.push(document.querySelectorAll('#audio audio').length);
          const element=document.createElement('audio');
          const track={kind:'audio',attach:()=>element,detach:()=>[element]};
          for(const h of this.handlers.track||[]) h(track,{}, {identity:'remote-test-speaker'});
          for(const h of this.handlers.audio||[]) h();
        }
      }
      async disconnect() { window.mediaEvents.disconnected++; for(const h of this.handlers.disconnected||[])h(); }
      async startAudio() { this.canPlaybackAudio=true; }
    }
    window.LivekitClient = {Room, RoomEvent:events, Track:{Kind:{Audio:'audio'},Source:{Microphone:'microphone'}},
      setLogLevel:()=>{}, createLocalAudioTrack:async()=>{
        window.mediaEvents.captures++;
        const track={mediaStreamTrack:{stop(){window.mediaEvents.stops++;},addEventListener(){}},stop(){}};
        if(window.holdMic) { window.mediaEvents.permissionPending=true;
          await new Promise(resolve=>{window.allowMic=resolve;}); }
        return track;
      }};
  ` }));
  await page.goto(origin + '/castle-audio/');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Keine Ansage');
  assert.equal(await page.evaluate(() => mediaEvents.captures), 0);
  assert.ok(await page.evaluate(() => widgetSizes.some(([key, value]) => key === 'height' && value === '84px')));
  await page.setViewportSize({ width: 340, height: 84 });
  const out = path.join(root, '.qa'); fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, 'widget-idle.png') });
  await page.setViewportSize({ width: 340, height: 220 });
  await page.evaluate(p => { window.mockPosition = p; }, point);
  await page.locator('#claim').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => mediaEvents.captures), 0);
  assert.ok(await page.evaluate(() => widgetSizes.some(([key, value]) => key === 'height' && value === '220px')));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(out, 'widget-podium.png') });
  await page.locator('#code').fill(syntheticCode);
  await page.locator('#start').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Du sprichst in der Halle');
  assert.equal(await page.evaluate(() => mediaEvents.captures), 1);
  assert.equal(await page.evaluate(() => mediaEvents.published), 1);
  assert.equal(await page.locator('#code').inputValue(), '');
  const stops = await page.evaluate(() => mediaEvents.stops);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => mediaEvents.stops), stops, 'tab visibility must not stop a healthy publisher');
  await page.screenshot({ path: path.join(out, 'widget-speaking.png') });
  await page.evaluate(() => { window.mockPosition = { x: 0, y: 0 }; });
  await page.waitForFunction(previous => mediaEvents.stops > previous, stops);
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Keine Ansage');
  await page.evaluate(p => { window.mockPosition = p; window.holdMic = true; }, point);
  await page.locator('#claim').waitFor({ state: 'visible' });
  await page.locator('#code').fill(syntheticCode); await page.locator('#start').click();
  await page.waitForFunction(() => mediaEvents.permissionPending);
  const beforeCancel = await page.evaluate(() => mediaEvents.stops);
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.allowMic(); });
  await page.waitForFunction(previous => mediaEvents.stops > previous, beforeCancel);
  await page.waitForTimeout(300);
  assert.equal(f.controller.lease, null, 'unload releases the permission-phase lease');
  assert.equal(await page.evaluate(() => mediaEvents.published), 1, 'late microphone permission must not publish');
  await f.controller.mediaTail;
  const remoteSession = f.session(other);
  const remoteGrant = await f.controller.claim(other, remoteSession, { code: syntheticCode, position: point }, 'ip-two');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Zweite Testperson'));
  await page.waitForFunction(() => document.querySelectorAll('#audio audio').length > 0);
  await f.controller.release(other, remoteSession, remoteGrant.leaseId);
  await f.controller.claim(other, remoteSession, { code: syntheticCode, position: point }, 'ip-two');
  await page.waitForFunction(() => mediaEvents.audioAtConnect.length >= 2);
  assert.ok(await page.evaluate(() => mediaEvents.audioAtConnect.every(count => count === 0)), 'detach old audio before a new room connects');
  const beforeFailure = await page.evaluate(() => mediaEvents.disconnected);
  await page.route('**/castle-audio/state', route => route.abort());
  await page.waitForFunction(previous => mediaEvents.disconnected > previous, beforeFailure);
  assert.equal(await page.locator('#audio audio').count(), 0);
  assert.equal(await page.evaluate(() => mediaEvents.captures), 0, 'audience never captures a microphone');
  await page.screenshot({ path: path.join(out, 'widget-offline.png') });
  assert.deepEqual(errors, []);
  await context.close();
});
