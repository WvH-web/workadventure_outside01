'use strict';

const fs = require('node:fs');

function loadConfig(env = process.env) {
  const file = env.HALL_AUDIO_CONFIG_FILE
    ? JSON.parse(fs.readFileSync(env.HALL_AUDIO_CONFIG_FILE, 'utf8')) : {};
  const map = {
    ...file.map,
    ...(env.HALL_AUDIO_MAP_ID ? { id: env.HALL_AUDIO_MAP_ID } : {}),
    ...(env.HALL_AUDIO_MAP_URL ? { url: env.HALL_AUDIO_MAP_URL } : {}),
    ...(env.HALL_AUDIO_MAP_NAME ? { name: env.HALL_AUDIO_MAP_NAME } : {}),
  };
  const podium = env.HALL_AUDIO_PODIUM_BOUNDS
    ? JSON.parse(env.HALL_AUDIO_PODIUM_BOUNDS) : file.podium;
  const origin = env.HALL_AUDIO_ORIGIN || 'https://together.deine-schule.com';
  if (new URL(origin).origin !== origin) throw new Error('Invalid HALL_AUDIO_ORIGIN');
  if (typeof map.id !== 'string' || !map.id || typeof map.url !== 'string' || !map.url ||
      typeof map.name !== 'string' || !map.name) throw new Error('Missing hall map configuration');
  if (!['https:', 'http:'].includes(new URL(map.url).protocol)) throw new Error('Invalid map URL');
  if (!podium || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(podium[k])) ||
      podium.width <= 0 || podium.height <= 0) throw new Error('Invalid podium bounds');
  for (const key of ['SECRET_KEY', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET',
    'LIVEKIT_HOST', 'LIVEKIT_URL', 'HALL_AUDIO_CODE_SALT', 'HALL_AUDIO_CODE_HASH']) {
    if (!env[key]) throw new Error('Missing ' + key);
  }
  if (!/^[a-f0-9]{128}$/i.test(env.HALL_AUDIO_CODE_HASH)) throw new Error('Invalid HALL_AUDIO_CODE_HASH');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(env.HALL_AUDIO_CODE_SALT) ||
      Buffer.from(env.HALL_AUDIO_CODE_SALT, 'base64').length < 16) throw new Error('Invalid HALL_AUDIO_CODE_SALT');
  if (!['wss:', 'ws:'].includes(new URL(env.LIVEKIT_HOST).protocol)) throw new Error('Invalid LIVEKIT_HOST');
  if (!['http:', 'https:'].includes(new URL(env.LIVEKIT_URL).protocol)) throw new Error('Invalid LIVEKIT_URL');
  const port = Number(env.PORT || 3210);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {
    origin, port, host: env.HALL_AUDIO_HOST || '127.0.0.1', map, podium,
    secret: env.SECRET_KEY,
    livekit: { browserUrl: env.LIVEKIT_HOST, apiUrl: env.LIVEKIT_URL,
      apiKey: env.LIVEKIT_API_KEY, apiSecret: env.LIVEKIT_API_SECRET },
    codeSalt: Buffer.from(env.HALL_AUDIO_CODE_SALT, 'base64'),
    codeHash: Buffer.from(env.HALL_AUDIO_CODE_HASH, 'hex'),
    allowedTags: (env.HALL_AUDIO_ALLOWED_TAGS || '').split(',').map(s => s.trim()).filter(Boolean),
    trustedProxyIps: (env.HALL_AUDIO_TRUSTED_PROXY_IPS || '').split(',').map(s => s.trim()).filter(Boolean),
    leaseMs: 8000, armingMs: 30000, tokenTtlSeconds: 45,
    freshnessMs: 4500, pollMs: 2000, heartbeatMs: 1000,
    sessionMs: 60000, mediaTimeoutMs: 3500,
    rateWindowMs: 60000, identityAttempts: 5, ipAttempts: 15, maxSessions: 1000,
  };
}

function publicConfig(config) {
  return { map: config.map, podium: config.podium, freshnessMs: config.freshnessMs,
    pollMs: config.pollMs, heartbeatMs: config.heartbeatMs, leaseMs: config.leaseMs,
    armingMs: config.armingMs };
}

module.exports = { loadConfig, publicConfig };
