'use strict';

const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const crypto = require('node:crypto');
const { createSchoolVerifier } = require('./identity.cjs');
const { GatewayError } = require('../hall-audio/errors.cjs');
const path = require('node:path');
const { validateProfile } = require('./policy.cjs');
const { createLookup } = require('./lookup.cjs');
const { IDS, offerDecision, offerMetadata, approvedRoomChange, target } = require('./offers.cjs');
const { createOfferLookup, createRoomLinkUpdater } = require('./catalog.cjs');
const { RoundBoard, KINDS } = require('./rounds.cjs');
const PREFIX = '/castle-school/';
const roundRoutes=new Map([['round-context',null],['round-create','create'],['round-join','join'],
  ['round-visit','visit'],['round-heartbeat','heartbeat'],['round-leave','leave'],['round-close','close']]);
function validateRoundBody(route,body){
  const keys=Object.keys(body).sort().join(',');
  if(route==='round-create'){
    if(keys==='capacity,kind,targetId'&&typeof body.targetId==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(body.targetId)&&
      typeof body.kind==='string'&&Object.hasOwn(KINDS,body.kind)&&Number.isInteger(body.capacity)&&body.capacity>=2&&body.capacity<=12)return;
  }else if(['round-join','round-visit','round-close'].includes(route)){
    if(keys==='roundId'&&typeof body.roundId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.roundId))return;
  }else if(keys==='leaseId'&&typeof body.leaseId==='string'&&/^[a-f0-9]{48}$/.test(body.leaseId))return;
  throw new GatewayError(400,'invalid_request');
}

function clientIp(req, config) {
  const peer = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const supplied = req.headers['x-real-ip'];
  return config.trustedProxyIps.includes(peer) && typeof supplied === 'string' && net.isIP(supplied) ? supplied : peer;
}
async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new GatewayError(415, 'invalid_request');
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length; if (length > 4096) throw new GatewayError(413, 'invalid_request'); chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object') throw Error('body');
    return data;
  } catch { throw new GatewayError(400, 'invalid_request'); }
}

