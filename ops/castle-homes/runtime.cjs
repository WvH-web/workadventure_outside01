'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ORIGINAL='/opt/wvh-sterne-kollegium/releases/20261109T191624Z';
const MANIFEST_SHA='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6';
const OWNED_SHA='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d';
const SOURCE='/opt/wvh-castle-homes/game-releases/'+OWNED_SHA.slice(0,16);
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function reviewedRuntime(raw,originalRaw){
 if(sha(raw)!==OWNED_SHA||sha(originalRaw)!==MANIFEST_SHA)throw Error('Reviewed runtime manifest changed');
 const value=JSON.parse(raw),original=JSON.parse(originalRaw);
 if(value.version!==1||original.version!==1||original.sourceRelease!==ORIGINAL||value.originalSource!==ORIGINAL||value.originalSourceManifestSha256!==MANIFEST_SHA||
  Object.keys(original.files).length!==107||Object.keys(value.sourceFiles).length!==162||Object.keys(value.dependencyFiles).length!==4706||
  Object.keys(value.supplementalSharedCode).length!==55||Object.keys(value.packages).length!==30||value.dependencyBytes!==80401400||value.materializedInternalFileSymlinks.length!==0)throw Error('Unexpected reviewed runtime');
 for(const [name,digest]of Object.entries(original.files))if(value.sourceFiles[name]!==digest)throw Error('Original source provenance changed');
 for(const [name,digest]of Object.entries(value.supplementalSharedCode))if(!/^dorfplatz\/public\/.+\.(?:js|mjs|cjs)$/.test(name)||value.sourceFiles[name]!==digest||Object.hasOwn(original.files,name))throw Error('Unexpected shared runtime code');
 if(Object.keys(value.dependencyFiles).some(name=>!name.startsWith('dorfplatz/node_modules/')))throw Error('Unexpected dependency path');
 const files={...value.sourceFiles,...value.dependencyFiles};if(Object.keys(files).length!==4868)throw Error('Overlapping runtime files');
 return {files:{...files,'.castle-homes-runtime.json':OWNED_SHA},sourceFiles:original.files};
}
async function validateRuntimeFiles(root,files,{owner=0}={}){
 if(!files||Array.isArray(files)||Object.keys(files).length===0)throw Error('Reviewed runtime files required');
 root=path.resolve(root);if(await fs.realpath(root)!==root)throw Error('Runtime root cannot be redirected');
 const directories=new Set(['']);
 for(const [name,digest]of Object.entries(files)){
  if(!/^[@a-zA-Z0-9_./+-]+$/.test(name)||name.split('/').some(part=>['','..','.'].includes(part))||path.isAbsolute(name)||!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid runtime manifest entry');
  let parent=path.posix.dirname(name);while(parent!=='.'){directories.add(parent);parent=path.posix.dirname(parent);}
 }
 const seen=new Set();
 const safe=stat=>process.platform!=='linux'||stat.uid===owner&&(stat.mode&0o022)===0;
 async function walk(relative){
  const directory=path.join(root,relative),stat=await fs.lstat(directory);
  if(!stat.isDirectory()||!safe(stat)||!directories.has(relative))throw Error('Unreviewed runtime directory');
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name,file=path.join(root,name);
   if(entry.isSymbolicLink())throw Error('Runtime files cannot be redirected');
   if(entry.isDirectory()){await walk(name);continue;}
   if(!entry.isFile()||!Object.hasOwn(files,name))throw Error('Unreviewed runtime file');
   const current=await fs.lstat(file);if(!current.isFile()||!safe(current)||sha(await fs.readFile(file))!==files[name])throw Error('Reviewed runtime file changed');
   seen.add(name);
  }
 }
 await walk('');if(seen.size!==Object.keys(files).length)throw Error('Missing reviewed runtime file');
}
module.exports={reviewedRuntime,validateRuntimeFiles,SOURCE,ORIGINAL,MANIFEST_SHA,OWNED_SHA};
