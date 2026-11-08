'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
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

async function widgetHarness({ remoteSpeaker = false, slowConnect = false, onPodium = false } = {}) {
  const f = await fixture();
  if (remoteSpeaker) await f.controller.claim(other, f.session(other), { code: syntheticCode, position: point }, 'other-ip');
  const sign = (actor, renewal) => new SignJWT({ identifier: actor.identifier, username: actor.name, renewal })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(f.clock() / 1000 + 3600).sign(key);
  const verify = createVerifier(testSecret, { clock: f.clock });
  let token = await sign(auth, 'initial'), clock = 0, positionError = false;
  const connectionStarted = Promise.withResolvers(), connectionCompleted = Promise.withResolvers();
  const timers = [], requests = [], pendingConnections = [], events = new Map(), elements = new Map();
  const media = { captures: 0, stops: 0, disconnects: 0, connected: 0, published: 0, nativeControls: 0 };
  const element = id => {
    if (!elements.has(id)) elements.set(id, { dataset: {}, value: '', hidden: false, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; }, querySelectorAll() { return []; }, append() {} });
    return elements.get(id);
  };
  class Room {
    constructor() { this.handlers = {}; this.closed = false; this.canPlaybackAudio = true;
      this.localParticipant = { publishTrack: async () => { media.published++; } }; }
    on(name, handler) { (this.handlers[name] ||= []).push(handler); }
    async connect() {
      connectionStarted.resolve();
      if (slowConnect) await new Promise(resolve => pendingConnections.push(resolve));
      media.connected++;
      connectionCompleted.resolve();
    }
    async disconnect() {
      media.disconnects++;
      if (!this.closed) { this.closed = true; for (const handler of this.handlers.disconnected || []) handler(); }
    }
  }
  const storage = { getItem: () => token };
  const context = { URL, AbortController, setTimeout, clearTimeout,
    performance: { now: () => clock },
    setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; }, clearInterval() {},
    localStorage: storage, location: { href: 'https://together.example.test/castle-audio/',
      origin: 'https://together.example.test', pathname: '/castle-audio/' },
    document: { getElementById: element, addEventListener() {} },
    addEventListener(name, handler) { events.set(name, handler); },
    LivekitClient: { Room, setLogLevel() {},
      RoomEvent: { TrackSubscribed: 'track', TrackUnsubscribed: 'untrack', AudioPlaybackStatusChanged: 'audio',
        Reconnecting: 'retry', Disconnected: 'disconnected' },
      Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
      async createLocalAudioTrack() { media.captures++; return {
        mediaStreamTrack: { stop() { media.stops++; }, addEventListener() {} }, stop() {},
      }; } },
    WA: { onInit: async () => {}, room: { id: f.config.map.id },
      player: { getPosition: async () => {
        if (positionError) throw new Error('synthetic position timeout');
        return onPodium ? point : { x: 0, y: 0 };
      } },
      controls: new Proxy({}, { get() { return () => { media.nativeControls++; }; } }),
      ui: { website: { getAll: async () => [] } } },
    async fetch(url, options = {}) {
      const route = url.split('/').at(-1);
      requests.push({ route, sessionId: options.headers?.['X-Hall-Session'] });
      try {
        if (route === 'config') return { ok: true, json: async () => publicConfig(f.config) };
        const actor = await verify(options.headers?.Authorization);
        const body = options.body ? JSON.parse(options.body) : {};
        const id = options.headers?.['X-Hall-Session'];
        let data;
        if (route === 'session') data = f.controller.newSession(actor, body.mapId);
        else if (route === 'state') data = await f.controller.state(actor, id);
        else if (route === 'listen') data = await f.controller.listen(actor, id);
        else if (route === 'claim') data = await f.controller.claim(actor, id, body, 'widget-ip');
        else if (route === 'heartbeat') data = await f.controller.heartbeat(actor, id, body);
        else if (route === 'release') data = await f.controller.release(actor, id, body.leaseId);
        else throw new Error('route');
        return { ok: true, json: async () => data };
      } catch (error) { return { ok: false, json: async () => ({ error: error.code || 'unavailable' }) }; }
    },
  };
  context.window = context;
  const source = fs.readFileSync(path.join(root, 'public/widget.js'), 'utf8');
  const marker = '  void initialize().catch(error => {';
  assert.equal(source.split(marker).length, 2, 'widget initialization hook must be unique');
  // Instrument only the in-memory test copy; slow media work is deliberately not part of control settling.
  const instrumented = source.replace(marker, `
    window.__test = { controlTasks: new Set() };
    const trackControl = fn => (...args) => {
      const task = fn(...args);
      window.__test.controlTasks.add(task);
      task.finally(() => window.__test.controlTasks.delete(task)).catch(() => {});
      return task;
    };
    api = trackControl(api);
    pollState = trackControl(pollState);
    pollPosition = trackControl(pollPosition);
    heartbeat = trackControl(heartbeat);
    revalidateAuth = trackControl(revalidateAuth);
    window.__test.ready = initialize().catch(error => {`);
  vm.runInNewContext(instrumented, context);
  const flush = async () => {
    while (context.__test.controlTasks.size) await Promise.all([...context.__test.controlTasks].map(task => task.catch(() => {})));
  };
  await context.__test.ready;
  await flush();
  if (remoteSpeaker) await connectionStarted.promise;
  return { f, timers, requests, pendingConnections, media, element, flush, sign,
    connected: connectionCompleted.promise,
    advance(ms) { clock += ms; },
    positionError(value) { positionError = value; },
    async interval(ms) { const timer = timers.find(item => item.ms === ms); assert.ok(timer, 'interval ' + ms); timer.fn(); await flush(); },
    replaceToken(value) { token = value; events.get('storage')({ key: 'authToken', storageArea: storage }); },
    close() { events.get('pagehide')(); },
  };
}

