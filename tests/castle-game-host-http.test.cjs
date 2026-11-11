'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {checkedCatalog}=require('./fixtures/castle-offers.cjs');
const {SignJWT}=require('node:module').createRequire(require.resolve('../ops/hall-audio/auth.cjs'))('jose');
async function fixture(run){
  let now=Date.UTC(2026,10,11,12),catalogPatch={},catalogError=false,profileError=false,reads=0,hold;
  const origin='https://together.deine-schule.com',secret='isolated-hosted-game-http-fixture',profiles=new Map();
  const getOffers=async()=>{reads++;if(catalogError)throw Error('private upstream details');const snapshot=checkedCatalog(now,catalogPatch);
    if(hold){const waiting=hold;hold=null;waiting.entered();await waiting.gate;}return snapshot;};
  const server=createSchoolServer({config:{origin,secret,trustedProxyIps:[]},clock:()=>now,verify:createSchoolVerifier(secret,{clock:()=>now}),
    lookup:async id=>{if(profileError)throw Error('private profile failure');return {version:1,eligible:true,kind:'student',age:16,gradeLevel:10,classId:17,checkedAt:now,...profiles.get(id)};},getOffers,
    updateRoomLink:async body=>{catalogPatch={gamesarea01:{targetUrl:body.targetUrl}};return {updated:true};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/castle-school/';
  async function api(route,body,who='a'){
    const token=await new SignJWT({identifier:who+'@invalid.local',tags:['teacher']}).setProtectedHeader({alg:'HS256'})
      .setExpirationTime(Math.floor(now/1000)+3600).sign(new TextEncoder().encode(secret));
    const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,Origin:origin,'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,value:await response.json()};
  }
  try{await run({api,profiles,reads:()=>reads,patch:value=>{catalogPatch=value;},failCatalog:value=>{catalogError=value;},failProfile:value=>{profileError=value;},advance:ms=>{now+=ms;},
    holdCatalog:()=>{let entered,release;const observed=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});hold={entered,gate};return {observed,release};}});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
const create={targetId:'spielesaal-lesekamin',kind:'talk',capacity:4};
const confirmation=leaseId=>({leaseId,resourceId:'gamesarea01',revision:1,targetUrl:'https://games.example.test/room/?code=one'});
test('real authenticated HTTP binds a host to its membership and freshly resolves the central URL for its peer',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),roundId=a.value.round.id;
  const b=await f.api('round-join',{roundId},'b');assert.equal(b.status,200);
  assert.equal((await f.api('round-game-confirm',confirmation(a.value.leaseId))).status,200);
  assert.equal((await f.api('round-context',undefined,'b')).value.rounds[0].game.state,'confirmed');
  const launch=await f.api('round-game-launch',{roundId},'b');assert.equal(launch.status,200);assert.equal(launch.value.targetUrl,confirmation('').targetUrl);
  assert.equal((await f.api('round-game-launch',{roundId},'visitor')).status,403);
  await f.api('round-leave',{leaseId:a.value.leaseId});
  assert.equal((await f.api('round-game-launch',{roundId},'b')).status,409);
  assert.equal((await f.api('round-context',undefined,'b')).value.rounds[0].registered,1);
}));
test('all new bodies are exact and cannot inject a provider, role, lease or classroom',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),body=confirmation(a.value.leaseId),before=f.reads();
  for(const patch of [{role:'staff'},{classId:17},{expiresAt:9999999999999},{targetUrl:'javascript:alert(1)'},{revision:0},{resourceId:'evil'},{leaseId:'bad'}])
    assert.equal((await f.api('round-game-confirm',{...body,...patch})).status,400);
  assert.equal(f.reads(),before);
  assert.equal((await f.api('round-game-confirm',{...body,targetUrl:'https://evil.example.test/room/'})).status,409);
  assert.equal((await f.api('round-game-end',{leaseId:body.leaseId,role:'staff'})).status,400);
}));
test('a central link save invalidates confirmation immediately, even when the saved URL is unchanged',async()=>fixture(async f=>{
  const a=await f.api('round-create',create);await f.api('round-game-confirm',confirmation(a.value.leaseId));
  assert.equal((await f.api('room-link',{resourceId:'gamesarea01',targetUrl:confirmation('').targetUrl,pin:'0000'})).status,200);
  const after=await f.api('round-context');assert.equal(after.value.rounds[0].game.state,'waiting');
  assert.equal((await f.api('round-game-launch',{roundId:a.value.round.id})).status,409);
}));
test('catalog failure preserves ordinary conversation but cannot renew a game host or launch a stored URL',async()=>fixture(async f=>{
  const a=await f.api('round-create',create);await f.api('round-game-confirm',confirmation(a.value.leaseId));f.failCatalog(true);
  const context=await f.api('round-context');assert.equal(context.status,200);assert.deepEqual(context.value.rounds[0].game,{state:'unavailable'});
  assert.equal((await f.api('round-game-launch',{roundId:a.value.round.id})).status,503);
  assert.equal((await f.api('round-heartbeat',{leaseId:a.value.leaseId})).status,200);f.failCatalog(false);
  assert.equal((await f.api('round-context')).value.rounds[0].game.state,'waiting');
}));
test('fresh class revocation denies a direct game start, and failed host school lookup removes confirmation',async()=>fixture(async f=>{
  const a=await f.api('round-create',create),roundId=a.value.round.id;await f.api('round-join',{roundId},'b');
  await f.api('round-game-confirm',confirmation(a.value.leaseId));f.profiles.set('b@invalid.local',{classId:18});
  assert.equal((await f.api('round-game-launch',{roundId},'b')).status,403);
  const hidden=await f.api('round-context',undefined,'b');assert.deepEqual(hidden.value.rounds[0].game,{state:'restricted'});
  f.failProfile(true);assert.equal((await f.api('round-heartbeat',{leaseId:a.value.leaseId})).status,503);f.failProfile(false);
  f.profiles.delete('b@invalid.local');assert.equal((await f.api('round-context',undefined,'b')).value.rounds[0].game.state,'waiting');
}));
test('a pending older heartbeat cannot invalidate a newer explicitly confirmed central link',async()=>fixture(async f=>{
  const a=await f.api('round-create',create);await f.api('round-game-confirm',confirmation(a.value.leaseId));
  const held=f.holdCatalog(),heartbeat=f.api('round-heartbeat',{leaseId:a.value.leaseId});await held.observed;
  try{
    f.patch({gamesarea01:{revision:2,targetUrl:'https://games.example.test/room/?code=two'}});
    const current=await f.api('round-game-confirm',{...confirmation(a.value.leaseId),revision:2,targetUrl:'https://games.example.test/room/?code=two'});
    assert.equal(current.status,200);
  }finally{held.release();}
  assert.equal((await heartbeat).status,200);assert.equal((await f.api('round-context')).value.rounds[0].game.state,'confirmed');
  assert.equal((await f.api('round-game-launch',{roundId:a.value.round.id})).value.targetUrl,'https://games.example.test/room/?code=two');
}));
