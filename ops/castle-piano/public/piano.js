import {PianoProjection} from './projection.js';
import {PianoAudio,noteName} from './audio.js';
const $=id=>document.getElementById(id),messages={unauthorized:'Bitte erneut in WorkAdventure anmelden.',school_required:'F\u00fcr dieses Konto besteht kein Schulzugang.',
  unavailable:'Das Klavier ist gerade nicht erreichbar.',session_expired:'Die Schulverbindung wird erneuert.',rate_limited:'Bitte kurz warten.',
  session_in_use:'Das Klavier ist bereits in einem anderen Fenster ge\u00f6ffnet.',room_full:'Am Klavier spielen schon acht Personen.',
  not_allowed:'Dieses Fenster geh\u00f6rt zu einem anderen Konto.',account_changed:'Der Schulzugang hat sich ge\u00e4ndert.'};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const keyboardNotes={KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12};
const colors=['#d9ac55','#66b8a0','#db819b','#82a8dc','#b9a0de','#c1c95e','#66bdcc','#d38b68'];
class PianoPage{
  constructor(){
    this.mode='together';this.audio=new PianoAudio();this.epoch=0;this.request=0;this.pointers=new Map();this.keys=new Map();this.base=60;this.started=false;this.closed=false;
    this.clientId=crypto.randomUUID();
    $('start').onclick=()=>void this.start();$('takeover').onclick=()=>void this.authorize(true);$('reconnect').onclick=()=>void this.authorize();
    $('modes').onchange=event=>{if(event.target.name==='mode'){this.mode=event.target.value;this.reset();this.value=null;this.controls();void this.authorize();}};
    $('volume').oninput=()=>this.audio.setVolume(Number($('volume').value)/100);
    $('lower').onclick=()=>this.register(-12);$('higher').onclick=()=>this.register(12);
    $('pedal').onchange=()=>this.send({type:'pedal',down:$('pedal').checked});$('clear').onclick=()=>this.clear();$('panic').onclick=()=>void this.panic();
    const board=$('keyboard');board.onpointerdown=event=>{
      const note=this.targetNote(event.target);if(!this.playable()||note===null)return;event.preventDefault();board.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,note);this.down(note);
    };
    board.onpointermove=event=>{
      if(!this.pointers.has(event.pointerId))return;const old=this.pointers.get(event.pointerId),note=this.targetNote(document.elementFromPoint(event.clientX,event.clientY));
      if(old===note)return;this.pointers.set(event.pointerId,note);this.upIfUnused(old);if(note!==null)this.down(note);
    };
    const release=event=>{if(!this.pointers.has(event.pointerId))return;const note=this.pointers.get(event.pointerId);this.pointers.delete(event.pointerId);this.upIfUnused(note);};
    board.onpointerup=release;board.onpointercancel=release;board.onlostpointercapture=release;
    board.onkeydown=event=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;let note;
      if(event.code==='Space'||event.code==='Enter')note=this.targetNote(event.target);else if(Object.hasOwn(keyboardNotes,event.code))note=this.base+keyboardNotes[event.code];
      if(!this.playable()||note===undefined||note===null||note>84)return;event.preventDefault();if(event.repeat||this.keys.has(event.code))return;this.keys.set(event.code,note);this.down(note);
    };
    window.addEventListener('keyup',event=>{const note=this.keys.get(event.code);if(note===undefined)return;this.keys.delete(event.code);this.upIfUnused(note);});
    board.addEventListener('focusout',event=>{if(!board.contains(event.relatedTarget))this.clear();});
    window.addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();else void this.authorize();});
    window.addEventListener('storage',event=>{if(event.key==='authToken'||event.key===null){this.syncAuth();void this.authorize();}});
    window.addEventListener('online',()=>void this.authorize());window.addEventListener('offline',()=>{this.reset();this.value=null;this.controls();this.message(messages.unavailable);});
    window.addEventListener('pagehide',()=>this.dispose(),{once:true});
    this.media=matchMedia('(max-width:520px)');this.media.addEventListener('change',()=>{this.clear();this.buildKeyboard();});
    this.poll=setInterval(()=>{if(this.syncAuth())void this.authorize();},1000);
    this.hold=setInterval(()=>{if(this.playable()&&this.mode==='together')this.send({type:'hold',notes:[...this.held()]});},3000);
    window.addEventListener('load',()=>window.lucide?.createIcons(),{once:true});window.lucide?.createIcons();
    this.buildKeyboard();this.syncAuth();void this.authorize();
  }
  token(){try{return localStorage.getItem('authToken');}catch{return null;}}
  syncAuth(){
    const next=this.token();if(next===this.auth)return false;const old=this.auth;this.auth=next;this.epoch++;this.request++;this.controller?.abort();
    clearTimeout(this.timer);clearTimeout(this.expiry);this.reset();this.value=null;this.started=false;this.audio.dispose();this.audio=new PianoAudio();
    this.audio.setVolume(Number($('volume').value)/100);this.audioError=null;this.message();$('takeover').hidden=true;this.controls();$('connection').textContent=next?'Schulzugang wird gepr\u00fcft \u2026':messages.unauthorized;
    if(old&&!next)void this.leave(old);return true;
  }
  message(text=''){ $('message').textContent=text;$('message').hidden=!text; }
  validContext(value){return value?.version===1&&uuid.test(value.serverId)&&uuid.test(value.voiceId)&&/^[a-f0-9]{24}$/.test(value.generation)&&
    value.mode===this.mode&&value.room?.id==='musiksalon'&&value.range?.min===48&&value.range?.max===84&&typeof value.staff==='boolean'&&value.leaseMs>0&&value.leaseMs<=45000;}
  async authorize(takeover=false){
    this.syncAuth();if(this.closed||!this.auth)return;
    const epoch=this.epoch,token=this.auth,attempt=++this.request,mode=this.mode,start=Date.now();this.controller?.abort();clearTimeout(this.timer);
    const controller=new AbortController();this.controller=controller;const timeout=setTimeout(()=>controller.abort(),6500);
    try{
      const response=await fetch('./session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId,roomId:'musiksalon',mode,takeover})});
      const value=await response.json();if(this.closed||epoch!==this.epoch||attempt!==this.request||token!==this.token())return;
      if(!response.ok)throw Object.assign(Error(),{code:value.error||'unavailable'});if(!this.validContext(value))throw Error('response');
      if(this.value?.generation!==value.generation){this.reset();this.value=value;this.projection=new PianoProjection(value);}else this.value=value;
      this.attempts=0;this.message(this.audioError||'');$('takeover').hidden=true;$('role').textContent=value.staff?'Lehrkraft':'';
      clearTimeout(this.expiry);this.expiry=setTimeout(()=>{this.reset();this.value=null;this.controls();this.message(messages.session_expired);void this.authorize();},Math.max(0,start+value.leaseMs-Date.now()));
      if(this.started&&this.audio.ready){if(this.mode==='practice')this.render();else if(!this.socket)this.connect();}
      $('connection').textContent=this.mode==='practice'?'Allein \u00fcben':this.connected?'Gemeinsam verbunden':'Bereit';this.controls();
      this.timer=setTimeout(()=>void this.authorize(),Math.min(20000,Math.max(1000,value.leaseMs/2)));
    }catch(error){
      if(this.closed||epoch!==this.epoch||attempt!==this.request||token!==this.token())return;
      this.reset();this.value=null;this.controls();this.message(messages[error.code]||messages.unavailable);$('connection').textContent='Nicht verbunden';
      const busy=error.code==='session_in_use';$('takeover').hidden=!busy;
      if(!busy)this.timer=setTimeout(()=>void this.authorize(),Math.min(15000,1500*2**Math.min(this.attempts=(this.attempts||0)+1,3))+Math.random()*500);
    }finally{clearTimeout(timeout);if(this.controller===controller)this.controller=null;}
  }
  async start(){
    if(!this.value||this.closed)return;const epoch=this.epoch,generation=this.value.generation;$('start').disabled=true;$('connection').textContent='Klavierklang wird geladen \u2026';
    try{await this.audio.unlock();if(this.closed||epoch!==this.epoch||generation!==this.value?.generation)return;
      this.audioError=null;this.message();this.started=true;if(this.mode==='practice'){this.render();$('connection').textContent='Allein \u00fcben';}else this.connect();this.controls();
    }catch(error){if(epoch===this.epoch){console.warn('Piano audio unavailable:',error);this.started=false;this.audioError='Der Klavierklang konnte nicht geladen werden. Bitte erneut versuchen.';this.message(this.audioError);this.controls();}}
  }
  connect(){
    if(!this.value||this.socket||this.closed||this.mode!=='together')return;
    const generation=this.value.generation,epoch=this.epoch,ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/castle-piano/socket',['castle-piano-v1','visit.'+generation]);this.socket=ws;
    const current=()=>!this.closed&&this.socket===ws&&this.epoch===epoch&&this.value?.generation===generation;
    const timeout=setTimeout(()=>{if(current())ws.close();},6000);$('connection').textContent='Verbindung zum Klavier \u2026';
    ws.onmessage=event=>{
      if(!current())return;let value;try{value=JSON.parse(event.data);}catch{ws.close();return;}
      if(value.type==='error'){this.message(messages[value.code]||messages.unavailable);this.clear(false);ws.close();return;}
      if(!this.projection.accept(value)){ws.close();return;}clearTimeout(timeout);this.connected=true;this.message();$('connection').textContent='Gemeinsam verbunden';this.render();this.controls();
    };
    ws.onclose=()=>{clearTimeout(timeout);if(!current())return;this.socket=null;this.connected=false;this.pointers.clear();this.keys.clear();this.projection=new PianoProjection(this.value);this.audio.release();this.render();this.controls();
      $('connection').textContent='Verbindung wird erneuert \u2026';clearTimeout(this.timer);this.timer=setTimeout(()=>void this.authorize(),1500+Math.random()*500);};
    ws.onerror=()=>{};
  }
  playable(){return Boolean(this.value&&this.started&&this.audio.ready&&(this.mode==='practice'||this.connected));}
  controls(){
    const active=this.playable();$('modes').disabled=!this.value;$('start').disabled=!this.value;$('start').hidden=active;
    $('keyboard').setAttribute('aria-disabled',String(!active));for(const button of $('keyboard').children)button.disabled=!active;
    $('pedal').disabled=!active;$('clear').disabled=!active;$('panic').hidden=!this.value?.staff||!active;
    $('lower').disabled=!this.value||this.base<=48;$('higher').disabled=!this.value||this.base>=(this.media.matches?72:60);
  }
  held(){return new Set([...this.pointers.values(),...this.keys.values()].filter(note=>note!==null));}
  targetNote(target){const button=target?.closest?.('button[data-note]');return button&&$('keyboard').contains(button)?Number(button.dataset.note):null;}
  down(note){if(this.held().size>8)return;this.send({type:'down',note,velocity:90});}
  upIfUnused(note){if(note!==null&&!this.held().has(note))this.send({type:'up',note});}
  send(value){
    if(!this.playable())return;const command={id:crypto.randomUUID(),...value};
    try{this.projection.command(command);if(this.mode==='together'){if(this.socket?.readyState!==WebSocket.OPEN)throw Error();this.socket.send(JSON.stringify(command));}this.render();}
    catch{this.reset();this.value=null;this.controls();void this.authorize();}
  }
  clear(send=true){this.pointers.clear();this.keys.clear();$('pedal').checked=false;if(send&&this.playable())this.send({type:'clear'});else this.audio.release();}
  reset(){
    const ws=this.socket;this.socket=null;this.connected=false;ws?.close();this.pointers.clear();this.keys.clear();this.audio.release();
    this.projection?.clear();this.projection=null;$('pedal').checked=false;$('players').replaceChildren();for(const key of $('keyboard').children)key.classList.remove('active','peer');
  }
  render(){
    if(!this.projection)return;const state=this.projection.view();this.audio.render(state);const own=state.members.find(member=>member.voiceId===this.value.voiceId);
    $('pedal').checked=Boolean(own?.pedal);
    for(const button of $('keyboard').children){const note=Number(button.dataset.note);button.classList.toggle('active',Boolean(own?.keys.some(key=>key.note===note)));
      button.classList.toggle('peer',state.members.some(member=>member!==own&&member.keys.some(key=>key.note===note)));}
    $('players').replaceChildren(...state.members.map((member,index)=>{const element=document.createElement('span');element.className='player';
      const dot=document.createElement('span');dot.className='dot color-'+colors.indexOf(member.color);element.append(dot,member===own?'Du':'Klavier '+(index+1));return element;}));
  }
  register(delta){this.clear();this.base=Math.max(48,Math.min(this.media.matches?72:60,this.base+delta));this.buildKeyboard();}
  buildKeyboard(){
    if(!this.media.matches&&this.base>60)this.base=60;
    const end=Math.min(84,this.base+(this.media.matches?12:24)),nodes=[];let whites=0;
    for(let note=this.base;note<=end;note++){
      const black=[1,3,6,8,10].includes(note%12),button=document.createElement('button');button.type='button';button.dataset.note=note;button.setAttribute('aria-label',noteName(note));
      button.className=black?'black b'+whites:'white';if(!black){whites++;if(note%12===0)button.textContent=noteName(note);}nodes.push(button);
    }
    $('keyboard').replaceChildren(...nodes);$('octave-label').textContent=noteName(this.base);$('register').textContent=noteName(this.base)+' \u2013 '+noteName(end);this.controls();this.render();
  }
  async panic(){
    if(!this.value?.staff)return;const epoch=this.epoch;
    try{const response=await fetch('./panic',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{Authorization:'Bearer '+this.auth,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId,roomId:'musiksalon'})});
      if(!response.ok)throw Error();if(epoch===this.epoch)this.clear();}catch{if(epoch===this.epoch)this.message(messages.unavailable);}
  }
  leave(token=this.auth){if(!token)return;return fetch('./leave',{method:'POST',credentials:'same-origin',keepalive:true,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId})}).catch(()=>{});}
  dispose(){if(this.closed)return;void this.leave();this.closed=true;this.epoch++;this.request++;this.controller?.abort();for(const timer of [this.timer,this.expiry])clearTimeout(timer);clearInterval(this.poll);clearInterval(this.hold);this.reset();this.audio.dispose();}
}
new PianoPage();
