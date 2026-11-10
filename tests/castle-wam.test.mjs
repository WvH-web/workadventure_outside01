import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
const {createWam,nativeTarget}=createRequire(import.meta.url)('../tools/castle-wam.cjs');
const base=new URL('../castle/',import.meta.url);
const worlds=JSON.parse(fs.readFileSync(new URL('layout.json',base))).worlds;
const properties=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const inside=(p,a)=>p.x>=a.x&&p.y>=a.y&&p.x<a.x+a.width&&p.y<a.y+a.height;
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
test('all registered native wrappers refer to the existing artwork and rebuild deterministically',()=>{
  const ids=new Set(),rooms=new Set();
  for(const world of worlds){
    const map=JSON.parse(fs.readFileSync(new URL(world.id+'.tmj',base)));
    const wam=JSON.parse(fs.readFileSync(new URL(world.id+'.wam',base)));
    assert.deepEqual(wam,createWam(map));
    assert.deepEqual(createWam(map),createWam(map));
    assert.equal(wam.version,'2.1.0');
    const expectedSource=new URL('https://wvh-web.github.io/workadventure_outside01/castle/'+world.id+'.tmj');
    const revision=[properties(map).castleRevision,properties(map).castleRuntimeRevision].filter(Boolean).join('-');
    if(revision)expectedSource.searchParams.set('v',revision);
    assert.equal(wam.mapUrl,expectedSource.href);
    assert.deepEqual(wam.entities,{});assert.deepEqual(wam.entityCollections,[]);
    assert.equal(wam.settings.megaphone.enabled,false);
    assert.ok(JSON.stringify(wam).length<10000);
    for(const area of wam.areas){
      assert.equal(area.visible,true);assert.ok(!ids.has(area.id));ids.add(area.id);
      assert.equal(area.properties.length,1);
      const meeting=area.properties[0];
      assert.equal(meeting.type,'livekitRoomProperty');
      assert.ok(!ids.has(meeting.id));ids.add(meeting.id);
      assert.ok(!rooms.has(meeting.roomName));rooms.add(meeting.roomName);
      assert.ok(meeting.roomName.startsWith('school-castle-v2-'+world.id+'-'));
      assert.equal(meeting.livekitRoomConfig,undefined,'Respect existing microphone/camera choices');
    }
  }
});
test('every conversational seat and approach uses the correct native room without touching quiet areas',()=>{
  let quietSeats=0;
  for(const world of worlds){
    const map=JSON.parse(fs.readFileSync(new URL(world.id+'.tmj',base))),layout=readLayout(map);
    const wam=createWam(map);
    for(const [index,area]of wam.areas.entries()){
      for(const other of wam.areas.slice(index+1))assert.equal(overlap(area,other),false);
      for(const quiet of layout.quiet)assert.equal(overlap(area,quiet),false);
    }
    for(const seat of layout.seats){
      const expected=conversationAt(layout,seat,seat);
      const areas=wam.areas.filter(a=>inside(seat,a));
      if(expected?.quiet){quietSeats++;assert.equal(areas.length,0);continue;}
      if(!expected){assert.equal(areas.length,0);continue;}
      assert.equal(areas.length,1,world.id+'/'+seat.id);
      assert.ok(areas[0].properties[0].roomName.endsWith('-'+expected.id));
      assert.ok(inside({x:seat.standX,y:seat.standY},areas[0]),seat.id+' approach');
    }
  }
  assert.equal(quietSeats,48);
});
test('only new castle destinations are rewritten; existing teacher and external links stay unchanged',()=>{
  for(const world of worlds){
    const target='https://together.deine-schule.com/~/castle-preview/'+world.id+'.wam#entry';
    assert.equal(nativeTarget(world.id+'.tmj#entry'),target);
    assert.equal(nativeTarget('https://wvh-web.github.io/workadventure_outside01/castle/'+world.id+'.tmj#entry'),target);
  }
  for(const value of ['../teachersmeetingground.tmj','../Schloss01.tmj','https://example.org/grosse-halle.tmj'])assert.equal(nativeTarget(value),value);
  const teacher=JSON.parse(fs.readFileSync(new URL('../teachersmeetingground.tmj',import.meta.url)));
  assert.equal(teacher.layers.find(l=>l.name==='exitSouth').properties[0].value,'Schloss01.tmj');
  assert.equal(properties(teacher).castleNativeMeetings,undefined);
});
