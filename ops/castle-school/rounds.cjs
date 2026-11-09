'use strict';
const crypto=require('node:crypto');
const {validateProfile,validateRules,decision}=require('./policy.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const KINDS=Object.freeze({talk:'Gespraechsrunde',read:'Leserunde',story:'Erzaehlkarten',chess:'Schach',draw:'Gemeinsam zeichnen'});
const TOKEN=/^[a-f0-9]{48}$/;
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function validateTargets(input){
  if(!Array.isArray(input)||!input.length||input.length>100)throw Error('Invalid round catalog');
  const seen=new Set();
  return Object.freeze(input.map(target=>{
    const keys=['id','mapId','location','label','group','bounds','arrivals','capacity','kinds','rule'];
    if(!target||Array.isArray(target)||Object.keys(target).sort().join(',')!==keys.sort().join(',')||
      typeof target.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(target.id)||seen.has(target.id)||
      typeof target.mapId!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(target.mapId)||!['location','label','group'].every(key=>typeof target[key]==='string'&&target[key].length>0&&target[key].length<=120)||
      !Number.isInteger(target.capacity)||target.capacity<2||target.capacity>12||
      !Array.isArray(target.kinds)||!target.kinds.length||new Set(target.kinds).size!==target.kinds.length||!target.kinds.every(kind=>typeof kind==='string'&&Object.hasOwn(KINDS,kind))||
      !target.bounds||Object.keys(target.bounds).sort().join(',')!=='height,width,x,y'||!['x','y','width','height'].every(key=>Number.isFinite(target.bounds[key])&&target.bounds[key]>=0)||
      !target.bounds.width||!target.bounds.height||!Array.isArray(target.arrivals)||!target.arrivals.length||target.arrivals.length>12||
      !target.arrivals.every(point=>point&&Object.keys(point).sort().join(',')==='x,y'&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&
        point.x>=target.bounds.x&&point.x<target.bounds.x+target.bounds.width&&point.y>=target.bounds.y&&point.y+16<target.bounds.y+target.bounds.height))throw Error('Invalid round target');
    const rule=validateRules([target.rule])[0];if(rule.id!==target.id)throw Error('Invalid round rule');
    seen.add(target.id);return Object.freeze({...target,rule,kinds:Object.freeze([...target.kinds]),
      bounds:Object.freeze({...target.bounds}),arrivals:Object.freeze(target.arrivals.map(point=>Object.freeze({...point})))});
  }));
}
class RoundBoard{
  constructor({targets,clock=Date.now,leaseMs=90000,lifetimeMs=2*60*60*1000,maxMembers=1000}={}){
    if(!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>120000||!Number.isSafeInteger(lifetimeMs)||lifetimeMs<leaseMs||lifetimeMs>4*60*60*1000||
      !Number.isSafeInteger(maxMembers)||maxMembers<1||maxMembers>2000)throw Error('Invalid round limits');
    this.targets=validateTargets(targets);this.byTarget=new Map(this.targets.map(target=>[target.id,target]));
    this.clock=clock;this.leaseMs=leaseMs;this.lifetimeMs=lifetimeMs;this.maxMembers=maxMembers;
    this.salt=crypto.randomBytes(32);this.rounds=new Map();this.members=new Map();this.slots=new Map();
  }
  principal(auth){
    const identifier=auth?.schoolIdentifier||auth?.identifier;
    if(typeof identifier!=='string'||!identifier||identifier.length>320)throw new GatewayError(401,'unauthorized');
    return crypto.createHmac('sha256',this.salt).update(identifier).digest('hex');
  }
  remove(id){
    const member=this.members.get(id);if(!member)return;
    this.members.delete(id);const round=this.rounds.get(member.roundId);if(!round)return;
    round.members.delete(id);if(!round.members.size){this.rounds.delete(round.id);this.slots.delete(round.targetId);}
  }
  revoke(auth){this.remove(this.principal(auth));}
  sweep(){
    const now=this.clock();
    for(const [id,member]of this.members)if(member.until<=now||!this.rounds.has(member.roundId)||this.rounds.get(member.roundId).endsAt<=now)this.remove(id);
  }
  caller(auth,profile){
    this.sweep();const id=this.principal(auth);
    try{
      validateProfile(profile,this.clock());
      if(!profile.eligible||!['student','staff'].includes(profile.kind)||!Number.isFinite(auth.expiresAt)||auth.expiresAt<=this.clock())throw new GatewayError(403,'not_allowed');
      const member=this.members.get(id),target=member&&this.byTarget.get(this.rounds.get(member.roundId)?.targetId);
      if(member&&(!target||!decision(profile,target.rule).allowed))this.remove(id);
      else if(member)member.staff=profile.kind==='staff';
      return id;
    }catch(error){this.remove(id);throw error;}
  }
  target(profile,id){
    const target=this.byTarget.get(id);
    if(!target||!decision(profile,target.rule).allowed)throw new GatewayError(403,'not_allowed');
    return target;
  }
  visible(round,id){
    const target=this.byTarget.get(round.targetId),members=[...round.members.values()];
    return {id:round.id,targetId:target.id,kind:round.kind,title:KINDS[round.kind],location:target.location,label:target.label,
      mapId:target.mapId,capacity:round.capacity,registered:members.length,staffRegistered:members.some(member=>member.staff),
      mine:round.members.has(id),hosting:round.members.keys().next().value===id,createdAt:round.createdAt,endsAt:round.endsAt};
  }
  context(auth,profile){
    const id=this.caller(auth,profile),targets=this.targets.filter(target=>decision(profile,target.rule).allowed);
    const allowed=new Set(targets.map(target=>target.id));
    return {account:{kind:profile.kind,schoolAccount:true},kinds:KINDS,
      targets:targets.map(({id,mapId,location,label,capacity,kinds})=>({id,mapId,location,label,capacity,kinds})),
      rounds:[...this.rounds.values()].filter(round=>allowed.has(round.targetId)).map(round=>this.visible(round,id)),
      me:this.members.has(id)?{roundId:this.members.get(id).roundId}:null,checkedAt:this.clock()};
  }
  attach(auth,profile,id,round){
    const previous=this.members.get(id);
    if(previous&&previous.roundId!==round.id)throw new GatewayError(409,'already_joined');
    if(!previous&&this.members.size>=this.maxMembers)throw new GatewayError(503,'unavailable');
    if(!previous&&round.members.size>=round.capacity)throw new GatewayError(409,'round_full');
    const member={roundId:round.id,lease:crypto.randomBytes(24).toString('hex'),
      until:Math.min(this.clock()+this.leaseMs,auth.expiresAt,round.endsAt),staff:profile.kind==='staff'};
    this.members.set(id,member);round.members.set(id,member);return this.membership(id,member);
  }
  membership(id,member){
    const round=this.rounds.get(member.roundId),target=this.byTarget.get(round.targetId);
    const index=[...round.members.keys()].indexOf(id),arrival=target.arrivals[index%target.arrivals.length];
    return {leaseId:member.lease,expiresAt:member.until,round:this.visible(round,id),
      destination:{mapId:target.mapId,group:target.group,bounds:target.bounds,arrival,
        playUri:'https://together.deine-schule.com/~/castle-preview/'+target.mapId+'.wam#start'},checkedAt:this.clock()};
  }
  visit(auth,profile,{roundId}){
    const id=this.caller(auth,profile),round=this.rounds.get(roundId);
    if(!ID.test(roundId)||!round)throw new GatewayError(404,'round_missing');
    const target=this.target(profile,round.targetId);
    return {round:this.visible(round,id),destination:{mapId:target.mapId,group:target.group,bounds:target.bounds,arrival:target.arrivals[0],
      playUri:'https://together.deine-schule.com/~/castle-preview/'+target.mapId+'.wam#start'},checkedAt:this.clock()};
  }
  create(auth,profile,{targetId,kind,capacity}){
    const id=this.caller(auth,profile),target=this.target(profile,targetId);
    if(!target.kinds.includes(kind)||!Number.isInteger(capacity)||capacity<2||capacity>target.capacity)throw new GatewayError(400,'invalid_request');
    if(this.members.has(id))throw new GatewayError(409,'already_joined');
    if(this.slots.has(target.id))throw new GatewayError(409,'round_exists');
    if(this.members.size>=this.maxMembers)throw new GatewayError(503,'unavailable');
    const now=this.clock(),round={id:crypto.randomUUID(),targetId:target.id,kind,capacity,createdAt:now,endsAt:now+this.lifetimeMs,members:new Map()};
    this.rounds.set(round.id,round);this.slots.set(target.id,round.id);
    try{return this.attach(auth,profile,id,round);}catch(error){this.rounds.delete(round.id);this.slots.delete(target.id);throw error;}
  }
  join(auth,profile,{roundId}){
    const id=this.caller(auth,profile),round=this.rounds.get(roundId);
    if(!ID.test(roundId)||!round)throw new GatewayError(404,'round_missing');
    this.target(profile,round.targetId);return this.attach(auth,profile,id,round);
  }
  current(auth,profile,{leaseId},renew){
    const id=this.caller(auth,profile),member=this.members.get(id);
    if(!TOKEN.test(leaseId)||!member||member.lease!==leaseId)throw new GatewayError(409,'stale_membership');
    if(renew){member.until=Math.min(this.clock()+this.leaseMs,auth.expiresAt,this.rounds.get(member.roundId).endsAt);member.staff=profile.kind==='staff';}
    return this.membership(id,member);
  }
  heartbeat(auth,profile,body){return this.current(auth,profile,body,true);}
  leave(auth,profile,body){const member=this.current(auth,profile,body,false);this.remove(this.principal(auth));return {left:true,roundId:member.round.id};}
  close(auth,profile,{roundId}){
    this.caller(auth,profile);if(profile.kind!=='staff')throw new GatewayError(403,'not_allowed');
    const round=this.rounds.get(roundId);if(!ID.test(roundId)||!round)throw new GatewayError(404,'round_missing');
    this.target(profile,round.targetId);for(const id of [...round.members.keys()])this.remove(id);return {closed:true};
  }
  dispose(){this.rounds.clear();this.members.clear();this.slots.clear();}
}
module.exports={RoundBoard,validateTargets,KINDS};
