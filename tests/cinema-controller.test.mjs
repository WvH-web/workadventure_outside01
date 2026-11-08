import test from 'node:test';
import assert from 'node:assert/strict';
import {CastleCinema} from '../castle/cinema.js';
const map={layers:[{objects:[{x:32,y:240,width:896,height:608,properties:[
  {name:'castleCinemaUrl',value:'https://deutsche-online-schule.com/kino/public/kino.php'},
  {name:'castleCinemaWidth',value:60},{name:'castleCinemaPolicy',value:'fullscreen; autoplay; encrypted-media; picture-in-picture'}]}]}]};
function fixture(){
  const buttons=new Map(),calls=[],closed=[],room={position:{x:480,y:272}},sites=new Set();
  const wa={ui:{actionBar:{addButton:b=>buttons.set(b.id,b),removeButton:id=>buttons.delete(id)}},nav:{
    openCoWebSite:async(...args)=>{calls.push(args);const id='film-'+calls.length;sites.add(id);return {id,close:async()=>{closed.push(id);sites.delete(id)}}},
    getCoWebSites:async()=>[...sites].map(id=>({id}))}};
  const cinema=new CastleCinema(wa,room,map);
  return {wa,room,cinema,buttons,calls,closed,sites};
}
test('entering opens the film automatically once without changing proximity or duplicating it on refresh',async()=>{
  const f=fixture();f.cinema.refresh();await f.cinema.openTask;assert.equal(f.calls.length,1);
  f.cinema.refresh();await Promise.resolve();assert.equal(f.calls.length,1);
  assert.equal(f.buttons.get('castle-cinema').label,'Kino schliessen');
  f.room.position={x:500,y:100};f.cinema.refresh();assert.equal(f.buttons.size,0);
  f.cinema.dispose();
});
test('automatic opening preserves the 60-percent film policy without granting scripting access',async()=>{
  const f=fixture();f.cinema.refresh();
  await f.cinema.openTask;
  assert.equal(f.calls.length,1);
  assert.deepEqual(f.calls[0],['https://deutsche-online-schule.com/kino/public/kino.php',false,
    'fullscreen; autoplay; encrypted-media; picture-in-picture',60,undefined,true,false]);
  assert.equal(f.buttons.get('castle-cinema').label,'Kino schliessen');f.cinema.dispose();
});
test('moving between every kind of cinema seat preserves the same film window',async()=>{
  const f=fixture();await f.cinema.open();const first=f.cinema.website;
  for(const p of [{x:240,y:272},{x:720,y:592},{x:112,y:690},{x:844,y:755}]){
    f.room.position=p;f.cinema.refresh();await f.cinema.open();assert.equal(f.cinema.website,first);
  }
  assert.equal(f.calls.length,1);assert.deepEqual(f.closed,[]);f.cinema.dispose();
});
test('concurrent clicks do not duplicate a pending film window',async()=>{
  const f=fixture();let resolve;f.wa.nav.openCoWebSite=()=>{f.calls.push('open');return new Promise(r=>{resolve=r})};
  const a=f.cinema.open(),b=f.cinema.open();assert.equal(a,b);await Promise.resolve();
  resolve({id:'pending',close:async()=>{}});await a;assert.equal(f.calls.length,1);f.cinema.dispose();
});
test('departure cancels a pending open and closes only its late result',async()=>{
  const f=fixture();let resolve;f.wa.nav.openCoWebSite=()=>new Promise(r=>{resolve=r});
  const pending=f.cinema.open();await Promise.resolve();f.cinema.dispose();
  resolve({id:'late',close:async()=>f.closed.push('late')});assert.equal(await pending,null);
  assert.deepEqual(f.closed,['late']);assert.equal(f.buttons.size,0);assert.equal(f.cinema.website,null);
});
test('closing by the native cross is detected and permits a fresh explicit open',async()=>{
  const f=fixture();await f.cinema.open();f.sites.clear();await f.cinema.checkWebsite();
  assert.equal(f.cinema.website,null);assert.equal(f.buttons.get('castle-cinema').label,'Kino');
  f.cinema.refresh();await Promise.resolve();assert.equal(f.calls.length,1,'Do not reopen a manually closed window');
  await f.cinema.open();assert.equal(f.calls.length,2);f.cinema.dispose();
});
test('manual close is respected until the viewer leaves and enters the cinema again',async()=>{
  const f=fixture();f.cinema.refresh();await f.cinema.openTask;
  await f.cinema.close(true);f.cinema.refresh();await Promise.resolve();assert.equal(f.calls.length,1);
  f.room.position={x:480,y:900};f.cinema.refresh();
  f.room.position={x:480,y:816};f.cinema.refresh();await f.cinema.openTask;
  assert.equal(f.calls.length,2);f.cinema.dispose();
});
test('failed automatic opening is retried with backoff, never on every position refresh',async t=>{
  t.mock.method(console,'warn',()=>{});
  const f=fixture();let attempts=0;
  f.wa.nav.openCoWebSite=async()=>{attempts++;throw Error('synthetic offline')};
  f.cinema.refresh();await f.cinema.openTask.catch(()=>{});
  f.cinema.refresh();await Promise.resolve();assert.equal(attempts,1);
  f.cinema.retryAt=0;f.cinema.refresh();await f.cinema.openTask.catch(()=>{});assert.equal(attempts,2);
  f.cinema.dispose();
});
test('leaving the film area closes its owned window and disposal never touches another website',async()=>{
  const f=fixture();f.sites.add('unrelated');await f.cinema.open();
  f.room.position={x:480,y:900};f.cinema.refresh();await Promise.resolve();
  assert.deepEqual(f.closed,['film-1']);assert.ok(f.sites.has('unrelated'));assert.equal(f.buttons.size,0);
  f.cinema.dispose();f.cinema.dispose();assert.deepEqual(f.closed,['film-1']);
});
test('a failed open releases the pending guard and allows retry',async()=>{
  const f=fixture(),real=f.wa.nav.openCoWebSite;
  f.wa.nav.openCoWebSite=async()=>{throw Error('synthetic failure')};await assert.rejects(f.cinema.open(),/synthetic failure/);
  assert.equal(f.cinema.openTask,null);f.wa.nav.openCoWebSite=real;
  await f.cinema.open();assert.equal(f.calls.length,1);f.cinema.dispose();
});