test('slow LiveKit connect does not block polling, timer initialization or the freshness watchdog', { timeout: 15000 }, async () => {
  const h = await widgetHarness({ remoteSpeaker: true, slowConnect: true });
  assert.equal(h.timers.length, 4);
  assert.equal(h.pendingConnections.length, 1);
  const initial = h.requests.filter(r => r.route === 'state').length;
  for (let n = 0; n < 3; n++) { h.advance(2000); await h.interval(2000); await h.interval(100); }
  assert.equal(h.requests.filter(r => r.route === 'state').length, initial + 3);
  assert.equal(h.media.disconnects, 0, 'healthy control state must not abort a slow connection');
  h.pendingConnections.shift()(); await h.connected; await h.flush();
  assert.equal(h.media.connected, 1);
  h.advance(4501); await h.interval(100);
  assert.ok(h.media.disconnects > 0, 'actual stale control state still disconnects');
  h.close();
});

test('same-identity token renewal verifies the existing session and never resumes microphone capture', { timeout: 15000 }, async () => {
  const h = await widgetHarness({ onPodium: true });
  h.element('code').value = syntheticCode;
  await h.element('claim').handlers.submit({ preventDefault() {} });
  assert.equal(h.media.captures, 1); assert.equal(h.media.published, 1);
  const sessions = h.requests.filter(r => r.route === 'session').length;
  const existing = h.requests.find(r => r.route === 'heartbeat').sessionId;
  const stops = h.media.stops;
  h.replaceToken(await h.sign(auth, 'renewed'));
  assert.ok(h.media.stops > stops, 'microphone stops before asynchronous revalidation');
  await h.flush(); await h.interval(2000);
  assert.equal(h.requests.filter(r => r.route === 'session').length, sessions);
  assert.equal(h.requests.filter(r => r.route === 'state').at(-1).sessionId, existing);
  assert.equal(h.element('claim').hidden, false, 'successful server verification clears fatal state');
  assert.equal(h.element('start').disabled, false);
  assert.equal(h.media.captures, 1); assert.equal(h.media.published, 1);
  assert.equal(h.media.nativeControls, 0);
  h.close();
});

