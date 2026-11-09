import {castleRoomReady} from './room.js?v=20261108-outdoors1';
import {characters} from './characters-data.js?v=20261108-characters1';
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,a)=>p.x>=a.x&&p.y>=a.y&&p.x<a.x+a.width&&p.y<a.y+a.height;
const ownBase=new URL('.',import.meta.url);
const gamesUrl='https://together.deine-schule.com/castle-school/games';
const chessUrl='https://together.deine-schule.com/castle-chess/';
const artUrl='https://together.deine-schule.com/castle-art/';
const allowedExternal=new Set([
  'https://musiclab.chromeexperiments.com/Song-Maker/',
  'https://eyes.nasa.gov/apps/solar-system/',
  'https://together.deine-schule.com/castle-content/collection.html?kind=museum',
  'https://together.deine-schule.com/castle-content/collection.html?kind=music',
  'https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de'
]);
export function activitySettings(object){
  const p=props(object),url=new URL(p.castleActivityUrl,ownBase);
  const story=['story.html','story.html?v=20261108-outdoors1'].some(page=>url.href===new URL(page,ownBase).href);
  const games=url.href===new URL('hall-games.html',ownBase).href||url.href===gamesUrl;
  const collection=['collection.html?kind=museum','collection.html?kind=music','expeditions.html'].some(page=>url.href===new URL(page,ownBase).href);
  const character=characters.some(c=>url.href===new URL('characters.html?npc='+c.id,ownBase).href);
  if(!story&&!games&&url.href!==chessUrl&&url.href!==artUrl&&!collection&&!character&&!allowedExternal.has(url.href))throw Error('Unknown castle activity destination');
  return {id:p.castleActivityId,label:p.castleActivityLabel,url:games?gamesUrl:url.href,api:story&&p.castleActivityApi===true};
}
export class CastleActivities{
  constructor(wa,room,map){
    this.wa=wa;this.room=room;this.mapId=props(map).castleMapId||'activity';this.areas=map.layers.flatMap(l=>l.objects||[]).filter(o=>props(o).castleActivityId)
      .map(o=>({...o,settings:activitySettings(o)}));this.epoch=0;this.closed=false;this.button='';this.appsButton='';
  }
  start(){this.refresh();this.timer=setInterval(()=>this.refresh(),400);return this}
  refresh(){
    if(this.closed)return;
    const next=this.areas.find(a=>inside(this.room.position,a));
    if(next?.settings.id===this.active?.settings.id)return;
    this.active=next;
    void this.close().catch(e=>console.warn('Activity departure:',e.message));
    if(this.button)this.wa.ui.actionBar.removeButton(this.button);
    if(this.appsButton)this.wa.ui.actionBar.removeButton(this.appsButton);
    this.button='';this.appsButton='';
    if(next){
      this.button='castle-activity-'+this.mapId+'-'+next.settings.id;
      const callback=()=>{
        void this.open().catch(e=>console.warn('Activity window:',e.message));
      };
      this.wa.ui.actionBar.addButton({id:this.button,label:next.settings.label,callback});
      // Apps remain reachable when the native meeting toolbar loses an overflow action.
      this.appsButton=this.button+'-apps';
      this.wa.ui.actionBar.addButton({id:this.appsButton,label:next.settings.label,location:'appsMenu',callback});
    }
  }
  async open(){
    if(this.closed||!this.active)return null;
    if(this.pending){
      if(this.pendingId===this.active.settings.id&&this.pendingEpoch===this.epoch)return this.pending;
      const epoch=this.epoch;
      return this.pending.catch(()=>null).then(()=>this.closed||epoch!==this.epoch?null:this.open());
    }
    const epoch=this.epoch,selected=this.active.settings;
    this.pendingId=selected.id;
    this.pendingEpoch=epoch;
    this.pending=(async()=>{
      if(this.website){
        const current=this.website;
        const sites=await this.wa.nav.getCoWebSites();
        if(this.closed||epoch!==this.epoch)return null;
        if(sites.some(s=>s.id===current.id))return current;
        this.website=null;
      }
      if(this.closed||epoch!==this.epoch)return null;
      const website=await this.wa.nav.openCoWebSite(selected.url,selected.api,'autoplay; fullscreen',65,undefined,true,false);
      if(this.closed||epoch!==this.epoch){await website.close();return null}
      this.website=website;return website;
    })().finally(()=>{this.pending=null;this.pendingId=null;this.pendingEpoch=null});
    return this.pending;
  }
  async close(){this.epoch++;const current=this.website;this.website=null;if(current)await current.close()}
  dispose(){
    if(this.closed)return;this.closed=true;clearInterval(this.timer);
    if(this.button)this.wa.ui.actionBar.removeButton(this.button);
    if(this.appsButton)this.wa.ui.actionBar.removeButton(this.appsButton);
    void this.close().catch(e=>console.warn('Activity departure:',e.message));
  }
}
if(typeof WA!=='undefined')castleRoomReady.then(async room=>{
  if(!room)return;
  const activities=new CastleActivities(WA,room,await WA.room.getTiledMap());window.castleActivities=activities;
  window.addEventListener('pagehide',()=>activities.dispose(),{once:true});activities.start();
}).catch(e=>console.error('Activity initialization:',e.message));
