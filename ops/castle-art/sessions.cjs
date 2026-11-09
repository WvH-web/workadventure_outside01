'use strict';
const crypto=require('node:crypto');
const {GatewayError}=require('../hall-audio/errors.cjs');
const BOARDS=Object.freeze([
  Object.freeze({id:'schlossatelier-maltisch',label:'Maltisch'}),
  Object.freeze({id:'schlossatelier-ideenwand',label:'Ideenwand'}),
  Object.freeze({id:'schlossatelier-plakat',label:'Plakatwerkstatt'}),
]);
const COOKIE='wvh_castle_art';
const fail=(status,code)=>{throw new GatewayError(status,code);};
function cookieFrom(header){
  if(typeof header!=='string'||header.length>8192)return null;
  const values=header.split(';').map(part=>part.trim()).filter(part=>part.startsWith(COOKIE+'='));
  if(values.length!==1)return null;const value=values[0].slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(value)?value:null;
}
class ArtSessions {
  constructor({clock=Date.now,leaseMs=45000,maxSessions=600}={}){
    this.clock=clock;this.leaseMs=leaseMs;this.maxSessions=maxSessions;this.salt=crypto.randomBytes(32);this.leases=new Map();this.clients=new Map();this.attempt=0;
  }
  opaque(value){return crypto.createHmac('sha256',this.salt).update(value).digest('hex');}
  actor(identifier,staff,expiresAt){
    if(typeof identifier!=='string'||!identifier||identifier.length>320||typeof staff!=='boolean'||!Number.isFinite(expiresAt)||expiresAt<=this.clock())fail(401,'unauthorized');
    return {id:this.opaque('account:'+identifier),staff,expiresAt};
  }
  begin(clientId,actor){
    if(typeof clientId!=='string'||!/^[a-f0-9-]{36}$/.test(clientId))fail(400,'invalid_request');this.sweep();
    let client=this.clients.get(clientId);
    if(!client){if(this.clients.size>=this.maxSessions*2)fail(503,'unavailable');client={id:clientId,actor:actor.id};this.clients.set(clientId,client);}
    if(client.actor!==actor.id){if(client.lease)this.revoke(client.lease);client.actor=actor.id;client.lease=null;}
    client.attempt=++this.attempt;client.until=this.clock()+60000;return {client,attempt:client.attempt};
  }
  complete(ticket,actor,cookie){
    const client=this.clients.get(ticket.client.id);
    if(client!==ticket.client||client.attempt!==ticket.attempt||client.actor!==actor.id)fail(409,'account_changed');
    let lease=cookie?this.leases.get(this.opaque('cookie:'+cookie)):null;
    if(lease&&(lease.actor!==actor.id||lease.client!==client.id||lease.staff!==actor.staff||lease.tokenExpires!==actor.expiresAt||lease.expiresAt<=this.clock())){
      this.revoke(lease.id);lease=null;
    }
    if(!lease){
      if(client.lease)this.revoke(client.lease);if(this.leases.size>=this.maxSessions)fail(503,'unavailable');
      cookie=crypto.randomBytes(32).toString('hex');const id=this.opaque('cookie:'+cookie);
      lease={id,client:client.id,actor:actor.id,staff:actor.staff,tokenExpires:actor.expiresAt,
        generation:crypto.randomBytes(12).toString('hex'),userSecret:this.opaque('wbo:'+actor.id).slice(0,32),resources:new Set()};
      this.leases.set(id,lease);client.lease=id;
    }
    lease.expiresAt=Math.min(actor.expiresAt,this.clock()+this.leaseMs);client.until=lease.expiresAt+60000;
    return {cookie,lease,context:this.context(lease)};
  }
  context(lease){return {version:1,generation:lease.generation,staff:lease.staff,leaseMs:Math.max(0,lease.expiresAt-this.clock()),
    boards:BOARDS.map(board=>({...board,path:'/castle-art/wbo/boards/'+board.id+'?lang=de'}))};}
  get(cookie,actor){
    if(typeof cookie!=='string'||!/^[a-f0-9]{64}$/.test(cookie))fail(401,'school_required');
    const lease=this.leases.get(this.opaque('cookie:'+cookie));if(!lease)fail(401,'school_required');
    if(lease.expiresAt<=this.clock()||lease.tokenExpires<=this.clock()){this.revoke(lease.id);fail(410,'session_expired');}
    if(actor&&lease.actor!==actor.id)fail(403,'not_allowed');return lease;
  }
  track(lease,kind,close){
    const max=kind==='ws'?6:32;if([...lease.resources].filter(resource=>resource.kind===kind).length>=max)fail(429,'rate_limited');
    const resource={kind,close};lease.resources.add(resource);return ()=>lease.resources.delete(resource);
  }
  revoke(id){const lease=this.leases.get(id);if(!lease)return;this.leases.delete(id);for(const resource of lease.resources){try{resource.close();}catch{}}lease.resources.clear();}
  revokeActor(id){for(const lease of this.leases.values())if(lease.actor===id)this.revoke(lease.id);}
  sweep(){const now=this.clock();for(const lease of this.leases.values())if(lease.expiresAt<=now||lease.tokenExpires<=now)this.revoke(lease.id);
    for(const [id,client]of this.clients)if(client.until<=now&&!this.leases.has(client.lease))this.clients.delete(id);}
  close(){for(const lease of [...this.leases.values()])this.revoke(lease.id);this.clients.clear();}
}
function internalToken(lease,secret,now=Date.now()){
  if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))throw Error('Separate art signing key required');
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const value=encode({alg:'HS256',typ:'JWT'})+'.'+encode({iat:Math.floor(now/1000),exp:Math.floor(lease.tokenExpires/1000),roles:BOARDS.map(board=>(lease.staff?'moderator:':'editor:')+board.id)});
  return value+'.'+crypto.createHmac('sha256',Buffer.from(secret)).update(value).digest('base64url');
}
function cookieHeader(cookie,lease,{secure=true,clock=Date.now}={}){
  return COOKIE+'='+cookie+'; Path=/castle-art/; Max-Age='+Math.max(0,Math.floor((lease.expiresAt-clock())/1000))+'; HttpOnly; SameSite=Strict'+(secure?'; Secure':'');
}
module.exports={ArtSessions,BOARDS,COOKIE,cookieFrom,cookieHeader,internalToken};
