'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {RoundBoard,validateTargets}=require('../ops/castle-school/rounds.cjs');
const targets=JSON.parse(fs.readFileSync(require.resolve('../ops/castle-school/round-targets.json')));
function fixture(options={}){
  let now=1000000;
  const board=new RoundBoard({targets,clock:()=>now,...options});
  const auth=(who,extra={})=>({identifier:who+'@invalid.local',name:'Never publish '+who,tags:['teacher'],expiresAt:now+3600000,...extra});
  const profile=(extra={})=>({version:1,kind:'student',eligible:true,age:13,gradeLevel:7,classId:17,checkedAt:now,...extra});
  const create=(who='a',extra={})=>board.create(auth(who),profile(),{targetId:'bibliothek-lesekamin',kind:'read',capacity:4,...extra});
  return {board,auth,profile,create,advance:ms=>{now+=ms;},now:()=>now};
}

test('round catalog contains only the sixteen public castle rooms and real group arrivals',()=>{
  const reviewed=validateTargets(targets);assert.equal(reviewed.length,49);
  assert.equal(new Set(reviewed.map(target=>target.mapId)).size,16);
  for(const target of reviewed){assert.ok(target.arrivals.length);assert.ok(target.kinds.includes('talk'));assert.ok(Object.isFrozen(target));}
  assert.ok(!reviewed.some(target=>/teacher|lehrerzimmer|secret|geheim/i.test(target.mapId)));
  assert.deepEqual(reviewed.find(target=>target.id==='grundschule-lesekamin').rule.gradeLevels,[1,2,3,4]);
  assert.ok(reviewed.find(target=>target.id==='atelier-buchclub').kinds.includes('draw'));
});

test('no fabricated rounds, names, ages, class ids or stored identities appear in the directory',()=>{
  const f=fixture();assert.deepEqual(f.board.context(f.auth('a'),f.profile()).rounds,[]);
  const joined=f.create();const value=f.board.context(f.auth('b'),f.profile());
  assert.equal(value.rounds[0].registered,1);assert.equal(value.rounds[0].mine,false);
  for(const privateValue of ['Never publish','@invalid.local','gradeLevel','classId','"age"',joined.leaseId,f.board.principal(f.auth('a'))])
    assert.ok(!JSON.stringify(value).includes(privateValue),privateValue);
  assert.equal(f.board.members.size,1);
});

test('a late participant joins the same announced table without modifying an actual game or creating a second round',()=>{
  const f=fixture(),a=f.create(),b=f.board.join(f.auth('b'),f.profile(),{roundId:a.round.id});
  assert.equal(a.round.id,b.round.id);assert.equal(b.round.registered,2);assert.notEqual(a.leaseId,b.leaseId);
  assert.equal(b.destination.playUri,'https://together.deine-schule.com/~/castle-preview/bibliothek.wam#start');
  assert.equal(b.destination.group,'lesekamin');assert.equal(f.board.rounds.size,1);
  assert.equal(f.board.context(f.auth('b'),f.profile()).me.roundId,a.round.id);
});

test('a visit is freshly permitted but does not count an unregistered visitor as a participant',()=>{
  const f=fixture(),a=f.create(),view=f.board.visit(f.auth('b'),f.profile(),{roundId:a.round.id});
  assert.equal(view.round.registered,1);assert.equal(view.round.mine,false);assert.ok(!Object.hasOwn(view,'leaseId'));
  assert.equal(f.board.members.size,1);
});

test('one verified account cannot inflate registrations, occupy multiple rounds or steal another account lease',()=>{
  const f=fixture(),a=f.create();
  assert.throws(()=>f.create('a',{targetId:'bibliothek-buchclub'}),error=>error.code==='already_joined');
  assert.throws(()=>f.board.heartbeat(f.auth('b'),f.profile(),{leaseId:a.leaseId}),error=>error.code==='stale_membership');
  assert.throws(()=>f.board.leave(f.auth('b'),f.profile(),{leaseId:a.leaseId}),error=>error.code==='stale_membership');
  assert.equal(f.board.members.size,1);assert.equal(f.board.rounds.size,1);
});

