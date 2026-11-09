import './displays.js?v=20261109-games1';
import {castleRoomReady} from './room.js?v=20261108-outdoors1';
import {characterById} from './characters-data.js?v=20261108-characters1';
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
export class CastleNpcs{
  constructor(wa,map){
    this.wa=wa;this.id=props(map).castleMapId;this.closed=false;this.websites=[];
    this.slots=map.layers.flatMap(l=>l.objects||[]).filter(o=>characterById(props(o).castleNpcId));
  }
  start(){
    if(this.closed||this.started)return this;this.started=true;
    for(const slot of this.slots){
      const id=props(slot).castleNpcId,url=new URL('https://together.deine-schule.com/castle-content/npc-sprite.html');url.searchParams.set('npc',id);url.searchParams.set('v','20261108-focus1');
      const website=this.wa.room.website.create({name:'castle-npc-'+this.id+'-'+id,url:url.href,
        position:{x:slot.x,y:slot.y,width:96,height:64},visible:true,origin:'map',allowApi:false,allow:'',scale:1});
      this.websites.push(website);
    }
    return this;
  }
  dispose(){
    if(this.closed)return;this.closed=true;
    for(const website of this.websites)void this.wa.room.website.delete(website.name).catch(()=>{});
    this.websites=[];
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room||room.disposed)return;const map=await WA.room.getTiledMap();if(room.disposed)return;
  const npcs=new CastleNpcs(WA,map);window.castleNpcs=npcs;
  window.addEventListener('pagehide',()=>npcs.dispose(),{once:true});npcs.start();
}).catch(error=>console.warn('Castle characters:',error.message));
