import {createParser} from '/castle-chess/vendor/eventsource-parser/dist/index.js';
import {BilliardsRenderer} from './renderer.js';
const errors={unauthorized:'Bitte erneut in WorkAdventure anmelden.',school_required:'Dieses Konto hat keinen Schulzugang.',preview_only:'Dieser Tisch ist noch in der geschuetzten Erprobung.',session_expired:'Die Verbindung wird wiederhergestellt.',
 connection_required:'Die Verbindung wird wiederhergestellt.',not_allowed:'Der Platz gehoert einem anderen Konto.',not_a_player:'Du schaust dieser Partie zu.',
 not_your_turn:'Du bist noch nicht am Zug.',waiting_for_player:'Wir warten auf den zweiten Mitspieler.',seat_occupied:'Der Platz ist inzwischen besetzt.',
 resume_required:'Dein Platz ist noch in einem anderen Fenster geoeffnet.',already_seated:'Du hast bereits einen Platz an einem anderen Tisch.',
 stale_position:'Der Spielstand hat sich inzwischen geaendert.',shot_in_progress:'Die Kugeln rollen noch.',invalid_shot:'Dieser Stoss ist nicht gueltig.',
 invalid_placement:'An dieser Stelle kann die weisse Kugel nicht liegen.',shot_not_allowed:'Zuerst muss die weisse Kugel eingesetzt werden.',placement_not_allowed:'Die weisse Kugel kann jetzt nicht versetzt werden.',
 staff_required:'Nur eine Lehrkraft kann den Tisch zuruecksetzen.',storage_unavailable:'Der Spielstand konnte nicht gespeichert werden. Der vorige Stand bleibt erhalten.',
 simulation_unavailable:'Die Spielberechnung ist gerade nicht erreichbar. Der vorige Stand bleibt erhalten.',rate_limited:'Bitte kurz warten.',session_limit:'Bitte ein anderes Billardfenster schliessen.',
 game_not_finished:'Diese Partie ist noch nicht beendet.',game_finished:'Diese Partie ist beendet.',unavailable:'Billard ist gerade nicht erreichbar.'};
const reasons={'No ball hit':'Keine Kugel getroffen','Cue ball potted':'Weisse Kugel versenkt','No cushion after contact':'Nach dem Kontakt keine Bande erreicht',
 'Wrong group hit first':'Zuerst die falsche Gruppe getroffen','Must hit 8-ball first':'Zuerst muss die Acht getroffen werden','Hitting the 8-ball first is a foul':'Die Acht zuerst getroffen',
 '8-ball pocketed early':'Die Acht wurde zu frueh versenkt','8-ball pocketed on foul':'Die Acht wurde bei einem Foul versenkt',resignation:'Partie aufgegeben'};
