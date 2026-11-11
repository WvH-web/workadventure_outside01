'use strict';
const fs=require('node:fs'),path=require('node:path');
const ids=new Set(require('./castle-map-ids.cjs'));
const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../castle/runtime.json'),'utf8'));
if(Object.keys(config).sort().join(',')!=='community,revision,version'||config.version!==1||typeof config.community!=='boolean'||
  typeof config.revision!=='string'||!/^[a-z0-9-]{1,32}$/.test(config.revision))throw Error('Invalid castle runtime configuration');
const props=map=>Object.fromEntries((map.properties||[]).map(property=>[property.name,property.value]));
function mapVersion(map){
  const settings=props(map),values=[settings.castleRevision,settings.castleRuntimeRevision].filter(Boolean);
  if(!values.length)return null;
  const value=values.join('-');if(!/^[a-z0-9-]{1,64}$/.test(value))throw Error('Invalid castle map revision');return value;
}
function applyRuntime(map){
  const settings=props(map);if(!ids.has(settings.castleMapId))throw Error('Runtime applies only to registered public castle preview maps');
  for(const name of ['castleMapId','script','castleRevision','castleCommunity','castleRuntimeRevision'])
    if(map.properties.filter(property=>property.name===name).length>1)throw Error('Duplicate castle runtime property');
  const script=new URL(settings.script,'https://wvh-web.github.io/workadventure_outside01/castle/');
  const prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
  const entry=script.pathname.split('/').at(-1);
  if(script.origin+script.pathname!==prefix+entry||!['room.js','hall.js','cinema.js','activities.js','expansion.bundle.js','outdoors.bundle.js','museum-tour.bundle.js'].includes(entry)||
    entry==='museum-tour.bundle.js'&&settings.castleMapId!=='museum'||
    script.hash||[...script.searchParams.keys()].some(key=>!['v','room'].includes(key)||script.searchParams.getAll(key).length!==1)||
    script.searchParams.has('room')&&script.searchParams.get('room')!==settings.castleMapId)throw Error('Unknown castle entry script');
  const revision=mapVersion({properties:[{name:'castleRevision',value:settings.castleRevision},{name:'castleRuntimeRevision',value:config.revision}]});
  for(const [name,type,value] of [['castleCommunity','bool',config.community],['castleRuntimeRevision','string',config.revision]]){
    const property=map.properties.find(property=>property.name===name);
    if(property){property.type=type;property.value=value;}else map.properties.push({name,type,value});
  }
  script.searchParams.set('v',revision);map.properties.find(property=>property.name==='script').value=script.href.slice(prefix.length);
  return map;
}
function updateMaps(){
  const {writeWam}=require('./castle-wam.cjs'),directory=path.resolve(__dirname,'../castle');
  for(const id of ids){const filename=path.join(directory,id+'.tmj'),map=applyRuntime(JSON.parse(fs.readFileSync(filename,'utf8')));
    fs.writeFileSync(filename,JSON.stringify(map)+'\n');writeWam(map,directory);}
  return {maps:ids.size,runtime:config.revision,community:config.community};
}
module.exports={applyRuntime,mapVersion,updateMaps};if(require.main===module)console.log(JSON.stringify(updateMaps()));
