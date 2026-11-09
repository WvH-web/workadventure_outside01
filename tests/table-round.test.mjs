import test from 'node:test';
import assert from 'node:assert/strict';
import {TableRound,TABLE_STATE} from '../castle/table-round.js';
const options=[{id:'chess'},{id:'story'}],tables=[{id:'one',seats:['a','b','c'],options},{id:'two',seats:['d','e'],options}];
function fixture(){
  const players=[],controllers=[];
  function add(id,seat){
    const player={playerId:id,state:{castleSeatV1:{id:seat,stage:'seated',visit:crypto.randomUUID()}}};players.push(player);
    const room={seat:{id:seat},busy:false},events=[];
    player.state.saveVariable=async(key,value)=>{player.state[key]=structuredClone(value);};
    const controller=new TableRound({player,players:{list:()=>players.filter(other=>other!==player)}},room,tables,value=>events.push(value));controllers.push(controller);
    return {player,room,controller,events};
  }
  async function settle(){for(let i=0;i<8;i++){for(const controller of controllers)controller.refresh();await Promise.all(controllers.map(controller=>controller.writing));}}
  function stand(user){user.room.seat=null;user.player.state.castleSeatV1=null;}
  function depart(user){players.splice(players.indexOf(user.player),1);user.controller.dispose();}
  return {add,settle,stand,depart,players};
}
test('only seated participants choose; one shared choice reaches late arrivals and survives the chooser leaving',async()=>{
  const f=fixture(),a=f.add(1,'a'),b=f.add(2,'b');await f.settle();
  assert.equal(a.controller.value.leader,true);assert.equal(b.controller.choose('story'),false);
  assert.equal(a.controller.choose('chess'),true);await f.settle();const round=a.controller.value.round;
  assert.equal(round.choice,'chess');assert.deepEqual(b.controller.value.round,round);
  const late=f.add(3,'c');await f.settle();assert.deepEqual(late.controller.value.round,round);
  f.stand(a);await f.settle();assert.equal(a.controller.value,null);assert.deepEqual(b.controller.value.round,round);
  f.depart(b);await f.settle();assert.deepEqual(late.controller.value.round,round);
  assert.equal(late.controller.choose('story'),false);
});
test('the last departure ends the round; a new visit and a neighboring table stay independent',async()=>{
  const f=fixture(),a=f.add(1,'a'),neighbor=f.add(2,'d');await f.settle();a.controller.choose('chess');neighbor.controller.choose('story');await f.settle();
  const old=a.controller.value.round.id;assert.equal(neighbor.controller.value.round.choice,'story');
  f.stand(a);await f.settle();a.room.seat={id:'a'};a.player.state.castleSeatV1={id:'a',stage:'seated',visit:crypto.randomUUID()};await f.settle();
  assert.equal(a.controller.value.round,null);assert.equal(a.controller.choose('story'),true);await f.settle();assert.notEqual(a.controller.value.round.id,old);
  assert.equal(neighbor.controller.value.round.choice,'story');
});
test('fixed activities start without a picker and never open before acknowledged publication',async()=>{
  const player={playerId:1,state:{castleSeatV1:{id:'a',stage:'seated',visit:crypto.randomUUID()}}},room={seat:{id:'a'}};let resolve;
  player.state.saveVariable=async(key,value)=>{await new Promise(r=>resolve=r);player.state[key]=value;};
  const c=new TableRound({player,players:{list:()=>[]}},room,[{...tables[0],options:[options[0]]}],()=>{});
  c.refresh();c.refresh();assert.equal(c.value.round,null);resolve();await c.writing;c.refresh();assert.equal(c.value.round.choice,'chess');
});
test('failed publication cannot invent a shared game and chair visit nonces reject old rounds',async()=>{
  const f=fixture(),a=f.add(1,'a');await f.settle();a.player.state.saveVariable=async()=>{throw Error('offline');};a.controller.choose('chess');await f.settle();assert.equal(a.controller.value.round,null);
  a.player.state[TABLE_STATE]={v:1,seat:'a',visit:crypto.randomUUID(),round:{id:crypto.randomUUID(),origin:1,choice:'story'}};
  assert.equal(a.controller.participants(tables[0])[0].round,null);assert.equal(a.controller.choose('unapproved-url'),false);
});
test('simultaneous isolated choices converge deterministically without changing another table',async()=>{
  const f=fixture(),a=f.add(1,'a'),b=f.add(2,'b');
  const first={id:crypto.randomUUID(),origin:1,choice:'chess'},second={id:crypto.randomUUID(),origin:2,choice:'story'};
  for(const [user,round] of [[a,first],[b,second]])user.player.state[TABLE_STATE]={v:1,seat:user.room.seat.id,visit:user.player.state.castleSeatV1.visit,round};
  await f.settle();assert.deepEqual(a.controller.value.round,first);assert.deepEqual(b.controller.value.round,first);
});
