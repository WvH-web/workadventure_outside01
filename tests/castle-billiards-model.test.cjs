'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.resolve(__dirname,'../ops/castle-billiards');
const core=require('../ops/castle-billiards/vendor/core.cjs'),{createBilliardsModel}=require('../ops/castle-billiards/model.cjs'),{PhysicsPool}=require('../ops/castle-billiards/physics-pool.cjs');
const model=createBilliardsModel(core),shot={angle:0,power:2.8,offset:{x:0,y:0}};
test('pinned billiards core and every corresponding source/license retain their reviewed bytes',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'vendor-manifest.json')));
 assert.equal(manifest.commit,'fda4e90e251ce59ad878dbb996af372f4028a325');assert.equal(manifest.physicsAndRuleSourceUnmodified,true);
 for(const file of manifest.files){const raw=fs.readFileSync(path.join(directory,file.path));assert.equal(raw.length,file.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),file.sha256);}
 assert.ok(manifest.files.some(file=>file.path==='vendor/tailuge/LICENSE'));assert.ok(manifest.files.some(file=>file.path==='public/vendor/three/LICENSE'));
});
test('actual upstream physics gives the same full result from the same canonical positions, without changing input',()=>{
 const state=model.initial(),saved=structuredClone(state),a=model.shoot(state,shot),b=model.shoot(state,shot);
 assert.deepEqual(state,saved);assert.deepEqual(a.state,b.state);assert.deepEqual(a.frames,b.frames);assert.equal(a.state.version,1);assert.ok(a.frames.length>4);
 assert.deepEqual(a.state.balls.map(ball=>ball.id),Array.from({length:16},(_,i)=>i));
});
test('browser-supplied coordinates, outcomes, invalid power and nonfinite shot values cannot replace physics',()=>{
 const state=model.initial();for(const input of [{...shot,balls:[]},{...shot,outcomes:[]},{...shot,power:0},{...shot,power:Infinity},{...shot,angle:NaN},{...shot,offset:{x:.45,y:.45}}])assert.throws(()=>model.shoot(state,input),/invalid_shot/);
});
test('a miss uses the upstream foul rule, switches turns and requires legal placement',()=>{
 const first=model.shoot(model.initial(),{...shot,angle:Math.PI,power:.2});assert.equal(first.state.turn,1);assert.equal(first.state.reason,'No ball hit');assert.equal(first.state.ballInHand,true);
 assert.throws(()=>model.shoot(first.state,shot),/shot_not_allowed/);assert.throws(()=>model.place(first.state,{x:1.9,y:0}),/invalid_placement/);
 const target=first.state.balls.find(ball=>ball.label===1).pos;assert.throws(()=>model.place(first.state,{x:target[0],y:target[1]}),/invalid_placement/);
 const placed=model.place(first.state,{x:-.7,y:.35});assert.equal(placed.ballInHand,false);assert.equal(placed.version,first.state.version+1);assert.equal(placed.balls[0].state,core.State.Stationary);
});
test('potted balls remain potted with their original labels and identities on subsequent shots',()=>{
 const state=model.initial(),index=state.balls.findIndex(ball=>ball.label===7);state.balls[index].state=core.State.InPocket;state.balls[index].pos=[.95,.45,-.2];
 const result=model.shoot(state,{...shot,angle:-1,power:.6});assert.equal(result.state.balls[index].state,core.State.InPocket);assert.equal(result.state.balls[index].label,7);assert.equal(result.state.balls[index].id,index);
});
function pocketFixture(label,group=0){
 const state=model.initial();state.groups=group?[group,group===1?2:1]:[0,0];state.shots=1;
 for(const ball of state.balls)if(ball.id!==0&&ball.label!==label){ball.state=core.State.InPocket;ball.pos=[.95,.45,-1];}
 const edge=core.PocketGeometry.pockets.pocketS.pocket.pos.y+core.PocketGeometry.middleRadius+.01*core.R;
 state.balls[0].pos=[0,edge+2.1*core.R,0];state.balls.find(ball=>ball.label===label).pos=[0,edge,0];return state;
}
test('a real legal solid pot assigns complementary groups and retains the turn via the unmodified rules',()=>{
 const result=model.shoot(pocketFixture(1),{...shot,angle:-Math.PI/2,power:18*core.R});assert.equal(result.state.groups[0],1);assert.equal(result.state.groups[1],2);assert.equal(result.state.turn,0);assert.equal(result.state.scores[0],1);
});
test('a physically potted final eight ends the game through the upstream win decision',()=>{
 const result=model.shoot(pocketFixture(8,1),{...shot,angle:-Math.PI/2,power:18*core.R});assert.equal(result.state.winner,0);assert.equal(result.ruleResult,'End');assert.throws(()=>model.shoot(result.state,shot),/shot_not_allowed/);
});
test('an open-table first-contact eight foul loses according to the upstream rules',()=>{
 const result=model.shoot(pocketFixture(8),{...shot,angle:-Math.PI/2,power:18*core.R});assert.equal(result.state.winner,1);assert.equal(result.ruleResult,'End');
});
test('an early eight with assigned group balls remaining follows the actual upstream respot rule',()=>{
 const state=pocketFixture(8,1),remaining=state.balls.find(ball=>ball.label===1);remaining.state=core.State.Stationary;remaining.pos=[.5,.25,0];
 const result=model.shoot(state,{...shot,angle:-Math.PI/2,power:18*core.R});assert.equal(result.state.winner,null);assert.equal(result.state.balls.find(ball=>ball.label===8).state,core.State.Stationary);assert.equal(result.state.ballInHand,true);assert.equal(result.state.turn,1);
});
test('two independent actual worker jobs do not mix geometry, identity or simulation messages',async t=>{
 const pool=new PhysicsPool();t.after(()=>pool.close());const initial=model.initial(),[a,b]=await Promise.all([pool.run('shoot',initial,shot),pool.run('shoot',initial,{...shot,angle:Math.PI,power:.2})]);
 assert.equal(a.state.shots,1);assert.equal(b.state.shots,1);assert.equal(b.state.ballInHand,true);assert.notDeepEqual(a.state.balls,b.state.balls);
 const repeat=await pool.run('shoot',initial,shot);assert.deepEqual(repeat.state,a.state);assert.deepEqual(repeat.frames,a.frames);
});
test('worker errors do not invent a result and later work still uses a healthy isolated engine',async t=>{
 const pool=new PhysicsPool({size:1});t.after(()=>pool.close());await assert.rejects(pool.run('shoot',model.initial(),{...shot,power:99}),/invalid_shot/);
 const initial=await pool.run('initial');assert.equal(initial.state.balls.length,16);assert.ok(initial.geometry.radius>0);
 await pool.close();await assert.rejects(pool.run('initial'),/closed/);
});
test('bounded worker capacity rejects overflow instead of creating extra physics workers',async t=>{
 const pool=new PhysicsPool({size:1,queueLimit:0});t.after(()=>pool.close());const pending=pool.run('shoot',model.initial(),shot);
 await assert.rejects(pool.run('initial'),/busy/);await pending;assert.equal(pool.slots.length,1);assert.equal(pool.queue.length,0);
});
test('an actual lost worker rejects its old job and a new generation serves later work',async t=>{
 const pool=new PhysicsPool({size:1});t.after(()=>pool.close());const pending=assert.rejects(pool.run('shoot',model.initial(),shot),/simulation_unavailable/);
 await pool.slots[0].worker.terminate();await pending;const fresh=await pool.run('initial');assert.equal(fresh.state.balls.length,16);
});
test('closing with queued and active work rejects both, waits for owned threads and never respawns them',async()=>{
 const pool=new PhysicsPool({size:1}),a=assert.rejects(pool.run('shoot',model.initial(),shot),/closed/),b=assert.rejects(pool.run('initial'),/closed/);
 await pool.close();await Promise.all([a,b]);assert.equal(pool.slots[0].worker,null);assert.equal(pool.queue.length,0);assert.equal(pool.terminating.size,0);await pool.close();
});
