'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),revision='20261111-puzzle1';
const properties=object=>Object.fromEntries((object.properties||[]).map(p=>[p.name,p.value]));
function property(object,name,value){
  const previous=object.properties.find(p=>p.name===name);
  if(previous)previous.value=value;else object.properties.push({name,type:typeof value==='boolean'?'bool':'string',value});
}
function candidate(source){
  if(properties(source).castleMapId!=='sternwarte')throw Error('Only the existing observatory is eligible');
  const map=structuredClone(source),area=map.layers.flatMap(layer=>layer.objects||[]).find(object=>properties(object).castleActivityId==='stars-solar');
  if(!area||properties(area).castleActivityGroup!=='buchclub'||!['https://eyes.nasa.gov/apps/solar-system/','puzzle.html'].includes(properties(area).castleActivityUrl))throw Error('Original astronomy table missing or changed');
  property(area,'castleActivityLabel','Sternenwerkstatt');property(area,'castleActivityUrl','puzzle.html');
  property(area,'castleActivityApi',true);property(area,'castleActivityOnSit',true);
  property(area,'castleActivityChoices',JSON.stringify([{id:'machine',label:'Sternenmaschine',url:'puzzle.html',api:true},
    {id:'solar',label:'Sonnensystem',url:'https://eyes.nasa.gov/apps/solar-system/'}]));
  property(map,'script','puzzle-preview.bundle.js?v='+revision+'-20261109-rounds1&room=sternwarte');property(map,'castleRevision',revision);
  return map;
}
function build(){
  const source=JSON.parse(fs.readFileSync(path.join(root,'castle/sternwarte.tmj'))),map=candidate(source);
  fs.writeFileSync(path.join(root,'castle/sternwarte-puzzle-preview.tmj'),JSON.stringify(map)+'\n');
  require('./build-castle-script.cjs').buildCastlePuzzleScript();return map;
}
module.exports={candidate,build,revision};
if(require.main===module){build();console.log(JSON.stringify({candidate:'castle/sternwarte-puzzle-preview.tmj',publishedMapChanged:false,revision}));}
