'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const storage=require('./castle-local-storage.cjs');storage.configure();
const root=path.resolve(__dirname,'..'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const stoolRevision=process.argv.includes('--stool-revision');
const canonical=process.argv.includes('--canonical-hall');assert.ok(!(canonical&&stoolRevision));
const files=canonical?['castle/spielesaal.tmj']:stoolRevision?['castle/spielesaal-billard2-preview.tmj','castle/art/spielesaal-billard-20261112/fronts-r2.png']:
 ['castle/spielesaal-billard-preview.tmj','castle/billiards-preview.bundle.js','castle/billiards-preview.bundle.manifest.json',
 ...['floor.png','fronts.png','marker.png','fire.png'].map(file=>'castle/art/spielesaal-billard-20261112/'+file)];
const output=storage.outputPath('billiards-map-publication/'+new Date().toISOString().replace(/[:.]/g,'-')),index=path.join(output,'publication.index');
const git=(args,options={})=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:5000000,...options});
let phase='preflight';
function main(){
 assert.equal(fs.existsSync(index),false);phase='fetching-publication-head';git(['fetch','origin','gh-pages']);phase='checking-exact-files';
 const source=git(['rev-parse','HEAD']).toString().trim(),base=git(['rev-parse','origin/gh-pages']).toString().trim();
 const values=new Map(files.map(file=>[file,git(['show',source+':'+file])]));
 for(const file of files)assert.equal(git(['ls-tree',base,'--',file]).length===0,!canonical,'Only the exact existing canonical hall may be replaced');
 const map=JSON.parse(values.get(files[0]));assert.equal(map.properties.find(p=>p.name==='castleMapId').value,'spielesaal');
 assert.equal(map.properties.find(p=>p.name==='castleRevision').value,stoolRevision||canonical?'20261112-billard2':'20261112-billard1');
 if(canonical)assert.equal(sha(values.get(files[0])),sha(git(['show',base+':castle/spielesaal-billard2-preview.tmj'])));
 if(stoolRevision||canonical){
  for(const name of ['castle/billiards-preview.bundle.js','castle/billiards-preview.bundle.manifest.json',...['floor','marker','fire',...(canonical?['fronts-r2']:[])].map(file=>'castle/art/spielesaal-billard-20261112/'+file+'.png')])
   assert.equal(sha(git(['show',base+':'+name])),sha(git(['show',source+':'+name])),'Referenced original candidate asset changed: '+name);
 }else{const bundle=JSON.parse(values.get(files[2]));assert.equal(bundle.sha256,sha(values.get(files[1])));}
 const env={...process.env,GIT_INDEX_FILE:index};let publication;
 try{
  phase='preparing-isolated-index';
  git(['read-tree',base],{env});
  for(const [file,bytes]of values){const oid=git(['hash-object','-w','--stdin'],{input:bytes}).toString().trim();git(['update-index','--add','--cacheinfo','100644',oid,file],{env});}
  const tree=git(['write-tree'],{env}).toString().trim(),changes=git(['diff-tree','--no-commit-id','--name-status','-r',base,tree]).toString().trim().split(/\r?\n/);
  assert.deepEqual(changes.sort(),files.map(file=>(canonical?'M':'A')+'\t'+file).sort());
  publication=git(['commit-tree',tree,'-p',base,'-m',canonical?'Activate accepted billiards map only in the new castle preview':'Add isolated castle billiards candidate assets only'],{env}).toString().trim();
  fs.writeFileSync(path.join(output,'attempt.json'),JSON.stringify({sourceCommit:source,publicationCommit:publication,previousPublicationCommit:base,files,publicationConfirmed:false},null,2)+'\n',{flag:'wx'});
  phase='pushing-publication';
  git(['push','origin',publication+':refs/heads/gh-pages'],{stdio:['ignore','pipe','pipe']});
 }finally{if(fs.existsSync(index)){assert.equal(fs.realpathSync(index),index);fs.unlinkSync(index);}}
 const record={version:1,sourceCommit:source,publicationCommit:publication,previousPublicationCommit:base,
  files:Object.fromEntries([...values].map(([name,bytes])=>[name,sha(bytes)])),onlyAdditionalPublicFiles:!canonical,
  ...(canonical?{onlyCanonicalGameHallChanged:true,previousCanonicalSha256:sha(git(['show',base+':castle/spielesaal.tmj']))}:{})};
 fs.writeFileSync(path.join(output,'publication.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:true,publicationCommit:publication,sourceCommit:source,additionalFiles:canonical?0:files.length,existingPublicFilesChanged:canonical,onlyCanonicalGameHallChanged:canonical,manifest:path.join(output,'publication.json')}));
}
try{main();}catch(error){
 fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({phase,errorType:error.name,status:error.status??null,signal:error.signal??null,
  diagnostic:Buffer.isBuffer(error.stderr)?error.stderr.toString():String(error.stderr??'')},null,2)+'\n',{flag:'wx'});
 console.error('Billiards publication stopped during '+phase+': '+error.name+'; private diagnostic retained at '+output);process.exitCode=1;
}
