import './activities.js?v=20261108-ui1';
import {castleRoomReady} from './room.js?v=20261108-ui1';
import {fetchCatalog,validBoard} from './catalog.js?v=20261108-expansion1';
export class CastleDisplays{
  constructor(wa,map){
    this.wa=wa;this.closed=false;this.busy=false;this.websites=new Map();
    const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
    this.id=props(map).castleMapId;
    this.slots=map.layers.flatMap(l=>l.objects||[]).filter(o=>validBoard(props(o).castleDisplayBoard))
      .map(o=>({board:props(o).castleDisplayBoard,x:o.x,y:o.y,width:o.width,height:o.height}));
  }
  async refresh(){
    if(this.closed||this.busy)return;this.busy=true;this.abort=new AbortController();const timer=setTimeout(()=>this.abort.abort(),12000);
    try{
      const items=new Map((await fetchCatalog(this.abort.signal)).map(item=>[item.board,item]));
      if(this.closed)return;
      for(const slot of this.slots){
        const item=items.get(slot.board),existing=this.websites.get(slot.board);
        if(!item){if(existing){await this.wa.room.website.delete(existing.name);this.websites.delete(slot.board);}continue;}
        if(this.closed)return;
        const url=new URL('display.html',import.meta.url);url.searchParams.set('board',slot.board);url.searchParams.set('image',item.image);
        if(existing){if(existing.url!==url.href)existing.url=url.href;continue;}
        const name='castle-exhibit-'+this.id+'-'+slot.board;
        const website=this.wa.room.website.create({name,url:url.href,position:{x:slot.x,y:slot.y,width:slot.width,height:slot.height},visible:true,origin:'map',allowApi:false,allow:'',scale:1});
        this.websites.set(slot.board,website);
      }
    }catch(error){if(!this.closed)console.warn('Exhibition images:',error.message);}
    finally{clearTimeout(timer);this.busy=false;}
  }
  start(){if(!this.slots.length)return this;void this.refresh();this.timer=setInterval(()=>void this.refresh(),60000);return this;}
  dispose(){
    if(this.closed)return;this.closed=true;clearInterval(this.timer);this.abort?.abort();
    for(const website of this.websites.values())void this.wa.room.website.delete(website.name).catch(()=>{});
    this.websites.clear();
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room)return;const displays=new CastleDisplays(WA,await WA.room.getTiledMap()).start();window.castleDisplays=displays;
  window.addEventListener('pagehide',()=>displays.dispose(),{once:true});
}).catch(error=>console.warn('Exhibition initialization:',error.message));