test('different-identity, invalid and removed tokens cannot revalidate or create replacement sessions', { timeout: 15000 }, async () => {
  const h = await widgetHarness({ remoteSpeaker: true, onPodium: true });
  const sessions = h.requests.filter(r => r.route === 'session').length;
  h.replaceToken(await h.sign(other, 'other-account'));
  assert.ok(h.media.disconnects > 0, 'listener disconnects synchronously');
  await h.flush();
  assert.equal(h.element('claim').hidden, true);
  assert.match(h.element('error').textContent, /abgelaufen/);
  const count = h.requests.filter(r => r.route === 'state').length;
  await h.interval(2000);
  assert.equal(h.requests.filter(r => r.route === 'state').length, count, 'identity mismatch stays fatal');
  h.replaceToken('invalid-synthetic-token'); await h.flush();
  assert.match(h.element('error').textContent, /erneut anmelden/);
  h.replaceToken(null); await h.flush();
  assert.match(h.element('error').textContent, /erneut anmelden/);
  assert.equal(h.requests.filter(r => r.route === 'session').length, sessions);
  assert.equal(h.media.captures, 0); assert.equal(h.media.nativeControls, 0);
  h.close();
});

test('two-second position delay and transient API failure preserve audio; stale position stops after three seconds', { timeout: 15000 }, async () => {
  const h = await widgetHarness({ onPodium: true });
  h.element('code').value = syntheticCode;
  await h.element('claim').handlers.submit({ preventDefault() {} });
  assert.equal(h.media.published, 1);
  const stopped = h.media.stops;
  h.positionError(true); h.advance(2000);
  await h.interval(500); await h.interval(1000); await h.interval(100);
  assert.equal(h.media.stops, stopped, 'a two-second gap is not a podium exit');
  assert.equal(h.element('error').hidden, true);
  h.advance(1001); await h.interval(100);
  assert.ok(h.media.stops > stopped);
  assert.match(h.element('error').textContent, /Pultposition/);
  assert.doesNotMatch(h.element('error').textContent, /verlassen/);
  assert.equal(h.f.controller.lease, null);
  h.close();
});

test('heartbeat reports stale control state separately from a fresh on-podium position', { timeout: 15000 }, async () => {
  const h = await widgetHarness({ onPodium: true });
  h.element('code').value = syntheticCode;
  await h.element('claim').handlers.submit({ preventDefault() {} });
  h.advance(4501); await h.interval(500); await h.interval(1000);
  assert.ok(h.media.stops > 0);
  assert.match(h.element('error').textContent, /nicht erreichbar/);
  assert.doesNotMatch(h.element('error').textContent, /Pultposition|verlassen/);
  h.close();
});

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
  await page.unroute('**/castle-audio/state');
  await f.controller.release(other, remoteSession, f.controller.lease.id);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/widget-width-harness', route => route.fulfill({ contentType: 'text/html', body: `
    <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0"><iframe id="audio-widget" src="/castle-audio/" allow="microphone; autoplay"
      style="position:fixed;right:64px;bottom:12px;border:0;width:min(340px, calc(100vw - 76px));height:220px"></iframe></body></html>
  ` }));
  await page.goto(origin + '/widget-width-harness');
  const mobile = page.frameLocator('#audio-widget');
  await mobile.locator('#status').filter({ hasText: 'Keine Ansage' }).waitFor();
  const frame = page.frames().find(frame => frame.url().endsWith('/castle-audio/'));
  await frame.evaluate(p => { window.mockPosition = p; }, point);
  await mobile.locator('#claim').waitFor({ state: 'visible' });
  assert.ok(await frame.evaluate(() => widgetSizes.some(([key, value]) =>
    key === 'width' && value === 'min(340px, calc(100vw - 76px))')));
  const iframeBox = await page.locator('#audio-widget').boundingBox();
  assert.equal(iframeBox.width, 244);
  assert.ok(iframeBox.x >= 0 && iframeBox.x + iframeBox.width <= 320);
  assert.equal(await mobile.locator('#panel').evaluate(panel => {
    const box = panel.getBoundingClientRect();
    return box.left < 0 || box.right > innerWidth || panel.scrollWidth > panel.clientWidth ||
      document.documentElement.scrollWidth > innerWidth;
  }), false, '320px parent viewport must not overflow the iframe or panel');
  await page.screenshot({ path: path.join(out, 'widget-mobile-320.png') });
  assert.deepEqual(errors, []);
  await context.close();
});
