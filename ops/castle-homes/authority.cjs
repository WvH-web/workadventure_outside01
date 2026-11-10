'use strict';
const crypto=require('node:crypto');
const {AdmissionGate}=require('../castle-school/admission.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {validateIdentity}=require('./identity-lookup.cjs');
const SID=/^[a-f0-9]{40}$/;
const denied=()=>new GatewayError(403,'not_allowed');
const unavailable=()=>new GatewayError(503,'unavailable',1);

// Internal authority for the existing Sternenhueter ticket/introspection protocol.
// The gateway must keep these return values server-side; its browser DTO contains no school profile.
function createHomeAuthority({key,verify,lookup,clock=Date.now,onInvalid=()=>{},maxGrants=600,admissionOptions}={}){
 if(!/^[a-f0-9]{64}$/.test(key)||typeof verify!=='function'||typeof verify.preflight!=='function'||typeof lookup!=='function'||
  !Number.isInteger(maxGrants)||maxGrants<1||maxGrants>1000||typeof onInvalid!=='function')throw Error('Invalid home authority configuration');
 const grants=new Map(),nonces=new Map(),limits=new Map(),gate=new AdmissionGate(admissionOptions);
 let closed=false;
 const mac=value=>crypto.createHmac('sha256',key).update(value).digest('hex');
 const opaque=value=>crypto.createHmac('sha256',key).update('admission\n'+value).digest('base64url');
 function revoke(sid){const grant=grants.get(sid);if(!grant)return;grants.delete(sid);grant.revoked=true;onInvalid(sid);}
 function sweep(){const now=clock();for(const [sid,grant]of grants)if(grant.until<=now||grant.expiresAt<=now)revoke(sid);
  for(const [nonce,until]of nonces)if(until<=now)nonces.delete(nonce);for(const [id,limit]of limits)if(limit.until<=now)limits.delete(id);}
 function rate(id){
  let entry=limits.get(id);if(!entry||entry.until<=clock()){if(limits.size>=5000)sweep();if(limits.size>=5000)throw unavailable();entry={until:clock()+60000,count:0};limits.set(id,entry);}
  if(++entry.count>90)throw new GatewayError(429,'rate_limited',1);
 }
 function live(sid){const grant=typeof sid==='string'&&SID.test(sid)?grants.get(sid):null;
  if(!grant||grant.revoked)return null;if(closed||grant.until<=clock()||grant.expiresAt<=clock()){revoke(sid);return null;}return grant;}
 async function open(authorization,{previousSid,signal}={}){
  if(closed)throw unavailable();const preauth=await verify.preflight(authorization),account=opaque(preauth.identifier);
  const prior=live(previousSid);if(prior&&prior.account!==account)revoke(prior.sid);rate(account);
  const renewing=prior&&!prior.revoked?prior:null,revision=renewing?++renewing.revision:null;
  if(renewing)renewing.pendingOpen=revision;
  let release;
  try{
   release=await gate.acquire(account,{signal});
   if(closed||signal?.aborted)throw unavailable();
   const auth=await verify(authorization);if(auth.identifier!==preauth.identifier)throw denied();
   const current=validateIdentity({version:1,checkedAt:clock(),identity:await lookup(auth.schoolIdentifier??auth.identifier)},clock());
   if(!current)throw denied();
   const checked=await verify.preflight(authorization);
   if(closed||signal?.aborted||checked.identifier!==auth.identifier||!Number.isSafeInteger(auth.expiresAt)||auth.expiresAt<=clock())throw denied();
   if(renewing&&(live(previousSid)!==renewing||renewing.revision!==revision))throw denied();
   const previous=live(previousSid),expiresAt=auth.expiresAt;
   if(previous&&(previous.account!==account||previous.identity.sub!==current.sub))revoke(previous.sid);
   let grant=previous&&!previous.revoked?previous:null;
   if(!grant){
    sweep();if(grants.size>=maxGrants||[...grants.values()].filter(value=>value.account===account).length>=4)throw unavailable();
    grant={sid:crypto.randomBytes(20).toString('hex'),account,createdAt:clock(),revoked:false,revision:0,pendingOpen:0};grants.set(grant.sid,grant);
   }
   Object.assign(grant,{identifier:auth.schoolIdentifier??auth.identifier,identity:current,pendingOpen:0,expiresAt:Math.min(expiresAt,grant.createdAt+2*60*60*1000),until:Math.min(expiresAt,grant.createdAt+2*60*60*1000,clock()+45000)});
   return {sid:grant.sid,validUntil:grant.until,ticket:ticket(grant)};
  }catch(error){
   // A failed fresh renewal cannot preserve this account's previous authorization.
   const old=typeof previousSid==='string'?grants.get(previousSid):null;if(old&&old.account===account&&(!renewing||renewing.revision===revision))revoke(previousSid);
   throw error;
  }finally{release?.();}
 }
 function ticket(grant){
  const now=Math.floor(clock()/1000),expires=Math.floor(grant.until/1000);if(expires<=now)throw denied();
  const alias='Schlossfreund '+mac('alias\n'+grant.identity.sub).slice(0,8).toUpperCase();
  const claim={v:1,iss:'wvh-portal',aud:'sternenhueter',iat:now,exp:Math.min(now+90,expires),nonce:crypto.randomBytes(20).toString('hex'),sid:grant.sid,...grant.identity,alias};
  const encoded=Buffer.from(JSON.stringify(claim)).toString('base64url');return encoded+'.'+mac(encoded);
 }
 async function check(raw,headers){
  if(closed||typeof raw!=='string'||Buffer.byteLength(raw)>8192)throw denied();
  const timestamp=headers.timestamp,nonce=headers.nonce,signature=headers.signature;
  if(typeof timestamp!=='string'||!/^[1-9][0-9]{9,11}$/.test(timestamp)||Math.abs(Math.floor(clock()/1000)-Number(timestamp))>30||
    typeof nonce!=='string'||!SID.test(nonce)||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||
    !crypto.timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(mac(timestamp+'\n'+nonce+'\n'+raw),'hex')))throw denied();
  sweep();if(nonces.has(nonce))throw denied();if(nonces.size>=4096)throw unavailable();nonces.set(nonce,clock()+60000);
  let input;try{input=JSON.parse(raw);}catch{throw denied();}
  if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='sid,subject'||typeof input.subject!=='string'||
    !/^wvh:(?:student|family|staff):[1-9][0-9]{0,15}$/.test(input.subject)||typeof input.sid!=='string'||!SID.test(input.sid))throw denied();
  let grant=live(input.sid),identity=null;
  if(grant&&grant.identity.sub===input.subject){
   const version=grant.revision;
   const release=await gate.acquire(grant.account);
   try{
    const current=validateIdentity({version:1,checkedAt:clock(),identity:await lookup(grant.identifier)},clock());
    if(live(grant.sid)===grant){
     if(grant.revision!==version){if(grant.pendingOpen)throw unavailable();identity=grant.identity;}
     else if(!current||current.sub!==input.subject){revoke(grant.sid);grant=null;}
     else{grant.identity=current;identity=current;}
    }
   }catch(error){if(grant?.revision===version)revoke(input.sid);throw error;}finally{release();}
  }
  const result=identity?{subject:input.subject,sid:input.sid,active:true,expires:Math.floor(grant.expiresAt/1000),...identity}:
   {subject:input.subject,sid:input.sid,active:false};
  delete result.sub;
  const body=JSON.stringify(result);return {body,signature:mac(nonce+'\n'+body)};
 }
 return {open,check,valid:sid=>!!live(sid),revoke,sweep,
  // Restart deliberately restores no browser grants, identity snapshots or unattended visits.
  close(){if(closed)return;closed=true;gate.close();for(const sid of [...grants.keys()])revoke(sid);nonces.clear();limits.clear();}};
}
module.exports={createHomeAuthority};
