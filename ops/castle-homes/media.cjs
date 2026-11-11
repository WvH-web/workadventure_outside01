'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const MANIFEST_SHA='242a42c7c40827e681c92fea56fe1d2d9886cab9fe8cd6279107af981e676909';
const RUNTIME_SHA='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6';
const ROUTES=Object.freeze(['/bilder/leer.png',
 ...['moebel-basis-v1','moebel-wohnen-v1','moebel-spiel-v1','hohe-moebel-v2','moebel-komfort-v1',
 'moebel-arbeiten-v1','moebel-klein-v1','moebel-licht-v1','moebel-wand-v1','moebel-deko-v1',
 'moebel-magie-v1','moebel-hobby-v1','moebel-extra-v1','boden-hell-v1','boden-fischgraet-v1','boden-stein-v1'].map(name=>'/zimmer/assets/'+name+'.png'),
 '/game/figuren-vorne.png','/game/figuren-hinten.png']);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function regular(root,name,{owner,maxBytes}){
 if(typeof name!=='string'||!name||path.isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..')||!/^[a-zA-Z0-9_.\/-]+$/.test(name))throw Error('Invalid reviewed media path');
 const file=path.join(root,name);if(await fs.realpath(file)!==file)throw Error('Media cannot be redirected');
 const stat=await fs.lstat(file);if(!stat.isFile()||stat.size>maxBytes||process.platform==='linux'&&(stat.uid!==owner||(stat.mode&0o022)!==0))throw Error('Immutable bounded media file required');
 return fs.readFile(file);
}
async function loadHomeMedia(directory,{sourceFiles,manifestSha256=MANIFEST_SHA,owner=0}={}){
 const root=path.resolve(directory);if(await fs.realpath(root)!==root||!/^[a-f0-9]{64}$/.test(manifestSha256))throw Error('Reviewed media root required');
 const raw=await regular(root,'manifest.json',{owner,maxBytes:32768});if(sha(raw)!==manifestSha256)throw Error('Reviewed media manifest changed');
 const manifest=JSON.parse(raw);if(manifest.version!==1||manifest.codec!=='lossless-mixed'||manifest.sourceManifestSha256!==RUNTIME_SHA||manifest.sourceImagesChanged!==false||
  !Array.isArray(manifest.images)||manifest.images.length!==19||!sourceFiles)throw Error('Invalid room media manifest');
 const redirects=new Map(),files=new Map();let bytes=0,originalBytes=0;
 for(const item of manifest.images){
  if(!ROUTES.includes(item.route)||redirects.has(item.route)||typeof item.source!=='string'||!/^[a-f0-9]{64}$/.test(item.sourceSha256)||sourceFiles[item.source]!==item.sourceSha256||!/^[a-f0-9]{64}$/.test(item.sha256)||
   !['webp','png'].includes(item.format)||!Number.isSafeInteger(item.bytes)||item.bytes<30||item.bytes>4*1024*1024||!Number.isSafeInteger(item.originalBytes)||item.originalBytes<item.bytes||
   ![item.width,item.height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=4096)||item.allVisibleRgbIdentical!==true||item.allAlphaIdentical!==true)throw Error('Unreviewed room image');
  const body=await regular(root,item.sha256+'.'+item.format,{owner,maxBytes:4*1024*1024});
  const valid=item.format==='webp'?body.toString('ascii',0,4)==='RIFF'&&body.toString('ascii',8,12)==='WEBP'&&body.readUInt32LE(4)+8===body.length:body.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  if(body.length!==item.bytes||sha(body)!==item.sha256||!valid)throw Error('Reviewed lossless image changed');
  const url='media/'+item.sha256+'.'+item.format;redirects.set(item.route,url);files.set(url,Object.freeze({body,type:'image/'+item.format,etag:'"'+item.sha256+'"'}));bytes+=item.bytes;originalBytes+=item.originalBytes;
 }
 if(bytes!==manifest.bytes||originalBytes!==manifest.originalBytes||bytes>32*1024*1024)throw Error('Invalid room media totals');
 return Object.freeze({redirect:route=>redirects.get(route),get:route=>files.get(route),
  summary:Object.freeze({images:19,bytes,originalBytes,manifestSha256})});
}
module.exports={loadHomeMedia,MANIFEST_SHA,ROUTES};
