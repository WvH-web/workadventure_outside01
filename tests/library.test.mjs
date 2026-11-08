import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
const sharp=createRequire(import.meta.url)('../tools/castle-deps.cjs')('sharp');
const base=new URL('../castle/',import.meta.url),art=new URL('art/bibliothek-20261108/',base);
const map=JSON.parse(fs.readFileSync(new URL('bibliothek.tmj',base))),l=readLayout(map);
const source=JSON.parse(fs.readFileSync(new URL('layout.json',art))),scene=source.scene;
const world=JSON.parse(fs.readFileSync(new URL('layout.json',base))).worlds.find(w=>w.id==='bibliothek');
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const cells=map.layers.find(l=>l.name==='collisions').data,cell=(x,y)=>Math.floor(y/32)*28+Math.floor(x/32);
test('library remains a compact 28x22 native room at the approved furniture and avatar scale',async()=>{
  assert.deepEqual([map.width,map.height,map.tilewidth,scene.avatarPixels],[28,22,32,32]);
  assert.equal(world.mapdata.sofaWidthPixels,100);assert.equal(world.mapdata.bookclubChairWidthPixels,40);
  assert.equal(l.seats.length,13);assert.equal(new Set(l.seats.map(s=>s.id)).size,13);
  for(const ts of map.tilesets){assert.ok(!/[?#]/.test(ts.image));assert.ok(fs.existsSync(new URL(ts.image,base)))}
  const b=await sharp(fs.readFileSync(new URL('bookclub.png',art))).metadata();
  assert.deepEqual([b.width,b.height,b.hasAlpha],[192,160,true]);
  assert.equal(world.mapdata.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('room-source.png',art))).digest('hex'));
});
test('three disjoint native reading groups include all seated and standing feet without muting microphones',()=>{
  const wam=JSON.parse(fs.readFileSync(new URL('bibliothek.wam',base)));
  assert.equal(l.groups.length,3);assert.equal(l.quiet.length,0);assert.equal(wam.areas.length,3);
  for(const [id,count]of [['lesekamin',6],['fensterleser',3],['buchclub',4]]){
    assert.equal(l.seats.filter(s=>s.audioGroup===id).length,count);
    assert.ok(wam.areas.some(a=>a.properties[0].roomName==='school-castle-v2-bibliothek-area-'+id));
  }
  for(const s of l.seats)for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])for(const dy of [0,16])
    assert.equal(conversationAt(l,{x:p.x,y:p.y+dy},s)?.id,'area-'+s.audioGroup);
  for(const [x,y]of [[448,288],[448,480],[432,624]])assert.equal(conversationAt(l,{x,y},null),null);
  for(const a of wam.areas)for(const b of wam.areas)if(a!==b)
    assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
  for(const a of wam.areas)assert.equal(a.properties[0].livekitRoomConfig,undefined);
});
test('every approach is reachable, solid shelves and tables stay blocked, and the middle passage stays open',()=>{
  const exit=new Set(map.layers.find(l=>l.name==='door-halle').data.flatMap((g,i)=>g?[i]:[]));
  const start=scene.entries.start[1]*28+scene.entries.start[0],queue=[start],seen=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%28,y=Math.floor(n/28);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*28+xx;
      if(xx<0||yy<0||xx>=28||yy>=22||cells[next]||exit.has(next)||seen.has(next))continue;
      seen.add(next);queue.push(next);
    }
  }
  for(const s of l.seats){
    assert.ok(seen.has(cell(s.standX,s.standY)),s.id);
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])for(const x of [p.x-8,p.x+8])for(const y of [p.y-8,p.y+8])assert.equal(cells[cell(x,y)],0,s.id);
  }
  for(const r of source.collisionRects.filter(r=>r.preserve))for(let y=0;y<22;y++)for(let x=0;x<28;x++)
    if(x*32+16>=r.x&&x*32+16<r.x+r.width&&y*32+16>=r.y&&y*32+16<r.y+r.height)assert.ok(cells[y*28+x],r.id);
  for(let y=272;y<656;y+=16)assert.equal(cells[cell(448,y)],0);
  for(const [x,y]of Object.values(scene.entries)){assert.ok(seen.has(y*28+x));assert.ok(!exit.has(y*28+x))}
  assert.ok([...exit].some(n=>seen.has(n-28)));
});
test('the library and Hall have precise bidirectional native arrival markers',()=>{
  const hall=JSON.parse(fs.readFileSync(new URL('grosse-halle.tmj',base)));
  assert.equal(props(hall.layers.find(l=>l.name==='door-bibliothek')).exitUrl,'https://together.deine-schule.com/~/castle-preview/bibliothek.wam#halle');
  assert.equal(props(map.layers.find(l=>l.name==='door-halle')).exitUrl,'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam#bibliothek');
  assert.equal(props(map).castleHallUrl,props(map.layers.find(l=>l.name==='door-halle')).exitUrl);
  assert.deepEqual(world.seats,l.seats);assert.equal(props(map).castleRevision,scene.revision);
});
test('foreground preserves source furniture pixels and leaves all thirteen seated heads and torsos visible',async()=>{
  const floor=await sharp(fs.readFileSync(new URL('floor.png',art))).ensureAlpha().raw().toBuffer();
  const fronts=await sharp(fs.readFileSync(new URL('fronts.png',art))).ensureAlpha().raw().toBuffer();
  let pixels=0;
  for(let i=0;i<fronts.length;i+=4)if(fronts[i+3]){pixels++;assert.deepEqual(fronts.subarray(i,i+4),floor.subarray(i,i+4))}
  assert.ok(pixels>12000&&pixels<30000);
  for(const s of l.seats)for(let y=s.y-22;y<s.y+(s.facing==='down'?11:3);y++)for(let x=s.x-10;x<s.x+10;x++)assert.equal(fronts[(y*896+x)*4+3],0,s.id);
  for(let y=256;y<656;y++)assert.equal(fronts[(y*896+448)*4+3],0);
  assert.ok(map.layers.findIndex(l=>l.name==='furniture-fronts')>map.layers.findIndex(l=>l.name==='floorLayer'));
});
test('the little fireplace has seven real animated frames contained in its hearth and quiet crackling',async()=>{
  const ts=map.tilesets.find(t=>t.name==='Bibliothekskamin');
  assert.equal(ts.tiles.length,6);assert.equal(ts.tilecount,42);
  for(const t of ts.tiles){assert.equal(t.animation.length,7);for(const f of t.animation)assert.ok(f.tileid<42&&f.duration===100)}
  const {data,info}=await sharp(fs.readFileSync(new URL('fire.png',art))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const hashes=new Set();
  for(let f=0;f<7;f++){
    const frame=[];
    for(let y=0;y<64;y++)for(let x=0;x<96;x++){
      const p=(y*info.width+f*96+x)*4;frame.push(...data.subarray(p,p+4));
      if(data[p+3])assert.ok(x>=30&&x<80&&y>=30&&y<64);
    }
    hashes.add(crypto.createHash('sha256').update(Buffer.from(frame)).digest('hex'));
  }
  assert.equal(hashes.size,7);assert.ok(map.layers.every(l=>!l.offsetx&&!l.offsety));
  const a=map.layers.find(l=>l.name==='ambience').objects[0];assert.equal(props(a).audioVolume,.06);assert.equal(props(a).audioLoop,true);
});