test('explicit same-account reentry rotates only its lease; a late old close cannot remove the replacement',()=>{
  const f=fixture(),a=f.create(),again=f.board.join(f.auth('a'),f.profile(),{roundId:a.round.id});
  assert.equal(again.round.registered,1);assert.notEqual(again.leaseId,a.leaseId);
  assert.throws(()=>f.board.leave(f.auth('a'),f.profile(),{leaseId:a.leaseId}),error=>error.code==='stale_membership');
  assert.equal(f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:again.leaseId}).round.registered,1);
});

test('one announcement per real table and exact bounded capacity prevent conflicting or fabricated occupancy',()=>{
  const f=fixture(),a=f.create('a',{capacity:2});
  assert.throws(()=>f.create('b'),error=>error.code==='round_exists');
  f.board.join(f.auth('b'),f.profile(),{roundId:a.round.id});
  assert.throws(()=>f.board.join(f.auth('c'),f.profile(),{roundId:a.round.id}),error=>error.code==='round_full');
  assert.equal(f.board.members.size,2);
  assert.throws(()=>f.create('c',{targetId:'bibliothek-buchclub',capacity:5}),error=>error.code==='invalid_request');
});

test('the first participant can leave while the rest keep the same round; the last departure removes it',()=>{
  const f=fixture(),a=f.create(),b=f.board.join(f.auth('b'),f.profile(),{roundId:a.round.id});
  f.board.leave(f.auth('a'),f.profile(),{leaseId:a.leaseId});
  const remaining=f.board.heartbeat(f.auth('b'),f.profile(),{leaseId:b.leaseId});
  assert.equal(remaining.round.id,a.round.id);assert.equal(remaining.round.hosting,true);assert.equal(remaining.round.registered,1);
  f.board.leave(f.auth('b'),f.profile(),{leaseId:b.leaseId});
  assert.equal(f.board.rounds.size,0);assert.equal(f.board.slots.size,0);
});

test('abandoned registrations expire without keeping a fake host or deleting an active peer',()=>{
  const f=fixture({leaseMs:1000}),a=f.create();
  f.advance(400);const b=f.board.join(f.auth('b'),f.profile(),{roundId:a.round.id});
  f.advance(600);const directory=f.board.context(f.auth('b'),f.profile());
  assert.equal(directory.rounds[0].registered,1);assert.equal(directory.rounds[0].hosting,true);
  f.advance(400);assert.deepEqual(f.board.context(f.auth('c'),f.profile()).rounds,[]);
  assert.equal(f.board.members.size,0);
});

test('lease renewal is capped by real verified-token expiry and a finite announcement lifetime',()=>{
  const f=fixture({leaseMs:1000,lifetimeMs:2000});
  const short=f.auth('a',{expiresAt:f.now()+500}),a=f.board.create(short,f.profile(),{targetId:'bibliothek-lesekamin',kind:'read',capacity:2});
  assert.equal(a.expiresAt,f.now()+500);f.advance(500);assert.equal(f.board.context(f.auth('b'),f.profile()).rounds.length,0);
  const b=f.create('b');f.advance(900);f.board.heartbeat(f.auth('b'),f.profile(),{leaseId:b.leaseId});
  f.advance(900);const last=f.board.heartbeat(f.auth('b'),f.profile(),{leaseId:b.leaseId});assert.equal(last.expiresAt,b.round.endsAt);
  f.advance(201);assert.equal(f.board.context(f.auth('c'),f.profile()).rounds.length,0);
});

