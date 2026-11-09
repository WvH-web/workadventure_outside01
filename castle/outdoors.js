import './npcs.js?v=20261108-focus1';
import {castleRoomReady} from './room.js?v=20261108-outdoors1';
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,r)=>r&&p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
async function bounded(promise){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cart appearance timeout')),2500)})])}
  finally{clearTimeout(timer)}
}
export class CastlePark{
  constructor(wa,room,map){
    this.wa=wa;this.room=room;const objects=map.layers.flatMap(l=>l.objects||[]);
    this.parking=objects.find(o=>props(o).castleKartParking===true);this.bounds=objects.find(o=>props(o).castleKartBounds===true);
    this.startId='castle-kart-start-park';this.stopId='castle-kart-stop-park';this.epoch=0;
  }
  start(){
    if(!this.parking||!this.bounds||this.timer||typeof this.wa.player.setTemporaryWoka!=='function'||typeof this.wa.player.restoreWoka!=='function')return this;
    this.unsubscribeTravel=this.room.onBeforeTravel?.(()=>this.active||this.needsRestore||this.busy?this.stopKart():undefined);
    this.timer=setInterval(()=>this.refresh(),250);this.refresh();return this;
  }
  refresh(){
    if(this.closed)return;
    if(this.active&&!inside(this.room.position,this.bounds)){void this.stopKart().catch(e=>console.warn('Cart exit:',e.message));return}
    const offer=!this.active&&!this.busy&&!this.needsRestore&&!this.room.seat&&!this.room.riding&&inside(this.room.position,this.parking)&&inside(this.room.position,this.bounds);
    if(offer!==this.offered){
      this.offered=offer;
      if(offer)this.wa.ui.actionBar.addButton({id:this.startId,label:'Go-Kart fahren',callback:()=>{void this.startKart().catch(e=>console.warn('Cart entry:',e.message))}});
      else this.wa.ui.actionBar.removeButton(this.startId);
    }
  }
  setParkingVisible(visible){
    try{void Promise.resolve(this.wa.room?.[visible?'showLayer':'hideLayer']?.('kart-parked')).catch(error=>console.warn('Cart parking:',error.message))}
    catch(error){console.warn('Cart parking:',error.message)}
  }
  async startKart(){
    if(this.closed||this.active||this.busy||this.needsRestore||this.room.seat||this.room.riding||!inside(this.room.position,this.parking)||!inside(this.room.position,this.bounds))return false;
    this.busy=true;const epoch=++this.epoch;this.refresh();
    const change=Promise.resolve().then(()=>this.wa.player.setTemporaryWoka({textureId:'wvh-go-cart-avatar-v3',url:'https://together.deine-schule.com/resources/wvh/go-cart-avatar.png?v=3',frameWidth:96,frameHeight:80,scale:.62}));
    // A late appearance update after leaving must not put the kart back on the next map.
    void Promise.resolve(change).then(()=>{if(this.closed||epoch!==this.epoch)return this.wa.player.restoreWoka()}).catch(()=>{});
    try{
      await bounded(change);if(this.closed||epoch!==this.epoch)return false;
      this.active=true;this.needsRestore=true;
      this.setParkingVisible(false);
      this.wa.ui.actionBar.addButton({id:this.stopId,label:'Aussteigen',callback:()=>{void this.stopKart().catch(e=>console.warn('Cart exit:',e.message))}});
      return true;
    }catch(error){
      this.needsRestore=true;await this.stopKart().catch(()=>{});throw error;
    }finally{this.busy=false;this.refresh()}
  }
  async stopKart(){
    if(this.exiting)return this.exiting;
    this.active=false;++this.epoch;
    this.exiting=(async()=>{
      try{await bounded(this.wa.player.restoreWoka());this.needsRestore=false;this.wa.ui.actionBar.removeButton(this.stopId);if(!this.closed)this.setParkingVisible(true)}
      catch(error){
        if(!this.closed)this.wa.ui.actionBar.addButton({id:this.stopId,label:'Avatar zuruecksetzen',callback:()=>{void this.stopKart().catch(e=>console.warn('Cart reset:',e.message))}});
        throw error;
      }
    })();
    try{await this.exiting}finally{this.exiting=null;this.refresh()}
  }
  dispose(){
    if(this.closed)return;this.closed=true;++this.epoch;clearInterval(this.timer);
    this.unsubscribeTravel?.();
    this.wa.ui.actionBar.removeButton(this.startId);this.wa.ui.actionBar.removeButton(this.stopId);
    if(this.active||this.needsRestore||this.busy)void this.stopKart().catch(()=>{});
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room||room.disposed)return;const map=await WA.room.getTiledMap();if(room.disposed)return;
  const park=new CastlePark(WA,room,map).start();window.castlePark=park;
  window.addEventListener('pagehide',()=>park.dispose(),{once:true});
}).catch(error=>console.warn('Castle park:',error.message));
