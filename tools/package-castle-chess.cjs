'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),ops=path.join(root,'ops'),destination=path.resolve(root,'../output/wvh-castle-chess.zip');
const manifest=JSON.parse(fs.readFileSync(path.join(ops,'castle-chess/vendor-manifest.json'),'utf8'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=['castle-chess/server.cjs','castle-chess/rooms.cjs','castle-chess/journal.cjs','castle-chess/vendor-manifest.json',
  'castle-chess/public/index.html','castle-chess/public/chess.css','castle-chess/public/chess.js','castle-chess/public/training.js','castle-chess/public/credits.html',
  'hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school/lookup.cjs','castle-school/policy.cjs','castle-school/identity.cjs',...manifest.files.map(file=>'castle-chess/'+file.path)];
if(files.length!==new Set(files).size)throw Error('Duplicate chess source');
for(const file of manifest.files)if(digest(fs.readFileSync(path.join(ops,'castle-chess',file.path)))!==file.sha256)throw Error('Changed vendored chess source');
fs.mkdirSync(path.dirname(destination),{recursive:true});execFileSync('tar',['-a','-cf',destination,...files],{cwd:ops,stdio:'inherit'});
console.log(JSON.stringify({files:files.length,archiveSha256:digest(fs.readFileSync(destination)),privateConfigurationIncluded:false}));
