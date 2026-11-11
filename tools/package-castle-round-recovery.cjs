'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const storage=require('./castle-local-storage.cjs');
const root=path.resolve(__dirname,'..'),folder=storage.outputPath('castle-rounds-recovery-20261111'),staging=path.join(storage.configure().directory,'files');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
fs.mkdirSync(staging,{recursive:true});const files={};
for(const name of ['presence.js','round-client.js']){const raw=fs.readFileSync(path.join(root,'ops/castle-school/public',name));files[name]=sha(raw);fs.writeFileSync(path.join(staging,name),raw);}
const archive=path.join(folder,'round-recovery.zip');cp.execFileSync('tar',['-a','-cf',archive,...Object.keys(files)],{cwd:staging});
const value={version:1,files,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),archiveSha256:sha(fs.readFileSync(archive))};
fs.writeFileSync(path.join(folder,'round-recovery.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({prepared:true,files:2,archiveSha256:value.archiveSha256,noCredentialsPackaged:true}));
