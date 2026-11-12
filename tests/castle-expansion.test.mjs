import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readLayout,conversationAt} from '../castle/room.js';
import {activitySettings} from '../castle/activities.js';
import {catalogItem,fetchCatalog,catalogBase} from '../castle/catalog.js';
import {CastleDisplays} from '../castle/displays.js';
import {SharedStory} from '../castle/story-state.js';
const require=createRequire(import.meta.url),sharp=require('../tools/castle-deps.cjs')('sharp');
const {rooms,revision}=require('../tools/build-castle-expansion.cjs');
const {createWam}=require('../tools/castle-wam.cjs');
const base=new URL('../castle/',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,base)));
const inside=(r,x,y)=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height;
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const manifest=read('layout.json');
for(const id of [...rooms.map(r=>r.id),'erdgeschoss','obergeschoss']){
  test(id+': current illustrated layout, native scale and real destinations',()=>{
    const map=read(id+'.tmj'),layout=readLayout(map),world=manifest.worlds.find(w=>w.id===id),hub=id==='erdgeschoss'||id==='obergeschoss';
    assert.deepEqual([map.width,map.height,map.tilewidth],[hub?40:28,22,32]);assert.equal(props(map).castleRevision,rooms.find(room=>room.id===id)?.revision||revision);
    assert.equal(world.illustrated,true);assert.deepEqual(world.seats,layout.seats);assert.equal(layout.seats.length,hub?10:id==='spielesaal'?14:12);
    assert.equal(layout.returnLabel,hub?'Grosse Halle':['oberstufe','sternwarte'].includes(id)?'Obere Galerie':'Wandelgang');
    const entry=new URL(props(map).script,'https://map.invalid/');assert.equal(entry.searchParams.get('room'),id);assert.equal(entry.pathname,'/'+(rooms.find(room=>room.id===id)?.bundle||'expansion.bundle.js'));
    assert.equal(createWam(map).areas.length,hub?2:3);
    for(const seat of layout.seats){
      const group=layout.groups.find(g=>g.group===seat.audioGroup);assert.ok(group);
      for(const point of [{x:seat.x,y:seat.y},{x:seat.standX,y:seat.standY}])for(const dy of [0,16])assert.ok(inside(group,point.x,point.y+dy),seat.id+' native feet');
      assert.equal(conversationAt(layout,{x:seat.standX,y:seat.standY},null).id,'area-'+seat.audioGroup);
    }
    for(const object of map.layers.flatMap(l=>l.objects||[]).filter(o=>props(o).castleActivityId)){
      const config=activitySettings(object),raw=props(object).castleActivityUrl;
      if(!raw.startsWith('https://'))assert.ok(fs.existsSync(new URL(raw.split('?')[0],base)),raw);
      if(!config.url.endsWith('/story.html')&&!config.url.endsWith('/puzzle.html')&&!config.url.endsWith('/collection.html?kind=museum&shared=table'))assert.equal(config.api,false);
    }
    for(const link of world.links){
      const dest=manifest.worlds.find(w=>w.id+'.tmj'===link.target);assert.ok(dest,link.target);assert.ok(dest.entries[link.entry||'start']);
    }
  });
  test(id+': every approach and entry is reachable by a whole avatar without crossing a portal',()=>{
    const map=read(id+'.tmj'),layout=readLayout(map),world=manifest.worlds.find(w=>w.id===id),collision=map.layers.find(l=>l.name==='collisions').data;
    const free=(x,y)=>x>=8&&y>=8&&x<map.width*32-8&&y<map.height*32-8&&[x-8,x+8].every(xx=>[y-8,y+8].every(yy=>!collision[Math.floor(yy/32)*map.width+Math.floor(xx/32)]));
    const portal=(x,y)=>world.links.some(r=>inside(r,x,y)),step=4,cols=map.width*8,key=(x,y)=>Math.round(y/step)*cols+Math.round(x/step);
    const start=world.entries.start.map(n=>n*32+16),seen=new Set([key(...start)]),queue=[start];
    for(let i=0;i<queue.length;i++)for(const [x,y]of [[queue[i][0]-step,queue[i][1]],[queue[i][0]+step,queue[i][1]],[queue[i][0],queue[i][1]-step],[queue[i][0],queue[i][1]+step]]){
      const n=key(x,y);if(seen.has(n)||!free(x,y)||portal(x,y))continue;seen.add(n);queue.push([x,y]);
    }
    for(const seat of layout.seats){assert.ok(free(seat.x,seat.y),seat.id+' body');assert.ok(seen.has(key(seat.standX,seat.standY)),seat.id+' approach');}
    for(const [name,tile]of Object.entries(world.entries)){const point=tile.map(n=>n*32+16);assert.ok(seen.has(key(...point)),name);assert.equal(portal(...point),false);}
    for(const link of world.links)assert.ok(queue.some(([x,y])=>Math.abs(x-(link.x+link.width/2))<20&&(Math.abs(y-link.y-40)<12||Math.abs(y-link.y+12)<12)),link.name+' approach');
    const actor=map.layers.flatMap(l=>l.objects||[]).find(o=>props(o).castleNpcId);assert.ok(actor);
    assert.ok(collision[Math.floor((actor.y+48)/32)*map.width+Math.floor((actor.x+48)/32)],'NPC body stays solid');
    const talk=map.layers.flatMap(l=>l.objects||[]).find(o=>props(o).castleActivityId==='npc-'+props(actor).castleNpcId);
    assert.ok(queue.some(([x,y])=>inside(talk,x,y)),'NPC conversation is reachable without walking through the character');
  });
  test(id+': foreground uses only matching furniture pixels and does not cover avatar heads',async()=>{
    const map=read(id+'.tmj'),layout=readLayout(map),art=new URL('art/'+(rooms.find(room=>room.id===id)?.folder||id+'-20261108-full')+'/',base);
    const floor=await sharp(fs.readFileSync(new URL('floor.png',art))).ensureAlpha().raw().toBuffer();
    const fronts=await sharp(fs.readFileSync(new URL('fronts.png',art))).ensureAlpha().raw().toBuffer();let opaque=0;
    for(let i=0;i<fronts.length;i+=4)if(fronts[i+3]){opaque++;assert.deepEqual(fronts.subarray(i,i+4),floor.subarray(i,i+4));}
    assert.ok(opaque>10000);
    for(const seat of layout.seats)for(let y=seat.y-20;y<seat.y+3;y++)for(let x=seat.x-9;x<seat.x+9;x++)assert.equal(fronts[(y*map.width*32+x)*4+3],0,seat.id+' head');
  });
}
test('all six ephemeral story keys are configured independently and accept no invented key',()=>{
  const keys=new Set();for(const room of rooms){const map=read(room.id+'.tmj'),key=props(map).castleStoryVariable;assert.ok(!keys.has(key));keys.add(key);
    assert.doesNotThrow(()=>new SharedStory({},key,()=>{}));
    const variable=map.layers.flatMap(l=>l.objects||[]).find(o=>o.name===key&&o.type==='variable');assert.equal(props(variable).persist,false);
  }
  assert.throws(()=>new SharedStory({},'castleStoryUnknown',()=>{}));
});
test('expansion entry is one pinned module with each controller included exactly once',()=>{
  const bundle=fs.readFileSync(new URL('expansion.bundle.js',base)),manifest=read('expansion.bundle.manifest.json');
  const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
  assert.equal(manifest.sha256,sha(bundle));assert.equal(manifest.bytes,bundle.length);assert.equal(manifest.runtimeModuleRequests,1);assert.ok(bundle.length<60000);
  assert.equal(manifest.compiler.version,'0.17.17');assert.ok(manifest.sources.length>=6);
  for(const source of manifest.sources)assert.equal(source.sha256,sha(fs.readFileSync(new URL(source.path.split('?')[0].replace(/^castle\//,''),base))));
  for(const name of ['room.js','activities.js','displays.js','characters-data.js'])assert.equal(manifest.sources.filter(source=>source.path.split('?')[0]==='castle/'+name).length,1);
  assert.doesNotMatch(bundle.toString('utf8'),/\b(?:import|export)\s[^;]*\bfrom\s*["']/);
});

test('the game room retains first-party school chess beside the new billiards nook without map API access',()=>{
  const map=read('spielesaal.tmj'),table=map.layers.flatMap(layer=>layer.objects||[]).find(object=>props(object).castleActivityId==='games-shelf');
  const config=activitySettings(table);assert.equal(config.url,'https://together.deine-schule.com/castle-chess/#table=tisch-2');assert.equal(config.label,'Schach spielen');assert.equal(config.api,false);assert.equal(config.group,'buchclub');assert.equal(config.autoOnSit,true);
  assert.equal(readLayout(map).seats.length,14);assert.equal(createWam(map).areas.length,3);
});
test('the atelier table opens only the protected first-party drawing page without map API access',()=>{
  const map=read('atelier.tmj'),table=map.layers.flatMap(layer=>layer.objects||[]).find(object=>props(object).castleActivityId==='atelier-draw');
  const config=activitySettings(table);assert.equal(config.url,'https://together.deine-schule.com/castle-art/');assert.equal(config.label,'Gemeinsam zeichnen');assert.equal(config.api,false);
  assert.equal(readLayout(map).seats.length,12);assert.equal(createWam(map).areas.length,3);
  for(const bad of ['https://evil.invalid/castle-art/','https://together.deine-schule.com/castle-art/?token=bad','https://together.deine-schule.com/castle-art/wbo/boards/arbitrary'])
    assert.throws(()=>activitySettings({properties:table.properties.map(property=>property.name==='castleActivityUrl'?{...property,value:bad}:property)}));
});

test('the music table shares a protected piano or the existing choir collection without changing furniture or conversation groups',()=>{
  const map=read('musikzimmer.tmj'),objects=map.layers.flatMap(layer=>layer.objects||[]),table=objects.find(object=>props(object).castleActivityId==='music-band');
  const config=activitySettings(table);assert.equal(config.url,'https://together.deine-schule.com/castle-piano/');assert.equal(config.api,false);assert.equal(config.autoOnSit,true);
  const choices=JSON.parse(props(table).castleActivityChoices);assert.deepEqual(choices.map(option=>option.id),['piano','choir']);
  assert.equal(choices[1].url,'https://together.deine-schule.com/castle-content/collection.html?kind=music');
  const nearby=objects.find(object=>props(object).castleActivityId==='music-piano');assert.equal(activitySettings(nearby).autoOnSit,false);
  const layout=readLayout(map);assert.equal(layout.seats.length,12);assert.equal(createWam(map).areas.length,3);
  assert.deepEqual(read('musikzimmer.wam').areas,createWam(map).areas);
  for(const bad of ['https://evil.invalid/castle-piano/','https://together.deine-schule.com/castle-piano/?token=bad','https://together.deine-schule.com/castle-piano/socket'])
    assert.throws(()=>activitySettings({properties:table.properties.map(property=>property.name==='castleActivityUrl'?{...property,value:bad}:property)}));
});
test('catalog rejects arbitrary boards and image hosts, never trusting target or open URLs',()=>{
  const input={board:'show1',title:'<img onerror=alert(1)>',image_url:catalogBase+'museum_asset.php?f=abc',open_url:'javascript:alert(1)'};
  const item=catalogItem(input);assert.equal(item.open,catalogBase+'workadventure_museum_open.php?board=show1');assert.equal(item.title,input.title);
  for(const patch of [{board:'show14'},{board:'musik08'},{board:'gamesarea01'},{image_url:'https://evil.invalid/museum_asset.php'},{image_url:'javascript:alert(1)'},{image_url:catalogBase+'admin.php'},{image_url:'https://person:password@deutsche-online-schule.com/schooltools/verwaltung/api/museum_asset.php'}])assert.equal(catalogItem({...input,...patch}),null);
});
test('catalog only reads the existing public endpoint and checks response shape',async()=>{
  const saved=globalThis.fetch;try{
    globalThis.fetch=async(url,options)=>{assert.equal(url,catalogBase+'workadventure_museum.php');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({items:[{board:'show1',image_url:catalogBase+'museum_asset.php?f=a'},{}]})};};
    assert.equal((await fetchCatalog()).length,1);
    globalThis.fetch=async()=>({ok:true,json:async()=>({})});await assert.rejects(fetchCatalog());
  }finally{globalThis.fetch=saved;}
});

test('catalog detects target-only and revision-only edits without trusting their destinations',()=>{
  const input={board:'show1',image_url:catalogBase+'museum_asset.php?f=a',target_url:'https://example.invalid/first'};
  const original=catalogItem(input),changed=catalogItem({...input,target_url:'javascript:alert(1)'});
  assert.notEqual(original.revision,changed.revision);assert.equal(original.open,changed.open);
  assert.equal(changed.open,catalogBase+'workadventure_museum_open.php?board=show1');
  assert.notEqual(original.revision,catalogItem({...input,updated_at:'2026-11-09 13:00:00'}).revision);
  assert.equal(original.revision,catalogItem({...input,open_url:'https://evil.invalid/'}).revision);
  assert.equal(catalogItem({...input,target_url:{bad:true},updated_at:[]}).revision,'["",""]');
  assert.ok(catalogItem({...input,target_url:'x'.repeat(20000),updated_at:'y'.repeat(1000)}).revision.length<8400);
});
test('wall displays update, remove withdrawn content and clean up only their own websites',async()=>{
  const saved=globalThis.fetch,created=[],deleted=[];let items=[{board:'show1',image_url:catalogBase+'museum_asset.php?f=a'}];
  globalThis.fetch=async()=>({ok:true,json:async()=>({items})});
  try{
    const map=read('museum.tmj'),wa={room:{website:{create:value=>{const w={...value};created.push(w);return w;},delete:async name=>deleted.push(name)}}};
    const displays=new CastleDisplays(wa,map);await displays.refresh();assert.equal(created.length,1);assert.equal(created[0].allowApi,false);assert.equal(created[0].origin,'map');
    const first=created[0].url;items[0].image_url=catalogBase+'museum_asset.php?f=b';await displays.refresh();assert.equal(created.length,1);assert.notEqual(created[0].url,first);
    items=[];await displays.refresh();assert.deepEqual(deleted,['castle-exhibit-museum-show1']);assert.equal(displays.websites.size,0);
    items=[{board:'show1',image_url:catalogBase+'museum_asset.php?f=c'}];await displays.refresh();displays.dispose();displays.dispose();assert.equal(deleted.length,2);
    assert.ok(deleted.every(name=>name.startsWith('castle-exhibit-museum-')));
  }finally{globalThis.fetch=saved;}
});
test('late catalog results cannot create images after a map is left',async()=>{
  const saved=globalThis.fetch;let resolve;const pending=new Promise(r=>resolve=r),created=[];
  globalThis.fetch=()=>pending;
  try{
    const d=new CastleDisplays({room:{website:{create:v=>created.push(v),delete:async()=>{}}}},read('museum.tmj'));
    const refresh=d.refresh();d.dispose();resolve({ok:true,json:async()=>({items:[{board:'show1',image_url:catalogBase+'museum_asset.php?f=a'}]})});await refresh;assert.deepEqual(created,[]);
  }finally{globalThis.fetch=saved;}
});
