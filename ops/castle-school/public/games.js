import {RoundClient} from './round-client.js';
const ids=['stumbleguysgame','haxballarea01','gamesarea01','gamesarea02','gamesarea03','gamesarea04','gamesarea05'];
const labels={ready:'Freigegeben',preview:'Lehrkraft-Vorschau',restricted:'Nicht freigegeben',not_configured:'Noch nicht eingerichtet'};
const errors={unauthorized:'Bitte erneut in WorkAdventure anmelden.',not_allowed:'Dieses Angebot ist f\u00fcr dein Konto nicht freigegeben.',
  wrong_pin:'Die Moderator-PIN stimmt nicht.',unreviewed_target:'Der neue Link liegt au\u00dferhalb des freigegebenen Anbieterbereichs.',
  invalid_request:'Bitte Raumlink und PIN pr\u00fcfen.',rate_limited:'Zu viele Anfragen. Bitte kurz warten.',
  unavailable:'Die Spielrunden sind gerade nicht erreichbar.','popup_blocked':'Das neue Fenster wurde vom Browser blockiert.',
  stale_membership:'Bitte der Treffpunktrunde in WorkAdventure erneut beitreten.',game_changed:'Der Raumlink wurde inzwischen ge\u00e4ndert. Bitte den neuen Link pr\u00fcfen.',
  game_hosted:'F\u00fcr diese Treffpunktrunde ist bereits ein anderer Gastgeber best\u00e4tigt.',game_not_host:'Deine Gastgeber-Best\u00e4tigung ist nicht mehr aktiv.',
  game_not_ready:'F\u00fcr diesen Raumlink gibt es keine aktuelle Gastgeber-Best\u00e4tigung.',round_missing:'Die Treffpunktrunde ist nicht mehr verf\u00fcgbar.'};
