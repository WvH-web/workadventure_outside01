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
  for(const url of ['hall-games.html','https://together.deine-schule.com/castle-school/games','https://together.deine-schule.com/castle-chess/','https://musiclab.chromeexperiments.com/Song-Maker/','https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de',
    'https://together.deine-schule.com/castle-content/collection.html?kind=museum','https://together.deine-schule.com/castle-content/collection.html?kind=music'])assert.equal(activitySettings(object('x',url,true)).api,false);
  for(const url of ['https://example.org/story.html','javascript:alert(1)','story.html?unreviewed=1','https://musiclab.chromeexperiments.com.evil.invalid/Song-Maker/',
    'https://together.deine-schule.com/castle-school/games?url=https://evil.invalid','https://together.deine-schule.com/castle-chess/?table=evil','https://together.deine-schule.com.evil.invalid/castle-chess/','https://together.deine-schule.com/castle-content/collection.html?kind=museum&url=https://evil.invalid','https://together.deine-schule.com.evil.invalid/castle-content/collection.html?kind=music'])assert.throws(()=>activitySettings(object('x',url,true)));
  assert.equal(activitySettings(object('games','hall-games.html',true)).url,'https://together.deine-schule.com/castle-school/games');
});
test('entering an activity offers a separate button and never opens a panel or changes media automatically',async()=>{
  const s=setup();assert.equal(s.buttons.size,2);assert.equal(s.websites.length,0);
  assert.ok(s.buttons.has('castle-activity-activity-story'));
  assert.equal(s.buttons.get('castle-activity-activity-story-apps').location,'appsMenu');
  await s.c.open();await s.c.open();assert.equal(s.websites.length,1);assert.equal(s.websites[0].api,true);
  s.websites[0].closed=true;await s.c.open();assert.equal(s.websites.length,2);s.c.dispose();
});
test('configured school chess opens once after seating finishes and closes on standing',async()=>{
  const s=setup(),area=s.c.areas[0];area.settings={...area.settings,url:'https://together.deine-schule.com/castle-chess/',api:false,autoOnSit:true};
  s.room.seat={id:'test-chair',x:20,y:20};s.room.busy=true;s.c.refresh();assert.equal(s.websites.length,0);
  s.room.busy=false;s.c.refresh();await s.c.pending;assert.equal(s.websites.length,1);assert.equal(s.websites[0].api,false);
  s.c.refresh();assert.equal(s.websites.length,1);await s.c.close();s.c.refresh();assert.equal(s.websites.length,1,'manual close is respected while seated');
  s.room.seat=null;s.c.refresh();s.room.seat={id:'test-chair',x:20,y:20};s.c.refresh();await s.c.pending;assert.equal(s.websites.length,2);
  s.room.seat=null;s.c.refresh();assert.equal(s.websites[1].closed,true);s.c.dispose();
});
test('automatic seating never grants map API access or opens external activities',()=>{
  for(const url of ['hall-games.html','https://musiclab.chromeexperiments.com/Song-Maker/']){
    const area=object('not-chess',url);area.properties.push(P('castleActivityOnSit',true));assert.equal(activitySettings(area).autoOnSit,false);
  }
  const area=object('chess','https://together.deine-schule.com/castle-chess/',true);area.properties.push(P('castleActivityOnSit',true));assert.equal(activitySettings(area).autoOnSit,true);assert.equal(activitySettings(area).api,false);
});

test('the current activity has an independent Apps entry and both commands share one owned panel',async()=>{
  const s=setup(),main=s.buttons.get('castle-activity-activity-story'),apps=s.buttons.get('castle-activity-activity-story-apps');
  assert.equal(main.label,apps.label);assert.equal(main.callback,apps.callback);apps.callback();await new Promise(resolve=>setTimeout(resolve));
  assert.equal(s.websites.length,1);main.callback();await new Promise(resolve=>setTimeout(resolve));assert.equal(s.websites.length,1);
  s.room.position={x:140,y:20};s.c.refresh();assert.equal(s.buttons.has('castle-activity-activity-story-apps'),false);
  assert.equal(s.buttons.get('castle-activity-activity-music-apps').location,'appsMenu');s.c.dispose();assert.equal(s.buttons.size,0);
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

test('a visible table choice opens for all seated participants, not passers-by, and standing closes only that participant',async()=>{
  const users=[],area=object('table','https://together.deine-schule.com/castle-chess/#table=tisch-1');area.name='activity-table';
  area.properties.push(P('castleActivityOnSit',true),P('castleActivityGroup','table'),P('castleActivityChoices',JSON.stringify([
    {id:'chess',label:'Schach',url:'https://together.deine-schule.com/castle-chess/#table=tisch-1'},
    {id:'story',label:'Erzaehlkarten',url:'story.html#table',api:true}])));
  function add(id,chair){
    const s=setup();s.c.dispose();s.wa.player={playerId:id,state:{castleSeatV1:chair?{id:chair,stage:'seated',visit:crypto.randomUUID()}:null}};
    s.wa.player.state.saveVariable=async(key,value)=>{s.wa.player.state[key]=structuredClone(value);};
    s.wa.players={list:()=>users.filter(other=>other!==s).map(other=>other.wa.player)};
    s.popups=[];s.wa.ui.openPopup=(name,label,buttons)=>{const popup={name,label,buttons,closed:false,close(){this.closed=true;}};s.popups.push(popup);return id%2?popup:Promise.resolve(popup);};
    s.room.layout={seats:[{id:'a',audioGroup:'table'},{id:'b',audioGroup:'table'},{id:'c',audioGroup:'table'}]};s.room.seat=chair?{id:chair,x:20,y:20}:null;
    s.c=new CastleActivities(s.wa,s.room,{layers:[{objects:[area]}]});users.push(s);return s;
  }
  async function tick(){for(let i=0;i<8;i++){for(const s of users)s.c.refresh();await Promise.all(users.map(s=>s.c.rounds?.writing));await new Promise(resolve=>setTimeout(resolve));}}
  const a=add(1,'a'),b=add(2,'b'),passer=add(3,null);await tick();assert.equal(a.popups.at(-1).buttons.length,2);assert.equal(passer.popups.length,0);
  a.popups.at(-1).buttons[0].callback();await tick();assert.equal(a.websites.length,1);assert.equal(b.websites.length,1);assert.equal(passer.websites.length,0);
  assert.ok(a.popups.every(p=>p.closed));assert.ok(b.popups.every(p=>p.closed));
  assert.equal(a.websites[0].url,b.websites[0].url);assert.equal(b.websites[0].api,false);
  const late=add(4,'c');await tick();assert.equal(late.websites.length,1);assert.equal(late.websites[0].url,a.websites[0].url);
  a.room.seat=null;a.wa.player.state.castleSeatV1=null;await tick();assert.equal(a.websites[0].closed,true);assert.equal(b.websites[0].closed,false);
  for(const s of users)s.c.dispose();await Promise.all(users.map(s=>s.c.rounds?.writing));
});
