'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {BilliardsRooms}=require('../ops/castle-billiards/rooms.cjs'),{PhysicsPool}=require('../ops/castle-billiards/physics-pool.cjs');
function fixture(t,options={}){
 let now=Date.now();const pool=options.pool||new PhysicsPool({size:1}),rooms=new BilliardsRooms({pool,clock:()=>now,...options});t.after(()=>pool.close?.());
 const actor=(id,staff=false)=>({id,staff,expiresAt:now+600000});
 const join=(a,table='tisch-1')=>{const id=rooms.create(a,table).sessionId;rooms.connect(id,a);return {id,actor:a};};
 const command=(s,action,fields={},version=rooms.snapshot(s.id).board.state.version)=>rooms.command(s.id,s.actor,{id:crypto.randomUUID(),action,version,...fields});
 return {rooms,pool,actor,join,command,advance:ms=>{now+=ms;rooms.sweep();}};
}
const shot={angle:0,power:2.8,offset:{x:0,y:0}};
test('only real connected seat owners may shoot, not spectators or the other turn',async t=>{
 const f=fixture(t),a=f.join(f.actor('a')),b=f.join(f.actor('b')),watch=f.join(f.actor('c'));
 await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});
 await assert.rejects(f.command(watch,'shoot',{shot}),/not_a_player/);await assert.rejects(f.command(b,'shoot',{shot}),/not_your_turn/);
 const result=await f.command(a,'shoot',{shot});assert.equal(result.board.state.shots,1);assert.ok(result.board.animation.frames.length>0);
 await assert.rejects(f.command(a,'shoot',{shot}),/shot_in_progress/);
 assert.deepEqual(f.rooms.snapshot(watch.id).board.state,result.board.state);f.advance(200000);assert.equal(f.rooms.tables.get('tisch-1').animation,null);
});
test('duplicate in-flight shot IDs share one calculation and do not apply a second stroke',async t=>{
 const f=fixture(t),a=f.join(f.actor('a')),b=f.join(f.actor('b'));await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});
 const input={id:crypto.randomUUID(),action:'shoot',version:0,shot};const [one,two]=await Promise.all([f.rooms.command(a.id,a.actor,input),f.rooms.command(a.id,a.actor,input)]);
 assert.equal(one.board.state.shots,1);assert.equal(two.board.state.shots,1);assert.deepEqual(one.board.animation.frames,two.board.animation.frames);
 await assert.rejects(f.rooms.command(a.id,a.actor,{...input,shot:{...shot,power:1}}),/command_conflict/);
});
test('a failed durable write keeps the previous authoritative state and never publishes an animation',async t=>{
 const f=fixture(t,{journal:{read:()=>null,write:()=>{throw Error('disk');}}}),a=f.join(f.actor('a')),b=f.join(f.actor('b'));
 await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});const before=structuredClone(f.rooms.snapshot(a.id).board.state);
 await assert.rejects(f.command(a,'shoot',{shot}),/storage_unavailable/);assert.deepEqual(f.rooms.snapshot(a.id).board.state,before);assert.equal(f.rooms.snapshot(a.id).board.animation,null);
});
test('leaving and reconnecting reserve the same account place without silently stealing another window',async t=>{
 const f=fixture(t),account=f.actor('a'),a=f.join(account);await f.command(a,'claim',{seat:0});f.rooms.disconnect(a.id);
 const b=f.join(account);assert.equal(f.rooms.snapshot(b.id).self.resumeSeat,0);await assert.rejects(f.command(b,'claim',{seat:0}),/resume_required/);
 await f.command(b,'resume',{seat:0});assert.equal(f.rooms.snapshot(a.id).self.seat,null);assert.equal(f.rooms.snapshot(b.id).self.seat,0);
 await f.command(b,'leave_seat');assert.equal(f.rooms.snapshot(b.id).board.seats[0].occupied,false);
});
test('session expiry and role revocation free stale places but do not expose account identifiers',async t=>{
 const f=fixture(t,{sessionMs:1000,reconnectMs:1000}),a=f.join(f.actor('private-a')),b=f.join(f.actor('private-b'));await f.command(a,'claim',{seat:0});
 assert.doesNotMatch(JSON.stringify(f.rooms.snapshot(b.id)),/private-a|private-b|actor|identifier|token|classId|gradeLevel/);
 f.rooms.revoke(a.actor.id);assert.equal(f.rooms.snapshot(b.id).board.seats[0].occupied,false);await assert.rejects(f.command(a,'claim',{seat:0},0),/session_expired/);
 f.advance(1001);assert.equal(f.rooms.sessions.size,0);
});
test('saved billiards restores actual positions without sessions, owners, animations or false occupied seats',async t=>{
 let saved;const journal={read:()=>saved??null,write:value=>{saved=structuredClone(value);}},f=fixture(t,{journal}),a=f.join(f.actor('a')),b=f.join(f.actor('b'));
 await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});const played=await f.command(a,'shoot',{shot});
 assert.doesNotMatch(JSON.stringify(saved),/actor|session|holdUntil|animation|frames|token/);
 const restored=new BilliardsRooms({pool:f.pool,journal});assert.deepEqual(restored.tables.get('tisch-1').state,played.board.state);assert.deepEqual(restored.tables.get('tisch-1').seats,[null,null]);assert.equal(restored.sessions.size,0);
});
test('a fresh revocation while a real calculation is pending prevents its later commit',async t=>{
 const f=fixture(t),a=f.join(f.actor('a')),b=f.join(f.actor('b'));await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});
 const pending=f.command(a,'shoot',{shot});f.rooms.revoke(a.actor.id);await assert.rejects(pending,/session_expired/);assert.equal(f.rooms.tables.get('tisch-1').state.shots,0);
});
test('staff reset cancels the pending generation; a late old physics result cannot overwrite the new table',async t=>{
 const f=fixture(t),a=f.join(f.actor('a')),b=f.join(f.actor('b')),staff=f.join(f.actor('teacher',true));await f.command(a,'claim',{seat:0});await f.command(b,'claim',{seat:1});
 const pending=f.command(a,'shoot',{shot});await f.command(staff,'reset');await assert.rejects(pending,/stale_position/);
 const current=f.rooms.snapshot(staff.id);assert.equal(current.board.state.shots,0);assert.equal(current.board.state.version,1);assert.deepEqual(current.board.seats.map(s=>s.occupied),[false,false]);
});
