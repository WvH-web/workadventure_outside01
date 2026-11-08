import './displays.js?v=20261108-characters1';
import {castleRoomReady} from './room.js?v=20261108-navigation2';
import {characters,characterById} from './characters-data.js?v=20261108-characters1';
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
export class CastleNpcs{
  constructor(wa,map){
    this.wa=wa;this.id=props(map).castleMapId;this.closed=false;this.figures=[];
    this.slots=map.layers.flatMap(l=>l.objects||[]).filter(o=>characterById(props(o).castleNpcId));
  }
  start(){
    if(this.closed)return Promise.resolve(this);if(this.task)return this.task;
    this.task=(async()=>{
      if(!this.slots.length)return this;
      const base=new URL('art/characters-20261108/',import.meta.url),labels=await this.wa.room.loadTileset(new URL('labels.json',base).href);
      for(const slot of this.slots){
        if(this.closed)return this;
        const id=props(slot).castleNpcId,index=characters.findIndex(c=>c.id===id),first=await this.wa.room.loadTileset(new URL(id+'.json',base).href);
        if(this.closed)return this;
        const x=Math.floor((slot.x+48)/32),y=Math.floor((slot.y+48)/32);
        const tiles=[{x,y,tile:first+1,layer:'castle-npc-sprites'},...[0,1,2].map(n=>({x:x-1+n,y:y-1,tile:labels+index*3+n,layer:'castle-npc-labels'}))];
        this.wa.room.setTiles(tiles);this.figures.push({id,x,y,tiles});
      }
      return this;
    })();return this.task;
  }
  dispose(clear=true){
    if(this.closed)return;this.closed=true;
    if(clear&&this.figures.length)this.wa.room.setTiles(this.figures.flatMap(f=>f.tiles.map(t=>({...t,tile:null}))));
    this.figures=[];
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room||room.disposed)return;const map=await WA.room.getTiledMap();if(room.disposed)return;
  const npcs=new CastleNpcs(WA,map);window.castleNpcs=npcs;
  window.addEventListener('pagehide',()=>npcs.dispose(false),{once:true});await npcs.start();
}).catch(error=>console.warn('Castle characters:',error.message));
