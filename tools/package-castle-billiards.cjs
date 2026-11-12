'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const storage=require('./castle-local-storage.cjs');storage.configure();
const root=path.resolve(__dirname,'..'),source=path.join(root,'ops'),directory=path.join(source,'castle-billiards');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'vendor-manifest.json'))),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const own=['admission.cjs','server.cjs','model.cjs','rooms.cjs','physics-pool.cjs','physics-worker.cjs','linux-smoke.cjs','core-entry.ts','headless-signals.ts','README.md','vendor-manifest.json',
 ...['index.html','billiards.css','billiards.js','renderer.js','credits.html'].map(file=>'public/'+file)];
const shared=[...['identity.cjs','lookup.cjs','policy.cjs'].map(file=>'castle-school/'+file),'hall-audio/auth.cjs','hall-audio/errors.cjs',
 'hall-audio/public/vendor/lucide.min.js','hall-audio/public/vendor/lucide.LICENSE','castle-chess/journal.cjs',
 ...['index.js','parse.js','types.js','errors.js'].map(file=>'castle-chess/public/vendor/eventsource-parser/dist/'+file),'castle-chess/public/vendor/eventsource-parser/LICENSE'];
const files=[...own.map(file=>'castle-billiards/'+file),...manifest.files.map(file=>'castle-billiards/'+file.path),...shared];
if(new Set(files).size!==files.length)throw Error('Repeated billiards release file');
for(const file of manifest.files)if(sha(fs.readFileSync(path.join(directory,file.path)))!==file.sha256)throw Error('Changed reviewed vendor bytes');
const hashes={};let bytes=0;
for(const file of files){
 if(file.split('/').some(part=>!part||part==='..'||part==='.')||path.isAbsolute(file))throw Error('Unsafe release path');
 const target=path.join(source,file);if(fs.lstatSync(target).isSymbolicLink())throw Error('Linked release file');
 const data=fs.readFileSync(target);bytes+=data.length;hashes[file]=sha(data);
}
const output=storage.outputPath('billiards-release/'+new Date().toISOString().replace(/[:.]/g,'-')),archive=path.join(output,'wvh-castle-billiards.zip');
execFileSync('tar',['-a','-cf',archive,...files],{cwd:source,windowsHide:true,stdio:'inherit'});
const result={version:1,archive,archiveSha256:sha(fs.readFileSync(archive)),files:hashes,sourceBytes:bytes,privateConfigurationIncluded:false};
fs.writeFileSync(path.join(output,'package.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,archive,archiveSha256:result.archiveSha256,files:files.length,sourceBytes:bytes,privateConfigurationIncluded:false}));
