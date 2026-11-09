import {Chess} from './vendor/chess/chess.mjs';
import {Chessboard,COLOR,INPUT_EVENT_TYPE} from './vendor/cm-chessboard/src/Chessboard.js';
import {Markers,MARKER_TYPE} from './vendor/cm-chessboard/src/extensions/markers/Markers.js';
import {PromotionDialog,PROMOTION_DIALOG_RESULT_TYPE} from './vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js';
import {createParser} from './vendor/eventsource-parser/dist/index.js';
import {puzzles,puzzleById} from './training.js';

const errors={unauthorized:'Bitte erneut in WorkAdventure anmelden.',school_required:'Für dieses Konto besteht kein Schulzugang.',
  session_expired:'Die Verbindung wird wiederhergestellt.',connection_required:'Die Verbindung wird wiederhergestellt.',
  not_your_turn:'Du bist noch nicht am Zug.',illegal_move:'Dieser Zug ist nicht erlaubt.',stale_position:'Die Stellung hat sich inzwischen geändert.',
  seat_occupied:'Dieser Platz ist inzwischen besetzt.',already_seated:'Du hast bereits einen Platz an einem anderen Tisch.',
  resume_required:'Dein Platz ist in einem anderen Fenster geöffnet.',waiting_for_player:'Wir warten auf den zweiten Mitspieler.',
  not_a_player:'Du schaust dieser Partie zu.',staff_required:'Nur eine Lehrkraft kann den Tisch zurücksetzen.',
  storage_unavailable:'Der Zug konnte nicht gespeichert werden. Die bisherige Stellung bleibt erhalten.',
  rate_limited:'Bitte kurz warten.',session_limit:'Zu viele offene Schachfenster. Bitte ein anderes Fenster schließen.',
  unavailable:'Schach ist gerade nicht erreichbar.',not_allowed:'Dieser Platz gehört zu einem anderen Konto.'};
const statuses={free:'frei',waiting:'wartet',playing:'läuft',finished:'beendet',paused:'pausiert'};
const reasons={checkmate:'Schachmatt',stalemate:'Patt',material:'Unzureichendes Material',repetition:'Stellungswiederholung',fifty_moves:'50-Züge-Regel',move_limit:'Zuggrenze',resignation:'Aufgabe',agreement:'Remis vereinbart'};
const colorName=color=>color==='w'?'Weiß':'Schwarz';
const icons=()=>window.lucide?.createIcons();
const cancelled=()=>Object.assign(Error(),{code:'cancelled'});

