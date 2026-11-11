'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const storage=require('./castle-local-storage.cjs'),root=path.resolve(__dirname,'..');
const staging=path.join(storage.configure().directory,'host-tests');fs.mkdirSync(staging);
const folder=storage.outputPath('castle-game-host-tests/'+new Date().toISOString().replace(/[:.]/g,'-'));
const names=['castle-game-host.test.cjs','castle-game-host-http.test.cjs','castle-game-status.test.mjs','castle-rounds.test.cjs','fixtures/castle-offers.cjs'];
cp.execFileSync('git',['diff','--exit-code','HEAD','--',...names.map(name=>'tests/'+name)],{cwd:root,stdio:'pipe'});
if(cp.execFileSync('git',['ls-files','--others','--exclude-standard','--',...names.map(name=>'tests/'+name)],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit test sources before packaging');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),files={};
for(const name of names){const raw=fs.readFileSync(path.join(root,'tests',name)),target=path.join(staging,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,raw);files[name]=sha(raw);}
const archive=path.join(folder,'host-tests.zip');cp.execFileSync('tar',['-a','-cf',archive,...names],{cwd:staging});
const descriptor={version:1,files,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),archiveSha256:sha(fs.readFileSync(archive))};
fs.writeFileSync(path.join(folder,'host-tests.json'),JSON.stringify(descriptor,null,2)+'\n');console.log(JSON.stringify({prepared:true,files:names.length,archive,descriptor:path.join(folder,'host-tests.json'),noCredentialsPackaged:true}));
