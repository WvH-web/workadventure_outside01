import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {MuseumTour,tourTarget,tourSelection,TOUR_STATE} from '../castle/tour-state.js';
import {activitySettings} from '../castle/activities.js';
const map=JSON.parse(fs.readFileSync(new URL('../castle/museum.tmj',import.meta.url))),target=tourTarget(map);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

test('the published museum source is a reproducible copy with one dedicated, integrity-checked controller',()=>{
  const raw=fs.readFileSync(new URL('../castle/museum.tmj',import.meta.url));
  assert.deepEqual(fs.readFileSync(new URL('../castle/museum-tour-preview.tmj',import.meta.url)),raw);
  const activity=map.layers.flatMap(layer=>layer.objects||[]).find(object=>object.properties?.some(p=>p.name==='castleActivityId'&&p.value==='museum-collection'));
  const settings=activitySettings(activity);assert.equal(settings.api,true);assert.equal(settings.autoOnSit,true);assert.equal(settings.group,'buchclub');
  assert.ok(map.properties.find(p=>p.name==='script').value.startsWith('museum-tour.bundle.js?v='));
  const manifest=JSON.parse(fs.readFileSync(new URL('../castle/museum-tour.bundle.manifest.json',import.meta.url))),digest=raw=>crypto.createHash('sha256').update(raw).digest('hex');
  const bundle=fs.readFileSync(new URL('../castle/museum-tour.bundle.js',import.meta.url));
  assert.equal(manifest.entry,'castle/museum.js');assert.equal(manifest.sha256,digest(bundle));assert.equal(manifest.bytes,bundle.length);
  assert.equal(manifest.runtimeModuleRequests,1);
  for(const source of manifest.sources)assert.equal(source.sha256,digest(fs.readFileSync(new URL('../'+source.path.split('?')[0],import.meta.url))));
  for(const name of ['room.js','activities.js','displays.js','characters-data.js'])assert.equal(manifest.sources.filter(source=>source.path.split('?')[0]==='castle/'+name).length,1);
});
function setup(){
  const users=[],writes=[];
  function add(id,round=users[0]?.wa.player.state.castleTableRoundV1.round.id||crypto.randomUUID()){
    const seat=target.seats[users.length%4],visit=crypto.randomUUID(),view=[];
    const state={castleSeatV1:{id:seat,stage:'seated',visit},castleTableRoundV1:{v:1,seat,visit,round:{id:round,choice:'museum-collection'}}};
    const wa={player:{playerId:id,state},players:{list:()=>users.filter(user=>user.wa!==wa).map(user=>user.wa.player)}};
    const user={wa,view,fail:false};state.saveVariable=async(key,value,options)=>{
      writes.push({id,key,value:structuredClone(value),options});if(user.fail)throw Error('offline');
      state[key]=structuredClone(value);
    };
    user.tour=new MuseumTour(wa,target,value=>view.push(value));users.push(user);return user;
  }
  async function tick(){for(let i=0;i<8;i++){for(const user of users)user.tour.refresh();await Promise.all(users.map(user=>user.tour.writing));}}
  async function stop(){for(const user of users)user.tour.dispose();await Promise.all(users.map(user=>user.tour.writing));}
  return {users,writes,add,tick,stop};
}

test('only the configured museum table accepts the shared gallery and grants the owned controller API access',()=>{
  assert.equal(target.seats.length,4);assert.throws(()=>tourTarget({...map,properties:[]}));
  const object={properties:[{name:'castleActivityId',value:'museum-collection'},{name:'castleActivityUrl',value:'https://together.deine-schule.com/castle-content/collection.html?kind=museum&shared=table'},
    {name:'castleActivityApi',value:true},{name:'castleActivityOnSit',value:true}]};
  const settings=activitySettings(object);assert.equal(settings.api,true);assert.equal(settings.autoOnSit,true);
  for(const url of ['https://evil.invalid/castle-content/collection.html?kind=museum&shared=table','https://together.deine-schule.com/castle-content/collection.html?kind=music&shared=table',
    'https://together.deine-schule.com/castle-content/collection.html?kind=museum&shared=table&url=https://evil.invalid'])assert.throws(()=>activitySettings({properties:object.properties.map(p=>p.name==='castleActivityUrl'?{...p,value:url}:p)}));
});

test('selection schema permits only published-board identifiers or the gallery, never names, URLs or unbounded clocks',()=>{
  const good={counter:1,source:2,change:crypto.randomUUID(),board:'show13'};assert.deepEqual(tourSelection(good),good);
  for(const patch of [{board:'show14'},{board:'musik01'},{board:'https://example.org'},{counter:0},{counter:Infinity},{counter:1e12},{counter:1.5},{source:'2'},{source:-1},
    {change:'bad'},{url:'https://example.org'},{name:'private'}])assert.equal(tourSelection({...good,...patch}),null);
  assert.equal(tourSelection([]),null);assert.equal(tourSelection(null),null);
});

