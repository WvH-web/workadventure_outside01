'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PianoRooms,DEFAULT_RULES,cookieFrom,cookieHeader}=require('../ops/castle-piano/rooms.cjs');
const uuid=()=>crypto.randomUUID(),bad=(fn,code)=>assert.throws(fn,error=>error.code===code);
function fixture(options={}){
  let now=1794273600000;const clock=()=>now,rooms=new PianoRooms({clock,...options});
  const auth=(name='a',extra={})=>({identifier:name+'@invalid.local',expiresAt:now+3600000,...extra});
  const profile=extra=>({version:1,kind:'student',eligible:true,age:9,gradeLevel:3,classId:12,checkedAt:now,...extra});
  function session(name='a',extra={}){const identity=auth(name,extra.auth),input={clientId:uuid(),roomId:'musiksalon',mode:'together',takeover:false,...extra.input};
    return {...rooms.complete(rooms.begin(input,identity),profile(extra.profile),extra.cookie),input,auth:identity};}
  function connect(session){const events=[],closed=[];const ticket=rooms.reserve(session.cookie,session.lease.generation),connection=rooms.connect(ticket,value=>events.push(value),()=>closed.push(true));
    return {...session,...connection,events,closed,command:(type,fields={},id=uuid())=>rooms.command(connection.lease,connection.stamp,{id,type,...fields})};}
  return {rooms,clock,auth,profile,session,connect,advance:ms=>{now+=ms;rooms.sweep();}};
}
test('school sessions contain no pupil identity or invented musicians; cookies are opaque and correctly scoped',()=>{
  const f=fixture(),a=f.session();assert.equal(a.context.mode,'together');assert.equal(a.cookie.length,64);assert.equal(f.rooms.rooms.get('musiksalon').members.size,0);
  assert.doesNotMatch(JSON.stringify(a.context),/@invalid|identifier|classId|gradeLevel|"age"|name|cookie/);
  const header=cookieHeader(a.cookie,a.lease,{clock:f.clock});assert.match(header,/Path=\/castle-piano\/; Max-Age=45; HttpOnly; SameSite=Strict; Secure$/);
  assert.equal(cookieFrom(header),a.cookie);assert.equal(cookieFrom('wvh_castle_piano='+a.cookie+'; wvh_castle_piano='+a.cookie),null);
  assert.equal(cookieFrom('wvh_castle_piano=forged'),null);
});
test('late participants see the current real chord and creator departure removes only the creator notes',()=>{
  const f=fixture(),a=f.connect(f.session('a'));a.command('down',{note:60,velocity:100});
  const b=f.connect(f.session('b'));assert.equal(b.events.at(-1).members.length,2);assert.equal(b.events.at(-1).members.find(member=>member.voiceId===a.lease.voiceId).keys[0].note,60);
  b.command('down',{note:64,velocity:90});f.rooms.disconnect(a.lease,a.stamp);
  const state=b.events.at(-1);assert.equal(state.members.length,1);assert.equal(state.members[0].keys[0].note,64);
  const c=f.connect(f.session('c'));assert.equal(c.events.at(-1).members.length,2);assert.equal(c.events.at(-1).members.find(member=>member.voiceId===b.lease.voiceId).keys[0].note,64);
});
test('two musicians can hold the same note independently; sustain and release affect only the owner',()=>{
  const f=fixture(),a=f.connect(f.session('a')),b=f.connect(f.session('b'));
  for(const user of [a,b])user.command('down',{note:60,velocity:100});
  a.command('pedal',{down:true});a.command('up',{note:60});assert.equal(a.lease.keys.get(60).down,false);assert.equal(b.lease.keys.get(60).down,true);
  a.command('pedal',{down:false});assert.equal(a.lease.keys.size,0);assert.equal(b.lease.keys.size,1);
  b.command('clear');assert.equal(b.lease.keys.size,0);assert.equal(b.lease.pedal,false);
});
test('retries cannot retrigger a sound and a reused request id with different content is rejected',()=>{
  const f=fixture(),a=f.connect(f.session()),id=uuid();a.command('down',{note:60,velocity:100},id);
  const key=a.lease.keys.get(60),sequence=a.events.at(-1).sequence;a.command('down',{note:60,velocity:100},id);
  assert.equal(a.lease.keys.get(60),key);assert.equal(a.events.at(-1).sequence,sequence);assert.equal(a.events.at(-1).ack.id,id);
  bad(()=>a.command('down',{note:61,velocity:100},id),'request_conflict');
});