const icon=name=>{const element=document.createElement('i');element.dataset.lucide=name;element.setAttribute('aria-hidden','true');return element;};
const icons=()=>window.lucide?.createIcons();
export class GamesPage {
  constructor(){
    this.ui=Object.fromEntries(['account','message','games-list','offer-select','detail-title','mode','availability','lobby','current-url','copy','join','external','host','room-form','room-url','pin','save','refresh','viewer','viewer-title','frame-slot','close-viewer',
      'round-place','round-game-state','confirm-game','end-game','join-game'].map(id=>[id,document.getElementById(id)]));
    this.roundClient=new RoundClient();this.roundGeneration=0;this.roundCheckedAt=0;
    const hash=location.hash.slice(1),fromRounds=hash==='rounds'||hash.startsWith('rounds/');
    const selection=fromRounds?hash.slice(7):hash;this.initialSelection=ids.includes(selection)?selection:null;
    document.getElementById('back-rounds').hidden=!fromRounds;
    this.auth=undefined;this.epoch=0;this.generation=0;this.offers=[];this.requests=new Set();this.closed=false;this.nextContext=0;
    this.ui.refresh.addEventListener('click',()=>void this.refresh());
    this.ui['offer-select'].addEventListener('change',()=>void this.select(this.ui['offer-select'].value));
    this.ui.join.addEventListener('click',()=>void this.join(false));this.ui.external.addEventListener('click',()=>void this.join(true,this.round?.game?.resourceId===this.selected));
    this.ui.copy.addEventListener('click',()=>void this.copy());this.ui['close-viewer'].addEventListener('click',()=>this.closeViewer());
    this.ui['confirm-game'].addEventListener('click',()=>void this.hostRound(false));this.ui['end-game'].addEventListener('click',()=>void this.hostRound(true));
    this.ui['join-game'].addEventListener('click',()=>void this.join(false,true));
    this.ui['room-url'].addEventListener('input',()=>{this.dirty=true;});this.ui['room-form'].addEventListener('submit',event=>{event.preventDefault();void this.save();});
    window.addEventListener('storage',event=>{if(['authToken','localUser',null].includes(event.key)){this.syncAuth();void this.refresh();}});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void this.refresh();});
    window.addEventListener('pagehide',()=>this.dispose(),{once:true});
    this.syncAuth();this.timer=setTimeout(()=>void this.tick(),Math.random()*600);icons();window.addEventListener('load',icons,{once:true});
  }
  token(){try{return localStorage.getItem('authToken');}catch{return null;}}
  syncAuth(){
    this.roundClient.sync(false);const token=this.token(),scope=this.roundClient.scope;if(token===this.auth&&scope===this.roundScope)return token;
    this.roundScope=scope;this.round=null;this.roundCheckedAt=0;this.roundGeneration++;
    this.auth=token;this.epoch++;this.generation++;
    for(const abort of this.requests)abort.abort();this.requests.clear();
    this.offers=[];this.selected=null;this.current=null;this.dirty=false;this.contextPending=null;this.resolvePending=null;this.nextContext=0;
    this.ui['room-url'].value='';this.ui.pin.value='';this.ui.host.open=false;this.closeViewer();this.renderList();this.renderDetail();
    this.ui.account.textContent=token?'Schulzugang wird gepr\u00fcft \u2026':'Bitte erneut in WorkAdventure anmelden.';return token;
  }
  async api(route,body){
    const token=this.syncAuth(),epoch=this.epoch;if(!token)throw Object.assign(Error(),{code:'unauthorized'});
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),6500);this.requests.add(abort);
    try{
      const response=await fetch('/castle-school/'+route,{method:body===undefined?'GET':'POST',credentials:'omit',cache:'no-store',
        headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:abort.signal});
      const value=await response.json();if(this.closed||epoch!==this.epoch||token!==this.token())throw Object.assign(Error(),{code:'cancelled'});
      if(!response.ok)throw Object.assign(Error(),{code:value.error||'unavailable'});return value;
    }catch(error){if(epoch!==this.epoch||token!==this.token()||this.closed)throw Object.assign(Error(),{code:'cancelled'});throw error;}
    finally{clearTimeout(timer);this.requests.delete(abort);}
  }
  message(text='',tone='error'){this.ui.message.textContent=text;this.ui.message.hidden=!text;this.ui.message.dataset.tone=tone;}
  failure(error){if(error.code!=='cancelled')this.message(errors[error.code]||errors.unavailable);}
  selectedOffer(){return this.offers.find(offer=>offer.id===this.selected);}
  renderList(){
    const focus=document.activeElement?.dataset?.gameId,fragment=document.createDocumentFragment();
    for(const offer of this.offers){
      const button=document.createElement('button');button.type='button';button.dataset.gameId=offer.id;button.dataset.state=offer.status;
      button.setAttribute('aria-current',String(offer.id===this.selected));
      const name=document.createElement('span'),title=document.createElement('span'),status=document.createElement('small'),dot=document.createElement('span');
      name.className='game-name';title.textContent=offer.title;status.textContent=labels[offer.status]||labels.restricted;name.append(title,status);dot.className='status-dot';dot.setAttribute('aria-hidden','true');
      button.append(icon(offer.id==='stumbleguysgame'?'flag':offer.id==='haxballarea01'?'circle-dot':'gamepad-2'),name,dot);
      button.addEventListener('click',()=>void this.select(offer.id));fragment.append(button);
    }
    const empty=document.createElement('option');empty.value='';empty.textContent='Keine Runde ge\u00f6ffnet';empty.disabled=true;
    this.ui['offer-select'].replaceChildren(empty,...this.offers.map(offer=>{const option=document.createElement('option');option.value=offer.id;option.textContent=offer.title+' \u00b7 '+(labels[offer.status]||labels.restricted);return option;}));
    this.ui['offer-select'].value=this.selected||'';
    this.ui['games-list'].replaceChildren(fragment);this.ui['games-list'].setAttribute('aria-busy','false');icons();
    if(focus)this.ui['games-list'].querySelector(`[data-game-id="${focus}"]`)?.focus({preventScroll:true});
  }
  renderDetail(){
    const offer=this.selectedOffer(),ready=Boolean(offer?.allowed&&this.current?.id===offer.id);
    this.ui['detail-title'].textContent=offer?.title||'Keine Runde ge\u00f6ffnet';
    this.ui.mode.hidden=offer?.mode!=='preview';this.ui.mode.textContent=offer?.mode==='preview'?'Entwurf \u00b7 Vorschau':'';
    this.ui.availability.textContent=!offer?'':offer.status==='not_configured'?labels.not_configured:!offer.allowed?errors.not_allowed:!ready?'Raumlink wird gepr\u00fcft \u2026':'';
    this.ui.lobby.hidden=!ready;this.ui['current-url'].textContent=ready?this.current.targetUrl:'';
    const game=this.round?.game,uncertain=Boolean(game&&!['confirmed','waiting'].includes(game.state));
    const connected=uncertain||game?.resourceId===this.selected,confirmed=game?.state==='confirmed';
    this.ui.join.hidden=connected;this.ui.join.disabled=!ready||this.joining;
    this.ui.copy.disabled=!ready||this.copying||connected&&!confirmed;
    this.ui.external.hidden=offer?.presentation!=='side'||connected&&!confirmed;this.ui.external.disabled=!ready||this.joining;
    this.ui.save.disabled=!ready||this.saving;
    this.renderRound(ready);
  }
  renderRound(ready){
    const round=this.round,game=round?.game,lease=this.roundClient.lease(),hosted=game?.state==='confirmed';
    const canConfirm=Boolean(ready&&round?.kind==='talk'&&lease?.roundId===round.id&&(!hosted||game.mineHost));
    this.ui['round-place'].textContent=round?round.location+' \u00b7 '+round.label:'Noch keine Treffpunkt-Anmeldung';
    this.ui['round-game-state'].dataset.state=game?.state||'none';
    this.ui['round-game-state'].textContent=!round?'':game?.state==='confirmed'?game.title+' \u00b7 Gastgeber best\u00e4tigt':
      game?.state==='restricted'?'Spielangebot nicht freigegeben':game?.state==='unavailable'?'Spielstatus gerade nicht erreichbar':'Noch kein Gastgeber best\u00e4tigt';
    this.ui['confirm-game'].disabled=!canConfirm||this.hosting;
    this.ui['confirm-game'].hidden=hosted;
    this.ui['end-game'].hidden=!game?.mineHost;this.ui['end-game'].disabled=!lease||lease.roundId!==round?.id||this.hosting;
    this.ui['join-game'].hidden=!hosted||game.resourceId!==this.selected;this.ui['join-game'].disabled=!ready||this.joining;
  }
  updateRound(value,generation){
    if(generation!==this.roundGeneration)return;
    if(!Object.hasOwn(value,'round')){this.round=null;return;}
    if(value.checkedAt<this.roundCheckedAt)return;
    if(!Number.isFinite(value.checkedAt)||value.round!==null&&(!value.round||value.round.mine!==true||typeof value.round.id!=='string'))throw Error('response');
    this.round=value.round;this.roundCheckedAt=value.checkedAt;
  }
  async hostRound(end){
    this.syncAuth();if(this.hosting)return;const lease=this.roundClient.lease(),round=this.round,current=this.current;
    if(!lease||lease.roundId!==round?.id||!current||!this.selectedOffer()?.allowed)return;
    const epoch=this.epoch,generation=this.generation;this.hosting=true;this.message();this.renderDetail();
    try{
      await this.api(end?'round-game-end':'round-game-confirm',end?{leaseId:lease.leaseId}:
        {leaseId:lease.leaseId,resourceId:current.id,revision:current.revision,targetUrl:current.targetUrl});
      if(epoch!==this.epoch)return;
      this.roundGeneration++;if(generation===this.generation)this.message(end?'Gastgeber-Best\u00e4tigung beendet.':'Gastgeber f\u00fcr diesen Raumlink best\u00e4tigt.','success');
    }catch(error){if(epoch===this.epoch&&generation===this.generation)this.failure(error);}
    finally{this.hosting=false;if(epoch===this.epoch){this.roundGeneration++;this.generation++;await this.refresh();}this.renderDetail();}
  }
  async context(){
    if(this.contextPending)return this.contextPending;
    const roundGeneration=this.roundGeneration;
    const job=(async()=>{
      try{
        const value=await this.api('context');
        if(!Array.isArray(value.offers)||value.offers.length!==7||!value.offers.every(offer=>ids.includes(offer.id)))throw Error('response');
        const changed=JSON.stringify(value.offers)!==JSON.stringify(this.offers);this.offers=value.offers;this.nextContext=Date.now()+15000;
        this.updateRound(value,roundGeneration);
        if(!this.selected&&this.initialSelection){this.selected=this.initialSelection;this.initialSelection=null;}
        this.ui.account.textContent=value.account.schoolAccount?(value.account.kind==='staff'?'Lehrkraftzugang':'Schulzugang'):'Keine Schulfreigabe f\u00fcr dieses Konto';
        if(this.selected&&!this.selectedOffer()?.allowed){this.generation++;this.current=null;this.closeViewer();this.ui.pin.value='';}
        if(changed)this.renderList();this.renderDetail();return true;
      }catch(error){if(error.code!=='cancelled'){this.current=null;this.offers=this.offers.map(offer=>({...offer,allowed:false,mode:null,status:offer.status==='not_configured'?'not_configured':'restricted'}));this.closeViewer();this.renderList();this.renderDetail();this.failure(error);}return false;}
    })().finally(()=>{if(this.contextPending===job)this.contextPending=null;});
    this.contextPending=job;return job;
  }
  async select(id){
    if(!ids.includes(id))return;this.syncAuth();this.generation++;this.selected=id;this.current=null;this.dirty=false;
    this.ui['room-url'].value='';this.ui.pin.value='';this.ui.host.open=false;this.closeViewer();this.message();this.renderList();this.renderDetail();
    if(this.selectedOffer()?.allowed)await this.resolve();
  }
  async resolve(){
    const id=this.selected,epoch=this.epoch,generation=this.generation,roundGeneration=this.roundGeneration;if(!this.selectedOffer()?.allowed)return;
    if(this.resolvePending?.id===id&&this.resolvePending.generation===generation)return this.resolvePending.job;
    const job=(async()=>{
      try{
        const value=await this.api('launch',{resourceId:id});if(epoch!==this.epoch||generation!==this.generation||id!==this.selected)return;
        this.apply(value,roundGeneration);return value;
      }catch(error){if(epoch===this.epoch&&generation===this.generation){this.current=null;this.closeViewer();this.renderDetail();this.failure(error);}}
    })().finally(()=>{if(this.resolvePending?.job===job)this.resolvePending=null;});
    this.resolvePending={id,generation,job};return job;
  }
  apply(value,roundGeneration=this.roundGeneration){
    const url=new URL(value.targetUrl);if(value.id!==this.selected||url.protocol!=='https:'||url.origin===location.origin)throw Error('response');
    this.updateRound(value,roundGeneration);this.current=value;if(!this.dirty)this.ui['room-url'].value=value.targetUrl;this.renderDetail();
    Object.assign(this.selectedOffer(),{presentation:value.presentation,title:value.title,revision:value.revision,mode:value.mode});this.renderDetail();
  }
  async refresh(){
    this.syncAuth();if(this.closed)return;
    if(await this.context())await this.resolve();
  }
  async tick(){
    if(this.closed)return;
    try{this.syncAuth();if(!document.hidden){if(Date.now()>=this.nextContext)await this.context();await this.resolve();}}
    finally{if(!this.closed)this.timer=setTimeout(()=>void this.tick(),5000+Math.random()*1000);}
  }
  async join(external,hosted=false){
    this.syncAuth();if(this.joining||!this.selectedOffer()?.allowed)return;
    if(this.round?.game&&!['confirmed','waiting'].includes(this.round.game.state))return;
    const id=this.selected,generation=this.generation,epoch=this.epoch,roundId=this.round?.id;
    if(hosted&&(!roundId||this.round.game?.state!=='confirmed'||this.round.game.resourceId!==id))return;
    const useTab=external||this.selectedOffer().presentation==='external';
    let popup;if(useTab){popup=window.open('about:blank','_blank');if(!popup){this.failure({code:'popup_blocked'});return;}popup.opener=null;popup.document.title='Spielrunde';popup.document.body.textContent='Freigabe wird gepr\u00fcft \u2026';}
    this.joining=true;this.message();this.renderDetail();
    try{
      const value=await this.api(hosted?'round-game-launch':'launch',hosted?{roundId}:{resourceId:id});
      if(epoch!==this.epoch||generation!==this.generation||!this.selectedOffer()?.allowed)throw Object.assign(Error(),{code:'cancelled'});
      this.apply(value);
      if(!useTab&&value.presentation==='external'){this.message('Die Runde ist jetzt f\u00fcr einen neuen Tab eingestellt.');return;}
      if(useTab){popup.location.replace(value.targetUrl);popup=null;}
      else{
        this.closeViewer();const frame=document.createElement('iframe');frame.title=value.title;frame.allow='autoplay; fullscreen';
        frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');
        frame.src=value.targetUrl;this.ui['frame-slot'].append(frame);this.ui['viewer-title'].textContent=value.title;this.ui.viewer.hidden=false;
      }
    }catch(error){if(epoch===this.epoch&&generation===this.generation){this.current=null;this.closeViewer();this.failure(error);}}
    finally{if(popup&&!popup.closed)popup.close();this.joining=false;this.renderDetail();}
  }
  async copy(){
    this.syncAuth();if(this.copying||!this.selectedOffer()?.allowed)return;
    if(this.round?.game&&!['confirmed','waiting'].includes(this.round.game.state))return;
    const id=this.selected,generation=this.generation,epoch=this.epoch,connected=this.round?.game?.resourceId===id,roundId=this.round?.id;
    if(connected&&this.round.game.state!=='confirmed')return;this.copying=true;this.renderDetail();
    try{const value=await this.api(connected?'round-game-launch':'launch',connected?{roundId}:{resourceId:id});if(epoch!==this.epoch||generation!==this.generation)return;this.apply(value);await navigator.clipboard.writeText(value.targetUrl);if(epoch===this.epoch&&generation===this.generation)this.message('Raumlink kopiert.','success');}
    catch(error){this.failure(error);}finally{this.copying=false;this.renderDetail();}
  }
  async save(){
    this.syncAuth();if(this.saving||!this.selectedOffer()?.allowed||!this.ui['room-form'].reportValidity())return;
    const id=this.selected,epoch=this.epoch,generation=this.generation,targetUrl=this.ui['room-url'].value,pin=this.ui.pin.value;
    this.saving=true;this.message();this.renderDetail();
    try{
      await this.api('room-link',{resourceId:id,targetUrl,pin});if(epoch!==this.epoch||generation!==this.generation)return;
      this.dirty=false;this.generation++;this.roundGeneration++;const current=await this.resolve();if(current)this.message('Raumlink gespeichert.','success');
    }catch(error){this.failure(error);}
    finally{this.ui.pin.value='';this.saving=false;this.renderDetail();}
  }
  closeViewer(){this.ui['frame-slot'].replaceChildren();this.ui.viewer.hidden=true;this.ui['viewer-title'].textContent='';}
  dispose(){this.closed=true;clearTimeout(this.timer);this.epoch++;for(const abort of this.requests)abort.abort();this.requests.clear();this.roundClient.dispose();this.ui.pin.value='';this.closeViewer();}
}
if(typeof document!=='undefined')new GamesPage();