const cancelled=()=>Object.assign(Error(),{code:'cancelled'});
export class BilliardsPage {
 constructor(){
  this.ui=Object.fromEntries(['connection','message','camera','seat-0','seat-1','resume','leave-seat','self','status','groups','resign','rematch','reset','angle','angle-value','power','power-value','spin','shoot','place','confirm','confirm-title','spin-dialog','spin-x','spin-y','spin-clear'].map(id=>[id,document.getElementById(id)]));
  this.tableId=/^#table=tisch-[123]$/.test(location.hash)?location.hash.slice(7):'tisch-1';this.epoch=0;this.requests=new Set();this.retryMs=1500;this.allowed=false;this.connected=false;this.offset={x:0,y:0};
  this.renderer=new BilliardsRenderer(document.getElementById('table'),point=>this.point(point));
  this.renderer.onGraphics=ready=>{document.getElementById('graphics-state').hidden=ready;this.render();};
  for(let seat=0;seat<2;seat++)this.ui['seat-'+seat].onclick=()=>void this.command('claim',{seat});
  this.ui.resume.onclick=()=>void this.command('resume',{seat:this.state?.self.resumeSeat});
  this.ui['leave-seat'].onclick=()=>this.confirm('Deinen Platz freigeben?',()=>this.command('leave_seat'));
  this.ui.resign.onclick=()=>this.confirm('Diese Partie aufgeben?',()=>this.command('resign'));
  this.ui.rematch.onclick=()=>void this.command('rematch');this.ui.reset.onclick=()=>this.confirm('Den Tisch fuer alle zuruecksetzen?',()=>this.command('reset'));
  this.ui.camera.onclick=()=>this.renderer.toggle();
  this.ui.angle.oninput=()=>this.aim();this.ui.power.oninput=()=>this.aim();this.ui.shoot.onclick=()=>void this.command('shoot',{shot:{angle:Number(this.ui.angle.value)*Math.PI/180,power:Number(this.ui.power.value)/100*5.24,offset:{...this.offset}}});
  this.ui.place.onclick=()=>{if(this.placement)void this.command('place',{point:{...this.placement}});};
  this.ui.spin.onclick=()=>this.ui['spin-dialog'].showModal();this.ui['spin-clear'].onclick=()=>{this.ui['spin-x'].value='0';this.ui['spin-y'].value='0';};
  this.ui['spin-dialog'].addEventListener('close',()=>{const x=Number(this.ui['spin-x'].value)/100,y=Number(this.ui['spin-y'].value)/100,length=Math.hypot(x,y),scale=length>.45?.45/length:1;this.offset={x:x*scale,y:y*scale};});
  this.onStorage=event=>{if(event.key==='authToken'||event.key===null){this.syncAuth();void this.connect();}};
  this.onOnline=()=>void this.connect();this.onVisible=()=>{if(!document.hidden)void this.connect();};
  window.addEventListener('storage',this.onStorage);window.addEventListener('online',this.onOnline);document.addEventListener('visibilitychange',this.onVisible);window.addEventListener('pagehide',()=>this.dispose(),{once:true});
  window.lucide?.createIcons();window.addEventListener('load',()=>window.lucide?.createIcons(),{once:true});
  this.syncAuth();this.render();void this.connect();this.heartbeat=setInterval(()=>void this.ping(),15000);this.controlsTimer=setInterval(()=>this.render(),200);
 }
 token(){try{return localStorage.getItem('authToken');}catch{return null;}}
 syncAuth(){
  const token=this.token();if(token===this.auth)return;this.auth=token;this.epoch++;for(const controller of this.requests)controller.abort();this.requests.clear();this.stream?.abort();this.stream=null;
  clearTimeout(this.retry);this.session=null;this.state=null;this.pending=false;this.allowed=false;this.connected=false;this.connecting=null;this.placement=null;this.renderer.clear();
  if(this.ui.confirm.open)this.ui.confirm.close();if(this.ui['spin-dialog'].open)this.ui['spin-dialog'].close();this.ui.connection.textContent=token?'Schulzugang wird geprueft':errors.unauthorized;this.render();
 }
 async api(route,body,{signal}={}){
  this.syncAuth();const token=this.auth,epoch=this.epoch;if(!token)throw Object.assign(Error(),{code:'unauthorized'});
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,7000);signal?.addEventListener('abort',abort,{once:true});this.requests.add(controller);
  try{
   const response=await fetch('/castle-billiards/'+route,{method:body===undefined?'GET':'POST',cache:'no-store',credentials:'omit',signal:controller.signal,
    headers:{Authorization:'Bearer '+token,...(this.session?{'X-Billiards-Session':this.session}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const value=await response.json();if(this.closed||epoch!==this.epoch||token!==this.token())throw cancelled();
   if(!response.ok)throw Object.assign(Error(),{code:value.error||'unavailable'});return value;
  }catch(error){if(this.closed||epoch!==this.epoch||token!==this.token()||signal?.aborted)throw cancelled();throw error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.requests.delete(controller);}
 }
 accept(value){
  if(this.state?.serverId===value.serverId&&value.sequence<this.state.sequence)return;
  const changed=this.state?.board.state.version!==value.board.state.version;
  if(changed){const reason=value.board.state.reason;this.ui.message.textContent=reason?(reasons[reason]||'Foul'):'';this.ui.message.hidden=!reason;}
  this.state=value;this.renderer.accept(value);this.allowed=true;if(!value.board.state.ballInHand)this.placement=null;this.render();
 }
 failure(error){
  if(error.code==='cancelled')return;
  if(['unauthorized','school_required','preview_only','not_allowed'].includes(error.code)){this.allowed=false;this.connected=false;this.session=null;this.state=null;this.renderer.clear();this.stream?.abort();this.stream=null;}
  if(error.code==='session_expired'){this.session=null;this.connected=false;}
  this.ui.message.textContent=errors[error.code]||errors.unavailable;this.ui.message.hidden=false;this.render();
 }
 async connect(){
  this.syncAuth();if(this.closed||!this.auth||this.connecting||this.stream)return this.connecting;
  const epoch=this.epoch,task=(async()=>{try{
   if(!this.session){const value=await this.api('session',{tableId:this.tableId});this.session=value.sessionId;this.accept(value);}else this.accept(await this.api('ping',{}));
   if(this.closed||epoch!==this.epoch)return;const controller=new AbortController();this.stream=controller;void this.listen(controller,epoch);
  }catch(error){if(epoch===this.epoch){this.failure(error);this.schedule();}}})().finally(()=>{if(this.connecting===task)this.connecting=null;});this.connecting=task;return task;
 }
 schedule(){clearTimeout(this.retry);if(!this.closed&&this.auth)this.retry=setTimeout(()=>void this.connect(),this.retryMs);this.retryMs=Math.min(15000,this.retryMs*1.6);}
 async listen(controller,epoch){
  let reader;try{
   const response=await fetch('/castle-billiards/events',{cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:'Bearer '+this.auth,'X-Billiards-Session':this.session}});
   if(!response.ok){const value=await response.json();throw Object.assign(Error(),{code:value.error||'unavailable'});}
   if(!response.body||!response.headers.get('content-type')?.startsWith('text/event-stream'))throw Error('stream');
   const parser=createParser({maxBufferSize:4000000,onEvent:event=>{
    if(epoch!==this.epoch||controller.signal.aborted)return;if(event.event==='expired')throw Object.assign(Error(),{code:'session_expired'});
    if(event.event==='state'){this.connected=true;this.retryMs=1500;this.ui.connection.textContent='Verbunden';this.accept(JSON.parse(event.data));}
   },onError:error=>{throw error;}}),decoder=new TextDecoder();reader=response.body.getReader();
   while(!controller.signal.aborted&&!this.closed){const part=await reader.read();if(part.done)break;parser.feed(decoder.decode(part.value,{stream:true}));}
  }catch(error){if(epoch===this.epoch&&!controller.signal.aborted)this.failure(error);}
  finally{try{await reader?.cancel();}catch{}if(epoch===this.epoch&&this.stream===controller){this.stream=null;this.connected=false;this.ui.connection.textContent='Verbindung wird wiederhergestellt';this.render();this.schedule();}}
 }
 async ping(){this.syncAuth();if(this.closed||!this.auth)return;if(!this.session){void this.connect();return;}try{this.accept(await this.api('ping',{}));}catch(error){this.failure(error);if(!this.stream)void this.connect();}}
 async command(action,fields={}){
  if(this.pending||!this.connected||!this.state)return;this.pending=true;this.ui.message.hidden=true;this.render();
  try{const value=await this.api('command',{id:crypto.randomUUID(),action,version:this.state.board.state.version,...fields});this.accept(value);}
  catch(error){this.failure(error);if(error.code==='stale_position')try{this.accept(await this.api('state'));}catch(next){this.failure(next);}}
  finally{this.pending=false;this.render();}
 }
 point(point){
  if(!this.canAct())return;const state=this.state.board.state;
  if(state.ballInHand){this.placement=point;this.render();return;}
  const pos=state.balls[0].pos;this.ui.angle.value=String(Math.atan2(point.y-pos[1],point.x-pos[0])*180/Math.PI);this.aim();
 }
 canAct(){const value=this.state;return Boolean(value&&this.renderer.ready&&this.allowed&&this.connected&&!this.pending&&!value.board.busy&&
  !(value.board.animation&&value.board.animation.endsAt>Date.now()+this.renderer.clockOffset)&&value.board.state.winner===null&&
  value.self.seat===value.board.state.turn&&value.board.seats.every(seat=>seat.connected));}
 aim(){
  const angle=Number(this.ui.angle.value),power=Number(this.ui.power.value);this.ui['angle-value'].textContent=Math.round(angle)+'\u00b0';this.ui['power-value'].textContent=power+'%';
  this.renderer.aim(angle*Math.PI/180,power/100,this.canAct(),this.state?.board.state.ballInHand?this.placement:null);
 }
 render(){
  const value=this.state,available=Boolean(this.connected&&this.allowed&&!this.pending),state=value?.board.state;
  for(let seat=0;seat<2;seat++){const button=this.ui['seat-'+seat],taken=value?.board.seats[seat];button.disabled=!available||Boolean(taken?.occupied);button.dataset.own=String(value?.self.seat===seat);button.textContent='Platz '+(seat+1)+(taken?.occupied?(taken.connected?' \u00b7 belegt':' \u00b7 reserviert'):'');}
  this.ui.resume.hidden=value?.self.resumeSeat===null||value?.self.resumeSeat===undefined;this.ui.resume.disabled=!available;
  this.ui['leave-seat'].hidden=value?.self.seat===null||value?.self.seat===undefined;this.ui['leave-seat'].disabled=!available;
  this.ui.self.textContent=value?.self.seat!==null&&value?.self.seat!==undefined?'Du: '+(value.self.seat+1):value?'Zuschauer':'';
  const rolling=Boolean(value?.board.animation&&value.board.animation.endsAt>Date.now()+this.renderer.clockOffset);
  this.ui.status.textContent=!value?'Keine Partie geoeffnet':state.winner!==null?'Platz '+(state.winner+1)+' gewinnt':value.board.busy?'Stoss wird berechnet':rolling?'Kugeln rollen':!value.board.seats.every(seat=>seat.connected)?'Warten auf Mitspieler':state.ballInHand?'Platz '+(state.turn+1)+': weisse Kugel setzen':'Platz '+(state.turn+1)+' ist am Zug';
  this.ui.groups.textContent=state?.groups[0]?'1: '+(state.groups[0]===1?'Volle':'Halbe')+' \u00b7 2: '+(state.groups[1]===1?'Volle':'Halbe'):'';
  this.ui.resign.disabled=!available||value?.self.seat===null||value?.self.seat===undefined||state?.winner!==null||rolling||value?.board.busy;
  this.ui.rematch.hidden=state?.winner===null||!state;this.ui.rematch.disabled=!available||value?.self.seat===null;this.ui.rematch.textContent=value?.board.rematch.includes(value.self.seat)?'Zustimmung steht':'Neue Partie';
  this.ui.reset.hidden=!value?.self.staff;this.ui.reset.disabled=!available;
  const can=this.canAct();for(const id of ['angle','power','spin'])this.ui[id].disabled=!can||state.ballInHand;
  this.ui.shoot.disabled=!can||state.ballInHand;this.ui.place.hidden=!state?.ballInHand;this.ui.place.disabled=!can||!this.placement;
  this.aim();
 }
 confirm(title,run){this.ui['confirm-title'].textContent=title;this.ui.confirm.returnValue='';this.ui.confirm.addEventListener('close',()=>{if(this.ui.confirm.returnValue==='yes')void run();},{once:true});this.ui.confirm.showModal();}
 dispose(){if(this.closed)return;this.closed=true;clearInterval(this.heartbeat);clearInterval(this.controlsTimer);clearTimeout(this.retry);this.stream?.abort();for(const controller of this.requests)controller.abort();
  window.removeEventListener('storage',this.onStorage);window.removeEventListener('online',this.onOnline);document.removeEventListener('visibilitychange',this.onVisible);this.renderer.dispose();}
}
try{window.castleBilliards=new BilliardsPage();}catch{
 document.getElementById('connection').textContent='3D-Grafik nicht verfuegbar';const message=document.getElementById('message');message.hidden=false;message.textContent='Die 3D-Ansicht konnte in diesem Browser nicht gestartet werden.';
}
