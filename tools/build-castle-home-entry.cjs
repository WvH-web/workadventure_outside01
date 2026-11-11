'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createWam}=require('./castle-wam.cjs');
const root=path.resolve(__dirname,'..'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function build(){
 const {HOME_ENTRY_VERSION,homeEntryArea}=await import(pathToFileURL(path.join(root,'castle/homes-entry.js')).href);
 const originalRaw=fs.readFileSync(path.join(root,'castle/obergeschoss.tmj')),map=JSON.parse(originalRaw),P=(name,value)=>({name,type:typeof value==='boolean'?'bool':'string',value});
 assert.equal(map.properties.find(p=>p.name==='castleMapId').value,'obergeschoss');assert.equal(map.properties.some(p=>p.name==='castleHomesPilot'),false);
 for(const [name,value]of [['castleRevision',HOME_ENTRY_VERSION],['script','upper-gallery.bundle.js?v='+HOME_ENTRY_VERSION],['castleNativeRoomUrl','https://together.deine-schule.com/~/castle-preview/zimmerprobe.wam']]){
  const property=map.properties.filter(p=>p.name===name);assert.equal(property.length,1);property[0].value=value;
 }
 map.properties.push(P('castleHomesPilot',HOME_ENTRY_VERSION));
 map.layers.push({id:map.nextlayerid++,name:'castle-homes-pilot',type:'objectgroup',x:0,y:0,opacity:1,visible:true,draworder:'topdown',objects:[
  {id:map.nextobjectid++,name:'castle-home-entry',type:'area',x:576,y:320,width:128,height:160,rotation:0,visible:true,properties:[P('silent',true),P('castleHomeEntry',true)]}]});
 assert.deepEqual(homeEntryArea(map),{x:576,y:320,width:128,height:160});
 const file='castle/obergeschoss-homes-pilot.tmj',raw=Buffer.from(JSON.stringify(map)+'\n');fs.writeFileSync(path.join(root,file),raw);
 const wam=createWam(map);wam.mapUrl='https://wvh-web.github.io/workadventure_outside01/'+file+'?v='+HOME_ENTRY_VERSION;
 for(const area of wam.areas)for(const property of area.properties)property.roomName=property.roomName.replace('school-castle-v2-obergeschoss-','school-castle-homes-qa-obergeschoss-');
 const out=path.resolve(root,'../output/castle-homes/native-entry');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'zimmerprobe.wam'),JSON.stringify(wam,null,2)+'\n');
 const preview=structuredClone(map);preview.properties.find(p=>p.name==='castleNativeRoomUrl').value='https://together.deine-schule.com/~/castle-preview/obergeschoss.wam';
 const previewFile='castle/obergeschoss-homes.tmj',previewRaw=Buffer.from(JSON.stringify(preview)+'\n');fs.writeFileSync(path.join(root,previewFile),previewRaw);
 const previewWam=createWam(preview);previewWam.mapUrl='https://wvh-web.github.io/workadventure_outside01/'+previewFile+'?v='+HOME_ENTRY_VERSION;
 fs.writeFileSync(path.join(out,'obergeschoss.wam'),JSON.stringify(previewWam,null,2)+'\n');
 assert.equal(sha(fs.readFileSync(path.join(root,'castle/obergeschoss.tmj'))),sha(originalRaw));
 console.log(JSON.stringify({built:true,file,sha256:sha(raw),previewFile,previewSha256:sha(previewRaw),originalGalleryUnchanged:true,separateNativeQaRoomNames:true,version:HOME_ENTRY_VERSION}));
}
if(require.main===module)build().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={build};
