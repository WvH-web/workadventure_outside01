'use strict';

const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const crypto = require('node:crypto');
const { createVerifier } = require('../hall-audio/auth.cjs');
const { GatewayError } = require('../hall-audio/errors.cjs');
const { validateProfile, validateRules, decision } = require('./policy.cjs');
const { createLookup } = require('./lookup.cjs');
const PREFIX = '/castle-school/';

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

function createSchoolServer({config, lookup, verify = createVerifier(config.secret), rules, clock = Date.now}) {
  const registry = new Map(validateRules(rules).map(rule => [rule.id, rule]));
  const limits = new Map();
  const rateSalt = crypto.randomBytes(32);
  const opaque = value => crypto.createHmac('sha256',rateSalt).update(value).digest('base64url');
  const sweep = () => {const now=clock();for(const [id,value] of limits)if(value.until<=now)limits.delete(id);};
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
      if (!['context', 'decision'].includes(route)) throw new GatewayError(404, 'not_found');
      if (req.method !== (route === 'context' ? 'GET' : 'POST')) throw new GatewayError(405, 'method_not_allowed');
      if (req.headers.origin && req.headers.origin !== config.origin || req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') {
        throw new GatewayError(403, 'wrong_origin');
      }
      limit('ip:' + opaque(clientIp(req, config)), 6000);
      const auth = await verify(req.headers.authorization);
      limit('id:' + opaque(auth.identifier), 90);
      let selected;
      if (route === 'decision') {
        const body = await readJson(req);
        if (Object.keys(body).length !== 1 || typeof body.resourceId !== 'string' || !registry.has(body.resourceId)) {
          throw new GatewayError(400, 'invalid_request');
        }
        selected = registry.get(body.resourceId);
      }
      const profile = validateProfile(await lookup(auth.identifier), clock());
      // Only decisions leave this boundary; no birthday, class id, age, email or display name.
      const account = {kind: profile.eligible ? profile.kind : 'unverified', schoolAccount: profile.eligible};
      const decisions = selected ? {[selected.id]: decision(profile, selected)} :
        Object.fromEntries([...registry].map(([id, rule]) => [id, decision(profile, rule)]));
      send(200, {account, decisions, checkedAt: clock()});
    } catch (error) {
      const safe = error instanceof GatewayError ? error : new GatewayError(503, 'unavailable');
      if (safe.status === 429 || safe.status === 503) res.setHeader('Retry-After', safe.status === 429 ? '60' : '3');
      send(safe.status, {error: safe.code});
    }
  });
  server.requestTimeout = 8000; server.headersTimeout = 8000;
  server.once('close',()=>{clearInterval(sweeper);limits.clear();});
  return server;
}

async function main() {
  const origin = process.env.CASTLE_SCHOOL_ORIGIN || 'https://together.deine-schule.com';
  const secret = process.env.SECRET_KEY, key = process.env.CASTLE_SCHOOL_LOOKUP_KEY;
  // Reuse the active platform verifier unchanged; never rotate global login material here.
  if (origin !== 'https://together.deine-schule.com' || typeof secret !== 'string' || !secret) throw Error('Invalid school configuration');
  const config = {origin, secret, trustedProxyIps: (process.env.CASTLE_SCHOOL_TRUSTED_PROXY_IPS || '').split(',').filter(Boolean)};
  const lookup = createLookup({url: 'https://www.deine-schule.com/workadventure-castle-context.php', key});
  const rules = JSON.parse(fs.readFileSync(process.env.CASTLE_SCHOOL_RULES_FILE || require('node:path').join(__dirname, 'rules.json'), 'utf8'));
  const server = createSchoolServer({config, lookup, rules});
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(3211, '0.0.0.0', resolve);});
  const stop = () => {server.close(); server.closeIdleConnections();};
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  console.info('Castle school permission service ready');
}
if (require.main === module) main().catch(() => {console.error('Castle school service could not start'); process.exitCode = 1;});
module.exports = {createSchoolServer};
