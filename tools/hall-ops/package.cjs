const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'ops/hall-audio');
const destination = path.resolve(root, '../output/hall-audio-release.zip');
fs.mkdirSync(path.dirname(destination), {recursive:true});
const files = ['auth.cjs','config.cjs','controller.cjs','errors.cjs','media.cjs','server.cjs',
  'package.json','package-lock.json','README.md','public/index.html','public/widget.css',
  'public/widget.js','public/vendor/livekit-client.umd.js','public/vendor/livekit-client.LICENSE',
  'public/vendor/lucide.min.js','public/vendor/lucide.LICENSE'];
execFileSync('tar', ['-a','-cf',destination,...files], {cwd:source,stdio:'inherit'});
console.log('Packaged gateway source and first-party assets without dependencies or private configuration.');
