import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
const sharp=createRequire(import.meta.url)('../tools/castle-deps.cjs')('sharp');
const base=new URL('../castle/',import.meta.url),art=new URL('art/grundschule-20261108/',base);
const map=JSON.parse(fs.readFileSync(new URL('grundschule.tmj',base))),l=readLayout(map);
const source=JSON.parse(fs.readFileSync(new URL('layout.json',art))),props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const cells=map.layers.find(l=>l.name==='collisions').data,cell=(x,y)=>Math.floor(y/32)*28+Math.floor(x/32);
test('the primary common room keeps twelve native seats in a compact 28x20 room with the approved furniture size',()=>{
  assert.deepEqual([map.width,map.height,map.tilewidth,source.scene.avatarPixels],[28,20,32,32]);
  assert.equal(l.seats.length,12);assert.equal(l.groups.length,3);assert.equal(new Set(l.seats.map(s=>s.id)).size,12);
  assert.equal(source.mapdata.sofaWidthPixels,100);assert.equal(source.mapdata.bookclubChairWidthPixels,40);
  for(const t of map.tilesets){assert.ok(fs.existsSync(new URL(t.image,base)));assert.ok(!/[?#]/.test(t.image))}
});
test('reading, building and music include standing and seated native feet without overlapping groups',()=>{
  const wam=JSON.parse(fs.readFileSync(new URL('grundschule.wam',base)));assert.equal(wam.areas.length,3);
  for(const s of l.seats)for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])for(const dy of [0,16])
    assert.equal(conversationAt(l,{x:p.x,y:p.y+dy},s)?.id,'area-'+s.audioGroup);
  for(const a of wam.areas)for(const b of wam.areas)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
});
test('all seat approaches are reachable, protected fixtures stay solid and arrival cannot bounce through the door',()=>{
  const scene=source.scene,exit=new Set(map.layers.find(l=>l.name==='door-halle').data.flatMap((g,i)=>g?[i]:[]));
  const start=scene.entries.start[1]*28+scene.entries.start[0],queue=[start],seen=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%28,y=Math.floor(n/28);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*28+xx;if(xx<0||yy<0||xx>=28||yy>=20||cells[next]||exit.has(next)||seen.has(next))continue;
      seen.add(next);queue.push(next);
    }
  }
  for(const s of l.seats){
    assert.ok(seen.has(cell(s.standX,s.standY)),s.id);
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])for(const x of [p.x-8,p.x+8])for(const y of [p.y-8,p.y+8])assert.equal(cells[cell(x,y)],0,s.id);
  }
  for(const r of source.collisionRects.filter(r=>r.preserve))for(let y=0;y<20;y++)for(let x=0;x<28;x++)
    if(x*32+16>=r.x&&x*32+16<r.x+r.width&&y*32+16>=r.y&&y*32+16<r.y+r.height)assert.ok(cells[y*28+x],r.id);
  for(let y=272;y<592;y+=16)assert.equal(cells[cell(448,y)],0);
  assert.ok(!exit.has(start));assert.ok([...exit].some(n=>seen.has(n-28)));
});
test('foreground matches the source pixels and protects all heads, torsos and the walking passage',async()=>{
  const floor=await sharp(fs.readFileSync(new URL('floor.png',art))).ensureAlpha().raw().toBuffer();
  const fronts=await sharp(fs.readFileSync(new URL(source.scene.frontFile||'fronts.png',art))).ensureAlpha().raw().toBuffer();
  for(let i=0;i<fronts.length;i+=4)if(fronts[i+3])assert.deepEqual(fronts.subarray(i,i+4),floor.subarray(i,i+4));
  for(const s of l.seats)for(let y=s.y-22;y<s.y+(s.facing==='down'?11:3);y++)for(let x=s.x-10;x<s.x+10;x++)assert.equal(fronts[(y*896+x)*4+3],0,s.id);
  for(let y=256;y<592;y++)assert.equal(fronts[(y*896+448)*4+3],0);
});
test('activities use real reviewed destinations and distinct ephemeral story variables, never score or identity storage',()=>{
  for(const [id,key,count]of [['grundschule','castleStoryGs',3],['mittelstufe','castleStoryMs',3]]){
    const m=JSON.parse(fs.readFileSync(new URL(id+'.tmj',base))),p=props(m);
    assert.match(p.script,id==='mittelstufe'?/^expansion\.bundle\.js\?v=/:/^activities\.js\?v=/);assert.equal(p.castleStoryVariable,key);
    const variables=m.layers.find(l=>l.name==='variables').objects;
    assert.equal(variables.length,1);assert.equal(variables[0].name,key);assert.equal(variables[0].type,'variable');
    assert.equal(props(variables[0]).persist,false);assert.equal(props(variables[0]).default,false);
    const actions=m.layers.find(l=>l.name==='activities').objects;
    assert.equal(actions.length,count);assert.equal(actions.filter(a=>props(a).castleActivityApi).length,1);
    assert.equal(props(actions.find(a=>props(a).castleActivityApi)).castleActivityUrl,'story.html');
    if(id==='mittelstufe'){
      const chess=props(actions.find(a=>props(a).castleActivityId==='games'));assert.equal(chess.castleActivityUrl,'https://together.deine-schule.com/castle-chess/#table=tisch-1');assert.equal(chess.castleActivityOnSit,true);assert.equal(chess.castleActivityGroup,'spieltisch');
    }
  }
  assert.equal(props(map.layers.find(l=>l.name==='door-halle')).exitUrl,'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam#grundschule');
});
