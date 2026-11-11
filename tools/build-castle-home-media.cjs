'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url'),sharp=require('./castle-deps.cjs')('sharp');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function build(){
 const source=path.resolve(__dirname,'../../sternenhueter'),base=path.join(source,'dorfplatz');
 const inventory=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../output/castle-homes/asset-inventory.json'),'utf8'));
 const runtime=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../output/castle-homes-runtime.manifest.json'),'utf8'));
 const {bedroomAssets}=await import(pathToFileURL(path.join(base,'server/bedrooms.mjs')).href),assets=bedroomAssets(base);
 const output=path.resolve(__dirname,'../../output/castle-homes/media');await fs.mkdir(output,{recursive:true});
 const rows=[];
 for(const item of inventory.rows){
  const file=assets.get(item.route);assert.ok(file&&file.startsWith(source+path.sep));const relative=path.relative(source,file).split(path.sep).join('/');
  const original=await fs.readFile(file),originalSha256=sha(original);assert.equal(originalSha256,runtime.files[relative]);
  const metadata=await sharp(original).metadata();assert.ok(!metadata.hasProfile&&!metadata.orientation,'Review color/orientation metadata before transcoding');
  const format=metadata.hasAlpha?'png':'webp';
  let encoded=await (format==='png'?sharp(original).png({compressionLevel:9,adaptiveFiltering:true,palette:false}):sharp(original).webp({lossless:true,effort:6,alphaQuality:100})).toBuffer();
  if(encoded.length>=original.length&&format==='png')encoded=original;
  const before=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),after=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(after.info.width,before.info.width);assert.equal(after.info.height,before.info.height);assert.equal(before.info.channels,4);assert.equal(after.info.channels,4);
  let invisibleRgbChanges=0;for(let offset=0;offset<before.data.length;offset+=4){
   assert.equal(after.data[offset+3],before.data[offset+3],'Alpha changed at '+item.route);
   for(let channel=0;channel<3;channel++)if(before.data[offset+channel]!==after.data[offset+channel]){
    assert.equal(before.data[offset+3],0,'Visible RGB changed at '+item.route);invisibleRgbChanges++;
   }
  }
  assert.ok(encoded.length<=original.length,'No saving at '+item.route);const digest=sha(encoded);await fs.writeFile(path.join(output,digest+'.'+format),encoded);
  rows.push({route:item.route,source:relative,sourceSha256:originalSha256,sha256:digest,format,originalBytes:original.length,bytes:encoded.length,
   width:before.info.width,height:before.info.height,allVisibleRgbIdentical:true,allAlphaIdentical:true,invisibleRgbChanges});
  console.log(JSON.stringify({image:rows.length,originalBytes:original.length,bytes:encoded.length,visiblePixelsAndAlphaIdentical:true}));
 }
 assert.equal(rows.length,19);const result={version:1,sourceManifestSha256:sha(await fs.readFile(path.resolve(__dirname,'../../output/castle-homes-runtime.manifest.json'))),
  codec:'lossless-mixed',sharpVersion:sharp.versions.sharp,webpVersion:sharp.versions.webp,images:rows,
  originalBytes:rows.reduce((n,r)=>n+r.originalBytes,0),bytes:rows.reduce((n,r)=>n+r.bytes,0),sourceImagesChanged:false};
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed:true,images:rows.length,originalBytes:result.originalBytes,bytes:result.bytes,savedPercent:Math.round((1-result.bytes/result.originalBytes)*100),sourceImagesChanged:false}));
}
build().catch(error=>{console.error('Lossless room-media build failed: '+error.message);process.exitCode=1;});
