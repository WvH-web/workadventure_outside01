import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {StarMachine,PUZZLE_STATE,puzzleSnapshot,mergePuzzle,puzzles,symbols,puzzleTarget} from '../castle/puzzle-state.js';
import {activitySettings} from '../castle/activities.js';
const require=createRequire(import.meta.url),{candidate,revision}=require('../tools/prepare-castle-puzzle.cjs');
const uuid=()=>crypto.randomUUID(),target={seats:['a','b','c','d'],choice:'machine'};
test('the dedicated candidate changes only astronomy activity settings and its controller, not furnishings, voices or exits',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('./fixtures/sternwarte-before-puzzle.tmj',import.meta.url))),copy=candidate(source);
  const stored=JSON.parse(fs.readFileSync(new URL('../castle/sternwarte-puzzle-preview.tmj',import.meta.url)));
  assert.deepEqual(copy,stored);assert.equal(copy.properties.find(p=>p.name==='castleRevision').value,revision);
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../castle/sternwarte.tmj',import.meta.url))),stored);
  assert.deepEqual(candidate(stored),stored);
  assert.equal(puzzleTarget(copy).seats.length,4);assert.throws(()=>puzzleTarget(source));
  const area=copy.layers.flatMap(l=>l.objects||[]).find(o=>o.properties?.some(p=>p.name==='castleActivityId'&&p.value==='stars-solar'));
  const settings=activitySettings(area);assert.equal(settings.api,true);assert.equal(settings.autoOnSit,true);
  const original=source.layers.flatMap(l=>l.objects||[]).find(o=>o.id===area.id);area.properties=structuredClone(original.properties);
  copy.properties=structuredClone(source.properties);assert.deepEqual(copy,source);
});
test('only the exact owned puzzle page may receive the map API',()=>{
  const object=url=>({properties:[{name:'castleActivityId',value:'puzzle'},{name:'castleActivityUrl',value:url},{name:'castleActivityApi',value:true}]});
  assert.equal(activitySettings(object('puzzle.html')).api,true);
  for(const url of ['puzzle.html?preview=1','puzzle.html#outside','https://evil.invalid/puzzle.html','puzzle.html?url=https://evil.invalid'])assert.throws(()=>activitySettings(object(url)));
});
test('the dedicated puzzle controller records every reviewed source hash independently',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../castle/puzzle-preview.bundle.manifest.json',import.meta.url)));
  const digest=bytes=>crypto.subtle.digest('SHA-256',bytes).then(hash=>Buffer.from(hash).toString('hex'));
  return (async()=>{
    assert.equal(manifest.entry,'castle/npcs.js');assert.equal(manifest.runtimeModuleRequests,1);
    const bytes=fs.readFileSync(new URL('../castle/puzzle-preview.bundle.js',import.meta.url));assert.equal(bytes.length,manifest.bytes);assert.equal(await digest(bytes),manifest.sha256);
    for(const source of manifest.sources)assert.equal(await digest(fs.readFileSync(new URL('../'+source.path.split('?')[0],import.meta.url))),source.sha256);
    for(const name of ['room.js','activities.js','displays.js','characters-data.js'])assert.equal(manifest.sources.filter(source=>source.path.split('?')[0]==='castle/'+name).length,1);
  })();
});
function fixture(){
  const users=[],writes=[];
  function add(id,round=users[0]?.wa.player.state.castleTableRoundV1.round.id||uuid()){
    const seat=target.seats[users.length%4],visit=uuid(),views=[];
    const state={castleSeatV1:{id:seat,stage:'seated',visit},castleTableRoundV1:{v:1,seat,visit,round:{id:round,choice:'machine'}}};
    const user={fail:false,views},wa={player:{playerId:id,state},players:{list:()=>users.filter(other=>other!==user).map(other=>other.wa.player)}};
    state.saveVariable=async(key,value,options)=>{writes.push({key,value:structuredClone(value),options});if(user.fail)throw Error('offline');state[key]=structuredClone(value);};
    user.wa=wa;user.game=new StarMachine(wa,target,value=>views.push(value));users.push(user);return user;
  }
  async function tick(){for(let n=0;n<8;n++){for(const u of users)u.game.refresh();await Promise.all(users.map(u=>u.game.writing));}}
  async function ready(){await tick();}
  async function solve(user){for(let i=0;i<3;i++){await user.game.setRing(i,puzzles[user.game.value.index].answer[i]);await tick();}}
  async function stop(){for(const u of users)u.game.dispose();await Promise.all(users.map(u=>u.game.writing));}
  return {users,writes,add,tick,ready,solve,stop};
}
test('all three original puzzles are in range and unsolved at their initial position',()=>{
  assert.equal(puzzles.length,3);assert.equal(symbols.length,6);
  for(const p of puzzles){assert.equal(p.answer.length,3);assert.equal(p.clues.length,3);assert.ok(p.answer.every(n=>Number.isInteger(n)&&n>=0&&n<6));assert.notDeepEqual(p.answer,[0,0,0]);}
});
test('schema rejects text, identities, destinations, invalid stamps and oversized or obsolete state',()=>{
  const round=uuid(),base={v:1,round,seat:'a',visit:uuid(),epoch:{clock:0,source:0,change:round,index:0},cells:[null,null,null]};
  assert.deepEqual(puzzleSnapshot(base),base);
  for(const patch of [{v:2},{email:'private'},{url:'https://example.org'},{round:'bad'},{visit:'bad'},{seat:'x'.repeat(81)},
    {epoch:{...base.epoch,index:3}},{epoch:{...base.epoch,change:uuid()}},{cells:[null,null]},
    {cells:[{clock:1,source:1,change:uuid(),value:6},null,null]},
    {cells:[{clock:1e12,source:1,change:uuid(),value:1},null,null]},
    {cells:[{clock:1,source:-1,change:uuid(),value:1},null,null]},
    {cells:[{clock:1,source:1,change:uuid(),value:1,note:'text'},null,null]}])assert.equal(puzzleSnapshot({...base,...patch}),null);
  assert.equal(puzzleSnapshot(null),null);assert.equal(puzzleSnapshot([]),null);
});
test('two participants can solve and progress through every puzzle with room-only transient state',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();
  for(let stage=0;stage<puzzles.length;stage++){
    await f.solve(stage%2?a:b);assert.equal(a.game.value.solved,true);assert.deepEqual(a.game.value.values,b.game.value.values);
    if(stage<2){assert.equal(await a.game.advance(),true);await f.tick();assert.equal(b.game.value.index,stage+1);assert.equal(b.game.value.solved,false);}
  }
  assert.equal(await a.game.advance(),false);assert.ok(f.writes.every(w=>w.key===PUZZLE_STATE&&JSON.stringify(w.options)==='{"public":true,"persist":false,"scope":"room"}'));
  assert.ok(f.writes.every(w=>Buffer.byteLength(JSON.stringify(w.value))<1500));await f.stop();
});
test('concurrent edits to different rings merge without dropping either change',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();const la=a.wa.players.list,lb=b.wa.players.list;
  a.wa.players.list=()=>[];b.wa.players.list=()=>[];
  await Promise.all([a.game.setRing(0,1),b.game.setRing(2,4)]);
  a.wa.players.list=la;b.wa.players.list=lb;await f.tick();assert.deepEqual(a.game.value.values,[1,0,4]);assert.deepEqual(a.game.value.values,b.game.value.values);await f.stop();
});
test('simultaneous edits to the same ring settle deterministically',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();const la=a.wa.players.list,lb=b.wa.players.list;
  a.wa.players.list=()=>[];b.wa.players.list=()=>[];await Promise.all([a.game.setRing(1,2),b.game.setRing(1,4)]);
  a.wa.players.list=la;b.wa.players.list=lb;await f.tick();assert.deepEqual(a.game.value.values,b.game.value.values);assert.equal(a.game.value.values[1],4);await f.stop();
});
test('a reset excludes delayed edits from the previous puzzle epoch',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();await a.game.setRing(0,1);await f.tick();
  const old=structuredClone(b.wa.player.state[PUZZLE_STATE]);assert.equal(await a.game.restart(),true);await f.tick();
  const current=a.wa.player.state[PUZZLE_STATE];old.cells[2]={clock:999,source:2,change:uuid(),value:4};
  assert.deepEqual(mergePuzzle(current.round,[current,old]).values,[0,0,0]);await f.stop();
});
test('late joiners and remaining participants retain changes; an empty new round starts fresh',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();await a.game.setRing(2,4);await f.tick();const c=f.add(3);await f.tick();
  assert.equal(c.game.value.values[2],4);a.wa.player.state.castleSeatV1=null;await f.tick();assert.equal(b.game.value.values[2],4);
  const old=structuredClone(b.wa.player.state[PUZZLE_STATE]);b.wa.player.state.castleSeatV1=null;c.wa.player.state.castleSeatV1=null;await f.tick();
  const next=f.add(4,uuid());next.wa.player.state[PUZZLE_STATE]=old;await f.tick();assert.deepEqual(next.game.value.values,[0,0,0]);await f.stop();
});
test('other chairs, choices, visits and rounds cannot contribute or change the puzzle',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2),other=f.add(3,uuid());await f.ready();await other.game.setRing(0,5);await f.tick();assert.equal(a.game.value.values[0],0);
  for(const patch of [{seat:'outside'},{visit:uuid()},{round:uuid()},{v:2}]){
    const state=structuredClone(b.wa.player.state[PUZZLE_STATE]);b.wa.player.state[PUZZLE_STATE]={...state,...patch,cells:[{clock:99,source:2,change:uuid(),value:5},null,null]};
    a.game.refresh();assert.equal(a.game.value.values[0],0);
  }
  b.wa.player.state.castleTableRoundV1.round.choice='solar';b.game.refresh();assert.equal(await b.game.setRing(1,3),false);
  b.wa.player.state.castleSeatV1=null;b.game.refresh();assert.equal(b.game.value.active,false);await f.stop();
});
test('reopening a side panel preserves the seated puzzle without a new session',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.ready();await a.game.setRing(1,2);await f.tick();
  a.game.dispose();a.game=new StarMachine(a.wa,target,v=>a.views.push(v));await f.tick();assert.deepEqual(a.game.value.values,[0,2,0]);await f.stop();
});
test('unacknowledged optimistic API state never appears as a saved puzzle',async()=>{
  const f=fixture(),a=f.add(1);await f.ready();let release;const save=a.wa.player.state.saveVariable;
  a.wa.player.state.saveVariable=async(key,value)=>{a.wa.player.state[key]=value;await new Promise(resolve=>release=resolve);};
  const setting=a.game.setRing(0,1);await Promise.resolve();a.game.refresh();assert.equal(a.game.value.values[0],0);assert.equal(a.game.value.waiting,true);
  release();assert.equal(await setting,true);assert.equal(a.game.value.values[0],1);a.wa.player.state.saveVariable=save;await f.stop();
});
test('a first click during background publication queues behind it rather than being silently dropped',async()=>{
  const f=fixture(),a=f.add(1),save=a.wa.player.state.saveVariable;let release,first=true;
  a.wa.player.state.saveVariable=async(...args)=>{if(first){first=false;await new Promise(resolve=>release=resolve);}return save(...args);};
  a.game.refresh();await Promise.resolve();const setting=a.game.setRing(0,1);await Promise.resolve();
  assert.equal(a.game.value.values[0],0);assert.equal(a.game.value.waiting,true);release();assert.equal(await setting,true);
  assert.equal(a.game.value.values[0],1);await f.stop();
});
test('failed writes require an explicit retry and never invent a local shared result',async()=>{
  const f=fixture(),a=f.add(1);await f.ready();a.fail=true;assert.equal(await a.game.setRing(0,1),false);assert.equal(a.game.value.values[0],0);assert.equal(a.game.value.failed,true);
  const n=f.writes.length;await f.tick();assert.equal(f.writes.length,n);a.fail=false;await a.game.retry();await f.tick();assert.equal(a.game.value.values[0],1);assert.equal(a.game.value.failed,false);await f.stop();
});
test('timeout is bounded and a delayed old chair write cannot leak into a new visit',async()=>{
  const f=fixture(),a=f.add(1);await f.ready();a.game.timeout=15;let release;const save=a.wa.player.state.saveVariable;
  a.wa.player.state.saveVariable=async(...args)=>{await new Promise(resolve=>release=resolve);return save(...args);};
  assert.equal(await a.game.setRing(0,1),false);assert.equal(a.game.value.failed,true);assert.equal(a.game.value.values[0],0);
  const visit=uuid(),round=uuid();a.wa.player.state.castleSeatV1.visit=visit;a.wa.player.state.castleTableRoundV1={v:1,seat:'a',visit,round:{id:round,choice:'machine'}};
  a.wa.player.state.saveVariable=save;release();await new Promise(resolve=>setTimeout(resolve));await f.tick();assert.deepEqual(a.game.value.values,[0,0,0]);await f.stop();
});
test('solo hints cover the whole puzzle; multiple participants get complementary clues without names',async()=>{
  const f=fixture(),a=f.add(10);await f.ready();assert.deepEqual(a.game.value.hints,[0,1,2]);const b=f.add(20);await f.tick();
  assert.deepEqual(a.game.value.hints,[0,2]);assert.deepEqual(b.game.value.hints,[1]);const c=f.add(30),d=f.add(40);await f.tick();
  assert.deepEqual([a,b,c,d].map(u=>u.game.value.hints),[[0],[1],[2],[]]);assert.equal(a.game.value.participants,4);await f.stop();
});
test('hundreds of unrelated players do not join the table, receive clues or trigger extra writes',async()=>{
  const f=fixture(),a=f.add(1);await f.ready();const list=a.wa.players.list;
  const others=Array.from({length:400},(_,i)=>({playerId:i+2,state:{castleSeatV1:null}}));
  a.wa.players.list=()=>[...list(),...others,a.wa.player];const writes=f.writes.length;await f.tick();
  assert.equal(a.game.value.participants,1);assert.deepEqual(a.game.value.hints,[0,1,2]);assert.equal(f.writes.length,writes);await f.stop();
});
test('start and disposal unsubscribe all native listeners and stop the poller',async()=>{
  const f=fixture(),a=f.add(1),listeners=new Set(),event={subscribe(fn){listeners.add(fn);return {unsubscribe(){listeners.delete(fn);}};}};
  a.wa.player.state.onVariableChange=()=>event;a.wa.players.onVariableChange=()=>event;a.wa.players.onPlayerEnters=event;a.wa.players.onPlayerLeaves=event;
  a.game.start();assert.equal(listeners.size,8);await f.tick();a.game.dispose();assert.equal(listeners.size,0);const n=a.views.length;a.game.refresh();assert.equal(a.views.length,n);await f.stop();
});
