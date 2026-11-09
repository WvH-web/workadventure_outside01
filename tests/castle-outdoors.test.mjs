import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {readLayout,seatingFacingPath} from '../castle/room.js';
import {CastlePark} from '../castle/outdoors.js';
import {activitySettings} from '../castle/activities.js';
import {SharedStory} from '../castle/story-state.js';
const require=createRequire(import.meta.url),sharp=require('../tools/castle-deps.cjs')('sharp');
const {scenes,revision}=require('../tools/build-castle-outdoors.cjs'),{createWam}=require('../tools/castle-wam.cjs');
const base=new URL('../castle/',import.meta.url),read=name=>JSON.parse(fs.readFileSync(new URL(name,base)));
const manifest=read('layout.json'),props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,r)=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
for(const scene of scenes){
  test(scene.id+': compact illustrated map, approved-scale picnic places and independent native groups',()=>{
    const map=read(scene.id+'.tmj'),layout=readLayout(map),world=manifest.worlds.find(w=>w.id===scene.id);
    assert.deepEqual([map.width,map.height,map.tilewidth,map.tileheight],[36,24,32,32]);assert.equal(props(map).castleRevision,revision);
    assert.equal(world.illustrated,true);assert.deepEqual(world.seats,layout.seats);assert.equal(layout.seats.length,scene.tables.length*4);
    assert.equal(createWam(map).areas.length,scene.groups.length);
    const water=map.tilesets.find(t=>t.name==='Wasserspiel');assert.equal(water.tiles[0].animation.length,8);
    assert.ok(water.tiles[0].animation.every(f=>f.tileid>=0&&f.tileid<water.tilecount&&f.duration===120));
    assert.doesNotThrow(()=>new SharedStory({},props(map).castleStoryVariable,()=>{}));
    for(const seat of layout.seats){
      const group=layout.groups.find(g=>g.group===seat.audioGroup);assert.ok(seatingFacingPath(map,seat),seat.id+' alignment');
      for(const p of [{x:seat.x,y:seat.y},{x:seat.standX,y:seat.standY}])for(const dy of [0,16])assert.ok(inside({x:p.x,y:p.y+dy},group),seat.id+' foot');
    }
    for(const link of world.links){const dest=manifest.worlds.find(w=>w.id+'.tmj'===link.target);assert.ok(dest?.entries[link.entry],link.target+' '+link.entry);}
    for(const area of map.layers.flatMap(l=>l.objects||[]).filter(o=>props(o).castleActivityId)){
      const settings=activitySettings(area);assert.equal(settings.api,new URL(settings.url).pathname.endsWith('/story.html'));
    }
  });
  test(scene.id+': every approach, entry, conversation and slide start can be reached without crossing solids or an exit',()=>{
    const map=read(scene.id+'.tmj'),layout=readLayout(map),world=manifest.worlds.find(w=>w.id===scene.id),grid=map.layers.find(l=>l.name==='collisions').data;
    const free=(x,y)=>x>=8&&y>=8&&x<map.width*32-8&&y<map.height*32-8&&[x-8,x+8].every(xx=>[y-8,y+8].every(yy=>!grid[Math.floor(yy/32)*map.width+Math.floor(xx/32)]));
    const portal=p=>world.links.some(l=>inside(p,l)),step=4,cols=map.width*8,key=(x,y)=>Math.round(y/step)*cols+Math.round(x/step);
    const start=world.entries.start.map(n=>n*32+16),queue=[start],seen=new Set([key(...start)]);
    for(let i=0;i<queue.length;i++)for(const [x,y]of [[queue[i][0]-step,queue[i][1]],[queue[i][0]+step,queue[i][1]],[queue[i][0],queue[i][1]-step],[queue[i][0],queue[i][1]+step]]){
      const n=key(x,y);if(seen.has(n)||!free(x,y)||portal({x,y}))continue;seen.add(n);queue.push([x,y]);
    }
    for(const seat of layout.seats){assert.ok(free(seat.x,seat.y),seat.id+' body');assert.ok(seen.has(key(seat.standX,seat.standY)),seat.id+' approach');}
    for(const [name,tile]of Object.entries(world.entries)){const p=tile.map(n=>n*32+16);assert.ok(seen.has(key(...p)),name);assert.equal(portal({x:p[0],y:p[1]}),false);}
    for(const link of world.links)assert.ok(queue.some(([x,y])=>Math.hypot(x-Math.max(link.x,Math.min(x,link.x+link.width)),y-Math.max(link.y,Math.min(y,link.y+link.height)))<=20),link.name+' reachable edge');
    for(const ride of layout.rides){assert.ok(queue.some(([x,y])=>inside({x,y},ride)),'slide start');const end=ride.waypoints.at(-1);assert.ok(free(end.x,end.y),'dry slide exit');}
    const talk=map.layers.flatMap(l=>l.objects||[]).find(o=>props(o).castleActivityId==='npc-'+scene.actor[0]);
    assert.ok(queue.some(([x,y])=>inside({x,y},talk)),'reachable character');
    if(scene.kart)assert.ok(queue.some(([x,y])=>inside({x,y},scene.kart.parking)),'reachable kart parking');
  });
  test(scene.id+': foreground keeps real furniture pixels, not ground rectangles, and leaves all avatar heads visible',async()=>{
    const map=read(scene.id+'.tmj'),layout=readLayout(map),folder='art/'+scene.id+'-20261108-full/';
    const floor=await sharp(fs.readFileSync(new URL(folder+'floor.png',base))).ensureAlpha().raw().toBuffer();
    const fronts=await sharp(fs.readFileSync(new URL(folder+'fronts.png',base))).ensureAlpha().raw().toBuffer();
    const furniture=await sharp(fs.readFileSync(new URL('art/outdoor-furniture-20261108/picnic.png',base))).ensureAlpha().raw().toBuffer();
    let count=0;for(let y=0;y<768;y++)for(let x=0;x<1152;x++){
      const offset=(y*1152+x)*4;if(!fronts[offset+3])continue;count++;assert.deepEqual(fronts.subarray(offset,offset+4),floor.subarray(offset,offset+4));
      assert.ok(scene.tables.some(b=>x>=b.x&&x<b.x+160&&y>=b.y&&y<b.y+112&&furniture[((y-b.y)*160+x-b.x)*4+3]>0),'No background cutout');
    }
    assert.ok(count>10000);for(const seat of layout.seats)for(let y=seat.y-20;y<seat.y+3;y++)for(let x=seat.x-9;x<seat.x+9;x++)assert.equal(fronts[(y*1152+x)*4+3],0,seat.id+' head');
  });
}
function setup(appearance=async()=>{},restore=async()=>{}){
  const buttons=new Map(),calls=[],beforeTravel=new Set(),room={position:{x:520,y:288},onBeforeTravel:fn=>{beforeTravel.add(fn);return ()=>beforeTravel.delete(fn)}},map=read('park.tmj');
  const wa={player:{setTemporaryWoka:async options=>{calls.push(['appearance',options]);return appearance()},restoreWoka:async()=>{calls.push(['restore']);return restore()}},
    ui:{actionBar:{addButton:b=>buttons.set(b.id,b),removeButton:id=>buttons.delete(id)}}};
  return {wa,room,map,buttons,calls,beforeTravel,park:new CastlePark(wa,room,map)};
}
test('kart uses the existing native appearance and preserves normal movement, Shift and media controls',async()=>{
  const s=setup();try{
    s.park.start();assert.equal(s.buttons.get(s.park.startId).label,'Go-Kart fahren');assert.equal(await s.park.startKart(),true);
    assert.equal(s.calls[0][1].textureId,'wvh-go-cart-avatar-v3');assert.equal(s.calls[0][1].scale,.62);assert.equal(s.buttons.get(s.park.stopId).label,'Aussteigen');
    await s.park.stopKart();assert.equal(s.park.active,false);assert.equal(s.park.needsRestore,false);assert.equal(s.buttons.has(s.park.stopId),false);
    assert.deepEqual(s.calls.map(c=>c[0]),['appearance','restore']);
  }finally{s.park.dispose()}
});
test('leaving the circuit restores the avatar without a key binding or player-control override',async()=>{
  const s=setup();try{s.park.start();await s.park.startKart();s.room.position={x:600,y:448};s.park.refresh();await new Promise(r=>setImmediate(r));assert.equal(s.park.active,false);assert.equal(s.park.needsRestore,false);}finally{s.park.dispose()}
});
test('unsupported clients never offer a broken kart command',()=>{
  const s=setup();delete s.wa.player.setTemporaryWoka;s.park.start();assert.equal(s.buttons.size,0);assert.equal(s.park.timer,undefined);s.park.dispose();
});
test('the voluntary return restores the kart appearance before navigation and releases only its own hook',async()=>{
  const s=setup(),unrelated=()=>{};s.beforeTravel.add(unrelated);try{
    s.park.start();await s.park.startKart();for(const callback of s.beforeTravel)await callback();
    assert.equal(s.park.active,false);assert.equal(s.park.needsRestore,false);
  }finally{s.park.dispose()}
  assert.deepEqual([...s.beforeTravel],[unrelated]);
});
test('duplicate entry and a late appearance response cannot reapply a kart after departure',async()=>{
  let finish;const pending=new Promise(r=>finish=r),s=setup(()=>pending);
  s.park.start();const entering=s.park.startKart();assert.equal(await s.park.startKart(),false);s.park.dispose();finish();assert.equal(await entering,false);
  await new Promise(r=>setImmediate(r));assert.equal(s.calls.filter(c=>c[0]==='appearance').length,1);assert.ok(s.calls.some(c=>c[0]==='restore'));assert.equal(s.buttons.size,0);
});
test('failed restoration leaves a retry command, not disabled movement or a silently lost exit',async()=>{
  let fail=true;const s=setup(async()=>{},async()=>{if(fail)throw Error('temporary failure')});try{
    s.park.start();await s.park.startKart();await assert.rejects(s.park.stopKart(),/temporary failure/);assert.equal(s.park.active,false);
    assert.equal(s.buttons.get(s.park.stopId).label,'Avatar zuruecksetzen');assert.equal(await s.park.startKart(),false);
    fail=false;await s.park.stopKart();assert.equal(s.park.needsRestore,false);assert.equal(s.buttons.has(s.park.stopId),false);
  }finally{s.park.dispose()}
});
