'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const sharp=require('./castle-deps.cjs')('sharp');
async function main(){
 const source=path.resolve(__dirname,'../../sternenhueter'),base=path.join(source,'dorfplatz');
 const {bedroomAssets}=await import(pathToFileURL(path.join(base,'server/bedrooms.mjs')).href);
 const {ATLAS}=await import(pathToFileURL(path.join(source,'planung/zimmer-editor/definitions.js')).href);
 const {FINISHES}=await import(pathToFileURL(path.join(source,'planung/zimmer-editor/finishes.js')).href);
 const assets=bedroomAssets(base),atlas=new Set(Object.values(ATLAS).map(name=>'/zimmer/'+name));
 const routes=new Set(['/bilder/leer.png',...atlas,...FINISHES.filter(item=>item.image).map(item=>'/zimmer/'+item.image),'/game/figuren-vorne.png','/game/figuren-hinten.png']);
 const rows=[];
 for(const route of routes){
  const file=assets.get(route);if(!file||!file.startsWith(source+path.sep))throw Error('Unreviewed image path');
  const [metadata,stat]=await Promise.all([sharp(file).metadata(),fs.stat(file)]);
  rows.push({route,bytes:stat.size,width:metadata.width,height:metadata.height,decodedRgbaBytes:metadata.width*metadata.height*4,alphaIndexBytes:atlas.has(route)?metadata.width*metadata.height:0});
 }
 const result={readOnly:true,initialImageCount:rows.length,encodedBytes:rows.reduce((sum,row)=>sum+row.bytes,0),
  minimumDecodedRgbaBytes:rows.reduce((sum,row)=>sum+row.decodedRgbaBytes,0),atlasAlphaIndexBytes:rows.reduce((sum,row)=>sum+row.alphaIndexBytes,0),
  memoryEstimateNotRssMeasurement:true,sourceImagesChanged:false,rows};
 const output=path.resolve(__dirname,'../../output/castle-homes');await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'asset-inventory.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,rows:undefined}));
}
main().catch(error=>{console.error('Room image inventory failed: '+error.name);process.exitCode=1;});
