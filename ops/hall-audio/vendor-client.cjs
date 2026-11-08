'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(path.dirname(require.resolve('livekit-client')));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '2.19.2') throw new Error('Expected livekit-client 2.19.2');
const out = path.join(__dirname, 'public', 'vendor');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'dist', 'livekit-client.umd.js'), path.join(out, 'livekit-client.umd.js'));
const license = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'].map(n => path.join(root, n)).find(p => fs.existsSync(p));
if (!license) throw new Error('LiveKit license not found');
fs.copyFileSync(license, path.join(out, 'livekit-client.LICENSE'));
console.info('Vendored livekit-client 2.19.2 and its license.');
