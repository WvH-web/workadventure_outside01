import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
const sharp=createRequire(import.meta.url)('../tools/castle-deps.cjs')('sharp');
const base=new URL('../castle/',import.meta.url),art=new URL('art/kino-20261108/',base);
const map=JSON.parse(fs.readFileSync(new URL('kino.tmj',base)));
const source=JSON.parse(fs.readFileSync(new URL('layout.json',art)));
const world=JSON.parse(fs.readFileSync(new URL('layout.json',base))).worlds.find(w=>w.id==='kino');
const layout=readLayout(map),props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const objects=map.layers.flatMap(l=>l.objects||[]),film=objects.find(o=>o.name==='kino-film');
const inside=(a,x,y)=>x>=a.x&&y>=a.y&&x<a.x+a.width&&y<a.y+a.height;
const collision=map.layers.find(l=>l.name==='collisions').data;
const cell=(x,y)=>Math.floor(y/32)*map.width+Math.floor(x/32);
test('cinema is a compact native 30x28 room with 32px avatars and individual 32x36px armchairs',async()=>{
  assert.equal(map.width,30);assert.equal(map.height,28);assert.equal(map.tilewidth,32);
  assert.equal(source.scene.avatarPixels,32);
  assert.ok(map.width*map.height<48*44/2);
  const chair=await sharp(fs.readFileSync(new URL('chair.png',art))).metadata();
  assert.equal(chair.width,32);assert.equal(chair.height,36);assert.equal(chair.hasAlpha,true);
  assert.equal(source.mapdata.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync(new URL('room-source.png',art))).digest('hex'));
  assert.equal(props(map).castleRevision,source.scene.revision);
  for(const ts of map.tilesets){
    assert.ok(!/[?#]/.test(ts.image),'Local Tiled image paths must be literal file names');
    assert.ok(fs.existsSync(new URL(ts.image,base)));
  }
});
test('48 silent seats and 16 conversation seats keep both scripting and native foot positions in their audio area',()=>{
  assert.equal(layout.seats.length,64);assert.equal(new Set(layout.seats.map(s=>s.id)).size,64);
  assert.equal(layout.groups.length,4);assert.equal(layout.quiet.length,1);
  assert.equal(layout.seats.filter(s=>!s.audioGroup).length,48);
  assert.equal(layout.seats.filter(s=>s.audioGroup).length,16);
  for(const s of layout.seats){
    const expected=s.audioGroup?'area-'+s.audioGroup:'quiet';
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}]){
      assert.equal(conversationAt(layout,p,s)?.id,expected,s.id);
      assert.equal(conversationAt(layout,{x:p.x,y:p.y+16},s)?.id,expected,s.id+' native foot');
    }
    if(!s.audioGroup)assert.equal(s.facing,'up');
  }
});
test('all four native rear groups are disjoint and include four seats, while the front remains natively silent',()=>{
  const wam=JSON.parse(fs.readFileSync(new URL('kino.wam',base)));
  assert.equal(wam.areas.length,4);
  for(const g of layout.groups){
    assert.equal(layout.seats.filter(s=>s.audioGroup===g.group).length,4);
    const native=wam.areas.find(a=>a.properties[0].roomName.endsWith('area-'+g.group));
    assert.ok(native);
    assert.equal(native.properties[0].type,'livekitRoomProperty');
    for(const other of [...layout.groups,...layout.quiet])if(other!==g)
      assert.ok(g.x+g.width<=other.x||other.x+other.width<=g.x||g.y+g.height<=other.y||other.y+other.height<=g.y);
  }
  assert.equal(props(layout.quiet[0]).silent,true);
});
test('one continuous film area reuses the existing player without sharing the seat action key',()=>{
  const p=props(film);
  assert.equal(p.castleCinemaUrl,'https://deutsche-online-schule.com/kino/public/kino.php');
  assert.equal(p.castleCinemaWidth,60);assert.match(p.castleCinemaPolicy,/autoplay/);
  assert.equal(objects.filter(o=>props(o).castleCinemaUrl).length,1);
  assert.equal(objects.filter(o=>props(o).openWebsite).length,0,'No native automatic or conflicting seat action');
  assert.match(props(map).script,/^cinema\.js\?v=/);
  for(const s of layout.seats)for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])
    for(const dy of [0,16])assert.ok(inside(film,p.x,p.y+dy),s.id);
});
test('entry, every seat approach and the exit are reachable without crossing an exit trigger or solid table',()=>{
  const portal=new Set(map.layers.find(l=>l.name==='door-foyer').data.flatMap((g,i)=>g?[i]:[]));
  const start=world.entries.start[1]*map.width+world.entries.start[0],seen=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%map.width,y=Math.floor(n/map.width);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*map.width+xx;
      if(xx<0||yy<0||xx>=map.width||yy>=map.height||collision[next]||portal.has(next)||seen.has(next))continue;
      seen.add(next);queue.push(next);
    }
  }
  for(const s of layout.seats){
    assert.ok(seen.has(cell(s.standX,s.standY)),s.id);
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])
      for(const x of [p.x-8,p.x+8])for(const y of [p.y-8,p.y+8])assert.equal(collision[cell(x,y)],0,s.id);
  }
  for(let y=240;y<=848;y+=16)assert.equal(collision[cell(480,y)],0,'central aisle '+y);
  for(const x of source.scene.lounges.columns)assert.ok(collision[cell(x+64,720)],'solid table '+x);
  for(const [x,y]of Object.values(world.entries)){
    assert.ok(seen.has(y*map.width+x));assert.ok(!portal.has(cell(x*32+16,y*32+32)));
  }
  assert.equal(portal.size,6);assert.ok([...portal].some(n=>seen.has(n-map.width)));
  assert.equal(props(map.layers.find(l=>l.name==='door-foyer')).exitUrl,'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam#kino');
});
test('furniture foreground uses matching source pixels and leaves every seated head and upper torso visible',async()=>{
  const floor=await sharp(fs.readFileSync(new URL(map.tilesets[0].image,base))).ensureAlpha().raw().toBuffer();
  const frontImage=map.tilesets.find(t=>t.name==='Moebel-Vorderkanten').image;
  const fronts=await sharp(fs.readFileSync(new URL(frontImage,base))).ensureAlpha().raw().toBuffer();
  assert.deepEqual(fs.readFileSync(new URL('fronts-20261108-v2.png',art)),fs.readFileSync(new URL('fronts.png',art)),'Earlier preview assets remain unchanged');
  let opaque=0;
  for(let i=0;i<fronts.length;i+=4)if(fronts[i+3]){
    opaque++;assert.equal(fronts[i+3],255);assert.deepEqual(fronts.subarray(i,i+4),floor.subarray(i,i+4));
  }
  assert.ok(opaque>30000&&opaque<90000);
  for(const s of layout.seats)for(let y=s.y-22;y<s.y+(s.facing==='down'?11:3);y++)for(let x=s.x-10;x<s.x+10;x++)
    assert.equal(fronts[(y*960+x)*4+3],0,s.id);
  for(let y=240;y<848;y++)assert.equal(fronts[(y*960+480)*4+3],0,'clear centre aisle');
  assert.ok(map.layers.findIndex(l=>l.name==='furniture-fronts')>map.layers.findIndex(l=>l.name==='floorLayer'));
});
test('two readable directional sign sprites mark the viewing and conversation areas without blocking seats or the centre aisle',async()=>{
  const signs=source.scene.signs,markers=map.layers.find(l=>l.name==='wayfinding').objects;
  assert.equal(signs.length,2);assert.equal(markers.length,2);
  assert.deepEqual(signs.map(s=>[s.id,s.direction]),[['quiet','up'],['conversation','down']]);
  assert.match(props(markers[0]).cinemaSignText,/VORNE: Nur Film/);
  assert.match(props(markers[1]).cinemaSignText,/HINTEN: Film & Gespr\u00e4che/);
  for(const s of signs){
    const sprite=await sharp(fs.readFileSync(new URL('sign-'+s.id+'.png',art))).metadata();
    assert.equal(sprite.width,80);assert.equal(sprite.height,64);assert.equal(sprite.hasAlpha,true);
    assert.ok(collision[cell(s.base.x+s.base.width/2,s.base.y+s.base.height/2)]);
    assert.ok(s.x+s.width<=456||s.x>=504,'Signs flank the centre without covering it');
  }
  const old=await sharp(fs.readFileSync(new URL('floor.png',art))).ensureAlpha().raw().toBuffer();
  const current=await sharp(fs.readFileSync(new URL(map.tilesets[0].image,base))).ensureAlpha().raw().toBuffer();
  for(let y=0;y<896;y++)for(let x=0;x<960;x++)if(!signs.some(s=>inside(s,x,y))){
    const p=(y*960+x)*4;
    assert.deepEqual(current.subarray(p,p+4),old.subarray(p,p+4),'Existing furniture and scale remain unchanged');
  }
});
test('candle flames use seven valid native animation frames without layer offsets',async()=>{
  const ts=map.tilesets.find(t=>t.name==='Kino-Kerzen');
  assert.equal(ts.tilecount,7);assert.equal(ts.tiles.length,2);
  for(const tile of ts.tiles){
    assert.equal(tile.animation.length,7);
    for(const f of tile.animation)assert.ok(f.tileid>=0&&f.tileid<7&&f.duration===100);
  }
  assert.ok(map.layers.every(l=>!l.offsetx&&!l.offsety));
  const pixels=await sharp(fs.readFileSync(new URL('candles.png',art))).ensureAlpha().raw().toBuffer();
  assert.ok(pixels.some((v,i)=>i%4===3&&v>0));
});
test('preview and native cinema share the same geometry, source version and furniture scale',()=>{
  assert.deepEqual(world.seats,layout.seats);
  assert.equal(world.width,map.width);assert.equal(world.height,map.height);assert.equal(world.illustrated,true);
  assert.deepEqual(world.entries,source.scene.entries);assert.equal(world.mapdata.avatarSize,32);
  const wam=JSON.parse(fs.readFileSync(new URL('kino.wam',base)));
  assert.equal(new URL(wam.mapUrl).searchParams.get('v'),source.scene.revision);
  assert.equal(props(map).castleArtScale,1);
});
