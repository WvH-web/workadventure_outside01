'use strict';
const crypto=require('node:crypto');
const {Chess}=require('./vendor/chess.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const TABLES=Object.freeze([{id:'tisch-1',name:'Schachtisch 1'},{id:'tisch-2',name:'Schachtisch 2'},{id:'tisch-3',name:'Schachtisch 3'}]);
const colors=['w','b'],outcomes=['1-0','0-1','1/2-1/2'];
const START_FEN=new Chess().fen();
const reasons=['checkmate','stalemate','material','repetition','fifty_moves','move_limit','resignation','agreement'];
const exact=(value,keys)=>value&&!Array.isArray(value)&&typeof value==='object'&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const fail=(status,code)=>{throw new GatewayError(status,code);};
function outcome(game){
  if(game.isCheckmate())return {score:game.turn()==='w'?'0-1':'1-0',reason:'checkmate'};
  const reason=game.isStalemate()?'stalemate':game.isInsufficientMaterial()?'material':game.isThreefoldRepetition()?'repetition':game.isDrawByFiftyMoves()?'fifty_moves':game.history().length>=512?'move_limit':null;
  return reason?{score:'1/2-1/2',reason}:null;
}
function moveList(game){return game.history({verbose:true}).map(move=>({from:move.from,to:move.to,promotion:move.promotion||null}));}
function gameFrom(moves){
  if(!Array.isArray(moves)||moves.length>512)throw Error('Invalid chess moves');const game=new Chess();
  for(const move of moves){
    if(!exact(move,['from','to','promotion'])||typeof move.from!=='string'||typeof move.to!=='string'||!/^[a-h][1-8]$/.test(move.from)||!/^[a-h][1-8]$/.test(move.to)||move.promotion!==null&&!['q','r','b','n'].includes(move.promotion)||outcome(game))throw Error('Invalid chess moves');
    game.move({from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})});
  }
  return game;
}
class ChessRooms {
  constructor({clock=Date.now,journal=null,maxSessions=800,sessionMs=45000,reconnectMs=120000}={}){
    this.clock=clock;this.journal=journal;this.maxSessions=maxSessions;this.sessionMs=sessionMs;this.reconnectMs=reconnectMs;
    this.boot=crypto.randomBytes(12).toString('hex');this.sequence=1;this.sessions=new Map();this.listeners=new Set();this.cleanupRetryAt=0;
    this.tables=new Map(TABLES.map(table=>[table.id,{...table,game:new Chess(),revision:1,result:null,draw:null,votes:new Set(),seats:{w:null,b:null},changedAt:clock()}]));
    const saved=journal?.read();if(saved!==null&&saved!==undefined)this.restore(saved);
  }
  restore(saved){
    if(!exact(saved,['version','tables'])||saved.version!==1||!Array.isArray(saved.tables)||saved.tables.length!==3)throw Error('Invalid chess journal');
    const seen=new Set();for(const value of saved.tables){
      if(!exact(value,['id','moves','revision','result','changedAt'])||!this.tables.has(value.id)||seen.has(value.id)||!Number.isSafeInteger(value.revision)||value.revision<1||!Number.isSafeInteger(value.changedAt)||value.changedAt<0)throw Error('Invalid chess journal');
      const game=gameFrom(value.moves),result=value.result;
      if(result!==null&&(!exact(result,['score','reason'])||!outcomes.includes(result.score)||!reasons.includes(result.reason)||
        ['agreement','stalemate','material','repetition','fifty_moves','move_limit'].includes(result.reason)&&result.score!=='1/2-1/2'))throw Error('Invalid chess result');
      const automatic=outcome(game);
      if(automatic&&(automatic.score!==result?.score||automatic.reason!==result?.reason)||result&&!['agreement','resignation'].includes(result.reason)&&!automatic)throw Error('Invalid chess result');
      seen.add(value.id);Object.assign(this.tables.get(value.id),{game,revision:value.revision,result,changedAt:value.changedAt});
    }
  }
  export(){return {version:1,tables:[...this.tables.values()].map(table=>({id:table.id,moves:moveList(table.game),revision:table.revision,result:table.result,changedAt:table.changedAt}))};}
  save(){this.journal?.write(this.export());}
  subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
  changed(){this.sequence++;for(const listener of this.listeners){try{listener();}catch{this.listeners.delete(listener);}}}
  actor(actor){if(!actor||typeof actor.id!=='string'||actor.id.length<1||actor.id.length>100||typeof actor.staff!=='boolean'||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=this.clock())fail(401,'unauthorized');}
  create(actor){
    this.actor(actor);this.sweep();
    if(this.sessions.size>=this.maxSessions||[...this.sessions.values()].filter(session=>session.actor===actor.id).length>=4)fail(429,'session_limit');
    const session={id:crypto.randomBytes(24).toString('hex'),actor:actor.id,staff:actor.staff,table:this.occupied(actor.id)?.table.id||'tisch-1',connected:false,
      expiresAt:Math.min(actor.expiresAt,this.clock()+this.sessionMs),commands:new Map()};
    this.sessions.set(session.id,session);return {sessionId:session.id,...this.snapshot(session.id)};
  }
  session(id,actor){
    if(typeof id!=='string'||!/^[a-f0-9]{48}$/.test(id))fail(400,'invalid_request');
    const session=this.sessions.get(id);if(!session||session.expiresAt<=this.clock())fail(410,'session_expired');
    if(actor){this.actor(actor);if(session.actor!==actor.id)fail(403,'not_allowed');}
    return session;
  }
  ping(id,actor){
    const session=this.session(id,actor),changed=session.staff!==actor.staff;session.staff=actor.staff;
    session.expiresAt=Math.min(actor.expiresAt,this.clock()+this.sessionMs);if(changed)this.changed();return this.snapshot(id);
  }
  connect(id,actor){const session=this.session(id,actor);this.ping(id,actor);if(!session.connected){session.connected=true;this.changed();}}
  disconnect(id){
    const session=this.sessions.get(id);if(!session||!session.connected)return;
    session.connected=false;for(const table of this.tables.values())for(const color of colors){const seat=table.seats[color];if(seat?.session===id)seat.holdUntil=this.clock()+this.reconnectMs;}
    this.changed();
  }
  occupied(actor){for(const table of this.tables.values())for(const color of colors)if(table.seats[color]?.actor===actor)return {table,color,seat:table.seats[color]};return null;}
  selfColor(table,session){return colors.find(color=>table.seats[color]?.session===session.id)||null;}
  connected(seat){const session=seat?this.sessions.get(seat.session):null;return Boolean(session?.connected&&session.expiresAt>this.clock());}
  viewers(table){return new Set([...this.sessions.values()].filter(session=>session.table===table.id&&session.connected&&session.expiresAt>this.clock()).map(session=>session.actor));}
  meta(table){
    if(table.metaSequence===this.sequence)return table.cachedMeta;
    const viewers=this.viewers(table),players=colors.filter(color=>table.seats[color]).length;
    for(const color of colors)if(table.seats[color])viewers.delete(table.seats[color].actor);
    table.metaSequence=this.sequence;return table.cachedMeta=Object.freeze({id:table.id,name:table.name,players,watchers:viewers.size,
      status:table.result?'finished':players===2&&colors.every(color=>this.connected(table.seats[color]))?'playing':players?'waiting':table.game.fen()!==START_FEN?'paused':'free'});
  }
  snapshot(id){
    const session=this.session(id),table=this.tables.get(session.table),own=this.occupied(session.actor),color=this.selfColor(table,session);
    if(table.cacheRevision!==table.revision){const verbose=table.game.history({verbose:true});
      table.cacheRevision=table.revision;table.cachedMoves=Object.freeze(table.game.history());table.cachedLast=verbose.length?Object.freeze({from:verbose.at(-1).from,to:verbose.at(-1).to}):null;}
    return {version:1,serverId:this.boot,sequence:this.sequence,leaseMs:Math.max(0,session.expiresAt-this.clock()),tables:[...this.tables.values()].map(table=>this.meta(table)),
      board:{id:table.id,name:table.name,revision:table.revision,fen:table.game.fen(),turn:table.game.turn(),check:table.game.isCheck(),
        moves:table.cachedMoves,lastMove:table.cachedLast,
        result:table.result,drawOffer:table.draw,rematch:[...table.votes],seats:Object.fromEntries(colors.map(side=>[side,{occupied:Boolean(table.seats[side]),connected:this.connected(table.seats[side]),
          reconnectSeconds:table.seats[side]?.holdUntil?Math.max(0,Math.ceil((table.seats[side].holdUntil-this.clock())/1000)):0}]))},
      self:{color,staff:session.staff,resumeColor:own?.table.id===table.id&&!color?own.color:null,occupiedTable:own?.table.id||null}};
  }
  clearSeat(table,color){table.seats[color]=null;table.draw=null;table.votes.clear();}
  leave(id,actor){
    const session=this.session(id,actor);for(const table of this.tables.values())for(const color of colors)if(table.seats[color]?.session===id)this.clearSeat(table,color);
    this.sessions.delete(id);this.changed();return {left:true};
  }
  revoke(actorId){
    let changed=false;for(const table of this.tables.values())for(const color of colors)if(table.seats[color]?.actor===actorId){this.clearSeat(table,color);changed=true;}
    for(const [id,session]of this.sessions)if(session.actor===actorId){this.sessions.delete(id);changed=true;}if(changed)this.changed();
  }
  transaction(table,run){
    const before={moves:moveList(table.game),result:table.result,revision:table.revision,changedAt:table.changedAt,draw:table.draw,votes:new Set(table.votes),seats:{...table.seats}};
    try{run();table.changedAt=this.clock();this.save();}
    catch(error){Object.assign(table,{game:gameFrom(before.moves),result:before.result,revision:before.revision,changedAt:before.changedAt,draw:before.draw,votes:before.votes,seats:before.seats});fail(503,'storage_unavailable');}
  }
  command(id,actor,command){
    const session=this.session(id,actor);this.actor(actor);if(!session.connected)fail(409,'connection_required');
    if(session.staff!==actor.staff){session.staff=actor.staff;this.changed();}
    if(!command||typeof command.id!=='string'||!/^[a-f0-9-]{36}$/.test(command.id))fail(400,'invalid_request');
    const allowed={watch:['id','action','tableId'],claim:['id','action','color','revision'],resume:['id','action','color','revision'],move:['id','action','from','to','promotion','revision'],
      offer_draw:['id','action','revision'],accept_draw:['id','action','revision'],decline_draw:['id','action','revision'],resign:['id','action','revision'],rematch:['id','action','revision'],reset:['id','action','revision'],leave_seat:['id','action','revision']};
    if(!Object.hasOwn(allowed,command.action)||!exact(command,allowed[command.action]))fail(400,'invalid_request');
    const digest=crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(command).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
    if(session.commands.has(command.id)){if(session.commands.get(command.id)!==digest)fail(409,'command_conflict');return this.snapshot(id);}
    const table=this.tables.get(session.table),color=this.selfColor(table,session);
    if(command.action==='watch'){
      if(!this.tables.has(command.tableId))fail(400,'invalid_request');if(color&&command.tableId!==session.table)fail(409,'leave_seat_first');session.table=command.tableId;
    }else{
      if(!Number.isSafeInteger(command.revision)||command.revision<1)fail(400,'invalid_request');if(command.revision!==table.revision)fail(409,'stale_position');
      if(['claim','resume'].includes(command.action)){
        if(!colors.includes(command.color))fail(400,'invalid_request');const own=this.occupied(session.actor),seat=table.seats[command.color];
        if(own&&(own.table!==table||own.color!==command.color))fail(409,'already_seated');
        if(command.action==='resume'){
          if(!seat||seat.actor!==session.actor)fail(403,'not_allowed');table.seats[command.color]={actor:session.actor,session:id,holdUntil:null};
        }else{
          if(seat&&seat.session!==id)fail(409,seat.actor===session.actor?'resume_required':'seat_occupied');
          if(!seat){table.draw=null;table.votes.clear();}table.seats[command.color]={actor:session.actor,session:id,holdUntil:null};
        }
      }else if(command.action==='reset'){
        if(!actor.staff)fail(403,'staff_required');this.transaction(table,()=>{Object.assign(table,{game:new Chess(),result:null,draw:null,votes:new Set(),seats:{w:null,b:null}});table.revision++;});
      }else if(command.action==='leave_seat'){
        if(!color)fail(403,'not_a_player');this.clearSeat(table,color);
      }else{
        if(!color)fail(403,'not_a_player');
        if(command.action==='rematch'){
          if(!table.result)fail(409,'game_not_finished');
          if(colors.every(side=>table.seats[side])&&table.votes.has(color==='w'?'b':'w'))this.transaction(table,()=>{
            const seats={w:table.seats.b,b:table.seats.w};Object.assign(table,{game:new Chess(),result:null,draw:null,votes:new Set(),seats});table.revision++;
          });else table.votes.add(color);
        }else{
          if(table.result)fail(409,'game_finished');if(!colors.every(side=>this.connected(table.seats[side])))fail(409,'waiting_for_player');
          if(command.action==='move'){
            if(typeof command.from!=='string'||typeof command.to!=='string'||!/^[a-h][1-8]$/.test(command.from)||!/^[a-h][1-8]$/.test(command.to)||command.promotion!==null&&!['q','r','b','n'].includes(command.promotion))fail(400,'invalid_request');
            if(table.game.turn()!==color)fail(403,'not_your_turn');
            const legal=table.game.moves({square:command.from,verbose:true}).find(move=>move.to===command.to&&(move.promotion||null)===command.promotion);if(!legal)fail(409,'illegal_move');
            this.transaction(table,()=>{table.game.move({from:command.from,to:command.to,...(command.promotion?{promotion:command.promotion}:{})});
              if(table.draw&&table.draw!==color)table.draw=null;table.result=outcome(table.game);table.revision++;});
          }else if(command.action==='resign')this.transaction(table,()=>{table.result={score:color==='w'?'0-1':'1-0',reason:'resignation'};table.draw=null;table.revision++;});
          else if(command.action==='offer_draw'){if(table.draw&&table.draw!==color)fail(409,'draw_already_offered');table.draw=color;}
          else if(command.action==='decline_draw'){if(!table.draw||table.draw===color)fail(409,'no_draw_offer');table.draw=null;}
          else if(command.action==='accept_draw'){if(!table.draw||table.draw===color)fail(409,'no_draw_offer');this.transaction(table,()=>{table.result={score:'1/2-1/2',reason:'agreement'};table.draw=null;table.revision++;});}
        }
      }
    }
    session.staff=actor.staff;session.expiresAt=Math.min(actor.expiresAt,this.clock()+this.sessionMs);session.commands.set(command.id,digest);
    while(session.commands.size>50)session.commands.delete(session.commands.keys().next().value);
    this.changed();return this.snapshot(id);
  }
  pgn(id,actor){const session=this.session(id,actor),table=this.tables.get(session.table);table.game.setHeader('Event','Schloss-Schach');table.game.setHeader('White','Weiss');table.game.setHeader('Black','Schwarz');table.game.setHeader('Result',table.result?.score||'*');return table.game.pgn();}
  sweep(){
    let changed=false;const now=this.clock();
    for(const [id,session]of this.sessions)if(session.expiresAt<=now){
      for(const table of this.tables.values())for(const side of colors){const seat=table.seats[side];if(seat?.session===id&&!seat.holdUntil)seat.holdUntil=now+this.reconnectMs;}
      this.sessions.delete(id);changed=true;
    }
    for(const table of this.tables.values()){
      for(const side of colors){const seat=table.seats[side];if(seat&&this.connected(seat)){if(seat.holdUntil){seat.holdUntil=null;changed=true;}}
        else if(seat?.holdUntil&&seat.holdUntil<=now){this.clearSeat(table,side);changed=true;}}
      if(now>=this.cleanupRetryAt&&!this.viewers(table).size&&!colors.some(side=>table.seats[side])&&now-table.changedAt>12*3600000&&(table.game.history().length||table.result)){
        try{this.transaction(table,()=>{Object.assign(table,{game:new Chess(),result:null,draw:null,votes:new Set()});table.revision++;});changed=true;}catch{this.cleanupRetryAt=now+60000;}
      }
    }
    if(changed)this.changed();
  }
}
module.exports={ChessRooms,TABLES,outcome,gameFrom};
