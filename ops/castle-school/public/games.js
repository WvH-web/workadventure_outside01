const ids=['stumbleguysgame','haxballarea01','gamesarea01','gamesarea02','gamesarea03','gamesarea04','gamesarea05'];
const labels={ready:'Freigegeben',preview:'Lehrkraft-Vorschau',restricted:'Nicht freigegeben',not_configured:'Noch nicht eingerichtet'};
const errors={unauthorized:'Bitte erneut in WorkAdventure anmelden.',not_allowed:'Dieses Angebot ist f\u00fcr dein Konto nicht freigegeben.',
  wrong_pin:'Die Moderator-PIN stimmt nicht.',unreviewed_target:'Der neue Link liegt au\u00dferhalb des freigegebenen Anbieterbereichs.',
  invalid_request:'Bitte Raumlink und PIN pr\u00fcfen.',rate_limited:'Zu viele Anfragen. Bitte kurz warten.',
  unavailable:'Die Spielrunden sind gerade nicht erreichbar.','popup_blocked':'Das neue Fenster wurde vom Browser blockiert.'};
const icon=name=>{const element=document.createElement('i');element.dataset.lucide=name;element.setAttribute('aria-hidden','true');return element;};
const icons=()=>window.lucide?.createIcons();
class GamesPage {
  constructor(){
    this.ui=Object.fromEntries(['account','message','games-list','offer-select','detail-title','mode','availability','lobby','current-url','copy','join','external','host','room-form','room-url','pin','save','refresh','viewer','viewer-title','frame-slot','close-viewer'].map(id=>[id,document.getElementById(id)]));
    this.auth=undefined;this.epoch=0;this.generation=0;this.offers=[];this.requests=new Set();this.closed=false;this.nextContext=0;
    this.ui.refresh.addEventListener('click',()=>void this.refresh());
    this.ui['offer-select'].addEventListener('change',()=>void this.select(this.ui['offer-select'].value));
    this.ui.join.addEventListener('click',()=>void this.join(false));this.ui.external.addEventListener('click',()=>void this.join(true));
    this.ui.copy.addEventListener('click',()=>void this.copy());this.ui['close-viewer'].addEventListener('click',()=>this.closeViewer());
    this.ui['room-url'].addEventListener('input',()=>{this.dirty=true;});this.ui['room-form'].addEventListener('submit',event=>{event.preventDefault();void this.save();});
    window.addEventListener('storage',event=>{if(event.key==='authToken'||event.key===null){this.syncAuth();void this.refresh();}});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void this.refresh();});
    window.addEventListener('pagehide',()=>this.dispose(),{once:true});
    this.syncAuth();this.timer=setTimeout(()=>void this.tick(),Math.random()*600);icons();window.addEventListener('load',icons,{once:true});
  }
  token(){try{return localStorage.getItem('authToken');}catch{return null;}}
  syncAuth(){
    const token=this.token();if(token===this.auth)return token;
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
    this.ui.join.disabled=!ready||this.joining;this.ui.copy.disabled=!ready||this.copying;
    this.ui.external.hidden=offer?.presentation!=='side';this.ui.external.disabled=!ready||this.joining;
    this.ui.save.disabled=!ready||this.saving;
  }
  async context(){
    if(this.contextPending)return this.contextPending;
    const job=(async()=>{
      try{
        const value=await this.api('context');
        if(!Array.isArray(value.offers)||value.offers.length!==7||!value.offers.every(offer=>ids.includes(offer.id)))throw Error('response');
        const changed=JSON.stringify(value.offers)!==JSON.stringify(this.offers);this.offers=value.offers;this.nextContext=Date.now()+15000;
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
    const id=this.selected,epoch=this.epoch,generation=this.generation;if(!this.selectedOffer()?.allowed)return;
    if(this.resolvePending?.id===id&&this.resolvePending.generation===generation)return this.resolvePending.job;
    const job=(async()=>{
      try{
        const value=await this.api('launch',{resourceId:id});if(epoch!==this.epoch||generation!==this.generation||id!==this.selected)return;
        this.apply(value);return value;
      }catch(error){if(epoch===this.epoch&&generation===this.generation){this.current=null;this.closeViewer();this.renderDetail();this.failure(error);}}
    })().finally(()=>{if(this.resolvePending?.job===job)this.resolvePending=null;});
    this.resolvePending={id,generation,job};return job;
  }
  apply(value){
    const url=new URL(value.targetUrl);if(value.id!==this.selected||url.protocol!=='https:'||url.origin===location.origin)throw Error('response');
    this.current=value;if(!this.dirty)this.ui['room-url'].value=value.targetUrl;this.renderDetail();
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
  async join(external){
    this.syncAuth();if(this.joining||!this.selectedOffer()?.allowed)return;
    const id=this.selected,generation=this.generation,epoch=this.epoch;
    const useTab=external||this.selectedOffer().presentation==='external';
    let popup;if(useTab){popup=window.open('about:blank','_blank');if(!popup){this.failure({code:'popup_blocked'});return;}popup.opener=null;popup.document.title='Spielrunde';popup.document.body.textContent='Freigabe wird gepr\u00fcft \u2026';}
    this.joining=true;this.message();this.renderDetail();
    try{
      const value=await this.api('launch',{resourceId:id});
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
    const id=this.selected,generation=this.generation,epoch=this.epoch;this.copying=true;this.renderDetail();
    try{const value=await this.api('launch',{resourceId:id});if(epoch!==this.epoch||generation!==this.generation)return;this.apply(value);await navigator.clipboard.writeText(value.targetUrl);if(epoch===this.epoch&&generation===this.generation)this.message('Raumlink kopiert.','success');}
    catch(error){this.failure(error);}finally{this.copying=false;this.renderDetail();}
  }
  async save(){
    this.syncAuth();if(this.saving||!this.selectedOffer()?.allowed||!this.ui['room-form'].reportValidity())return;
    const id=this.selected,epoch=this.epoch,generation=this.generation,targetUrl=this.ui['room-url'].value,pin=this.ui.pin.value;
    this.saving=true;this.message();this.renderDetail();
    try{
      await this.api('room-link',{resourceId:id,targetUrl,pin});if(epoch!==this.epoch||generation!==this.generation)return;
      this.dirty=false;this.generation++;const current=await this.resolve();if(current)this.message('Raumlink gespeichert.','success');
    }catch(error){this.failure(error);}
    finally{this.ui.pin.value='';this.saving=false;this.renderDetail();}
  }
  closeViewer(){this.ui['frame-slot'].replaceChildren();this.ui.viewer.hidden=true;this.ui['viewer-title'].textContent='';}
  dispose(){this.closed=true;clearTimeout(this.timer);this.epoch++;for(const abort of this.requests)abort.abort();this.requests.clear();this.ui.pin.value='';this.closeViewer();}
}
new GamesPage();
