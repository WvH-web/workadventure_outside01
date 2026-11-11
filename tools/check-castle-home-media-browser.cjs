'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),{loadHomeMedia}=require('../ops/castle-homes/media.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function main(){
 const source=path.resolve(__dirname,'../../sternenhueter'),output=path.resolve(__dirname,'../../output/castle-homes/media');
 const manifest=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8')),runtime=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../output/castle-homes-runtime.manifest.json'),'utf8'));
 const media=await loadHomeMedia(output,{sourceFiles:runtime.files}),bodies=new Map();
 for(const [index,row]of manifest.images.entries()){
  const original=await fs.readFile(path.join(source,row.source));assert.equal(sha(original),row.sourceSha256);
  const image=media.get('media/'+row.sha256+'.'+row.format);bodies.set('/original/'+index,{body:original,type:'image/png'});bodies.set('/optimized/'+index,{body:image.body,type:image.type});
 }
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><title>Local room-media fidelity check</title><body></body></html>');return;}
  const image=bodies.get(req.url);if(!image){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':image.type});res.end(image.body);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const comparisons=await page.evaluate(async rows=>{
   const result=[];for(let n=0;n<rows.length;n++){
    const images=[];for(const url of ['/original/'+n,'/optimized/'+n]){const image=new Image();image.src=url;await image.decode();images.push(image);}
    const arrays=images.map(image=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return context.getImageData(0,0,canvas.width,canvas.height).data;});
    let alphaDifferences=0,visibleRgbDifferences=0;for(let offset=0;offset<arrays[0].length;offset+=4){
     if(arrays[0][offset+3]!==arrays[1][offset+3])alphaDifferences++;if(arrays[0][offset+3])for(let channel=0;channel<3;channel++)if(arrays[0][offset+channel]!==arrays[1][offset+channel])visibleRgbDifferences++;
    }
    result.push({route:rows[n].route,width:images[0].naturalWidth,height:images[0].naturalHeight,
     sameDimensions:images[0].naturalWidth===images[1].naturalWidth&&images[0].naturalHeight===images[1].naturalHeight,alphaDifferences,visibleRgbDifferences});
   }return result;
  },manifest.images);
  const proof={passed:comparisons.length===19&&comparisons.every(row=>row.sameDimensions&&row.alphaDifferences===0&&row.visibleRgbDifferences===0),manifestSha256:media.summary.manifestSha256,browserVersion:browser.version(),comparisons,sourceImagesChanged:false,publicDeploymentTested:false};
  await fs.writeFile(path.join(output,'browser-fidelity.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,comparisons:undefined,images:19,changed:comparisons.filter(row=>row.alphaDifferences||row.visibleRgbDifferences)}));
  assert.ok(proof.passed,'Visible browser pixel mismatch');
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error('Browser media-fidelity check stopped: '+error.name);process.exitCode=1;});