test('two seated participants share acknowledged choices and returning to the gallery',async()=>{
  const f=setup(),a=f.add(1),b=f.add(2);await f.tick();assert.equal(a.tour.value.selection,null);
  assert.equal(await a.tour.choose('show1'),true);await f.tick();assert.equal(b.tour.value.selection.board,'show1');
  assert.equal(await b.tour.choose('show3'),true);await f.tick();assert.equal(a.tour.value.selection.board,'show3');
  assert.equal(await a.tour.choose(null),true);await f.tick();assert.equal(b.tour.value.selection.board,null);
  assert.ok(f.writes.every(row=>row.key===TOUR_STATE&&same(row.options,{public:true,persist:false,scope:'room'})));
  await f.stop();
});

test('late arrivals keep the selected contribution after the chooser leaves and old empty rounds never revive',async()=>{
  const f=setup(),a=f.add(1),b=f.add(2);await f.tick();await a.tour.choose('show5');await f.tick();
  const c=f.add(3);await f.tick();assert.equal(c.tour.value.selection.board,'show5');
  a.wa.player.state.castleSeatV1=null;await f.tick();assert.equal(a.tour.value.active,false);assert.equal(b.tour.value.selection.board,'show5');
  const former=b.wa.player.state[TOUR_STATE];for(const user of [b,c])user.wa.player.state.castleSeatV1=null;await f.tick();
  const next=f.add(4,crypto.randomUUID());next.wa.player.state[TOUR_STATE]=former;await f.tick();
  assert.equal(next.tour.value.selection,null);await f.stop();
});

test('standing, other tables, stale chair visits, other choices and other rounds cannot contribute',async()=>{
  const f=setup(),a=f.add(1),b=f.add(2),other=f.add(3,crypto.randomUUID());await f.tick();
  await other.tour.choose('show9');await f.tick();assert.equal(a.tour.value.selection,null);
  await a.tour.choose('show1');await f.tick();const selection=structuredClone(a.wa.player.state[TOUR_STATE]);
  for(const patch of [{seat:'outside'}, {visit:crypto.randomUUID()}, {round:crypto.randomUUID()}, {v:2}]){
    b.wa.player.state[TOUR_STATE]={...selection,...patch,selection:{...selection.selection,counter:999,board:'show8'}};
    await f.tick();assert.equal(a.tour.value.selection.board,'show1');
  }
  b.wa.player.state.castleTableRoundV1.round.choice='story';await f.tick();assert.equal(b.tour.value.active,false);
  b.wa.player.state.castleSeatV1.id='outside';assert.equal(await b.tour.choose('show4'),false);
  await f.stop();
});

test('simultaneous offline-isolated proposals converge deterministically after broadcasts arrive',async()=>{
  const f=setup(),a=f.add(1),b=f.add(2);await f.tick();
  const listA=a.wa.players.list,listB=b.wa.players.list;a.wa.players.list=()=>[];b.wa.players.list=()=>[];
  await Promise.all([a.tour.choose('show2'),b.tour.choose('show4')]);
  a.wa.players.list=listA;b.wa.players.list=listB;await f.tick();assert.deepEqual(a.tour.value.selection,b.tour.value.selection);
  assert.equal(a.tour.value.selection.board,'show4');await f.stop();
});

test('failed publication never opens a locally invented shared contribution and a retry can recover',async()=>{
  const f=setup(),a=f.add(1);await f.tick();a.fail=true;
  assert.equal(await a.tour.choose('show6'),false);assert.equal(a.view.some(value=>value.selection?.board==='show6'),false);
  a.fail=false;await f.tick();assert.equal(a.tour.value.selection.board,'show6');await f.stop();
});

test('closing every side panel preserves the selection while chairs remain occupied',async()=>{
  const f=setup(),a=f.add(1),b=f.add(2);await f.tick();await a.tour.choose('show11');await f.tick();
  a.tour.dispose();b.tour.dispose();await Promise.all(f.users.map(user=>user.tour.writing));
  const updates=[];a.tour=new MuseumTour(a.wa,target,value=>updates.push(value));await f.tick();
  assert.equal(a.tour.value.selection.board,'show11');
  a.wa.player.state.castleSeatV1=null;b.wa.player.state.castleSeatV1=null;await f.tick();
  assert.equal(a.tour.value.active,false);await f.stop();
});

test('a pending old chair write cannot replace a new round selection',async()=>{
  const f=setup(),a=f.add(1);await f.tick();const save=a.wa.player.state.saveVariable;let release;
  a.wa.player.state.saveVariable=async(...args)=>{await new Promise(resolve=>release=resolve);return save(...args);};
  const choosing=a.tour.choose('show7');await Promise.resolve();
  const state=a.wa.player.state;state.castleSeatV1.visit=crypto.randomUUID();state.castleTableRoundV1={v:1,seat:state.castleSeatV1.id,visit:state.castleSeatV1.visit,round:{id:crypto.randomUUID(),choice:'museum-collection'}};
  a.tour.refresh();a.wa.player.state.saveVariable=save;release();await choosing;await f.tick();
  assert.equal(a.tour.value.selection,null);await f.stop();
});
