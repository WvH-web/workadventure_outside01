import {ownedUi} from './ui-ids.js?v=20261109-rounds1';
const REQUEST='castleRoundTravelV1',READY='castleRoundTravelReadyV1',FAILED='castleRoundTravelFailedV1';
const PRIVATE={public:false,persist:false};
const PAGE='https://together.deine-schule.com/castle-school/rounds';
const PRESENCE='https://together.deine-schule.com/castle-school/presence';
const valid=value=>value&&Object.keys(value).sort().join(',')==='createdAt,mapId,nonce,v'&&value.v===1&&
  Number.isFinite(value.createdAt)&&Date.now()-value.createdAt>=-2000&&Date.now()-value.createdAt<10000&&
  typeof value.nonce==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.nonce)&&Object.hasOwn(ownedUi,value.mapId);
export class CastleCommunity{
  constructor(wa,room){this.wa=wa;this.room=room;this.id='castle-rounds-'+room.layout.id;this.closed=false;this.generation=0;this.panelGeneration=0;}
  start(){
    if(this.started||this.closed)return this;this.started=true;
    if(!this.wa.ui?.website?.open||!this.wa.player.state?.onVariableChange)return this;
    const previous=this.wa.player.state.loadVariable?.(REQUEST);if(valid(previous)){this.lastNonce=previous.nonce;this.lastRequestAt=previous.createdAt;}
    this.subscription=this.wa.player.state.onVariableChange(REQUEST).subscribe(value=>{if(valid(value)&&value.nonce!==this.lastNonce)void this.travel(value);});
    this.before=this.room.onBeforeTravel(()=>this.closePanel());
    this.bridgePending=Promise.resolve().then(()=>this.closed?null:this.wa.ui.website.open({url:PRESENCE,allowApi:true,allowPolicy:'',visible:true,
      position:{vertical:'top',horizontal:'left'},size:{width:'1px',height:'1px'},margin:{left:'-2px',top:'-2px'}})).then(async website=>{
      if(!website)return;if(this.closed){await website.close();return;}
      this.bridge=website;const callback=()=>void this.open().catch(()=>console.warn('Castle rounds could not open.'));
      this.wa.ui.actionBar.addButton({id:this.id,label:'Runden',callback});
      this.wa.ui.actionBar.addButton({id:this.id+'-apps',label:'Runden',location:'appsMenu',callback});
    }).catch(()=>{if(!this.closed)console.warn('Castle round registration is unavailable.');});
    return this;
  }
  async closePanel(){const generation=++this.panelGeneration,website=this.website;this.website=null;if(website)await website.close();return generation;}
  open(){
    if(this.closed)return Promise.resolve();if(this.pending)return this.pending;
    const task=(async()=>{
      const generation=await this.closePanel();if(this.closed||generation!==this.panelGeneration)return;
      const website=await this.wa.nav.openCoWebSite(PAGE,true,'',60,0);
      if(this.closed||generation!==this.panelGeneration)await website.close();else this.website=website;
    })().finally(()=>{if(this.pending===task)this.pending=null;});this.pending=task;return task;
  }
  async travel(value){
    if(this.closed||!valid(value)||this.lastNonce===value.nonce||value.createdAt<(this.lastRequestAt||0))return;
    this.lastNonce=value.nonce;this.lastRequestAt=value.createdAt;const generation=++this.generation;
    try{
      if(this.room.riding)throw Error('Busy');
      if(value.mapId===this.room.layout.id){
        await this.room.stand();if(this.closed||generation!==this.generation)return;
        await this.closePanel();
        if(!this.closed&&generation===this.generation)await this.wa.player.state.saveVariable(READY,value.nonce,PRIVATE);
      }else{
        const url='https://together.deine-schule.com/~/castle-preview/'+value.mapId+'.wam#start';
        if(!await this.room.travelTo(url))throw Error('Busy');
      }
    }catch(error){
      if(!this.closed&&generation===this.generation){
        await Promise.resolve(this.wa.player.state.saveVariable(FAILED,value.nonce,PRIVATE)).catch(()=>{});
        this.wa.ui.displayActionMessage?.({message:'Die Runde konnte nicht geoeffnet werden.',callback:()=>void this.open()});
      }
    }
  }
  dispose(){
    if(this.closed)return;this.closed=true;this.generation++;this.subscription?.unsubscribe();this.before?.();
    this.wa.ui.actionBar.removeButton(this.id);
    this.wa.ui.actionBar.removeButton(this.id+'-apps');
    void this.closePanel().catch(()=>{});void Promise.resolve().then(()=>this.bridge?.close()).catch(()=>{});
  }
}
