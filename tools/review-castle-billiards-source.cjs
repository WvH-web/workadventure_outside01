'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const commit='fda4e90e251ce59ad878dbb996af372f4028a325';
const root=storage.outputPath('billiards-review/'+commit),source=path.join(root,'source');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function get(url,limit){
 const response=await fetch(url,{headers:{'User-Agent':'wvh-castle-billiards-review'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Upstream HTTP '+response.status);
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('Bounded source download exceeded');chunks.push(chunk);}return Buffer.concat(chunks);
}
function destination(name){
 if(!/^[a-zA-Z0-9._/-]+$/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe upstream path');
 let parent=source;for(const part of name.split('/').slice(0,-1)){parent=path.join(parent,part);if(!fs.existsSync(parent))fs.mkdirSync(parent);if(fs.lstatSync(parent).isSymbolicLink())throw Error('Linked review directory');}
 const file=path.join(source,name);if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Linked review file');return file;
}
async function main(){
 const treeRaw=await get('https://api.github.com/repos/tailuge/billiards/git/trees/'+commit+'?recursive=1',3000000),tree=JSON.parse(treeRaw);
 if(tree.truncated)throw Error('Incomplete upstream tree');
 const selected=tree.tree.filter(item=>item.type==='blob'&&(/^(?:src|test)\/.+\.(?:ts|js|json|md)$/.test(item.path)||
  ['LICENSE','README.md','package.json','yarn.lock','webpack.config.js','tsconfig.json'].includes(item.path)));
 if(!selected.length||selected.length>750||selected.reduce((sum,item)=>sum+item.size,0)>8000000)throw Error('Unexpected review source volume');
 if(!fs.existsSync(source))fs.mkdirSync(source);if(fs.lstatSync(source).isSymbolicLink())throw Error('Linked source root');
 const records=[];let next=0;
 async function worker(){while(next<selected.length){const item=selected[next++],file=destination(item.path);let raw;
  if(fs.existsSync(file))raw=fs.readFileSync(file);else raw=await get('https://raw.githubusercontent.com/tailuge/billiards/'+commit+'/'+item.path,Math.min(item.size+1,1000000));
  const gitSha=crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
  if(raw.length!==item.size||gitSha!==item.sha)throw Error('Source differs from pinned Git tree: '+item.path);
  if(!fs.existsSync(file))fs.writeFileSync(file,raw,{flag:'wx'});records.push({path:item.path,bytes:raw.length,gitBlob:item.sha,sha256:sha(raw)});
 }}
 await Promise.all(Array.from({length:4},()=>worker()));records.sort((a,b)=>a.path.localeCompare(b.path));
 const manifest={version:1,source:'https://github.com/tailuge/billiards',commit,treeSha256:sha(treeRaw),files:records,
  onlySourceAndTests:true,thirdPartyCodeExecuted:false,liveServicesChanged:false};
 fs.writeFileSync(path.join(root,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({passed:true,root,commit,files:records.length,bytes:records.reduce((sum,item)=>sum+item.bytes,0),thirdPartyCodeExecuted:false,liveServicesChanged:false}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
