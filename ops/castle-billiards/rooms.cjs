'use strict';
const crypto=require('node:crypto');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {createBilliardsModel}=require('./model.cjs');
const core=require('./vendor/core.cjs');
const TABLES=Object.freeze(['tisch-1','tisch-2','tisch-3']);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const fail=(status,code)=>{throw new GatewayError(status,code);};
class BilliardsRooms {
 constructor({pool,journal=null,clock=Date.now,sessionMs=45000,reconnectMs=120000,maxSessions=300}={}){
  if(!pool||typeof pool.run!=='function')throw Error('Bounded physics workers required');
  this.pool=pool;this.journal=journal;this.clock=clock;this.sessionMs=sessionMs;this.reconnectMs=reconnectMs;this.maxSessions=maxSessions;
  this.model=createBilliardsModel(core);this.geometry=this.model.geometry();this.boot=crypto.randomUUID();this.sequence=1;this.sessions=new Map();this.listeners=new Set();
  this.tables=new Map(TABLES.map(id=>[id,{id,state:this.model.initial(),seats:[null,null],votes:new Set(),epoch:crypto.randomUUID(),busy:null,animation:null,changedAt:clock()}]));
  const saved=journal?.read();if(saved!==undefined&&saved!==null){
   if(!exact(saved,['version','tables'])||saved.version!==1||!Array.isArray(saved.tables)||saved.tables.length!==3)throw Error('Invalid billiards journal');
   const seen=new Set();for(const value of saved.tables){
    if(!exact(value,['id','state','changedAt'])||!this.tables.has(value.id)||seen.has(value.id)||!Number.isSafeInteger(value.changedAt)||value.changedAt<0)throw Error('Invalid billiards journal');
    seen.add(value.id);this.model.validate(value.state);Object.assign(this.tables.get(value.id),{state:structuredClone(value.state),changedAt:value.changedAt});
   }
  }
 }
 export(){return {version:1,tables:[...this.tables.values()].map(table=>({id:table.id,state:table.state,changedAt:table.changedAt}))};}
 commit(table,state){
  this.model.validate(state);const before={state:table.state,changedAt:table.changedAt};table.state=state;table.changedAt=this.clock();
  try{this.journal?.write(this.export());}catch{Object.assign(table,before);fail(503,'storage_unavailable');}
 }
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 changed(){this.sequence++;for(const listener of this.listeners)try{listener();}catch{this.listeners.delete(listener);}}
 actor(actor){if(!actor||typeof actor.id!=='string'||!actor.id||actor.id.length>100||typeof actor.staff!=='boolean'||!Number.isFinite(actor.expiresAt)||actor.expiresAt<=this.clock())fail(401,'unauthorized');}
 session(id,actor){
  if(typeof id!=='string'||!/^[a-f0-9]{48}$/.test(id))fail(400,'invalid_request');const value=this.sessions.get(id);
  if(!value||value.expiresAt<=this.clock())fail(410,'session_expired');
  if(actor){this.actor(actor);if(actor.id!==value.actor)fail(403,'not_allowed');}return value;
 }
 occupied(actor){for(const table of this.tables.values())for(let seat=0;seat<2;seat++)if(table.seats[seat]?.actor===actor)return {table,seat};return null;}
 connected(seat){const session=seat&&this.sessions.get(seat.session);return Boolean(session?.connected&&session.expiresAt>this.clock());}
 create(actor,tableId='tisch-1'){
  this.actor(actor);this.sweep();if(!this.tables.has(tableId))fail(400,'invalid_request');
  if(this.sessions.size>=this.maxSessions||[...this.sessions.values()].filter(session=>session.actor===actor.id).length>=3)fail(429,'session_limit');
  const id=crypto.randomBytes(24).toString('hex');this.sessions.set(id,{id,actor:actor.id,staff:actor.staff,table:tableId,connected:false,
   expiresAt:Math.min(actor.expiresAt,this.clock()+this.sessionMs),commands:new Map()});return {sessionId:id,...this.snapshot(id)};
 }
 ping(id,actor){const session=this.session(id,actor);session.staff=actor.staff;session.expiresAt=Math.min(actor.expiresAt,this.clock()+this.sessionMs);return this.snapshot(id);}
 connect(id,actor){const session=this.session(id,actor);this.ping(id,actor);session.connected=true;this.changed();}
 disconnect(id){const session=this.sessions.get(id);if(!session?.connected)return;session.connected=false;
  for(const table of this.tables.values())for(const seat of table.seats)if(seat?.session===id)seat.holdUntil=this.clock()+this.reconnectMs;this.changed();}
 release(table,index){table.seats[index]=null;table.votes.clear();}
 leave(id,actor){this.session(id,actor);for(const table of this.tables.values())for(let i=0;i<2;i++)if(table.seats[i]?.session===id)this.release(table,i);this.sessions.delete(id);this.changed();return {left:true};}
 revoke(actor){for(const [id,session]of this.sessions)if(session.actor===actor){for(const table of this.tables.values())for(let i=0;i<2;i++)if(table.seats[i]?.actor===actor)this.release(table,i);this.sessions.delete(id);}this.changed();}
 snapshot(id,{frames=true}={}){
  const session=this.session(id),table=this.tables.get(session.table),now=this.clock(),own=this.occupied(session.actor);
  const seat=table.seats.findIndex(value=>value?.session===id),animation=table.animation&&table.animation.endsAt>now?table.animation:null;
  return {version:1,serverId:this.boot,sequence:this.sequence,serverTime:now,leaseMs:Math.max(0,session.expiresAt-now),geometry:this.geometry,
   board:{id:table.id,state:table.state,busy:Boolean(table.busy),animation:animation?{...animation,...(!frames?{frames:undefined}:{})}:null,
    seats:table.seats.map(value=>({occupied:Boolean(value),connected:this.connected(value),reconnectSeconds:value?.holdUntil?Math.max(0,Math.ceil((value.holdUntil-now)/1000)):0})),rematch:[...table.votes]},
   self:{seat:seat<0?null:seat,staff:session.staff,resumeSeat:own?.table===table&&seat<0?own.seat:null,occupiedTable:own?.table.id??null}};
 }
 async command(id,actor,command){
  const session=this.session(id,actor);if(!session.connected)fail(409,'connection_required');session.staff=actor.staff;
  const shapes={claim:['id','action','version','seat'],resume:['id','action','version','seat'],leave_seat:['id','action','version'],
   shoot:['id','action','version','shot'],place:['id','action','version','point'],reset:['id','action','version'],resign:['id','action','version'],rematch:['id','action','version']};
  if(!command||!Object.hasOwn(shapes,command.action)||!exact(command,shapes[command.action])||typeof command.id!=='string'||!/^[a-f0-9-]{36}$/.test(command.id))fail(400,'invalid_request');
  const digest=crypto.createHash('sha256').update(JSON.stringify(command)).digest('hex'),previous=session.commands.get(command.id);
  if(previous){if(previous.digest!==digest)fail(409,'command_conflict');await previous.task;return this.snapshot(id);}
  if(!Number.isSafeInteger(command.version)||command.version<0)fail(400,'invalid_request');
  const table=this.tables.get(session.table);if(command.version!==table.state.version)fail(409,'stale_position');
  const task=this.apply(table,session,actor,command);session.commands.set(command.id,{digest,task});
  while(session.commands.size>32)session.commands.delete(session.commands.keys().next().value);
  try{await task;this.session(id,actor);this.changed();return this.snapshot(id);}catch(error){session.commands.delete(command.id);throw error;}
 }
 async apply(table,session,actor,command){
  const seat=table.seats.findIndex(value=>value?.session===session.id),now=this.clock();
  if(['claim','resume'].includes(command.action)){
   if(![0,1].includes(command.seat))fail(400,'invalid_request');const own=this.occupied(actor.id),current=table.seats[command.seat];
   if(own&&(own.table!==table||own.seat!==command.seat))fail(409,'already_seated');
   if(command.action==='resume'){if(!current||current.actor!==actor.id)fail(403,'not_allowed');}
   else if(current&&current.session!==session.id)fail(409,current.actor===actor.id?'resume_required':'seat_occupied');
   table.seats[command.seat]={actor:actor.id,session:session.id,holdUntil:null};table.votes.clear();return;
  }
  if(command.action==='leave_seat'){if(seat<0)fail(403,'not_a_player');this.release(table,seat);return;}
  if(command.action==='reset'){
   if(!actor.staff)fail(403,'staff_required');const state=this.model.initial();state.version=table.state.version+1;this.commit(table,state);
   table.epoch=crypto.randomUUID();table.busy=null;table.animation=null;table.seats=[null,null];table.votes.clear();return;
  }
  if(seat<0)fail(403,'not_a_player');
  if(table.busy||table.animation?.endsAt>now)fail(409,'shot_in_progress');
  if(command.action==='rematch'){
   if(table.state.winner===null)fail(409,'game_not_finished');table.votes.add(seat);
   if(table.votes.size===2&&table.seats.every(value=>this.connected(value))){const state=this.model.initial();state.version=table.state.version+1;this.commit(table,state);table.epoch=crypto.randomUUID();table.animation=null;table.seats.reverse();table.votes.clear();}return;
  }
  if(table.state.winner!==null)fail(409,'game_finished');
  if(!table.seats.every(value=>this.connected(value)))fail(409,'waiting_for_player');
  if(command.action==='resign'){this.commit(table,{...structuredClone(table.state),version:table.state.version+1,winner:1-seat,ballInHand:false,reason:'resignation'});return;}
  if(seat!==table.state.turn)fail(403,'not_your_turn');
  const marker={id:crypto.randomUUID(),epoch:table.epoch,version:table.state.version};table.busy=marker;this.changed();
  try{
   const result=await this.pool.run(command.action==='shoot'?'shoot':'place',table.state,command.action==='shoot'?command.shot:command.point);
   if(table.busy!==marker||table.epoch!==marker.epoch||table.state.version!==marker.version)fail(409,'stale_position');
   this.session(session.id,actor);this.commit(table,result.state);
   if(command.action==='shoot'){
    const startedAt=this.clock()+120,rate=1.5;table.animation={id:marker.id,startedAt,endsAt:startedAt+result.simulatedSeconds*1000/rate,rate,frames:result.frames};
   }else table.animation=null;
  }catch(error){
   if(error instanceof GatewayError)throw error;
   if(['invalid_shot','invalid_placement','shot_not_allowed','placement_not_allowed'].includes(error.code))fail(400,error.code);
   fail(503,'simulation_unavailable');
  }finally{if(table.busy===marker)table.busy=null;this.changed();}
 }
 sweep(){
  let changed=false;const now=this.clock();
  for(const [id,session]of this.sessions)if(session.expiresAt<=now){
   for(const table of this.tables.values())for(const seat of table.seats)if(seat?.session===id&&!seat.holdUntil)seat.holdUntil=now+this.reconnectMs;
   this.sessions.delete(id);changed=true;
  }
  for(const table of this.tables.values()){
   for(let i=0;i<2;i++){const seat=table.seats[i];if(seat&&this.connected(seat)){if(seat.holdUntil){seat.holdUntil=null;changed=true;}}
    else if(seat?.holdUntil&&seat.holdUntil<=now){this.release(table,i);changed=true;}}
   if(table.animation&&table.animation.endsAt<=now){table.animation=null;changed=true;}
  }
  if(changed)this.changed();
 }
}
module.exports={BilliardsRooms,TABLES};
