'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {RoundBoard}=require('../ops/castle-school/rounds.cjs');
const {checkedCatalog}=require('./fixtures/castle-offers.cjs');
const targets=require('../ops/castle-school/round-targets.json');
function fixture(){
  let now=Date.UTC(2026,10,11,12);
  const board=new RoundBoard({targets,clock:()=>now,leaseMs:1000});
  const auth=id=>({identifier:id+'@invalid.local',expiresAt:now+3600000});
  const profile=extra=>({version:1,kind:'student',eligible:true,age:16,gradeLevel:10,classId:17,checkedAt:now,...extra});
  const offers=patch=>checkedCatalog(now,patch);
  const create=id=>board.create(auth(id),profile(),{targetId:'spielesaal-lesekamin',kind:'talk',capacity:4});
  const a=create('a'),b=board.join(auth('b'),profile(),{roundId:a.round.id});
  const confirm=(who='a',lease=a,patch={})=>board.confirmGame(auth(who),profile(),{leaseId:lease.leaseId,resourceId:'gamesarea01',revision:1,
    targetUrl:'https://games.example.test/room/?code=one',...patch},offers());
  const view=(who='b',list=offers(),extra={})=>board.context(auth(who),profile(extra),list).rounds[0];
  const launch=(who='b',list=offers())=>board.launchGame(auth(who),profile(),{roundId:a.round.id},list);
  return {board,auth,profile,offers,a,b,confirm,view,launch,advance:ms=>{now+=ms;}};
}
test('a voluntary host confirms the exact central link, while observers receive no URL, lease or identity',()=>{
  const f=fixture();assert.throws(()=>f.launch(),e=>e.code==='game_not_ready');
  f.confirm();const row=f.view();assert.equal(row.game.state,'confirmed');assert.equal(row.game.mineHost,false);
  assert.equal(f.view('a').game.mineHost,true);assert.equal(f.launch().targetUrl,'https://games.example.test/room/?code=one');
  const publicValue=JSON.stringify(row);
  for(const privateValue of ['@invalid.local','targetUrl','code=one',f.a.leaseId,f.board.principal(f.auth('a'))])assert.ok(!publicValue.includes(privateValue));
});
test('the host leaving ends only its game confirmation, not the peer conversation or registration',()=>{
  const f=fixture();f.confirm();f.board.leave(f.auth('a'),f.profile(),{leaseId:f.a.leaseId});
  assert.equal(f.view().registered,1);assert.equal(f.view().hosting,true);assert.equal(f.view().game.state,'waiting');
  assert.throws(()=>f.launch(),e=>e.code==='game_not_ready');
  f.confirm('b',f.b);assert.equal(f.launch().roundId,f.a.round.id);
});
test('host expiration cannot be renewed by a peer and does not invent a successor game host',()=>{
  const f=fixture();f.confirm();f.advance(600);f.board.heartbeat(f.auth('b'),f.profile(),{leaseId:f.b.leaseId});f.advance(400);
  assert.equal(f.view().registered,1);assert.equal(f.view().game.state,'waiting');assert.equal(f.view().game.mineHost,false);
  assert.throws(()=>f.launch(),e=>e.code==='game_not_ready');
});
test('ending a game needs the host nonce; other members cannot end or take over an active confirmation',()=>{
  const f=fixture();f.confirm();
  assert.throws(()=>f.confirm('b',f.b),e=>e.code==='game_hosted');
  assert.throws(()=>f.board.endGame(f.auth('b'),f.profile(),{leaseId:f.b.leaseId}),e=>e.code==='game_not_host');
  assert.throws(()=>f.board.endGame(f.auth('b'),f.profile(),{leaseId:f.a.leaseId}),e=>e.code==='stale_membership');
  assert.equal(f.board.endGame(f.auth('a'),f.profile(),{leaseId:f.a.leaseId}).ended,true);
  assert.equal(f.view().registered,2);assert.equal(f.view().game.state,'waiting');
});
test('explicit same-account reentry requires a new confirmation and old lease commands cannot affect it',()=>{
  const f=fixture();f.confirm();const again=f.board.join(f.auth('a'),f.profile(),{roundId:f.a.round.id});
  assert.equal(f.view().game.state,'waiting');assert.throws(()=>f.confirm(),e=>e.code==='stale_membership');
  f.confirm('a',again);assert.throws(()=>f.board.endGame(f.auth('a'),f.profile(),{leaseId:f.a.leaseId}),e=>e.code==='stale_membership');
  assert.equal(f.view().game.state,'confirmed');
});
test('a changed central URL or revision cannot be launched or silently confirmed from an old displayed link',()=>{
  const f=fixture();f.confirm();
  for(const patch of [{targetUrl:'https://games.example.test/room/?code=two'},{revision:2}]){
    const offers=f.offers({gamesarea01:patch});assert.equal(f.view('b',offers).game.state,'waiting');
    assert.throws(()=>f.launch('b',offers),e=>e.code==='game_not_ready');
    assert.throws(()=>f.board.confirmGame(f.auth('a'),f.profile(),{leaseId:f.a.leaseId,resourceId:'gamesarea01',revision:1,
      targetUrl:'https://games.example.test/room/?code=one'},offers),e=>e.code==='game_changed');
  }
  f.board.invalidateGame('gamesarea01');assert.equal(f.view().game.state,'waiting');
});
test('fresh game rules are checked on launch and host renewal, without exposing a restricted game title',()=>{
  const f=fixture();f.confirm();
  const revoked=f.offers({gamesarea01:{rule:{published:false}}});
  assert.deepEqual(f.view('b',revoked).game,{state:'restricted'});
  assert.throws(()=>f.launch('b',revoked),e=>e.code==='not_allowed');
  f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:f.a.leaseId},revoked);
  assert.equal(f.view().registered,2);assert.equal(f.view().game.state,'waiting');
});
test('a missing catalog cannot advertise or extend game confirmation, but a chat heartbeat can still renew',()=>{
  const f=fixture();f.confirm();assert.deepEqual(f.view('b',null).game,{state:'unavailable'});
  f.advance(400);const renewed=f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:f.a.leaseId});
  assert.equal(renewed.expiresAt,f.a.expiresAt+400);assert.equal(f.view().game.state,'waiting');
});
test('late catalog reads cannot clear a newer explicit confirmation',()=>{
  const f=fixture(),before=f.board.gameVersion(f.auth('a'));f.confirm();
  f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:f.a.leaseId},undefined,before);
  assert.equal(f.view().game.state,'confirmed');
  const observed=f.board.gameVersion(f.auth('a'));f.confirm();
  f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:f.a.leaseId},f.offers({gamesarea01:{revision:2}}),observed);
  assert.equal(f.view().game.state,'confirmed');
  assert.equal(f.view('b',f.offers({gamesarea01:{revision:2}})).game.state,'waiting');
  assert.equal(f.view().game.state,'confirmed','An old context is read-only and cannot invalidate the new state');
});
test('only registered members with the actual target and game permission can launch or confirm',()=>{
  const f=fixture();f.confirm();
  assert.throws(()=>f.launch('visitor'),e=>e.code==='not_allowed');
  for(const extra of [{age:15},{gradeLevel:9},{classId:18}]){
    assert.deepEqual(f.view('b',f.offers(),extra).game,{state:'restricted'});
    assert.throws(()=>f.board.launchGame(f.auth('b'),f.profile(extra),{roundId:f.a.round.id},f.offers()),e=>e.code==='not_allowed');
  }
  assert.throws(()=>f.confirm('a',f.a,{resourceId:'gamesarea02'}),e=>e.code==='not_allowed');
});
test('reading or launching a game does not renew either participant lease',()=>{
  const f=fixture();f.confirm();f.advance(400);f.launch();f.view();
  assert.equal(f.board.members.get(f.board.principal(f.auth('a'))).until,f.a.expiresAt);
  assert.equal(f.board.members.get(f.board.principal(f.auth('b'))).until,f.b.expiresAt);
  f.advance(600);assert.equal(f.board.context(f.auth('visitor'),f.profile(),f.offers()).rounds.length,0);
});
test('game hosting is explicit rather than inherited from the first conversation registration',()=>{
  const f=fixture();f.confirm('b',f.b);assert.equal(f.view('b').hosting,false);assert.equal(f.view('b').game.mineHost,true);
  f.board.leave(f.auth('a'),f.profile(),{leaseId:f.a.leaseId});assert.equal(f.view('b').game.state,'confirmed');
  f.board.endGame(f.auth('b'),f.profile(),{leaseId:f.b.leaseId});assert.equal(f.view('b').game.state,'waiting');
});
test('an empty bundled summary grants no membership, while an existing round still requires token expiry',()=>{
  const f=fixture(),withoutExpiry={identifier:'visitor@invalid.local'};
  assert.equal(f.board.own(withoutExpiry,f.profile(),f.offers()),null);
  assert.throws(()=>f.board.own({identifier:'a@invalid.local'},f.profile(),f.offers()),error=>error.code==='not_allowed');
  assert.equal(f.board.members.has(f.board.principal(f.auth('a'))),false);
  assert.equal(f.board.own(f.auth('b'),f.profile(),f.offers()).registered,1);
});
