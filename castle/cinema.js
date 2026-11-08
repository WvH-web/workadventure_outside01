import {castleRoomReady} from './room.js?v=20261108-kino3';

const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,a)=>p.x>=a.x&&p.y>=a.y&&p.x<a.x+a.width&&p.y<a.y+a.height;
const buttonId='castle-cinema';
export class CastleCinema {
  constructor(wa,room,map){
    this.wa=wa;this.room=room;
    this.area=map.layers.flatMap(l=>l.objects||[]).find(o=>props(o).castleCinemaUrl);
    if(!this.area)throw Error('Cinema film area missing');
    this.settings=props(this.area);this.epoch=0;this.closed=false;this.buttonLabel='';
  }
  start(){this.refresh();this.timer=setInterval(()=>this.refresh(),400);return this;}
  isInside(){return !this.closed&&inside(this.room.position,this.area);}
  refresh(){
    const active=this.isInside();
    if(!active){
      if(this.buttonLabel){this.wa.ui.actionBar.removeButton(buttonId);this.buttonLabel='';}
      if(this.website||this.openTask)void this.close();
      return;
    }
    this.updateButton();
    if(this.website&&!this.checkTask&&Date.now()>=(this.nextCheck||0)){
      this.nextCheck=Date.now()+1500;
      void this.checkWebsite().catch(e=>console.warn('Cinema window check:',e.message));
    }
  }
  updateButton(){
    if(!this.isInside())return;
    const label=this.website?'Kino schliessen':'Kino';
    if(this.buttonLabel===label)return;
    if(this.buttonLabel)this.wa.ui.actionBar.removeButton(buttonId);
    this.wa.ui.actionBar.addButton({id:buttonId,label,callback:()=>{
      void (this.website?this.close():this.open()).catch(e=>console.warn('Cinema window:',e.message));
    }});
    this.buttonLabel=label;
  }
  checkWebsite(){
    if(this.checkTask)return this.checkTask;
    const current=this.website;
    this.checkTask=Promise.resolve().then(()=>this.wa.nav.getCoWebSites()).then(sites=>{
      if(this.closed||this.website!==current)return;
      if(current&&!sites.some(s=>s.id===current.id)){this.website=null;this.updateButton();}
    }).finally(()=>{this.checkTask=null;});
    return this.checkTask;
  }
  open(){
    if(!this.isInside()||this.website)return Promise.resolve(this.website||null);
    if(this.openTask)return this.openTask;
    const epoch=this.epoch;
    this.openTask=Promise.resolve().then(()=>this.wa.nav.openCoWebSite(this.settings.castleCinemaUrl,false,
      this.settings.castleCinemaPolicy||'',this.settings.castleCinemaWidth||60,undefined,true,false))
      .then(async website=>{
        if(!this.isInside()||epoch!==this.epoch){await website.close();return null;}
        this.website=website;this.nextCheck=Date.now()+1500;this.updateButton();return website;
      }).finally(()=>{this.openTask=null;});
    return this.openTask;
  }
  async close(){
    this.epoch++;
    const current=this.website;this.website=null;this.updateButton();
    if(current)await current.close();
  }
  dispose(){
    if(this.closed)return;
    this.closed=true;clearInterval(this.timer);
    if(this.buttonLabel)this.wa.ui.actionBar.removeButton(buttonId);
    this.buttonLabel='';
    void this.close().catch(e=>console.warn('Cinema departure:',e.message));
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room)return;
  const cinema=new CastleCinema(WA,room,await WA.room.getTiledMap());
  window.castleCinema=cinema;
  window.addEventListener('pagehide',()=>cinema.dispose(),{once:true});cinema.start();
}).catch(e=>console.error('Cinema initialization:',e.message));
