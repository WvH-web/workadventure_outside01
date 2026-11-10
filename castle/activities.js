import {castleRoomReady} from './room.js?v=20261109-rounds1';
import {characters} from './characters-data.js?v=20261108-characters1';
import {TableRound} from './table-round.js';
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,a)=>p.x>=a.x&&p.y>=a.y&&p.x<a.x+a.width&&p.y<a.y+a.height;
const ownBase=new URL('.',import.meta.url);
const gamesUrl='https://together.deine-schule.com/castle-school/games';
const chessUrl='https://together.deine-schule.com/castle-chess/';
const artUrl='https://together.deine-schule.com/castle-art/';
const pianoUrl='https://together.deine-schule.com/castle-piano/';
const allowedExternal=new Set([
  'https://musiclab.chromeexperiments.com/Song-Maker/',
  'https://eyes.nasa.gov/apps/solar-system/',
  'https://together.deine-schule.com/castle-content/collection.html?kind=museum',
  'https://together.deine-schule.com/castle-content/collection.html?kind=music',
  'https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de'
]);
export function activitySettings(object){
  const p=props(object),url=new URL(p.castleActivityUrl,ownBase);
  const chessTable=url.origin===new URL(chessUrl).origin&&url.pathname===new URL(chessUrl).pathname&&/^#table=tisch-[123]$/.test(url.hash)&&!url.search;
  const tableStory=url.href===new URL('story.html#table',ownBase).href;
  const story=['story.html','story.html?v=20261108-outdoors1'].some(page=>url.href===new URL(page,ownBase).href);
  const games=url.href===new URL('hall-games.html',ownBase).href||url.href===gamesUrl;
  const collection=['collection.html?kind=museum','collection.html?kind=music','expeditions.html'].some(page=>url.href===new URL(page,ownBase).href);
  const character=characters.some(c=>url.href===new URL('characters.html?npc='+c.id,ownBase).href);
  if(!story&&!tableStory&&!games&&!chessTable&&url.href!==chessUrl&&url.href!==artUrl&&url.href!==pianoUrl&&!collection&&!character&&!allowedExternal.has(url.href))throw Error('Unknown castle activity destination');
  return {id:p.castleActivityId,label:p.castleActivityLabel,url:games?gamesUrl:url.href,api:(story||tableStory)&&p.castleActivityApi===true,
    autoOnSit:p.castleActivityOnSit===true&&(story||tableStory||chessTable||url.href===chessUrl||url.href===artUrl||url.href===pianoUrl),
    group:p.castleActivityGroup||null};
}
export class CastleActivities{
  constructor(wa,room,map){
    this.wa=wa;this.room=room;this.mapId=props(map).castleMapId||'activity';this.areas=map.layers.flatMap(l=>l.objects||[]).filter(o=>props(o).castleActivityId)
      .map(o=>({...o,settings:activitySettings(o)}));this.epoch=0;this.closed=false;this.button='';this.appsButton='';
    const tables=this.areas.filter(a=>a.settings.autoOnSit&&a.settings.group).map(a=>({id:a.settings.id,area:a,
      seats:(room.layout?.seats||[]).filter(s=>s.audioGroup===a.settings.group).map(s=>s.id),
      options:props(a).castleActivityChoices?JSON.parse(props(a).castleActivityChoices).map(option=>activitySettings({properties:[
        {name:'castleActivityId',value:option.id},{name:'castleActivityLabel',value:option.label},
        {name:'castleActivityUrl',value:option.url},{name:'castleActivityApi',value:option.api===true}]})):[a.settings]}));
    if(tables.length)this.rounds=new TableRound(wa,room,tables,value=>this.tableChanged(value));
  }
  start(){this.refresh();this.timer=setInterval(()=>this.refresh(),400);return this}
  refresh(){
    if(this.closed)return;
    const next=this.areas.find(a=>inside(this.room.position,a));
    if(next?.settings.id===this.active?.settings.id){this.rounds?.refresh();this.refreshSeat();return;}
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
    this.rounds?.refresh();this.refreshSeat();
  }
  refreshSeat(){
    if(this.rounds)return;
    const seat=this.room.seat,area=this.active;
    if(!seat||!area?.settings.autoOnSit||!inside(seat,area)){
      if(this.autoSeat){this.autoSeat=null;void this.close().catch(e=>console.warn('Seated activity departure:',e.message));}return;
    }
    if(this.room.busy)return;
    const key=area.settings.id+':'+seat.id;if(this.autoSeat===key)return;this.autoSeat=key;
    void this.open().catch(e=>console.warn('Seated activity window:',e.message));
  }
  tableChanged(value){
    const epoch=(this.pickerEpoch||0)+1;this.pickerEpoch=epoch;this.picker?.close();this.picker=null;
    if(!value){this.tableSelection=null;this.autoSeat=null;void this.close().catch(()=>{});return;}
    if(this.tableVisit!==value.visit){this.tableVisit=value.visit;this.tableSelection=null;this.autoSeat=null;void this.close().catch(()=>{});}
    if(value.round){
      const key=value.visit+':'+value.round.id;if(this.autoSeat===key)return;
      this.autoSeat=key;this.tableSelection=value.table.options.find(option=>option.id===value.round.choice);
      void this.close().then(()=>this.open()).catch(e=>console.warn('Table activity:',e.message));return;
    }
    if(value.waiting)return;
    const buttons=value.leader?value.table.options.map(option=>({label:option.label,className:'primary',callback:()=>this.rounds.choose(option.id)})):[];
    void Promise.resolve().then(()=>this.wa.ui.openPopup(value.table.area.name,value.leader?'Unsere Tischrunde':'Die Tischrunde wird ausgewaehlt.',buttons)).then(popup=>{
      if(this.closed||epoch!==this.pickerEpoch)popup.close();else this.picker=popup;
    }).catch(e=>console.warn('Table selection:',e.message));
  }
  async open(){
    if(this.closed||!this.active)return null;
    if(this.rounds?.value&&!this.tableSelection){this.rounds.refresh();return null;}
    if(this.pending){
      if(this.pendingId===this.active.settings.id&&this.pendingEpoch===this.epoch)return this.pending;
      const epoch=this.epoch;
      return this.pending.catch(()=>null).then(()=>this.closed||epoch!==this.epoch?null:this.open());
    }
    const epoch=this.epoch,selected=this.tableSelection||this.active.settings;
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
    this.rounds?.dispose();this.pickerEpoch=(this.pickerEpoch||0)+1;this.picker?.close();
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
