'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const sharp=require('./castle-deps.cjs')('sharp');
const {validateTargets}=require('../ops/castle-school/rounds.cjs');
const root=path.resolve(__dirname,'..'),source=path.join(root,'castle'),destination=path.join(root,'ops/castle-school');
const titles={'grosse-halle':'Grosse Halle',kino:'Kino',bibliothek:'Bibliothek',grundschule:'Grundschulstube',mittelstufe:'Mittelstufe',
  oberstufe:'Oberstufensalon',spielesaal:'Spielesaal',museum:'Museum',musikzimmer:'Musiksalon',atelier:'Atelier',sternwarte:'Sternwarte',
  erdgeschoss:'Wandelgang',obergeschoss:'Obere Galerie',umgebung:'Schlosshof',dorf:'Sternendorf',park:'Schlossgarten'};
const props=object=>Object.fromEntries((object.properties||[]).map(property=>[property.name,property.value]));
async function build(){
  const {readLayout}=await import(pathToFileURL(path.join(source,'room.js')).href),targets=[];
  const imageDir=path.join(destination,'public/round-rooms');fs.mkdirSync(imageDir,{recursive:true});
  for(const [mapId,location]of Object.entries(titles)){
    const map=JSON.parse(fs.readFileSync(path.join(source,mapId+'.tmj'))),layout=readLayout(map);
    const activities=map.layers.flatMap(layer=>layer.objects||[]).map(props);
    for(const group of layout.groups){
      const seats=layout.seats.filter(seat=>seat.audioGroup===group.group);if(seats.length<2)continue;
      const id=mapId+'-'+group.group,kinds=['talk'];
      if(mapId==='bibliothek'||mapId==='grundschule'&&group.group==='lesekamin'||mapId==='mittelstufe'&&group.group==='kaminrunde')kinds.push('read');
      if(activities.some(activity=>activity.castleActivityGroup===group.group&&/\/story\.html(?:[?#]|$)|^story\.html(?:[?#]|$)/.test(activity.castleActivityUrl||'')))kinds.push('story');
      if([['mittelstufe','spieltisch'],['spielesaal','buchclub'],['oberstufe','buchclub']].some(([m,g])=>m===mapId&&g===group.group))kinds.push('chess');
      if(mapId==='atelier'&&group.group==='buchclub')kinds.push('draw');
      const arrivals=[...new Map(seats.filter(seat=>seat.standX>=group.x&&seat.standX<group.x+group.width&&
        seat.standY>=group.y&&seat.standY+16<group.y+group.height)
        .map(seat=>[seat.standX+':'+seat.standY,{x:seat.standX,y:seat.standY}])).values()];
      targets.push({id,mapId,location,label:group.label,group:group.group,bounds:{x:group.x,y:group.y,width:group.width,height:group.height},
        arrivals,capacity:Math.min(12,seats.length),kinds,
        rule:{id,published:true,audiences:['staff','student'],staffPreview:false,minAge:0,maxAge:null,
          gradeLevels:mapId==='grundschule'?[1,2,3,4]:mapId==='mittelstufe'?[5,6,7,8,9,10]:mapId==='oberstufe'?[11,12,13]:null,classIds:null}});
    }
    const image=map.tilesets.find(tileset=>tileset.image&&/\/floor[^/]*\.png$/.test(tileset.image))?.image;
    if(!image)throw Error('Missing room image: '+mapId);
    await sharp(path.join(source,image)).resize({width:176,height:128,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(imageDir,mapId+'.webp'));
  }
  validateTargets(targets);fs.writeFileSync(path.join(destination,'round-targets.json'),JSON.stringify(targets,null,2)+'\n');
  console.log(JSON.stringify({targets:targets.length,rooms:Object.keys(titles).length,secretRoutesIncluded:false}));
}
module.exports={build};if(require.main===module)build().catch(error=>{console.error(error.message);process.exitCode=1;});