test('repeated acknowledged requests still count toward the transport rate limit',()=>{
  const f=fixture(),a=f.connect(f.session()),id=uuid();for(let n=0;n<40;n++)a.command('down',{note:60,velocity:90},id);
  bad(()=>a.command('down',{note:60,velocity:90},id),'rate_limited');assert.equal(a.lease.seen.size,1);assert.equal(a.lease.keys.size,1);
  f.advance(1001);a.command('down',{note:60,velocity:90},id);assert.equal(a.lease.keys.get(60).pressId,id);
});
test('only exact, bounded MIDI commands are accepted; role, identity, room and peer ownership cannot be injected',()=>{
  const f=fixture(),a=f.connect(f.session());
  for(const fields of [{note:47,velocity:100},{note:85,velocity:100},{note:60,velocity:0},{note:60,velocity:128},{note:60.5,velocity:100},
    {note:60,velocity:100,voiceId:uuid()},{note:60,velocity:100,role:'staff'},{note:60,velocity:100,classId:12}])bad(()=>a.command('down',fields),'invalid_request');
  bad(()=>a.command('hold',{notes:[60,60]}),'invalid_request');bad(()=>a.command('room',{roomId:'other'}),'invalid_request');
  assert.equal(a.lease.keys.size,0);
});
test('an account needs explicit fresh takeover and cannot inflate real connected counts through more tabs',()=>{
  const f=fixture(),a=f.connect(f.session('a'));
  bad(()=>f.session('a'),'session_in_use');assert.equal(a.closed.length,0);
  const b=f.connect(f.session('a',{input:{takeover:true}}));assert.equal(a.closed.length,1);assert.equal(f.rooms.rooms.get('musiksalon').members.size,1);
  assert.equal(b.events.at(-1).members[0].voiceId,b.lease.voiceId);bad(()=>a.command('down',{note:60,velocity:90}),'session_expired');
});
test('fresh same-client renewal preserves transport and held notes, while practice mode closes shared sound',()=>{
  const f=fixture(),a=f.connect(f.session());a.command('down',{note:60,velocity:100});
  f.advance(10000);const renewed=f.rooms.complete(f.rooms.begin(a.input,a.auth),f.profile(),a.cookie);
  assert.equal(renewed.lease,a.lease);assert.equal(renewed.context.generation,a.context.generation);assert.equal(a.closed.length,0);assert.equal(a.lease.keys.size,1);
  const practice=f.rooms.complete(f.rooms.begin({...a.input,mode:'practice'},a.auth),f.profile(),a.cookie);
  assert.equal(a.closed.length,1);assert.equal(f.rooms.rooms.get('musiksalon').members.size,0);bad(()=>f.rooms.reserve(practice.cookie,practice.context.generation),'practice_only');
});
test('late account-switch lookups cannot set an old session or revoke the newer account',()=>{
  const f=fixture(),clientId=uuid(),input={clientId,roomId:'musiksalon',mode:'together',takeover:false};
  const a=f.rooms.begin(input,f.auth('a')),b=f.rooms.begin(input,f.auth('b')),active=f.rooms.complete(b,f.profile(),null);
  bad(()=>f.rooms.complete(a,f.profile(),null),'account_changed');assert.equal(f.rooms.get(active.cookie).actor,b.actor.id);
});
test('real class, grade and age rules combine on creation and renewal; revoked access closes only that account',()=>{
  const f=fixture({rules:[{...DEFAULT_RULES[0],minAge:8,maxAge:12,gradeLevels:[3],classIds:[12]}]}),a=f.connect(f.session('a')),b=f.connect(f.session('b'));
  for(const extra of [{classId:13},{gradeLevel:7},{age:7},{age:null}])bad(()=>f.session('denied',{profile:extra}),'school_required');
  bad(()=>f.rooms.complete(f.rooms.begin(a.input,a.auth),f.profile({classId:13}),a.cookie),'school_required');
  assert.equal(a.closed.length,1);assert.equal(b.closed.length,0);assert.equal(b.events.at(-1).members.length,1);
});
test('parent, unknown and signed teacher tags do not authorize school audio; stale profiles fail closed',()=>{
  const f=fixture();
  for(const kind of ['parent','unknown','ambiguous'])bad(()=>f.session(kind,{auth:{tags:['teacher']},profile:{kind,eligible:kind==='parent',age:null,gradeLevel:null,classId:null}}),'school_required');
  const a=f.connect(f.session());bad(()=>f.rooms.complete(f.rooms.begin(a.input,a.auth),f.profile({checkedAt:f.clock()-10001}),a.cookie),'unavailable');
  assert.equal(a.closed.length,1);
});
test('lease and verified-token expiry stop all sound and sockets, even without an explicit leave',()=>{
  const f=fixture(),a=f.connect(f.session('a',{auth:{expiresAt:1794273600000+5000}}));a.command('down',{note:60,velocity:100});
  assert.equal(a.context.leaseMs,5000);f.advance(5001);assert.equal(a.closed.length,1);assert.equal(f.rooms.rooms.get('musiksalon').members.size,0);
  const b=f.connect(f.session('b'));f.advance(45001);assert.equal(b.closed.length,1);assert.equal(f.rooms.leases.size,0);
});
test('lost key-up has a finite safety timeout and current held-key reports do not renew school authorization',()=>{
  const f=fixture(),a=f.connect(f.session());a.command('down',{note:60,velocity:100});f.advance(14000);a.command('hold',{notes:[60]});
  f.advance(14000);assert.equal(a.lease.keys.size,1);f.advance(2000);assert.equal(a.lease.keys.size,0);
  a.command('down',{note:60,velocity:100});f.advance(15001);assert.equal(a.closed.length,1);
});
test('capacity is reserved atomically during an upgrade and stale close events cannot remove a new transport',()=>{
  const f=fixture({capacity:2}),a=f.session('a'),b=f.session('b'),c=f.session('c');
  const ra=f.rooms.reserve(a.cookie,a.context.generation),rb=f.rooms.reserve(b.cookie,b.context.generation);
  bad(()=>f.rooms.reserve(c.cookie,c.context.generation),'room_full');f.rooms.cancel(ra);
  const rc=f.rooms.reserve(c.cookie,c.context.generation);f.rooms.cancel(rc);f.rooms.cancel(rb);
  const active=f.connect(a);f.rooms.disconnect(active.lease,active.stamp);const next=f.connect(a);
  f.rooms.disconnect(active.lease,active.stamp);assert.equal(f.rooms.rooms.get('musiksalon').members.size,1);assert.equal(next.closed.length,0);
});
test('chords, request memory, sustained notes and event rate stay bounded without permanent performance storage',()=>{
  const f=fixture(),a=f.connect(f.session());for(let note=48;note<56;note++)a.command('down',{note,velocity:100});
  bad(()=>a.command('down',{note:60,velocity:100}),'too_many_notes');a.command('clear');
  for(let i=0;i<30;i++)a.command('clear');bad(()=>a.command('clear'),'rate_limited');
  for(let n=0;n<5;n++){f.advance(1001);for(let i=0;i<30;i++)a.command('clear');}assert.equal(a.lease.seen.size,128);
  f.rooms.close();assert.equal(f.rooms.leases.size,0);assert.equal(f.rooms.clients.size,0);assert.equal(f.rooms.rooms.get('musiksalon').members.size,0);
  const next=fixture();assert.equal(next.rooms.rooms.get('musiksalon').members.size,0);assert.notEqual(f.rooms.serverId,next.rooms.serverId);
});
test('moderation requires another fresh real staff profile and cannot be granted by a note message',()=>{
  const f=fixture(),a=f.connect(f.session());a.command('down',{note:60,velocity:100});
  bad(()=>f.rooms.panic(f.auth('a'),f.profile(),'musiksalon'),'not_allowed');
  const result=f.rooms.panic(f.auth('staff'),f.profile({kind:'staff',age:null,gradeLevel:null,classId:null}),'musiksalon');
  assert.equal(result.cleared,true);assert.equal(a.lease.keys.size,0);assert.equal(a.closed.length,0);
});
