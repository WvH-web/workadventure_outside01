const HOME='https://together.deine-schule.com/castle-homes/';
export const HOME_ENTRY_VERSION='20261111-homes2';
export const HOME_MEDIA_POLICY='microphone; camera; clipboard-write';
const props=object=>Object.fromEntries((object.properties||[]).map(p=>[p.name,p.value]));
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const inside=(p,a)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&p.x>=a.x&&p.y>=a.y&&p.x<a.x+a.width&&p.y<a.y+a.height;
export function homeEntryArea(map){
 const p=props(map);if(p.castleMapId!=='obergeschoss'||p.castleHomesPilot!==HOME_ENTRY_VERSION)return null;
 const objects=[];function walk(layers){for(const layer of layers||[]){if(layer.layers)walk(layer.layers);objects.push(...(layer.objects||[]));}}walk(map.layers);
 const entries=objects.filter(o=>props(o).castleHomeEntry===true);if(entries.length!==1)throw Error('One reviewed home entry required');
 const area=entries[0];if(area.name!=='castle-home-entry'||area.type!=='area'||props(area).silent!==true||
  !['x','y','width','height'].every(key=>Number.isFinite(area[key]))||area.x<0||area.y<0||area.width<64||area.height<64||area.x+area.width>map.width*map.tilewidth||area.y+area.height>map.height*map.tileheight||
  objects.some(o=>props(o).conversationGroup&&overlap(o,area)))throw Error('Home entry must be a separate native quiet area');
 return Object.freeze({x:area.x,y:area.y,width:area.width,height:area.height});
}
export class CastleHomeEntry{
 constructor(wa,area){this.wa=wa;this.area=area;this.epoch=0;this.positionVersion=0;this.active=false;}
 async start(){
  if(this.started||this.closed)return this;this.started=true;
  this.subscription=this.wa.player.onPlayerMove(p=>{this.positionVersion++;this.update(p);});
  const version=this.positionVersion,position=await this.wa.player.getPosition();if(version===this.positionVersion)this.update(position);return this;
 }
 update(position){
  if(this.closed)return;const active=inside(position,this.area);if(active===this.active)return;this.active=active;
  if(!active){void this.close().catch(()=>{});return;}this.epoch++;void this.open().catch(()=>console.warn('Schlosszimmer konnte nicht geoeffnet werden.'));
 }
 async open(){
  if(this.closed||!this.active)return null;
  const epoch=this.epoch;
  if(this.pending)return this.pending.catch(()=>null).then(()=>!this.closed&&this.active&&epoch===this.epoch?this.open():null);
  this.pending=(async()=>{
   const website=await this.wa.nav.openCoWebSite(HOME,false,HOME_MEDIA_POLICY,65,undefined,true,false);
   if(this.closed||!this.active||epoch!==this.epoch){await website.close();return null;}this.website=website;return website;
  })().finally(()=>{this.pending=null;});return this.pending;
 }
 async close(){this.epoch++;const website=this.website;this.website=null;if(website)await website.close();}
 dispose(){if(this.closed)return;this.closed=true;this.subscription?.unsubscribe?.();void this.close().catch(()=>{});}
}
if(typeof WA!=='undefined')WA.onInit().then(async()=>{
 const area=homeEntryArea(await WA.room.getTiledMap());if(!area)return;
 const entry=new CastleHomeEntry(WA,area);window.castleHomeEntry=entry;window.addEventListener('pagehide',()=>entry.dispose(),{once:true});await entry.start();
}).catch(()=>console.warn('Schlosszimmer-Einstieg ist nicht verfuegbar.'));
