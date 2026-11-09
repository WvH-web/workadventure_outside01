const $=id=>document.getElementById(id),errors={unauthorized:'Bitte erneut in WorkAdventure anmelden.',school_required:'Für dieses Konto besteht kein Schulzugang.',
  unavailable:'Das Atelier ist gerade nicht erreichbar.',session_expired:'Die Schulverbindung wird erneuert.',rate_limited:'Bitte kurz warten.',not_allowed:'Dieses Fenster gehört zu einem anderen Konto.'};
class ArtPage {
  constructor(){
    this.auth=undefined;this.epoch=0;this.closed=false;this.controllers=new Set();this.attempts=0;
    try{this.clientId=localStorage.getItem('castleArtClientId');if(!/^[a-f0-9-]{36}$/.test(this.clientId||'')){this.clientId=crypto.randomUUID();localStorage.setItem('castleArtClientId',this.clientId);}}catch{this.clientId=crypto.randomUUID();}
    $('board-select').onchange=()=>this.open($('board-select').value);$('reconnect').onclick=()=>void this.renew();
    window.addEventListener('storage',event=>{if(event.key==='authToken'||event.key===null){this.sync();void this.renew();}});
    window.addEventListener('online',()=>void this.renew());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void this.renew();});
    window.addEventListener('pagehide',()=>this.dispose(),{once:true});window.lucide?.createIcons();window.addEventListener('load',()=>window.lucide?.createIcons(),{once:true});
    this.sync();void this.renew();
  }
  token(){try{return localStorage.getItem('authToken');}catch{return null;}}
  sync(){
    const next=this.token();if(next===this.auth)return next;const previous=this.auth;this.auth=next;this.epoch++;
    for(const controller of this.controllers)controller.abort();this.controllers.clear();this.pending=null;this.value=null;clearTimeout(this.timer);this.clear();$('board-select').replaceChildren();$('board-select').disabled=true;$('role').textContent='';this.message();
    $('connection').textContent=next?'Schulzugang wird geprüft …':errors.unauthorized;
    if(previous&&!next)void fetch('/castle-art/leave',{method:'POST',credentials:'same-origin',keepalive:true,headers:{Authorization:'Bearer '+previous,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId})}).catch(()=>{});
    return next;
  }
  message(text=''){ $('message').textContent=text;$('message').hidden=!text; }
  clear(){this.frame?.remove();this.frame=null;$('empty').hidden=false;}
  open(id){
    const board=this.value?.boards.find(board=>board.id===id);if(!board)return;
    const url=new URL(board.path,location.origin);if(url.origin!==location.origin||url.pathname!=='/castle-art/wbo/boards/'+board.id||url.search!=='?lang=de')throw Error('board');
    this.selected=id;$('board-select').value=id;if(this.frame?.dataset.board===id)return;
    this.clear();const frame=document.createElement('iframe');frame.title=board.label;frame.dataset.board=id;frame.src=url.href;frame.referrerPolicy='no-referrer';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox');
    $('surface').append(frame);this.frame=frame;$('empty').hidden=true;
  }
  async renew(){
    this.sync();if(this.pending||this.closed||!this.auth)return this.pending;
    const epoch=this.epoch,token=this.auth,controller=new AbortController();this.controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),6500);
    const job=(async()=>{
      try{
        const response=await fetch('/castle-art/session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId})});
        const value=await response.json();if(this.closed||epoch!==this.epoch||token!==this.token())return;
        if(response.status===409&&value.error==='account_changed'){this.nextDelay=500+Math.random()*500;return;}
        if(!response.ok)throw Object.assign(Error(),{code:value.error||'unavailable'});
        if(value.version!==1||!Array.isArray(value.boards)||value.boards.length!==3||typeof value.generation!=='string'||typeof value.staff!=='boolean')throw Error('response');
        if(this.value?.generation!==value.generation)this.clear();this.value=value;this.attempts=0;this.message();
        const selected=this.selected;$('board-select').replaceChildren(...value.boards.map(board=>new Option(board.label,board.id)));$('board-select').disabled=false;
        $('connection').textContent='Verbunden';$('role').textContent=value.staff?'Lehrkraft':'';this.open(value.boards.some(board=>board.id===selected)?selected:value.boards[0].id);
      }catch(error){
        if(this.closed||epoch!==this.epoch||token!==this.token())return;
        this.clear();this.value=null;$('board-select').disabled=true;$('role').textContent='';const message=errors[error.code]||errors.unavailable;this.message(message);$('connection').textContent=message;
        this.nextDelay=Math.min(15000,1500*2**Math.min(++this.attempts,3))+Math.random()*1000;
      }finally{
        clearTimeout(timeout);this.controllers.delete(controller);
        if(epoch===this.epoch&&!this.closed){this.pending=null;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.renew(),this.nextDelay||13000+Math.random()*4000);this.nextDelay=null;}
      }
    })();this.pending=job;return job;
  }
  dispose(){this.closed=true;this.epoch++;clearTimeout(this.timer);for(const controller of this.controllers)controller.abort();this.controllers.clear();this.clear();}
}
new ArtPage();
