import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
import {activitySettings} from '../castle/activities.js';
const require=createRequire(import.meta.url),sharp=require('../tools/castle-deps.cjs')('sharp');
const root=new URL('../castle/',import.meta.url),read=name=>JSON.parse(fs.readFileSync(new URL(name,root))),props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const map=read('spielesaal.tmj'),layout=readLayout(map),before=read('art/spielesaal-20261108-full/layout.json');
const objects=map.layers.flatMap(layer=>layer.objects||[]),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');

test('the two inward-facing stools preserve every original seat position, door and approved furniture dimension',()=>{
 assert.equal(layout.seats.length,14);for(const seat of before.seats){
  const current=layout.seats.find(value=>value.id===seat.id);assert.ok(current);
  for(const key of ['x','y','standX','standY','facing','audioGroup'])assert.equal(current[key],seat[key],seat.id+' '+key);
 }
 assert.deepEqual(layout.seats.filter(seat=>seat.id.startsWith('billard-')).map(seat=>[seat.id,seat.x,seat.y,seat.facing]),[
  ['billard-west',576,338,'right'],['billard-east',800,338,'left']]);
 assert.equal(props(map).castleArtScale,1);assert.equal(JSON.parse(props(map).castleMapdata).sofaWidthPixels,100);
 assert.deepEqual(read('layout.json').worlds.find(world=>world.id==='spielesaal').entries,before.scene.entries);
});

test('both players and window spectators share one disjoint native conversation, separate from chess and lounge',()=>{
 const group=seat=>conversationAt(layout,{x:seat.x,y:seat.y},seat).id;
 for(const id of ['billard-west','billard-east','fenster-0','fenster-1'])assert.equal(group(layout.seats.find(seat=>seat.id===id)),'area-fensterleser');
 assert.equal(group(layout.seats.find(seat=>seat.id==='buchclub-n0')),'area-buchclub');
 assert.equal(layout.groups.length,3);
 for(const [i,a]of layout.groups.entries())for(const b of layout.groups.slice(i+1))assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
 assert.equal(read('spielesaal.wam').areas.length,3);
});

test('the native table offers one shared billiards-or-blocks choice and does not alter the separate chess destination',()=>{
 const table=objects.find(object=>props(object).castleActivityId==='games-puzzles'),settings=activitySettings(table);
 assert.equal(settings.autoOnSit,true);assert.equal(settings.api,false);assert.equal(settings.group,'fensterleser');
 const options=JSON.parse(props(table).castleActivityChoices);assert.deepEqual(options.map(option=>option.id),['billiards','blocks']);
 assert.equal(options[0].url,'https://together.deine-schule.com/castle-billiards/#table=tisch-1');
 assert.equal(options[1].url,'https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de');
 assert.equal(activitySettings(objects.find(object=>props(object).castleActivityId==='games-shelf')).url,'https://together.deine-schule.com/castle-chess/#table=tisch-2');
});

test('only three exact school billiards tables can open, never granting the map API or accepting credential arguments',()=>{
 const base=objects.find(object=>props(object).castleActivityId==='games-puzzles');
 const withUrl=url=>({...base,properties:base.properties.map(p=>p.name==='castleActivityUrl'?{...p,value:url}:p.name==='castleActivityApi'?{...p,value:true}:p)});
 for(const n of [1,2,3]){const settings=activitySettings(withUrl('https://together.deine-schule.com/castle-billiards/#table=tisch-'+n));assert.equal(settings.api,false);assert.equal(settings.autoOnSit,true);}
 for(const url of ['https://together.deine-schule.com/castle-billiards/','https://together.deine-schule.com/castle-billiards/#table=tisch-4',
  'https://together.deine-schule.com/castle-billiards/?token=x#table=tisch-1','https://foreign.invalid/castle-billiards/#table=tisch-1',
  'https://together.deine-schule.com/castle-billiards/command#table=tisch-1'])assert.throws(()=>activitySettings(withUrl(url)));
});

test('the solid table cannot be walked through and the original central entrance passage remains free',()=>{
 const layer=map.layers.find(layer=>layer.name==='collisions'),blocked=(x,y)=>Boolean(layer.data[Math.floor(y/32)*map.width+Math.floor(x/32)]);
 for(const y of [304,336,368])for(const x of [624,656,688,720,752])assert.equal(blocked(x,y),true);
 for(let y=272;y<=624;y+=32)assert.equal(blocked(448,y),false);
 for(const seat of layout.seats.filter(seat=>seat.id.startsWith('billard-')))assert.equal(blocked(seat.standX,seat.standY),false);
});

test('the real transparent generated furniture is small, source-bound and included in the matching room pixels',async()=>{
 const manifest=read('art/billard-20261112/furniture.json'),sprite=fs.readFileSync(new URL('art/billard-20261112/furniture.png',root));
 assert.equal(sha(sprite),manifest.spriteSha256);assert.equal(sha(fs.readFileSync(new URL('art/billard-20261112/furniture-source.png',root))),manifest.sourceSha256);
 const meta=await sharp(sprite).metadata();assert.equal(meta.width,256);assert.ok(meta.height>=64&&meta.height<=128);assert.equal(meta.hasAlpha,true);
 const floor=await sharp(fs.readFileSync(new URL('art/spielesaal-billard-20261112/floor.png',root))).extract({left:560,top:288,width:256,height:meta.height}).raw().toBuffer();
 const original=await sharp(fs.readFileSync(new URL('art/spielesaal-20261108-full/floor.png',root))).extract({left:560,top:288,width:256,height:meta.height}).raw().toBuffer();
 assert.notDeepEqual(floor,original);
 assert.equal(fs.existsSync(new URL('art/spielesaal-billard-20261112/room.png',root)),false,'Do not retain a duplicate background raster');
});

test('the new map uses one source-pinned dedicated entry, without silently changing the published service or old castle',()=>{
 const manifest=read('billiards-preview.bundle.manifest.json');assert.equal(manifest.sha256,sha(fs.readFileSync(new URL('billiards-preview.bundle.js',root))));
 assert.equal(manifest.runtimeModuleRequests,1);assert.ok(manifest.bytes<60000);
 for(const source of manifest.sources)assert.equal(source.sha256,sha(fs.readFileSync(new URL('../'+source.path.split('?')[0],root))));
 assert.match(props(map).script,/^billiards-preview\.bundle\.js\?v=20261112-billard2-/);
 assert.deepEqual(read('spielesaal-billard2-preview.tmj'),map);
 const first=read('spielesaal-billard-preview.tmj');assert.equal(props(first).castleRevision,'20261112-billard1');
 assert.equal(readLayout(first).seats.find(seat=>seat.id==='billard-west').y,350,'Preserve the real first-probe source');
});

test('the revised stools leave at least the whole head and upper body visible, rather than just the hair',async()=>{
 const fronts=await sharp(fs.readFileSync(new URL('art/spielesaal-billard-20261112/fronts-r2.png',root))).ensureAlpha().raw().toBuffer();
 for(const seat of layout.seats.filter(seat=>seat.id.startsWith('billard-')))for(let y=seat.y-16;y<seat.y+12;y++)for(let x=seat.x-9;x<seat.x+9;x++)
  assert.equal(fronts[(y*map.width*32+x)*4+3],0,seat.id+' head and upper body');
});
