'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
async function fixture(mode='together'){
  const {PianoProjection,validState}=await import('../ops/castle-piano/public/projection.js'),voiceId=crypto.randomUUID(),peer=crypto.randomUUID(),serverId=crypto.randomUUID();
  const context={mode,voiceId,serverId,room:{id:'musiksalon'}},p=new PianoProjection(context,()=>1000);
  const state=(sequence,keys=[],ack=null)=>({version:1,type:'state',serverId,roomId:'musiksalon',sequence,time:1000,ack,members:[{voiceId,color:'#d9ac55',pedal:false,keys},{voiceId:peer,color:'#66b8a0',pedal:false,keys:[]}]});
  const cmd=(type,more={})=>({id:crypto.randomUUID(),type,...more}),key=(command,more={})=>({note:60,velocity:90,pressId:command.id,down:true,startedAt:1000,...more});
  return {p,context,peer,state,cmd,key,validState};
}
test('late key-down acknowledgements never resurrect a locally released key',async()=>{
  const f=await fixture(),{p}=f;p.accept(f.state(1));const down=f.cmd('down',{note:60,velocity:90}),up=f.cmd('up',{note:60});p.command(down);p.command(up);
  assert.equal(p.view().members[0].keys.length,0);p.accept(f.state(2,[f.key(down)],{voiceId:f.context.voiceId,id:down.id}));assert.equal(p.view().members[0].keys.length,0);
  p.accept(f.state(3,[],{voiceId:f.context.voiceId,id:up.id}));assert.equal(p.pending.length,0);assert.equal(p.view().members[0].keys.length,0);
});
test('peer updates preserve pending own chords; retries and stale frames do not retrigger',async()=>{
  const f=await fixture(),{p}=f;p.accept(f.state(1));const a=f.cmd('down',{note:60,velocity:90}),b=f.cmd('down',{note:64,velocity:80});p.command(a);p.command(b);
  p.accept(f.state(2));assert.equal(p.view().members[0].keys.length,2);
  p.accept(f.state(3,[f.key(a)],{voiceId:f.context.voiceId,id:a.id}));assert.deepEqual(p.view().members[0].keys.map(key=>key.note),[60,64]);
  assert.equal(p.accept(f.state(2)),false);const before=p.view();assert.equal(p.accept(f.state(3,[f.key(a)],{voiceId:f.context.voiceId,id:a.id})),true);assert.deepEqual(p.view(),before);
});
test('sustain release is owner-scoped and same-pitch reattack gets another press identity',async()=>{
  const f=await fixture(),{p}=f;p.accept(f.state(1));const down=f.cmd('down',{note:60,velocity:90});p.command(down);p.command(f.cmd('pedal',{down:true}));p.command(f.cmd('up',{note:60}));
  assert.equal(p.view().members[0].keys[0].down,false);const again=f.cmd('down',{note:60,velocity:70});p.command(again);assert.equal(p.view().members[0].keys[0].pressId,again.id);
  p.command(f.cmd('up',{note:60}));p.command(f.cmd('pedal',{down:false}));assert.equal(p.view().members[0].keys.length,0);
});
test('practice is local, bounded and never queues commands for a later shared connection',async()=>{
  const f=await fixture('practice'),{p}=f;for(let n=0;n<9;n++)p.command(f.cmd('down',{note:60+n,velocity:90}));assert.equal(p.view().members[0].keys.length,8);assert.equal(p.pending.length,0);
  p.command(f.cmd('clear'));assert.equal(p.view().members[0].keys.length,0);p.clear();assert.deepEqual(p.view().members,[]);
});
test('wrong server, room, repeated voices, malformed notes and oversized snapshots are rejected',async()=>{
  const f=await fixture();assert.equal(f.validState(f.state(0),f.context),true);
  for(const change of [{serverId:crypto.randomUUID()},{roomId:'elsewhere'},{sequence:NaN},{sequence:-1},{members:Array(9).fill(f.state(0).members[0])},
    {members:[{...f.state(0).members[0],keys:[{note:999}]}]},{ack:{voiceId:f.peer,id:'bad'}}])assert.equal(f.p.accept({...f.state(1),...change}),false);
});
