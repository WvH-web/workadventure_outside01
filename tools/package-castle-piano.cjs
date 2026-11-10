'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),destination=path.resolve(root,'../output/wvh-castle-piano.zip'),directory=path.join(root,'ops/castle-piano');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'vendor-manifest.json'),'utf8'));
const files=['castle-piano/package.json','castle-piano/server.cjs','castle-piano/rooms.cjs','castle-piano/vendor-manifest.json',
  ...['index.html','piano.js','piano.css','keys.css','audio.js','projection.js','credits.html'].map(file=>'castle-piano/public/'+file),
  ...manifest.files.map(file=>'castle-piano/'+file.path),
  ...['identity.cjs','lookup.cjs','policy.cjs'].map(file=>'castle-school/'+file),'hall-audio/auth.cjs','hall-audio/errors.cjs'];
if(new Set(files).size!==files.length)throw Error('Repeated piano package file');
for(const file of manifest.files)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,file.path))).digest('hex')!==file.sha256)throw Error('Vendor file changed');
fs.mkdirSync(path.dirname(destination),{recursive:true});execFileSync('tar',['-a','-cf',destination,...files],{cwd:path.join(root,'ops'),stdio:'inherit'});
console.log(JSON.stringify({packagedFiles:files.length,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex'),privateConfigurationIncluded:false}));
