'use strict';
const crypto=require('node:crypto');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {validateProfile,validateRules,decision}=require('../castle-school/policy.cjs');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const COOKIE='wvh_castle_piano';
const DEFAULT_RULES=[{id:'musiksalon',published:true,audiences:['student','staff'],staffPreview:false,minAge:0,maxAge:null,gradeLevels:null,classIds:null}];
const fail=(status,code)=>{throw new GatewayError(status,code);};
const note=value=>Number.isInteger(value)&&value>=48&&value<=84;
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
function cookieFrom(header){
  if(typeof header!=='string'||header.length>8192)return null;
  const values=header.split(';').map(value=>value.trim()).filter(value=>value.startsWith(COOKIE+'='));
  return values.length===1&&/^[a-f0-9]{64}$/.test(values[0].slice(COOKIE.length+1))?values[0].slice(COOKIE.length+1):null;
}
function cookieHeader(cookie,lease,{secure=true,clock=Date.now}={}){
  return COOKIE+'='+cookie+'; Path=/castle-piano/; Max-Age='+Math.max(0,Math.floor((lease.expiresAt-clock())/1000))+'; HttpOnly; SameSite=Strict'+(secure?'; Secure':'');
}
class PianoRooms{
  constructor({clock=Date.now,rules=DEFAULT_RULES,leaseMs=45000,maxSessions=256,capacity=8}={}){
    if(!Number.isInteger(leaseMs)||leaseMs<1000||leaseMs>60000||!Number.isInteger(maxSessions)||maxSessions<1||maxSessions>600||
      !Number.isInteger(capacity)||capacity<2||capacity>12)throw Error('Invalid piano limits');
    this.clock=clock;this.leaseMs=leaseMs;this.maxSessions=maxSessions;this.capacity=capacity;this.salt=crypto.randomBytes(32);this.serverId=crypto.randomUUID();
    this.rules=new Map(validateRules(rules).map(rule=>[rule.id,rule]));
    if(this.rules.size!==1||!this.rules.has('musiksalon'))throw Error('Only the configured school music piano is available');
    this.rooms=new Map([['musiksalon',{id:'musiksalon',label:'Musiksalon',sequence:0,members:new Map(),pending:new Set()}]]);
    this.leases=new Map();this.accounts=new Map();this.clients=new Map();this.attempt=0;
  }
  opaque(value){return crypto.createHmac('sha256',this.salt).update(value).digest('hex');}
  actor(auth){
    const identity=auth?.schoolIdentifier||auth?.identifier;
    if(typeof identity!=='string'||!identity||identity.length>320||!Number.isFinite(auth.expiresAt)||auth.expiresAt<=this.clock())fail(401,'unauthorized');
    return {id:this.opaque('account:'+identity),expiresAt:auth.expiresAt};
  }
  begin(input,auth){
    if(!exact(input,'clientId,mode,roomId,takeover')||!UUID.test(input.clientId)||!['together','practice'].includes(input.mode)||
      input.roomId!=='musiksalon'||typeof input.takeover!=='boolean')fail(400,'invalid_request');
    this.sweep();const actor=this.actor(auth);let client=this.clients.get(input.clientId);
    if(!client){if(this.clients.size>=this.maxSessions*2)fail(503,'unavailable');client={id:input.clientId,actor:actor.id};this.clients.set(client.id,client);}
    if(client.actor!==actor.id){if(client.lease)this.revoke(client.lease);client.actor=actor.id;client.lease=null;}
    client.attempt=++this.attempt;client.until=this.clock()+60000;
    return {client,attempt:client.attempt,actor,input:{...input}};
  }
  complete(ticket,profile,cookie){
    const actor=ticket.actor,client=this.clients.get(ticket.client.id);
    if(client!==ticket.client||client.attempt!==ticket.attempt||client.actor!==actor.id)fail(409,'account_changed');
    try{
      validateProfile(profile,this.clock());
      if(!['student','staff'].includes(profile.kind)||!decision(profile,this.rules.get(ticket.input.roomId)).allowed)fail(403,'school_required');
      if(actor.expiresAt<=this.clock())fail(401,'unauthorized');
    }catch(error){this.revokeActor(actor.id);throw error;}
    let lease=cookie?this.leases.get(this.opaque('cookie:'+cookie)):null;
    const current=this.leases.get(this.accounts.get(actor.id));
    if(current&&(!lease||lease!==current||lease.client!==client.id)){
      if(!ticket.input.takeover)fail(409,'session_in_use');this.revoke(current.id);lease=null;
    }
    if(lease&&(lease.actor!==actor.id||lease.client!==client.id||lease.mode!==ticket.input.mode||lease.roomId!==ticket.input.roomId||
      lease.staff!==(profile.kind==='staff')||lease.expiresAt<=this.clock())){if(lease.actor===actor.id)this.revoke(lease.id);lease=null;}
    if(!lease){
      if(this.leases.size>=this.maxSessions)fail(503,'unavailable');
      cookie=crypto.randomBytes(32).toString('hex');const id=this.opaque('cookie:'+cookie);
      lease={id,actor:actor.id,client:client.id,roomId:ticket.input.roomId,mode:ticket.input.mode,staff:profile.kind==='staff',
        generation:crypto.randomBytes(12).toString('hex'),voiceId:crypto.randomUUID(),keys:new Map(),pedal:false,seen:new Map(),
        rate:{until:0,count:0},color:['#d9ac55','#66b8a0','#db819b','#82a8dc','#b9a0de','#c1c95e','#66bdcc','#d38b68'][crypto.randomInt(8)]};
      this.leases.set(id,lease);this.accounts.set(actor.id,id);client.lease=id;
    }
    lease.tokenExpires=actor.expiresAt;lease.expiresAt=Math.min(actor.expiresAt,this.clock()+this.leaseMs);client.until=lease.expiresAt+60000;
    return {cookie,lease,context:this.context(lease)};
  }
  context(lease){return {version:1,serverId:this.serverId,generation:lease.generation,voiceId:lease.voiceId,staff:lease.staff,
    leaseMs:Math.max(0,lease.expiresAt-this.clock()),mode:lease.mode,room:{id:lease.roomId,label:'Musiksalon'},range:{min:48,max:84}};}
  get(cookie,actor){
    if(typeof cookie!=='string'||!/^[a-f0-9]{64}$/.test(cookie))fail(401,'school_required');
    const lease=this.leases.get(this.opaque('cookie:'+cookie));if(!lease)fail(401,'school_required');
    if(lease.expiresAt<=this.clock()||lease.tokenExpires<=this.clock()){this.revoke(lease.id);fail(410,'session_expired');}
    if(actor&&lease.actor!==actor.id)fail(403,'not_allowed');return lease;
  }
  reserve(cookie,generation){
    this.sweep();
    const lease=this.get(cookie);if(lease.mode!=='together')fail(403,'practice_only');
    if(lease.generation!==generation)fail(409,'session_changed');
    if(lease.socket||lease.reservation)fail(409,'session_in_use');
    const room=this.rooms.get(lease.roomId);if(room.members.size+room.pending.size>=this.capacity)fail(409,'room_full');
    const ticket={lease,stamp:crypto.randomUUID()};lease.reservation=ticket;room.pending.add(ticket);return ticket;
  }
  cancel(ticket){const lease=ticket.lease;if(lease.reservation===ticket)lease.reservation=null;this.rooms.get(lease.roomId)?.pending.delete(ticket);}
  connect(ticket,send,close){
    const lease=ticket.lease;
    if(this.leases.get(lease.id)!==lease||lease.expiresAt<=this.clock()||lease.reservation!==ticket){this.cancel(ticket);fail(410,'session_expired');}
    this.cancel(ticket);lease.socket={stamp:ticket.stamp,send,close};const room=this.rooms.get(lease.roomId);room.members.set(lease.voiceId,lease);this.publish(room);
    return {lease,stamp:ticket.stamp};
  }
  disconnect(lease,stamp){
    if(this.leases.get(lease.id)!==lease||lease.socket?.stamp!==stamp)return;
    lease.socket=null;lease.keys.clear();lease.pedal=false;const room=this.rooms.get(lease.roomId);
    if(room.members.get(lease.voiceId)===lease){room.members.delete(lease.voiceId);this.publish(room);}
  }
  snapshot(room,ack=null){return {version:1,type:'state',serverId:this.serverId,roomId:room.id,sequence:room.sequence,time:this.clock(),ack,
    members:[...room.members.values()].filter(lease=>lease.expiresAt>this.clock()&&lease.tokenExpires>this.clock()).map(lease=>({voiceId:lease.voiceId,color:lease.color,pedal:lease.pedal,
      keys:[...lease.keys.values()].map(key=>({note:key.note,velocity:key.velocity,pressId:key.pressId,down:key.down,startedAt:key.startedAt}))}))};}
  publish(room,ack=null){
    room.sequence++;const state=this.snapshot(room,ack);
    for(const lease of [...room.members.values()])if(lease.expiresAt>this.clock()&&lease.tokenExpires>this.clock())try{lease.socket?.send(state);}catch{try{lease.socket?.close();}catch{}}
  }
  command(lease,stamp,input){
    if(this.leases.get(lease.id)!==lease||lease.expiresAt<=this.clock()){this.revoke(lease.id);fail(410,'session_expired');}
    if(lease.socket?.stamp!==stamp)fail(409,'session_changed');
    if(!input||!UUID.test(input.id))fail(400,'invalid_request');
    const valid=input.type==='down'?exact(input,'id,note,type,velocity')&&note(input.note)&&Number.isInteger(input.velocity)&&input.velocity>=1&&input.velocity<=127:
      input.type==='up'?exact(input,'id,note,type')&&note(input.note):input.type==='pedal'?exact(input,'down,id,type')&&typeof input.down==='boolean':
        input.type==='clear'?exact(input,'id,type'):input.type==='hold'?exact(input,'id,notes,type')&&Array.isArray(input.notes)&&input.notes.length<=8&&
          new Set(input.notes).size===input.notes.length&&input.notes.every(note):false;
    if(!valid)fail(400,'invalid_request');
    const now=this.clock();if(lease.rate.until<=now)lease.rate={until:now+1000,count:0};if(++lease.rate.count>40)fail(429,'rate_limited');
    const digest=this.opaque(JSON.stringify(input)),prior=lease.seen.get(input.id),room=this.rooms.get(lease.roomId),ack={voiceId:lease.voiceId,id:input.id};
    if(prior){if(prior!==digest)fail(409,'request_conflict');lease.socket.send(this.snapshot(room,ack));return;}
    if(input.type==='down'){
      const old=lease.keys.get(input.note);
      if(!old?.down){
        if([...lease.keys.values()].filter(key=>key.down).length>=8)fail(429,'too_many_notes');
        if(lease.keys.size>=24){const oldest=[...lease.keys.values()].find(key=>!key.down);if(oldest)lease.keys.delete(oldest.note);}
        lease.keys.set(input.note,{note:input.note,velocity:input.velocity,pressId:input.id,down:true,startedAt:now,heldUntil:now+15000});
      }
    }else if(input.type==='up'){
      const key=lease.keys.get(input.note);if(key){if(lease.pedal)key.down=false;else lease.keys.delete(input.note);}
    }else if(input.type==='pedal'){
      lease.pedal=input.down;if(!input.down)for(const [note,key]of lease.keys)if(!key.down)lease.keys.delete(note);
    }else if(input.type==='clear'){lease.keys.clear();lease.pedal=false;}
    else if(input.type==='hold'){
      for(const key of lease.keys.values())if(key.down){if(input.notes.includes(key.note))key.heldUntil=now+15000;
        else if(lease.pedal)key.down=false;else lease.keys.delete(key.note);}
    }
    lease.seen.set(input.id,digest);while(lease.seen.size>128)lease.seen.delete(lease.seen.keys().next().value);
    this.publish(room,ack);
  }
  revoke(id){
    const lease=this.leases.get(id);if(!lease)return;
    if(lease.reservation)this.cancel(lease.reservation);
    const socket=lease.socket;if(socket)this.disconnect(lease,socket.stamp);
    this.leases.delete(id);if(this.accounts.get(lease.actor)===id)this.accounts.delete(lease.actor);
    const client=this.clients.get(lease.client);if(client?.lease===id)client.lease=null;
    try{socket?.close();}catch{}
  }
  revokeActor(id){for(const lease of [...this.leases.values()])if(lease.actor===id)this.revoke(lease.id);}
  panic(auth,profile,roomId){
    const actor=this.actor(auth);validateProfile(profile,this.clock());
    if(profile.kind!=='staff'||!decision(profile,this.rules.get(roomId)||this.rules.get('musiksalon')).allowed||!this.rooms.has(roomId))fail(403,'not_allowed');
    const room=this.rooms.get(roomId);for(const lease of room.members.values()){lease.keys.clear();lease.pedal=false;}this.publish(room);
    return {cleared:true,staff:profile.kind==='staff',ownActorVerified:Boolean(actor.id)};
  }
  sweep(){
    const now=this.clock();for(const lease of [...this.leases.values()]){
      if(lease.expiresAt<=now||lease.tokenExpires<=now){this.revoke(lease.id);continue;}
      let changed=false;for(const [note,key]of lease.keys)if(key.down&&key.heldUntil<=now||!key.down&&now-key.startedAt>=30000){lease.keys.delete(note);changed=true;}
      if(changed&&lease.socket)this.publish(this.rooms.get(lease.roomId));
    }
    for(const [id,client]of this.clients)if(client.until<=now&&!this.leases.has(client.lease))this.clients.delete(id);
  }
  close(){for(const lease of [...this.leases.values()])this.revoke(lease.id);this.clients.clear();}
}
module.exports={PianoRooms,DEFAULT_RULES,COOKIE,cookieFrom,cookieHeader};