function createSchoolServer({config, lookup, getOffers, updateRoomLink, roundTargets, verify = createSchoolVerifier(config.secret), clock = Date.now}) {
  if(typeof lookup!=='function'||typeof getOffers!=='function'||typeof updateRoomLink!=='function')throw Error('School dependencies required');
  const pages=new Map(['games','games.js','games.css'].map(name=>[name,{type:name==='games'?'text/html':name.endsWith('.js')?'text/javascript':'text/css',
    content:fs.readFileSync(path.join(__dirname,'public',name==='games'?'games.html':name))}]));
  for(const name of ['rounds','rounds.js','rounds.css','round-client.js','presence','presence.js','presence.css','unowned-ui.js']){
    const html=['rounds','presence'].includes(name);
    pages.set(name,{type:html?'text/html':name.endsWith('.js')?'text/javascript':'text/css',
      content:fs.readFileSync(path.join(__dirname,'public',html?name+'.html':name))});
  }
  const limits = new Map();
  const rounds=new RoundBoard({targets:roundTargets||JSON.parse(fs.readFileSync(path.join(__dirname,'round-targets.json'),'utf8')),clock});
  for(const mapId of new Set(rounds.targets.map(target=>target.mapId)))pages.set('round-rooms/'+mapId+'.webp',{
    type:'image/webp',content:fs.readFileSync(path.join(__dirname,'public/round-rooms',mapId+'.webp'))});
  const rateSalt = crypto.randomBytes(32);
  const opaque = value => crypto.createHmac('sha256',rateSalt).update(value).digest('base64url');
  const sweep = () => {const now=clock();for(const [id,value] of limits)if(value.until<=now)limits.delete(id);rounds.sweep();};
  const sweeper = setInterval(sweep,1000);sweeper.unref();
  function limit(key, maximum) {
    const now = clock(); let entry = limits.get(key);
    if (!entry || entry.until <= now) {
      if (limits.size >= 5000) for (const [id, value] of limits) if (value.until <= now) limits.delete(id);
      if (limits.size >= 5000) throw new GatewayError(503, 'unavailable');
      entry = {until: now + 60000, count: 0}; limits.set(key, entry);
    }
    if (++entry.count > maximum) throw new GatewayError(429, 'rate_limited');
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'microphone=(), camera=(), display-capture=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const send = (status, value) => { if (!res.destroyed) {res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(value));} };
    try {
      const url = new URL(req.url, config.origin);
      if (url.search || !url.pathname.startsWith(PREFIX)) throw new GatewayError(404, 'not_found');
      const route = url.pathname.slice(PREFIX.length);
      if (route === 'health' && req.method === 'GET') { send(200, {ready: true}); return; }
      if(pages.has(route)){
        if(req.method!=='GET')throw new GatewayError(405,'method_not_allowed');
        res.setHeader('X-Frame-Options','SAMEORIGIN');
        res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src https:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'");
        const page=pages.get(route);res.writeHead(200,{'Content-Type':page.type+(page.type.startsWith('image/')?'':'; charset=utf-8')});res.end(page.content);return;
      }
      if (!['context', 'decision','launch','room-link'].includes(route)&&!roundRoutes.has(route)) throw new GatewayError(404, 'not_found');
      if (req.method !== (route === 'context'||route==='round-context' ? 'GET' : 'POST')) throw new GatewayError(405, 'method_not_allowed');
      if (req.headers.origin && req.headers.origin !== config.origin || req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') {
        throw new GatewayError(403, 'wrong_origin');
      }
      limit('ip:' + opaque(clientIp(req, config)), 6000);
      const auth = await verify(req.headers.authorization);
      limit('id:' + opaque(auth.identifier), 90);
      if(roundRoutes.has(route)){
        const roundBody=route==='round-context'?null:await readJson(req);
        if(roundBody)validateRoundBody(route,roundBody);
        let profile;
        try{profile=validateProfile(await lookup(auth.schoolIdentifier??auth.identifier),clock());}
        catch(error){rounds.revoke(auth);throw error;}
        if(route==='round-create')limit('round-create:'+opaque(auth.identifier),6);
        const value=route==='round-context'?rounds.context(auth,profile):rounds[roundRoutes.get(route)](auth,profile,roundBody);
        send(200,value);return;
      }
      let body;
      if (route !== 'context') {
        body = await readJson(req);
        const keys=Object.keys(body).sort().join(',');
        if (keys!==(route==='room-link'?'pin,resourceId,targetUrl':'resourceId') || typeof body.resourceId !== 'string' || !IDS.includes(body.resourceId) ||
          route==='room-link'&&(typeof body.targetUrl!=='string'||!target(body.targetUrl)||typeof body.pin!=='string'||!/^\d{4,12}$/.test(body.pin))) {
          throw new GatewayError(400, 'invalid_request');
        }
      }
      const [rawProfile,offers]=await Promise.all([lookup(auth.schoolIdentifier??auth.identifier),getOffers({fresh:route!=='context'})]);
      const profile=validateProfile(rawProfile,clock());
      const selected=body?offers.find(offer=>offer.id===body.resourceId):null;
      if(body&&!selected)throw new GatewayError(503,'unavailable');
      // Only decisions leave this boundary; no birthday, class id, age, email or display name.
      const account = {kind: profile.eligible ? profile.kind : 'unverified', schoolAccount: profile.eligible};
      if(route==='launch'||route==='room-link'){
        const access=offerDecision(profile,selected,clock());
        if(!access.allowed)throw new GatewayError(403,'not_allowed');
        if(route==='room-link'){
          if(!approvedRoomChange(profile,selected,body.targetUrl,clock()))throw new GatewayError(403,'unreviewed_target');
          limit('edit-id:'+opaque(auth.identifier),6);limit('edit-ip:'+opaque(clientIp(req,config)),30);
          await updateRoomLink(body);getOffers.invalidate?.();
          send(200,{updated:true,checkedAt:clock()});return;
        }
        send(200,{id:selected.id,title:selected.title,targetUrl:target(selected.targetUrl).href,presentation:selected.presentation,
          revision:selected.revision,mode:access.mode,checkedAt:clock()});return;
      }
      const decisions=Object.fromEntries((selected?[selected]:offers).map(offer=>[offer.id,offerDecision(profile,offer,clock())]));
      const metadata=offers.map(offer=>offerMetadata(profile,offer,clock()));
      send(200,{account,decisions,offers:metadata,checkedAt:clock()});
    } catch (error) {
      const safe = error instanceof GatewayError ? error : new GatewayError(503, 'unavailable');
      if (safe.status === 429 || safe.status === 503) res.setHeader('Retry-After', safe.status === 429 ? '60' : '3');
      send(safe.status, {error: safe.code});
    }
  });
  server.requestTimeout = 8000; server.headersTimeout = 8000;
  server.once('close',()=>{clearInterval(sweeper);limits.clear();rounds.dispose();});
  return server;
}

async function main() {
  const origin = process.env.CASTLE_SCHOOL_ORIGIN || 'https://together.deine-schule.com';
  const secret = process.env.SECRET_KEY, key = process.env.CASTLE_SCHOOL_LOOKUP_KEY;
  // Reuse the active platform verifier unchanged; never rotate global login material here.
  if (origin !== 'https://together.deine-schule.com' || typeof secret !== 'string' || !secret) throw Error('Invalid school configuration');
  const config = {origin, secret, trustedProxyIps: (process.env.CASTLE_SCHOOL_TRUSTED_PROXY_IPS || '').split(',').filter(Boolean)};
  const lookup = createLookup({url: 'https://www.deine-schule.com/workadventure-castle-context.php', key});
  const getOffers=createOfferLookup({key}),updateRoomLink=createRoomLinkUpdater();
  const server = createSchoolServer({config, lookup, getOffers, updateRoomLink});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(3211, '0.0.0.0', resolve);});
  const stop = () => {server.close(); server.closeIdleConnections();};
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  console.info('Castle school permission service ready');
}
if (require.main === module) main().catch(() => {console.error('Castle school service could not start'); process.exitCode = 1;});
module.exports = {createSchoolServer};
