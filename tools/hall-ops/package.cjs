const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'ops/hall-audio');
const destination = path.resolve(root, '../output/hall-audio-release.zip');
fs.mkdirSync(path.dirname(destination), {recursive:true});
const files = fs.readdirSync(source).filter(f => /\.(cjs|json|md)$/.test(f));
function collect(dir) {
  for (const entry of fs.readdirSync(path.join(source, dir), {withFileTypes:true})) {
    const rel = dir + '/' + entry.name;
    if (entry.isDirectory()) collect(rel); else files.push(rel);
  }
}
collect('public');
execFileSync('tar', ['-a','-cf',destination,...files], {cwd:source,stdio:'inherit'});
console.log('Packaged gateway source and first-party assets without dependencies or private configuration.');