test('age, grade and exact class all apply to create, discovery, visit, join and renewal on the server',()=>{
  const restricted=structuredClone(targets.find(target=>target.id==='bibliothek-lesekamin'));
  Object.assign(restricted.rule,{minAge:12,maxAge:15,gradeLevels:[7],classIds:[17]});
  const f=fixture({targets:[restricted]}),a=f.create();
  for(const extra of [{age:11},{age:16},{age:null},{gradeLevel:6},{gradeLevel:null},{classId:18}]){
    const denied=f.profile(extra),auth=f.auth('b');
    assert.equal(f.board.context(auth,denied).targets.length,0);assert.equal(f.board.context(auth,denied).rounds.length,0);
    for(const method of ['join','visit'])assert.throws(()=>f.board[method](auth,denied,{roundId:a.round.id}),error=>error.code==='not_allowed');
    assert.throws(()=>f.board.create(auth,denied,{targetId:restricted.id,kind:'read',capacity:2}),error=>error.code==='not_allowed');
  }
  assert.throws(()=>f.board.heartbeat(f.auth('a'),f.profile({classId:18}),{leaseId:a.leaseId}),error=>error.code==='stale_membership');
  assert.equal(f.board.members.size,0);
});

test('parents, inactive profiles and signed teacher tags never confer round access or moderation',()=>{
  const f=fixture(),a=f.create();
  for(const profile of [f.profile({kind:'parent',age:null,gradeLevel:null,classId:null}),
    f.profile({kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null})])
    assert.throws(()=>f.board.context(f.auth('b'),profile),error=>error.code==='not_allowed');
  assert.throws(()=>f.board.close(f.auth('b'),f.profile(),{roundId:a.round.id}),error=>error.code==='not_allowed');
  const staff=f.profile({kind:'staff',age:null,gradeLevel:null,classId:null});
  assert.equal(f.board.close(f.auth('staff'),staff,{roundId:a.round.id}).closed,true);assert.equal(f.board.members.size,0);
});

test('fresh role changes update the voluntary staff flag, and a revoked or malformed profile drops the registration',()=>{
  const f=fixture(),auth=f.auth('a'),staff=f.profile({kind:'staff',age:null,gradeLevel:null,classId:null});
  const a=f.board.create(auth,staff,{targetId:'bibliothek-lesekamin',kind:'read',capacity:4});
  assert.equal(a.round.staffRegistered,true);
  assert.equal(f.board.context(auth,f.profile()).rounds[0].staffRegistered,false);
  assert.throws(()=>f.board.heartbeat(auth,f.profile({checkedAt:f.now()-10001}),{leaseId:a.leaseId}));
  assert.equal(f.board.members.size,0);
});

test('bounded state refuses overload without creating phantom rounds; a service restart does not resurrect registrations',()=>{
  const f=fixture({maxMembers:1}),a=f.create();
  assert.throws(()=>f.board.join(f.auth('b'),f.profile(),{roundId:a.round.id}),error=>error.code==='unavailable');
  assert.throws(()=>f.create('b',{targetId:'bibliothek-buchclub'}),error=>error.code==='unavailable');
  assert.equal(f.board.rounds.size,1);assert.equal(f.board.members.size,1);
  f.board.dispose();assert.equal(f.board.rounds.size,0);assert.equal(f.board.slots.size,0);
  assert.throws(()=>f.board.heartbeat(f.auth('a'),f.profile(),{leaseId:a.leaseId}),error=>error.code==='stale_membership');
});

test('invalid catalogs, invented games and URLs cannot become shared destinations',()=>{
  const base=targets[0];
  for(const patch of [{mapId:['bibliothek']},{kinds:[['talk']]},{capacity:99},{arrivals:[]},{url:'https://evil.invalid/'},
    {bounds:{...base.bounds,width:-1}},{id:'../secret'}])assert.throws(()=>validateTargets([{...base,...patch}]));
  const f=fixture();assert.throws(()=>f.create('a',{kind:'gartic-phone'}),error=>error.code==='invalid_request');
  assert.throws(()=>f.board.join(f.auth('b'),f.profile(),{roundId:'00000000-0000-4000-8000-000000000000'}),error=>error.code==='round_missing');
});
