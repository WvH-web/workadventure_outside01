'use strict';

const { GatewayError } = require('../hall-audio/errors.cjs');
const { validateProfile } = require('./policy.cjs');

function createLookup({url, key, fetcher = fetch, clock = Date.now, timeout = 3000, concurrency = 16}) {
  if (url !== 'https://www.deine-schule.com/workadventure-castle-context.php' || !/^[a-f0-9]{64}$/.test(key)) {
    throw Error('Invalid school lookup configuration');
  }
  let active = 0;
  return async identifier => {
    if (!/^[^\s@\u0000-\u001f]+@[^\s@\u0000-\u001f]+\.[^\s@\u0000-\u001f]+$/.test(identifier) || identifier.length > 254) {
      return {version: 1, kind: 'unknown', eligible: false, age: null, gradeLevel: null, classId: null, checkedAt: clock()};
    }
    if (active >= concurrency) throw new GatewayError(503, 'unavailable');
    active++;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeout);
    try {
      const response = await fetcher(url, {method: 'POST', redirect: 'error', signal: abort.signal,
        headers: {'Content-Type': 'application/json', 'X-Castle-School-Key': key}, body: JSON.stringify({identifier})});
      if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) throw Error('lookup');
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length; if (bytes > 4096) { abort.abort(); throw Error('lookup'); }
        chunks.push(chunk);
      }
      return validateProfile(JSON.parse(Buffer.concat(chunks).toString('utf8')), clock());
    } catch { throw new GatewayError(503, 'unavailable'); }
    finally { clearTimeout(timer); active--; }
  };
}

module.exports = { createLookup };
