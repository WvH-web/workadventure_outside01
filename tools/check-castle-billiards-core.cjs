'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const folder=storage.outputPath('billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/build');
const core=require(path.join(folder,'core.cjs')),{createBilliardsModel}=require('../ops/castle-billiards/model.cjs');
const model=createBilliardsModel(core),cases=[],times=[];
function check(name,callback){callback();cases.push(name);}
const shot={angle:0,power:2.8,offset:{x:0,y:0}};
check('sixteen stable balls, canonical identity, no browser globals',()=>{const state=model.initial();assert.equal(state.balls.length,16);assert.equal(typeof document,'undefined');assert.deepEqual(state.balls.map(b=>b.id),Array.from({length:16},(_,i)=>i));});
const initial=model.initial(),saved=structuredClone(initial);let first;
check('real upstream physics and rules complete a break without mutating its input',()=>{first=model.shoot(initial,shot);times.push(first.computeMs);assert.deepEqual(initial,saved);assert.equal(first.state.version,1);assert.equal(first.state.shots,1);assert.ok(first.frames.length>4);assert.ok(first.steps<65000);assert.ok(first.state.balls.some((b,i)=>b.pos[0]!==initial.balls[i].pos[0]));});
check('the same starting positions produce exactly the same authoritative result',()=>{const repeat=model.shoot(initial,shot);times.push(repeat.computeMs);assert.deepEqual(repeat.state,first.state);assert.deepEqual(repeat.frames,first.frames);});
check('pocket state and stable ball identity survive the following shot',()=>{
 let state=first.state;if(state.ballInHand)state=model.place(state,{x:-.7,y:.35});
 const index=state.balls.findIndex(b=>b.label===7);state.balls[index]={...state.balls[index],state:core.State.InPocket,pos:[.95,.45,-.2]};
 const next=model.shoot(state,{...shot,angle:-1,power:.6});times.push(next.computeMs);assert.equal(next.state.balls[index].state,core.State.InPocket);assert.equal(next.state.balls[index].id,index);
});
check('invalid shots cannot submit positions, arbitrary spin, zero power or nonfinite values',()=>{
 for(const value of [{...shot,balls:[]},{...shot,power:0},{...shot,power:99},{...shot,angle:NaN},{...shot,offset:{x:.45,y:.45}},{...shot,offset:{x:0,y:0,z:1}}])assert.throws(()=>model.shoot(initial,value),/invalid_shot/);
});
check('a miss produces the upstream foul and switches the active player',()=>{const miss=model.shoot(initial,{...shot,angle:Math.PI,power:.2});times.push(miss.computeMs);assert.equal(miss.state.turn,1);assert.equal(miss.state.ballInHand,true);assert.equal(miss.state.reason,'No ball hit');});
check('placement follows upstream table bounds and overlap checks',()=>{
 const miss=model.shoot(initial,{...shot,angle:Math.PI,power:.2}),state=miss.state;
 assert.throws(()=>model.shoot(state,shot),/shot_not_allowed/);assert.throws(()=>model.place(state,{x:1.9,y:0}),/invalid_placement/);
 const target=state.balls.find(b=>b.label===1).pos;assert.throws(()=>model.place(state,{x:target[0],y:target[1]}),/invalid_placement/);
 const placed=model.place(state,{x:-.7,y:.35});assert.equal(placed.ballInHand,false);assert.equal(placed.version,state.version+1);assert.equal(placed.balls[0].state,core.State.Stationary);
 assert.throws(()=>model.place(placed,{x:-.7,y:.35}),/placement_not_allowed/);
});
check('unknown state fields and invalid ball identities are rejected',()=>{assert.throws(()=>model.validate({...initial,account:'not allowed'}));const corrupt=structuredClone(initial);corrupt.balls[2].id=1;assert.throws(()=>model.validate(corrupt));});
const result={passed:true,cases,actualUpstreamPhysicsAndRules:true,onlyOneAuthoritativeSimulation:true,normalSchoolIntegrationTested:false,
 normalPublishedPreview:false,loadApprovalFor400:false,computeMs:times,coreSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,'core.cjs'))).digest('hex')};
fs.writeFileSync(path.join(folder,'core-check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
