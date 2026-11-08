const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mapBase = 'https://wvh-web.github.io/workadventure_outside01/castle/';
const playBase = 'https://together.deine-schule.com/~/castle-preview/';
const ids = new Set(require('./castle-map-ids.cjs'));
const props = object => Object.fromEntries((object.properties || []).map(p => [p.name,p.value]));
const inside = (point,area) => point.x >= area.x && point.y >= area.y &&
  point.x < area.x + area.width && point.y < area.y + area.height;
function uuid(key) {
  const bytes = crypto.createHash('sha256').update('wvh-castle-meetings/'+key).digest().subarray(0,16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
function nativeTarget(value) {
  const url = new URL(value,mapBase);
  const file = url.pathname.split('/').at(-1);
  if (url.origin !== new URL(mapBase).origin || !url.pathname.startsWith(new URL(mapBase).pathname) ||
      !file.endsWith('.tmj') || !ids.has(file.slice(0,-4))) return value;
  return new URL(file.slice(0,-4)+'.wam'+url.search+url.hash,playBase).href;
}
function meetingAreas(map) {
  const objects = [];
  const walk = layers => {
    for (const layer of layers || []) {
      if (layer.layers) walk(layer.layers);
      for (const object of layer.objects || []) objects.push({...object,p:props(object)});
    }
  };
  walk(map.layers);
  const groups = objects.filter(o => o.p.conversationGroup).map(o => ({
    id:'area-'+o.p.conversationGroup,name:o.p.conversationLabel || o.name,
    x:o.x,y:o.y,width:o.width,height:o.height,
  }));
  const quiet = objects.filter(o => o.p.silent === true || o.p.silent === 'true');
  const tables = new Map();
  for (const object of objects.filter(o => o.p.seatId && o.p.audioGroup)) {
    const p = object.p, point = {x:p.seatX,y:p.seatY};
    if (groups.some(g => inside(point,g)) || quiet.some(q => inside(point,q))) continue;
    const id = 'table-'+p.audioGroup;
    if (!tables.has(id)) tables.set(id,{id,name:p.seatLabel || p.audioGroup,points:[]});
    tables.get(id).points.push(point,{x:p.standX,y:p.standY});
  }
  for (const table of tables.values()) {
    const xs = table.points.map(p => p.x), ys = table.points.map(p => p.y);
    groups.push({id:table.id,name:table.name,x:Math.min(...xs)-8,y:Math.min(...ys)-8,
      width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...ys)-Math.min(...ys)+16});
  }
  for (let i=0;i<groups.length;i++) {
    const a=groups[i];
    if (![a.x,a.y,a.width,a.height].every(Number.isFinite) || a.width<=0 || a.height<=0)
      throw Error('Invalid meeting rectangle: '+a.id);
    for (const b of [...groups.slice(i+1),...quiet])
      if (a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y)
        throw Error('Overlapping meeting or quiet areas: '+a.id+' / '+(b.id||b.name));
  }
  return groups;
}
function createWam(map) {
  const settings = props(map), id = settings.castleMapId;
  if (!ids.has(id)) throw Error('Unknown castle map id');
  const areas = meetingAreas(map).map(group => ({
    id:uuid(id+'/'+group.id),name:group.name,x:group.x,y:group.y,width:group.width,height:group.height,
    visible:true,properties:[{id:uuid(id+'/'+group.id+'/meeting'),type:'livekitRoomProperty',
      roomName:'school-castle-v2-'+id+'-'+group.id}],
  }));
  const sourceUrl=new URL(id+'.tmj',mapBase);
  if(settings.castleRevision)sourceUrl.searchParams.set('v',settings.castleRevision);
  return {version:'2.1.0',mapUrl:sourceUrl.href,entities:{},areas,entityCollections:[],
    settings:{megaphone:{enabled:false,title:'',scope:'ROOM'}},
    metadata:{name:settings.mapName || id,description:settings.mapDescription || '',
      copyright:settings.mapCopyright || '',thumbnail:new URL(settings.mapImage,mapBase).href}};
}
function writeWam(map, directory) {
  const wam = createWam(map);
  fs.writeFileSync(path.join(directory,props(map).castleMapId+'.wam'),JSON.stringify(wam,null,2)+'\n');
  return wam;
}
module.exports = {nativeTarget,meetingAreas,createWam,writeWam};
