'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { GatewayError } = require('./errors.cjs');
const scrypt = promisify(crypto.scrypt);

function createVerifier(secret, { clock = Date.now } = {}) {
  const { jwtVerify } = require('jose');
  const key = new TextEncoder().encode(secret);
  return async function verify(header) {
    if (typeof header !== 'string' || !/^Bearer [^\s]+$/.test(header) || header.length > 32768) {
      throw new GatewayError(401, 'unauthorized');
    }
    try {
      const { payload } = await jwtVerify(header.slice(7), key, {
        algorithms: ['HS256'], requiredClaims: ['exp', 'identifier'], currentDate: new Date(clock()),
      });
      if (typeof payload.identifier !== 'string' || !payload.identifier.trim() || payload.identifier.length > 320 ||
          typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) throw new Error('claims');
      const name = typeof payload.username === 'string'
        ? payload.username.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80).trim() : '';
      return { identifier: payload.identifier, name: name || 'Person am Pult',
        tags: Array.isArray(payload.tags) ? payload.tags.filter(t => typeof t === 'string') : [] };
    } catch {
      throw new GatewayError(401, 'unauthorized');
    }
  };
}

function createCodeVerifier(config) {
  return async code => {
    if (typeof code !== 'string' || code.length < 1 || code.length > 128) return false;
    const hash = await scrypt(code, config.codeSalt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return config.codeHash.length === hash.length && crypto.timingSafeEqual(hash, config.codeHash);
  };
}

module.exports = { createVerifier, createCodeVerifier };
