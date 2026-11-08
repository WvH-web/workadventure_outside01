'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { GatewayError } = require('./errors.cjs');
const { loadConfig, publicConfig } = require('./config.cjs');
const { createVerifier, createCodeVerifier } = require('./auth.cjs');
const { HallAudioController } = require('./controller.cjs');

const PREFIX = '/castle-audio/';
const ASSETS = {
  '': ['index.html', 'text/html; charset=utf-8'],
  'widget.css': ['widget.css', 'text/css; charset=utf-8'],
  'widget.js': ['widget.js', 'text/javascript; charset=utf-8'],
  'vendor/livekit-client.umd.js': ['vendor/livekit-client.umd.js', 'text/javascript; charset=utf-8'],
  'vendor/livekit-client.LICENSE': ['vendor/livekit-client.LICENSE', 'text/plain; charset=utf-8'],
  'vendor/lucide.min.js': ['vendor/lucide.min.js', 'text/javascript; charset=utf-8'],
  'vendor/lucide.LICENSE': ['vendor/lucide.LICENSE', 'text/plain; charset=utf-8'],
};

function clientIp(req, config) {
  const peer = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const supplied = req.headers['x-real-ip'];
  return config.trustedProxyIps.includes(peer) && typeof supplied === 'string' && net.isIP(supplied)
    ? supplied : peer;
}

async function readJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new GatewayError(415, 'invalid_request');
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 4096) throw new GatewayError(413, 'invalid_request');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('body');
    return body;
  } catch { throw new GatewayError(400, 'invalid_request'); }
}

function createGatewayServer({ config, controller, verify = createVerifier(config.secret) }) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), display-capture=(), autoplay=(self)');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' " +
      new URL(config.livekit.browserUrl).origin + "; media-src blob:; img-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
    const send = (status, value) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, config.origin);
      if (url.search || !url.pathname.startsWith(PREFIX)) throw new GatewayError(404, 'not_found');
      const route = url.pathname.slice(PREFIX.length);
      if (req.method === 'GET' && Object.hasOwn(ASSETS, route)) {
        const [file, type] = ASSETS[route];
        const data = await fs.promises.readFile(path.join(__dirname, 'public', file));
        res.writeHead(200, { 'Content-Type': type }); res.end(data); return;
      }
      if (req.method === 'GET' && route === 'config') { send(200, publicConfig(config)); return; }
      if (req.method === 'GET' && route === 'health') { send(controller.ready ? 200 : 503, { ready: controller.ready }); return; }
      if (!['session', 'state', 'listen', 'claim', 'heartbeat', 'release'].includes(route)) throw new GatewayError(404, 'not_found');
      if (req.method !== (route === 'state' ? 'GET' : 'POST')) throw new GatewayError(405, 'method_not_allowed');
      if (req.headers.origin && req.headers.origin !== config.origin) throw new GatewayError(403, 'wrong_origin');
      if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') throw new GatewayError(403, 'wrong_origin');
      const auth = await verify(req.headers.authorization);
      const body = req.method === 'POST' ? await readJson(req) : {};
      const sessionId = req.headers['x-hall-session'];
      let result;
      if (route === 'session') result = controller.newSession(auth, body.mapId);
      else if (route === 'state') result = await controller.state(auth, sessionId);
      else if (route === 'listen') result = await controller.listen(auth, sessionId);
      else if (route === 'claim') result = await controller.claim(auth, sessionId, body, clientIp(req, config));
      else if (route === 'heartbeat') result = await controller.heartbeat(auth, sessionId, body);
      else result = await controller.release(auth, sessionId, body.leaseId);
      send(200, result);
    } catch (error) {
      const safe = error instanceof GatewayError ? error : new GatewayError(503, 'unavailable');
      if (safe.retryAfter) res.setHeader('Retry-After', String(safe.retryAfter));
      send(safe.status, { error: safe.code });
    }
  });
}

async function main() {
  const config = loadConfig();
  const { LiveKitMedia } = require('./media.cjs');
  const controller = new HallAudioController({ config, media: new LiveKitMedia(config.livekit),
    verifyCode: createCodeVerifier(config) });
  const server = createGatewayServer({ config, controller });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(config.port, config.host, resolve);
  });
  try { await controller.initialize(); }
  catch (error) { server.close(); server.closeAllConnections(); throw error; }
  const ticker = setInterval(() => { void controller.tick().catch(() => {}); }, 250);
  ticker.unref();
  console.info('Hall audio gateway listening on port ' + config.port);
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true; clearInterval(ticker);
    server.close(); server.closeIdleConnections();
    await controller.shutdown().catch(() => {});
  };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
}

if (require.main === module) main().catch(() => {
  console.error('Hall audio gateway could not start. Check private configuration and LiveKit availability.');
  process.exitCode = 1;
});

module.exports = { createGatewayServer, readJson, clientIp, PREFIX };
