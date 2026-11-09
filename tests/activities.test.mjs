import test from 'node:test';
import assert from 'node:assert/strict';
import {CastleActivities,activitySettings} from '../castle/activities.js';
import {newStory,normalizeStory,SharedStory} from '../castle/story-state.js';
const P=(name,value)=>({name,value});
const object=(id,url,api=false,x=0)=>({x,y:0,width:100,height:100,properties:[P('castleActivityId',id),P('castleActivityLabel',id),P('castleActivityUrl',url),P('castleActivityApi',api)]});
function setup(open){
  const websites=[],buttons=new Map(),room={position:{x:20,y:20}};
  const wa={ui:{actionBar:{addButton:b=>buttons.set(b.id,b),removeButton:id=>buttons.delete(id)}},nav:{
    openCoWebSite:open||(async(url,api)=>{const w={id:String(websites.length),url,api,closed:false,close:async()=>{w.closed=true}};websites.push(w);return w}),
    getCoWebSites:async()=>websites.filter(w=>!w.closed)
  }};
  const map={layers:[{objects:[object('story','story.html',true),object('music','https://musiclab.chromeexperiments.com/Song-Maker/',true,120)]}]};
  const c=new CastleActivities(wa,room,map);c.refresh();return {c,wa,websites,buttons,room};
}
test('only the exact owned story page gets API access; external providers and the game shelf never do',()=>{
  assert.equal(activitySettings(object('story','story.html',true)).api,true);
  for(const url of ['hall-games.html','https://musiclab.chromeexperiments.com/Song-Maker/','https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de',
    'https://together.deine-schule.com/castle-content/collection.html?kind=museum','https://together.deine-schule.com/castle-content/collection.html?kind=music'])assert.equal(activitySettings(object('x',url,true)).api,false);
  for(const url of ['https://example.org/story.html','javascript:alert(1)','story.html?unreviewed=1','https://musiclab.chromeexperiments.com.evil.invalid/Song-Maker/',
    'https://together.deine-schule.com/castle-content/collection.html?kind=museum&url=https://evil.invalid','https://together.deine-schule.com.evil.invalid/castle-content/collection.html?kind=music'])assert.throws(()=>activitySettings(object('x',url,true)));
});
test('entering an activity offers a separate button and never opens a panel or changes media automatically',async()=>{
  const s=setup();assert.equal(s.buttons.size,1);assert.equal(s.websites.length,0);
  assert.ok(s.buttons.has('castle-activity-activity-story'));
  await s.c.open();await s.c.open();assert.equal(s.websites.length,1);assert.equal(s.websites[0].api,true);
  s.websites[0].closed=true;await s.c.open();assert.equal(s.websites.length,2);s.c.dispose();
});
test('departure closes only the owned panel and removes its own command',async()=>{
  const s=setup();await s.c.open();s.room.position={x:500,y:500};s.c.refresh();
  assert.equal(s.websites[0].closed,true);assert.equal(s.buttons.size,0);s.c.dispose();
});
test('pending panels are deduplicated and a late result is closed after departure',async()=>{
  let resolve,calls=0,closed=0;const pending=new Promise(r=>resolve=r),s=setup(()=>{calls++;return pending});
  const a=s.c.open(),b=s.c.open();s.room.position={x:500,y:500};s.c.refresh();
  resolve({id:'late',close:async()=>closed++});await Promise.all([a,b]);
  assert.equal(calls,1);assert.equal(closed,1);assert.equal(s.c.website,null);s.c.dispose();
});
test('a click in a new area waits for an old pending panel rather than losing the command',async()=>{
  let resolve,calls=0,closed=0;const p=new Promise(r=>resolve=r),s=setup(async()=>++calls===1?p:{id:'music',close:async()=>{}});
  const old=s.c.open();s.room.position={x:140,y:20};s.c.refresh();const next=s.c.open();
  resolve({id:'old',close:async()=>closed++});await old;const w=await next;
  assert.equal(w.id,'music');assert.equal(calls,2);assert.equal(closed,1);s.c.dispose();
});
test('all generated story rounds have three different validated images and contain no identity or free text',()=>{
  for(let i=0;i<300;i++){
    const round=newStory();assert.deepEqual(normalizeStory(round),round);assert.equal(new Set(round.cards).size,3);
    assert.deepEqual(Object.keys(round),['v','round','cards']);
  }
  for(const value of [false,null,{},[],{v:1,round:'x',cards:[0,1,2]},{v:1,round:crypto.randomUUID(),cards:[0,0,2]},{v:1,round:crypto.randomUUID(),cards:[0,1,99]}])assert.equal(normalizeStory(value),null);
});
test('re-entering the same area can reopen after an old pending visit completes',async()=>{
  let resolve,calls=0;const p=new Promise(r=>resolve=r),s=setup(async()=>++calls===1?p:{id:'new',close:async()=>{}});
  const old=s.c.open();s.room.position={x:500,y:500};s.c.refresh();s.room.position={x:20,y:20};s.c.refresh();const next=s.c.open();
  resolve({id:'old',close:async()=>{}});await old;assert.equal((await next).id,'new');assert.equal(calls,2);s.c.dispose();
});
test('shared stories follow server broadcasts, include late joiners and stop updates after disposal',async()=>{
  let value=false;const listeners=new Set();
  const state={loadVariable:()=>value,onVariableChange:()=>({subscribe:fn=>{listeners.add(fn);return {unsubscribe:()=>listeners.delete(fn)}}}),saveVariable:async(_k,v)=>{value=v;for(const fn of listeners)fn(v)}};
  const a=[],b=[],one=new SharedStory(state,'castleStoryGs',v=>a.push(v)).start();await one.roll();
  const two=new SharedStory(state,'castleStoryGs',v=>b.push(v)).start();assert.deepEqual(a.at(-1),b.at(-1));
  await two.roll();assert.deepEqual(a.at(-1),b.at(-1));const n=b.length;two.dispose();await one.roll();assert.equal(b.length,n);one.dispose();
  assert.equal(listeners.size,0);assert.throws(()=>new SharedStory(state,'unconfigured',()=>{}));
});
test('a failed write never invents a local shared round and releases the busy guard',async()=>{
  const values=[];const s=new SharedStory({loadVariable:()=>false,saveVariable:async()=>{throw Error('offline')}},'castleStoryMs',v=>values.push(v));
  await assert.rejects(s.roll(),/offline/);assert.equal(s.busy,false);assert.deepEqual(values,[]);
});
