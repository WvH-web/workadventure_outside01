'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyRuntime,mapVersion}=require('../tools/castle-runtime.cjs'),{createWam}=require('../tools/castle-wam.cjs');
const ids=require('../tools/castle-map-ids.cjs'),root=path.resolve(__dirname,'..');
const runtime=JSON.parse(fs.readFileSync(path.join(root,'castle/runtime.json'),'utf8'));
const read=id=>JSON.parse(fs.readFileSync(path.join(root,'castle',id+'.tmj'),'utf8'));
const props=map=>Object.fromEntries(map.properties.map(property=>[property.name,property.value]));
const managed=new Set(['script','castleCommunity','castleRuntimeRevision']);
const withoutRuntime=map=>({...map,properties:map.properties.filter(property=>!managed.has(property.name))});
test('all sixteen new maps enable the reviewed runtime without changing their layout revisions or native voice groups',()=>{
  assert.equal(ids.length,16);assert.equal(runtime.community,true);
  for(const id of ids){
    const map=read(id),settings=props(map),before=structuredClone(map);applyRuntime(map);
    assert.deepEqual(map,before,'Runtime finalization is deterministic: '+id);
    assert.equal(settings.castleCommunity,true);assert.equal(settings.castleRuntimeRevision,runtime.revision);
    const url=new URL(settings.script,'https://map.invalid/');assert.equal(url.searchParams.get('v'),mapVersion(map));
    const legacy=structuredClone(map);legacy.properties=legacy.properties.filter(property=>property.name!=='castleRuntimeRevision'&&property.name!=='castleCommunity');
    const a=createWam(map),b=createWam(legacy);assert.deepEqual(a.areas,b.areas);assert.deepEqual(a.settings,b.settings);
    assert.notEqual(a.mapUrl,b.mapUrl,'A new source URL forces the updated map to be fetched');
  }
});
test('runtime finalization edits only managed metadata, keeps room query keys and never regenerates artwork or geometry',()=>{
  const map=read('atelier'),before=structuredClone(map);applyRuntime(map);
  assert.deepEqual(withoutRuntime(map),withoutRuntime(before));
  assert.equal(new URL(props(map).script,'https://map.invalid/').searchParams.get('room'),'atelier');
  const revision=mapVersion(map);map.properties.find(property=>property.name==='castleRevision').value='next-layout';
  applyRuntime(map);assert.notEqual(mapVersion(map),revision);assert.ok(mapVersion(map).startsWith('next-layout-'));
});
test('old castle, teacher room, foreign scripts, extra arguments and duplicate fields cannot be silently retargeted',()=>{
  for(const change of [map=>{map.properties.find(p=>p.name==='castleMapId').value='lehrerzimmer';},
    map=>{map.properties.find(p=>p.name==='script').value='https://evil.invalid/room.js';},
    map=>{map.properties.find(p=>p.name==='script').value='sub/room.js';},
    map=>{map.properties.find(p=>p.name==='script').value='room.js?token=unexpected';},
    map=>{map.properties.find(p=>p.name==='script').value='room.js?room=other';},
    map=>{map.properties.find(p=>p.name==='castleRevision').value='bad revision';},
    map=>{map.properties.push({...map.properties.find(p=>p.name==='script')});}]){
    const map=read('bibliothek');change(map);const before=structuredClone(map);
    assert.throws(()=>applyRuntime(map));assert.deepEqual(map,before);
  }
  const teacher=JSON.parse(fs.readFileSync(path.join(root,'teachersmeetingground.tmj'),'utf8')),before=structuredClone(teacher);
  assert.throws(()=>applyRuntime(teacher));assert.deepEqual(teacher,before);
});
test('every live entry controller imports the same cache-busted room module and owned UI metadata',()=>{
  for(const filename of ['activities.js','cinema.js','displays.js','npcs.js','outdoors.js','hall.js']){
    const source=fs.readFileSync(path.join(root,'castle',filename),'utf8');
    assert.equal(source.match(/from\s+["']\.\/room\.js\?v=([^"']+)/)?.[1],runtime.revision,filename);
  }
  for(const filename of ['community.js','ui-lifecycle.js']){
    const source=fs.readFileSync(path.join(root,'castle',filename),'utf8');
    assert.equal(source.match(/from\s+["']\.\/ui-ids\.js\?v=([^"']+)/)?.[1],runtime.revision,filename);
  }
});