class ChessPage {
  constructor(){
    this.boundTable=/^#table=tisch-[123]$/.test(location.hash)?location.hash.slice(7):null;
    this.ui=Object.fromEntries(['connection','message','table','table-bar','presence','puzzle','puzzle-bar','top-seat','your-color','position-status','flip','white','black','resume','leave-seat','seat-actions','move-form','move-from','move-to','move-promotion','submit-move','game-title','result','moves','online-actions','offer-draw','draw-offer','accept-draw','decline-draw','resign','rematch','reset','undo','restart','pgn','confirm','confirm-title'].map(id=>[id,document.getElementById(id)]));
    this.mode='online';this.local=new Chess();this.puzzle=puzzles[0];this.epoch=0;this.auth=undefined;this.requests=new Set();this.orientation='w';this.closed=false;this.retryMs=1500;
    this.board=new Chessboard(document.getElementById('board'),{position:this.local.fen(),assetsUrl:'/castle-chess/vendor/cm-chessboard/assets/',
      style:{cssClass:'green',aspectRatio:1,animationDuration:0},extensions:[{class:Markers,props:{autoMarkers:null}},{class:PromotionDialog,props:{language:'de'}}]});
    this.handler=event=>this.input(event);
    for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>void this.setMode(button.dataset.mode));
    this.ui.table.addEventListener('change',()=>void this.command('watch',{tableId:this.ui.table.value}));
    this.ui.puzzle.replaceChildren(...puzzles.map(puzzle=>new Option(puzzle.name,puzzle.id)));
    this.ui.puzzle.addEventListener('change',()=>{this.puzzle=puzzleById(this.ui.puzzle.value);this.newLocal();});
    for(const color of ['w','b'])this.ui[color==='w'?'white':'black'].onclick=()=>void this.command('claim',{color});
    this.ui.resume.onclick=()=>void this.command('resume',{color:this.state?.self.resumeColor});
    this.ui['leave-seat'].onclick=()=>void this.confirm('Deinen Platz freigeben?',()=>this.command('leave_seat'));
    this.ui['offer-draw'].onclick=()=>void this.command('offer_draw');this.ui['accept-draw'].onclick=()=>void this.command('accept_draw');this.ui['decline-draw'].onclick=()=>void this.command('decline_draw');
    this.ui.resign.onclick=()=>void this.confirm('Diese Partie aufgeben?',()=>this.command('resign'));
    this.ui.rematch.onclick=()=>void this.command('rematch');this.ui.reset.onclick=()=>void this.confirm('Die Partie für alle zurücksetzen?',()=>this.command('reset'));
    this.ui.flip.onclick=()=>{this.orientation=this.orientation==='w'?'b':'w';this.renderBoard(true);};
    this.ui.undo.onclick=()=>{this.local.undo();this.message();this.render();};
    this.ui.restart.onclick=()=>void this.confirm('Neu beginnen?',async()=>{this.newLocal();});
    this.ui.pgn.onclick=()=>void this.download();
    this.ui['move-from'].onchange=()=>this.renderMoveOptions();
    this.ui['move-to'].onchange=()=>this.renderMoveOptions(false);
    this.ui['move-form'].onsubmit=event=>{event.preventDefault();const from=this.ui['move-from'].value,to=this.ui['move-to'].value;
      const move=this.game().moves({square:from,verbose:true}).find(move=>move.to===to&&(!move.promotion||move.promotion===this.ui['move-promotion'].value));if(move)void this.play(move);};
    window.addEventListener('storage',event=>{if(event.key==='authToken'||event.key===null){this.syncAuth();void this.connect();}});
    window.addEventListener('online',()=>void this.connect());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void this.connect();});
    window.addEventListener('pagehide',()=>this.dispose(),{once:true});icons();window.addEventListener('load',icons,{once:true});
    this.syncAuth();this.render();void this.connect();this.timer=setInterval(()=>void this.heartbeat(),15000);
  }
  token(){try{return localStorage.getItem('authToken');}catch{return null;}}
  syncAuth(){
    const token=this.token();if(token===this.auth)return token;
    this.auth=token;this.epoch++;for(const controller of this.requests)controller.abort();this.requests.clear();this.stream?.abort();this.stream=null;
    clearTimeout(this.retry);this.session=null;this.state=null;this.connected=false;this.allowed=false;this.pending=false;this.connecting=null;this.mode='online';this.local=new Chess();this.orientation='w';
    this.closePromotion();if(this.ui.confirm.open)this.ui.confirm.close('cancel');this.message();this.render();
    this.ui.connection.textContent=token?'Schulzugang wird geprüft …':errors.unauthorized;return token;
  }
  async api(route,body,{signal,session=true}={}){
    const token=this.syncAuth(),epoch=this.epoch;if(!token)throw Object.assign(Error(),{code:'unauthorized'});
    const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,7000);signal?.addEventListener('abort',abort,{once:true});this.requests.add(controller);
    try{
      const response=await fetch('/castle-chess/'+route,{method:body===undefined?'GET':'POST',cache:'no-store',credentials:'omit',signal:controller.signal,
        headers:{Authorization:'Bearer '+token,...(session&&this.session?{'X-Chess-Session':this.session}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const value=route==='pgn'&&response.ok?await response.text():await response.json();
      if(this.closed||epoch!==this.epoch||token!==this.token())throw cancelled();
      if(!response.ok)throw Object.assign(Error(),{code:value.error||'unavailable'});return value;
    }catch(error){if(this.closed||epoch!==this.epoch||token!==this.token()||signal?.aborted)throw cancelled();throw error;}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.requests.delete(controller);}
  }
  message(text='',tone='error'){this.ui.message.textContent=text;this.ui.message.hidden=!text;this.ui.message.dataset.tone=tone;}
  failure(error){
    if(error.code==='cancelled')return;
    if(['unauthorized','school_required','not_allowed'].includes(error.code)){
      this.allowed=false;this.connected=false;this.stream?.abort();this.state=null;this.session=null;this.local=new Chess();this.closePromotion();if(this.ui.confirm.open)this.ui.confirm.close('cancel');
      this.ui.connection.textContent=errors[error.code];
    }
    if(error.code==='session_expired'){this.session=null;this.connected=false;}
    this.message(errors[error.code]||errors.unavailable);this.render();
  }
  async connect(){
    this.syncAuth();if(this.closed||!this.auth||this.connecting||this.stream)return this.connecting;
    const epoch=this.epoch,job=(async()=>{
      try{
        if(!this.session){const value=await this.api('session',this.boundTable?{tableId:this.boundTable}:{}, {session:false});this.session=value.sessionId;this.state=null;this.accept(value);}
        else this.accept(await this.api('ping',{}));
        if(epoch!==this.epoch||this.closed)return;
        this.allowed=true;const controller=new AbortController();this.stream=controller;void this.listen(controller,epoch);this.render();
      }catch(error){if(epoch===this.epoch){this.failure(error);this.schedule();}}
    })().finally(()=>{if(this.connecting===job)this.connecting=null;});this.connecting=job;return job;
  }
  schedule(){clearTimeout(this.retry);if(!this.closed&&this.auth)this.retry=setTimeout(()=>void this.connect(),this.retryMs);this.retryMs=Math.min(15000,this.retryMs*1.6);}
  async listen(controller,epoch){
    let reader;
    try{
      const response=await fetch('/castle-chess/events',{cache:'no-store',credentials:'omit',signal:controller.signal,
        headers:{Authorization:'Bearer '+this.auth,'X-Chess-Session':this.session}});
      if(!response.ok){const value=await response.json();throw Object.assign(Error(),{code:value.error||'unavailable'});}
      if(!response.body||!response.headers.get('content-type')?.startsWith('text/event-stream'))throw Error();
      const parser=createParser({maxBufferSize:32768,onEvent:event=>{
        if(controller.signal.aborted||epoch!==this.epoch)return;
        if(event.event==='expired')throw Object.assign(Error(),{code:'session_expired'});
        if(event.event==='state'){this.connected=true;this.allowed=true;this.retryMs=1500;this.accept(JSON.parse(event.data));this.ui.connection.textContent='Verbunden';}
      },onError:error=>{throw error;}}),decoder=new TextDecoder();reader=response.body.getReader();
      while(!this.closed&&!controller.signal.aborted){const {value,done}=await reader.read();if(done)break;parser.feed(decoder.decode(value,{stream:true}));}
    }catch(error){if(!controller.signal.aborted&&epoch===this.epoch)this.failure(error);}
    finally{
      try{await reader?.cancel();}catch{}
      if(epoch===this.epoch&&this.stream===controller){this.stream=null;this.connected=false;this.closePromotion();this.render();if(this.allowed)this.ui.connection.textContent='Verbindung wird wiederhergestellt …';this.schedule();}
    }
  }
  async heartbeat(){
    this.syncAuth();if(this.closed||!this.auth)return;
    if(!this.stream){await this.connect();return;}
    if(this.pinging)return;this.pinging=true;
    try{this.accept(await this.api('ping',{}));}catch(error){this.failure(error);this.stream?.abort();}
    finally{this.pinging=false;}
  }
  accept(value){
    if(value.version!==1||!value.board||!Array.isArray(value.tables)||value.tables.length!==3)throw Error('response');
    if(this.state?.serverId===value.serverId&&value.sequence<this.state.sequence)return;
    const changedTable=this.state?.board.id!==value.board.id,changedColor=this.state?.self.color!==value.self.color;
    this.state=value;this.allowed=true;if(changedColor&&value.self.color)this.orientation=value.self.color;if(changedTable)this.message();this.render();
  }
  async command(action,fields={}){
    this.syncAuth();if(this.pending||!this.allowed||!this.connected||!this.state)return false;
    const epoch=this.epoch,session=this.session,body={id:crypto.randomUUID(),action,...fields,...(action==='watch'?{}:{revision:this.state.board.revision})};
    this.pending=true;this.message();this.render();
    try{
      const value=await this.api('command',body);if(epoch!==this.epoch||session!==this.session)throw cancelled();this.accept(value);return true;
    }catch(error){if(epoch===this.epoch){this.failure(error);if(this.session)try{this.accept(await this.api('state'));}catch(next){this.failure(next);}}return false;}
    finally{if(epoch===this.epoch){this.pending=false;this.render();}}
  }
  game(){return this.mode==='online'?new Chess(this.state?.board.fen):this.local;}
  canPlay(){return this.allowed&&this.connected&&!this.pending&&(this.mode==='online'?Boolean(this.state?.self.color&&!this.state.board.result&&this.state.board.seats.w.connected&&this.state.board.seats.b.connected&&this.state.board.turn===this.state.self.color):!this.local.isGameOver());}
  closePromotion(){const extension=this.board?.getExtension(PromotionDialog);if(extension?.isPromotionDialogShown())extension.setDisplayState('hidden');}
  input(event){
    if(event.type===INPUT_EVENT_TYPE.moveInputStarted){
      if(!this.canPlay())return false;const moves=this.game().moves({square:event.squareFrom,verbose:true});if(!moves.length)return false;
      this.board.removeMarkers();this.board.addMarker(MARKER_TYPE.frame,event.squareFrom);this.board.addLegalMovesMarkers(moves);return true;
    }
    if(event.type===INPUT_EVENT_TYPE.moveInputCanceled||event.type===INPUT_EVENT_TYPE.moveInputFinished)this.markers();
    if(event.type===INPUT_EVENT_TYPE.validateMoveInput){
      const moves=this.game().moves({square:event.squareFrom,verbose:true}).filter(move=>move.to===event.squareTo);this.markers();if(!this.canPlay()||!moves.length)return false;
      const epoch=this.epoch,mode=this.mode,fen=this.game().fen();
      // The renderer finishes its pointer transaction before any authoritative position replaces it.
      setTimeout(()=>{
        if(epoch!==this.epoch||mode!==this.mode||fen!==this.game().fen()||!this.canPlay())return;
        if(moves[0].promotion)this.board.showPromotionDialog(event.squareTo,moves[0].color,result=>{
          if(result.type===PROMOTION_DIALOG_RESULT_TYPE.pieceSelected&&epoch===this.epoch&&mode===this.mode&&fen===this.game().fen())void this.play(moves.find(move=>move.promotion===result.piece.slice(1)));
        });else void this.play(moves[0]);
      });return false;
    }
    return true;
  }
  async play(move){
    if(!move||!this.canPlay())return;
    if(this.mode==='online'){await this.command('move',{from:move.from,to:move.to,promotion:move.promotion||null});return;}
    this.local.move(move);
    if(this.mode==='puzzle'&&!this.local.isCheckmate()){this.local.undo();this.message('Noch kein Matt. Probier einen anderen Zug.');}
    else this.message(this.mode==='puzzle'?'Gelöst!':'','success');this.render();
  }
  async setMode(mode){
    if(!['online','practice','puzzle'].includes(mode)||mode===this.mode||!this.allowed||!this.connected)return;
    if(this.state?.self.color){const left=await this.confirm('Deinen Tischplatz freigeben?',()=>this.command('leave_seat'));if(!left)return;}
    this.closePromotion();this.mode=mode;this.newLocal();
  }
  newLocal(){this.local=new Chess(this.mode==='puzzle'?this.puzzle.fen:undefined);if(this.mode==='puzzle')this.orientation=this.local.turn();this.message();this.render();}
  async confirm(title,action){
    if(this.ui.confirm.open)return false;const epoch=this.epoch;this.ui['confirm-title'].textContent=title;this.ui.confirm.returnValue='cancel';this.ui.confirm.showModal();
    const result=await new Promise(resolve=>this.ui.confirm.addEventListener('close',()=>resolve(this.ui.confirm.returnValue==='yes'),{once:true}));
    if(!result||epoch!==this.epoch||!this.allowed)return false;return await action()!==false;
  }
  markers(){this.board.removeMarkers();if(this.mode==='online'&&this.state?.board.lastMove)for(const square of Object.values(this.state.board.lastMove))this.board.addMarker(MARKER_TYPE.square,square);}
  renderBoard(force=false){
    if(!this.board)return;const fen=this.game().fen();
    if(force||this.shownFen!==fen||this.shownMode!==this.mode){this.closePromotion();this.board.cancelMoveInput();void this.board.setPosition(fen,false);this.shownFen=fen;this.shownMode=this.mode;this.markers();}
    if(this.board.getOrientation()!==this.orientation){this.board.cancelMoveInput();void this.board.setOrientation(this.orientation,false);}
    const input=this.canPlay()?this.game().turn():null;
    if(input!==this.enabledInput){this.board.disableMoveInput();if(input)this.board.enableMoveInput(this.handler,input=== 'w'?COLOR.white:COLOR.black);this.enabledInput=input;}
  }
  renderMoveOptions(reset=true){
    if(!this.board)return;const moves=this.canPlay()?this.game().moves({verbose:true}):[],from=this.ui['move-from'].value,to=this.ui['move-to'].value;
    const froms=[...new Set(moves.map(move=>move.from))].sort();this.ui['move-from'].replaceChildren(new Option('Von',''),...froms.map(square=>new Option(square,square)));this.ui['move-from'].value=froms.includes(from)?from:'';
    const selected=moves.filter(move=>move.from===this.ui['move-from'].value),tos=[...new Set(selected.map(move=>move.to))].sort();
    this.ui['move-to'].replaceChildren(new Option('Nach',''),...tos.map(square=>new Option(square,square)));this.ui['move-to'].value=tos.includes(to)?to:'';
    const promotion=selected.some(move=>move.to===this.ui['move-to'].value&&move.promotion);
    this.ui['move-from'].disabled=!moves.length;this.ui['move-to'].disabled=!tos.length;this.ui['move-promotion'].disabled=!promotion;this.ui['submit-move'].disabled=!this.ui['move-to'].value||!moves.length;
  }
  render(){
    if(!this.board)return;const online=this.mode==='online',state=this.state,game=this.game(),active=Boolean(this.allowed&&this.connected&&!this.pending),own=online&&state?.self.color,result=online?state?.board.result:null;
    for(const button of document.querySelectorAll('[data-mode]')){button.setAttribute('aria-pressed',String(button.dataset.mode===this.mode));button.disabled=!active;}
    this.ui['table-bar'].hidden=!online;this.ui['puzzle-bar'].hidden=this.mode!=='puzzle';this.ui['seat-actions'].hidden=!online;this.ui['online-actions'].hidden=!online;
    if(state){const selected=state.board.id;for(const table of state.tables){let option=[...this.ui.table.options].find(option=>option.value===table.id);if(!option){option=new Option('',table.id);this.ui.table.add(option);}option.textContent=table.name+' · '+statuses[table.status];}this.ui.table.value=selected;this.ui.presence.textContent=state.tables.find(table=>table.id===selected).watchers+' Zuschauer';}
    else{this.ui.table.replaceChildren();this.ui.presence.textContent='';}
    this.ui.table.disabled=!!this.boundTable||!active||Boolean(own);this.ui.puzzle.disabled=!active;
    this.ui['game-title'].textContent=online?state?.board.name||'Tischpartie':this.mode==='puzzle'?this.puzzle.name:'Freies Spiel';
    this.ui['top-seat'].textContent=online&&state?colorName(this.orientation==='w'?'b':'w')+' · '+(state.board.seats[this.orientation==='w'?'b':'w'].connected?'am Tisch':state.board.seats[this.orientation==='w'?'b':'w'].occupied?'kehrt zurück':'frei'):colorName(this.orientation==='w'?'b':'w');
    this.ui['your-color'].textContent=online?(own?'Du spielst '+colorName(own):state?.self.resumeColor?'Dein Platz ist reserviert':'Zuschauer'):this.mode==='practice'?'Beide Seiten':'Matt in einem Zug';
    this.ui['position-status'].textContent=!this.allowed?'Keine Partie geöffnet':!this.connected?'Verbindung wird wiederhergestellt …':result?reasons[result.reason]:game.isCheckmate()?'Schachmatt':game.isDraw()?'Remis':online&&(!state?.board.seats.w.connected||!state?.board.seats.b.connected)?'Wir warten auf Mitspieler':colorName(game.turn())+' am Zug'+(game.isCheck()?' · Schach':'');
    this.ui.result.hidden=!result;this.ui.result.textContent=result?result.score+' · '+reasons[result.reason]:'';
    this.ui.flip.disabled=!this.allowed;for(const color of ['w','b']){const button=this.ui[color==='w'?'white':'black'];button.hidden=Boolean(own||state?.self.resumeColor);button.disabled=!active||Boolean(state?.board.seats[color].occupied||state?.self.occupiedTable);}
    this.ui.resume.hidden=!state?.self.resumeColor;this.ui.resume.disabled=!active;this.ui['leave-seat'].hidden=!own;this.ui['leave-seat'].disabled=!active;
    const both=state?.board.seats.w.connected&&state?.board.seats.b.connected;
    this.ui['offer-draw'].disabled=!active||!own||!both||Boolean(result||state?.board.drawOffer);this.ui.resign.disabled=!active||!own||!both||Boolean(result);
    const offered=Boolean(own&&state?.board.drawOffer&&state.board.drawOffer!==own);this.ui['draw-offer'].hidden=!offered;
    this.ui['accept-draw'].disabled=!active;this.ui['decline-draw'].disabled=!active;
    this.ui.rematch.hidden=!result||!own;this.ui.rematch.disabled=!active||Boolean(state?.board.rematch.includes(own));this.ui.rematch.textContent=state?.board.rematch.includes(own)?'Warten auf Zustimmung':'Neue Partie';
    this.ui.reset.hidden=!state?.self.staff;this.ui.reset.disabled=!active;this.ui.undo.hidden=online;this.ui.undo.disabled=!active||!this.local.history().length;
    this.ui.restart.hidden=online;this.ui.restart.disabled=!active;this.ui.pgn.disabled=!active;
    const moves=online?state?.board.moves||[]:game.history(),key=JSON.stringify(moves);if(this.movesKey!==key){this.movesKey=key;const rows=[];for(let index=0;index<moves.length;index+=2){const li=document.createElement('li');for(const text of [String(index/2+1)+'.',moves[index],moves[index+1]||'']){const span=document.createElement('span');span.textContent=text;li.append(span);}rows.push(li);}this.ui.moves.replaceChildren(...rows);this.ui.moves.scrollTop=this.ui.moves.scrollHeight;}
    this.renderBoard();this.renderMoveOptions();
  }
  async download(){
    try{let pgn;if(this.mode==='online')pgn=await this.api('pgn');else{this.local.setHeader('Event',this.mode==='puzzle'?'Schloss-Schach: Raetsel':'Schloss-Schach: Freies Spiel');pgn=this.local.pgn();}
      const url=URL.createObjectURL(new Blob([pgn],{type:'application/x-chess-pgn'})),link=document.createElement('a');link.href=url;link.download='schloss-schach.pgn';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){this.failure(error);}
  }
  dispose(){this.closed=true;this.epoch++;clearInterval(this.timer);clearTimeout(this.retry);this.stream?.abort();for(const controller of this.requests)controller.abort();this.requests.clear();this.board.destroy();}
}
new ChessPage();
