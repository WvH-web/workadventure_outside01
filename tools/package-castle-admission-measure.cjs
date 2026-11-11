'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const storage=require('./castle-local-storage.cjs');
const root=path.resolve(__dirname,'..'),folder=storage.outputPath('castle-capacity/admission-profile-20261111');
const staging=path.join(storage.configure().directory,'tests'),files={'castle-admission.test.cjs':'tests/castle-admission.test.cjs',
 'castle-admission-http.test.cjs':'tests/castle-admission-http.test.cjs','fixtures/castle-offers.cjs':'tests/fixtures/castle-offers.cjs',
 'reporter.cjs':'tools/castle-admission-reporter.cjs'};
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const attempt=Number(process.argv.find(arg=>/^--attempt=[1-9]$/.test(arg))?.split('=')[1]||1);
fs.mkdirSync(staging,{recursive:true});
for(const [name,source]of Object.entries(files)){const target=path.join(staging,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source),target);}
const archive=path.join(folder,'admission-measure.zip');cp.execFileSync('tar',['-a','-cf',archive,...Object.keys(files)],{cwd:staging});
const value={version:1,attempt,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 archiveSha256:sha(fs.readFileSync(archive)),files:Object.fromEntries(Object.keys(files).map(name=>[name,sha(fs.readFileSync(path.join(staging,name)))]))};
fs.writeFileSync(path.join(folder,'admission-measure.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({prepared:true,sourceCommit:value.sourceCommit,files:4,archiveSha256:value.archiveSha256,noSchoolCredentialsPackaged:true}));
