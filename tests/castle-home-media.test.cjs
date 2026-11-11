'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {loadHomeMedia,ROUTES,MANIFEST_SHA}=require('../ops/castle-homes/media.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const body=Buffer.from('524946461e000000574542505650384c110000002f000000000750cb9215b9ff8188e87f0000','hex');
test('the source-reviewed manifest pins all nineteen generic images and their original ownership-free source bytes',async()=>{
 const raw=await fs.readFile(path.resolve(__dirname,'../ops/castle-homes/media.manifest.json')).catch(error=>{
  if(error.code!=='ENOENT')throw error;return fs.readFile(path.resolve(__dirname,'../ops/castle-homes/media/manifest.json'));
 });assert.equal(sha(raw),MANIFEST_SHA);
 const manifest=JSON.parse(raw);assert.equal(manifest.images.length,19);assert.deepEqual([...manifest.images.map(row=>row.route)].sort(),[...ROUTES].sort());
 assert.equal(manifest.images.filter(row=>row.format==='webp').length,4);assert.equal(manifest.images.filter(row=>row.format==='png').length,15);
 assert.equal(manifest.bytes,30386384);assert.equal(manifest.originalBytes,34169550);
});
async function fixture(run){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'castle-home-media-')),sourceFiles={};
 const images=ROUTES.map((route,index)=>{const source='synthetic/'+index+'.png';sourceFiles[source]='a'.repeat(64);return {route,source,sourceSha256:'a'.repeat(64),sha256:sha(body),
  format:'webp',originalBytes:100,bytes:body.length,width:1,height:1,allVisibleRgbIdentical:true,allAlphaIdentical:true};});
 const value={version:1,codec:'lossless-mixed',sourceManifestSha256:'8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6',sourceImagesChanged:false,
  images,bytes:body.length*19,originalBytes:1900};
 async function load(mutate=()=>{}){const manifest=structuredClone(value);mutate(manifest);const raw=Buffer.from(JSON.stringify(manifest));await fs.writeFile(path.join(directory,'manifest.json'),raw,{mode:0o644});
  return loadHomeMedia(directory,{sourceFiles,manifestSha256:sha(raw),owner:process.getuid?.()??0});}
 try{await fs.writeFile(path.join(directory,sha(body)+'.webp'),body,{mode:0o644});await run({directory,load,value,sourceFiles});}
 finally{assert.equal(path.dirname(await fs.realpath(directory)),await fs.realpath(os.tmpdir()));assert.ok(path.basename(directory).startsWith('castle-home-media-'));await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
}
test('only nineteen reviewed nonpersonal image aliases resolve to immutable content-addressed bytes',async()=>fixture(async({load})=>{
 const media=await load();assert.equal(media.summary.images,19);assert.equal(media.summary.bytes,body.length*19);assert.ok(Object.isFrozen(media.summary));
 for(const route of ROUTES){const url=media.redirect(route);assert.equal(url,'media/'+sha(body)+'.webp');assert.deepEqual(media.get(url).body,body);}
 for(const route of ['/api/bedroom','/zimmer/app.js','/game/room-social.js','/bilder/private.png','../manifest.json'])assert.equal(media.redirect(route),undefined);
 assert.equal(media.get('media/manifest.json'),undefined);
}));
test('unreviewed routes, source hashes, lossy claims, wrong totals and duplicate aliases fail closed',async()=>fixture(async({load})=>{
 for(const mutate of [m=>m.images.pop(),m=>m.images[0].route='/api/bedroom',m=>m.images[0].route=m.images[1].route,
  m=>m.images[0].sourceSha256='b'.repeat(64),m=>delete m.images[0].sourceSha256,m=>m.images[0].allAlphaIdentical=false,
  m=>m.images[0].allVisibleRgbIdentical=false,m=>m.codec='webp-lossy',m=>m.images[0].width=5000,m=>m.images[0].bytes=999,
  m=>m.originalBytes++,m=>m.sourceImagesChanged=true,m=>m.sourceManifestSha256='0'.repeat(64)])await assert.rejects(load(mutate));
}));
test('changed image and manifest bytes cannot be used under their reviewed hashes',async()=>fixture(async({directory,load,sourceFiles})=>{
 await load();await assert.rejects(loadHomeMedia(directory,{sourceFiles,manifestSha256:'0'.repeat(64)}));
 const file=path.join(directory,sha(body)+'.webp');await fs.writeFile(file,Buffer.alloc(body.length));await assert.rejects(load());
}));
