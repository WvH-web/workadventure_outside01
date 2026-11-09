'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),ops=path.join(root,'ops'),destination=path.resolve(root,'../output/wvh-castle-art.zip');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(ops,'castle-art/upstream-manifest.json'),'utf8'));
const files=['castle-art/server.cjs','castle-art/sessions.cjs','castle-art/routes.cjs','castle-art/upstream-manifest.json',
  ...['index.html','art.js','art.css','credits.html','rules.html'].map(name=>'castle-art/public/'+name),
  'castle-art/'+manifest.wbo.archive,'castle-art/upstream/WBO-LICENSE',...manifest.files.map(file=>'castle-art/'+file.path),
  'hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school/lookup.cjs','castle-school/policy.cjs','castle-school/identity.cjs'];
if(files.length!==new Set(files).size)throw Error('Duplicate art source');
for(const file of [...manifest.files,{path:manifest.wbo.archive,sha256:manifest.wbo.sha256}])
  if(digest(fs.readFileSync(path.join(ops,'castle-art',file.path)))!==file.sha256)throw Error('Changed pinned art source');
fs.mkdirSync(path.dirname(destination),{recursive:true});execFileSync('tar',['-a','-cf',destination,...files],{cwd:ops,stdio:'inherit'});
console.log(JSON.stringify({files:files.length,archiveSha256:digest(fs.readFileSync(destination)),privateConfigurationIncluded:false}));
