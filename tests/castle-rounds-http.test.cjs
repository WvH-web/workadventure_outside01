'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {checkedCatalog}=require('./fixtures/castle-offers.cjs');
const secret='synthetic-round-directory-secret-not-used-in-production';
async function fixture(run){
  let now=1794196800000,calls=0;
  const profiles=new Map(),clock=()=>now;
  const pupil=extra=>({version:1,kind:'student',eligible:true,age:13,gradeLevel:7,classId:17,checkedAt:now,...extra});
  const lookup=async identifier=>{calls++;const value=profiles.get(identifier);if(value instanceof Error)throw value;return pupil(value||{});};
  const server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret,trustedProxyIps:[]},lookup,
    getOffers:async()=>checkedCatalog(now),updateRoomLink:async()=>({updated:true}),clock,verify:createSchoolVerifier(secret,{clock})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/castle-school/';
  const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
  async function headers(id='a',extra={}){
    const token=await new SignJWT({identifier:id+'@invalid.local',username:'Private pupil name',tags:['teacher'],...extra})
      .setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(now/1000)+3600).sign(new TextEncoder().encode(secret));
    return {Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin'};
  }
  async function api(route,body,who='a'){
    const response=await fetch(base+route,{headers:await headers(who),method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,value:await response.json(),headers:response.headers};
  }
  try{await run({api,base,headers,profiles,pupil,clock,calls:()=>calls,advance:ms=>{now+=ms;}});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
const create={targetId:'bibliothek-lesekamin',kind:'read',capacity:4};
test('real HTTP exposes only voluntary registrations, no raw identities or class policy, and requires fresh pupil access',async()=>fixture(async f=>{
  const first=await f.api('round-context');assert.equal(first.status,200);assert.equal(first.value.rounds.length,0);assert.equal(first.value.targets.length,43);
  const made=await f.api('round-create',create);assert.equal(made.status,200);const lease=made.value.leaseId;
  const peer=await f.api('round-context',undefined,'b');assert.equal(peer.status,200);assert.equal(peer.value.rounds[0].registered,1);
  const payload=JSON.stringify(peer.value);
  for(const value of ['@invalid.local','Private pupil name','classId','gradeLevel','"age"',lease,'Bearer '])assert.ok(!payload.includes(value),value);
  assert.equal(peer.headers.get('cache-control'),'no-store');assert.equal(f.calls(),3);
}));
test('normal join, visit, heartbeat, reentry and leave use the same round while a departed first participant is not required',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),id=a.value.round.id;
  const visit=await f.api('round-visit',{roundId:id},'c');assert.equal(visit.status,200);assert.equal(visit.value.round.registered,1);assert.ok(!visit.value.leaseId);
  const b=await f.api('round-join',{roundId:id},'b');assert.equal(b.status,200);assert.equal(b.value.round.registered,2);
  assert.equal((await f.api('round-leave',{leaseId:a.value.leaseId})).status,200);
  const active=await f.api('round-heartbeat',{leaseId:b.value.leaseId},'b');assert.equal(active.status,200);assert.equal(active.value.round.hosting,true);
  const renewed=await f.api('round-join',{roundId:id},'b');assert.notEqual(renewed.value.leaseId,b.value.leaseId);
  assert.equal((await f.api('round-leave',{leaseId:b.value.leaseId},'b')).status,409);
  assert.equal((await f.api('round-heartbeat',{leaseId:renewed.value.leaseId},'b')).status,200);
}));
test('an old valid context is not permission to discover, join or visit another school cohort',async()=>fixture(async f=>{
  f.profiles.set('a@invalid.local',{age:9,gradeLevel:3,classId:99});
  const ms=await f.api('round-create',{targetId:'mittelstufe-spieltisch',kind:'chess',capacity:2},'b');assert.equal(ms.status,200);
  const directory=await f.api('round-context');assert.equal(directory.status,200);assert.equal(directory.value.rounds.length,0);
  assert.ok(directory.value.targets.some(target=>target.mapId==='grundschule'));assert.ok(!directory.value.targets.some(target=>target.mapId==='mittelstufe'));
  for(const route of ['round-visit','round-join'])assert.equal((await f.api(route,{roundId:ms.value.round.id})).status,403);
  assert.equal((await f.api('round-create',{targetId:'mittelstufe-spieltisch',kind:'chess',capacity:2})).status,403);
}));
test('fresh revocation or lookup failure immediately removes the caller registration rather than using cached permission',async()=>fixture(async f=>{
  const a=await f.api('round-create',create);const id=a.value.round.id;
  const b=await f.api('round-join',{roundId:id},'b');f.profiles.set('a@invalid.local',new Error('private database details'));
  const failed=await f.api('round-heartbeat',{leaseId:a.value.leaseId});assert.equal(failed.status,503);assert.deepEqual(failed.value,{error:'unavailable'});
  const after=await f.api('round-context',undefined,'b');assert.equal(after.value.rounds[0].registered,1);assert.equal(after.value.rounds[0].hosting,true);
  f.profiles.set('b@invalid.local',{eligible:false,age:null,gradeLevel:null,classId:null});
  assert.equal((await f.api('round-heartbeat',{leaseId:b.value.leaseId},'b')).status,403);
  const observer=await f.api('round-context',undefined,'c');assert.equal(observer.value.rounds.length,0);
}));
test('signed teacher tags, parent profiles, foreign leases and injected URLs or roles cannot create access',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),id=a.value.round.id;
  assert.equal((await f.api('round-close',{roundId:id},'b')).status,403);
  assert.equal((await f.api('round-leave',{leaseId:a.value.leaseId},'b')).status,409);
  const before=f.calls();
  for(const extra of [{age:99},{classId:17},{role:'staff'},{targetUrl:'https://evil.invalid/'},{expiresAt:9999999999999},{name:'Injected pupil'}])
    assert.equal((await f.api('round-create',{...create,...extra},'b')).status,400);
  assert.equal(f.calls(),before);
  f.profiles.set('b@invalid.local',{kind:'parent',age:null,gradeLevel:null,classId:null});
  assert.equal((await f.api('round-context',undefined,'b')).status,403);
}));
test('moderation requires a fresh staff profile and clears only the selected announcement',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),b=await f.api('round-create',{...create,targetId:'bibliothek-buchclub'},'b');
  f.profiles.set('staff@invalid.local',{kind:'staff',age:null,gradeLevel:null,classId:null});
  assert.equal((await f.api('round-close',{roundId:a.value.round.id},'staff')).status,200);
  const list=await f.api('round-context',undefined,'staff');assert.equal(list.value.rounds.length,1);assert.equal(list.value.rounds[0].id,b.value.round.id);
  f.profiles.set('staff@invalid.local',{eligible:false,kind:'staff',age:null,gradeLevel:null,classId:null});
  assert.equal((await f.api('round-close',{roundId:b.value.round.id},'staff')).status,403);
}));
test('round endpoints reject absent or forged tokens, cross-origin calls, query tokens and malformed request shapes',async()=>fixture(async f=>{
  const headers=await f.headers();
  assert.equal((await fetch(f.base+'round-context')).status,401);
  assert.equal((await fetch(f.base+'round-context',{headers:{...headers,Authorization:'Bearer forged'}})).status,401);
  for(const extra of [{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'cross-site'}])
    assert.equal((await fetch(f.base+'round-context',{headers:{...headers,...extra}})).status,403);
  assert.equal((await fetch(f.base+'round-context?token=not-allowed',{headers})).status,404);
  assert.equal((await fetch(f.base+'round-create',{headers})).status,405);
  for(const body of ['null','[]','{}','{"leaseId":"bad"}'])
    assert.equal((await fetch(f.base+'round-heartbeat',{method:'POST',headers,body})).status,400);
  assert.equal((await fetch(f.base+'round-create',{method:'POST',headers,body:'x'.repeat(5000)})).status,413);
}));
test('owned round and presence pages are frame-scoped with no media capture or private-file serving',async()=>fixture(async f=>{
  for(const page of ['rounds','rounds.js','round-client.js','presence','presence.js','round-rooms/bibliothek.webp']){
    const response=await fetch(f.base+page);assert.equal(response.status,200);assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
    assert.equal(response.headers.get('permissions-policy'),'microphone=(), camera=(), display-capture=()');
  }
  for(const page of ['round-targets.json','rounds.cjs','public/presence.js','round-rooms/../../profile.php'])assert.equal((await fetch(f.base+page)).status,404);
}));
