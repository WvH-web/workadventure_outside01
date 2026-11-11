import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {homeEntryArea,CastleHomeEntry,HOME_ENTRY_VERSION,HOME_MEDIA_POLICY} from '../castle/homes-entry.js';
const P=(name,value)=>({name,value}),area={name:'castle-home-entry',type:'area',x:576,y:320,width:128,height:160,properties:[P('silent',true),P('castleHomeEntry',true)]};
const map=()=>({width:40,height:22,tilewidth:32,tileheight:32,properties:[P('castleMapId','obergeschoss'),P('castleHomesPilot',HOME_ENTRY_VERSION)],layers:[{objects:[structuredClone(area)]}]});
function setup(open){
 const websites=[],options=[];let movement,unsubscribed=false;
 const wa={player:{getPosition:async()=>({x:500,y:400}),onPlayerMove:fn=>{movement=fn;return {unsubscribe(){unsubscribed=true;}};}},nav:{openCoWebSite:open|| (async(...args)=>{options.push(args);const website={id:String(websites.length),closed:false,close:async()=>{website.closed=true;}};websites.push(website);return website;})}};
 const entry=new CastleHomeEntry(wa,homeEntryArea(map()));return {entry,websites,options,move:p=>movement(p),get unsubscribed(){return unsubscribed;}};
}
test('home entry requires the reviewed gallery flag and a disjoint, native silent area',()=>{
 assert.deepEqual(homeEntryArea(map()),{x:576,y:320,width:128,height:160});const wrong=map();wrong.properties[0].value='musikzimmer';assert.equal(homeEntryArea(wrong),null);
 for(const change of [{type:'object'},{width:0},{x:-1},{y:Infinity},{properties:[P('castleHomeEntry',true)]}]){const value=map();Object.assign(value.layers[0].objects[0],change);assert.throws(()=>homeEntryArea(value));}
 const overlap=map();overlap.layers[0].objects.push({x:600,y:400,width:100,height:100,properties:[P('conversationGroup','table')]});assert.throws(()=>homeEntryArea(overlap));
});
test('entering opens only the fixed protected first-party room, with optional devices but never the map API',async()=>{
 const s=setup();await s.entry.start();assert.equal(s.websites.length,0);s.move({x:608,y:384});await s.entry.pending;assert.equal(s.websites.length,1);
 assert.equal(HOME_MEDIA_POLICY,'microphone; camera; clipboard-write');assert.equal(/display-capture|geolocation|fullscreen/.test(HOME_MEDIA_POLICY),false);
 assert.deepEqual(s.options[0],['https://together.deine-schule.com/castle-homes/',false,HOME_MEDIA_POLICY,65,undefined,true,false]);s.move({x:620,y:400});assert.equal(s.websites.length,1);
 s.move({x:500,y:400});assert.equal(s.websites[0].closed,true);s.entry.dispose();assert.equal(s.unsubscribed,true);
});
test('manual panel closure is respected until leaving and entering again',async()=>{
 const s=setup();await s.entry.start();s.move({x:608,y:384});await s.entry.pending;await s.websites[0].close();s.move({x:624,y:384});assert.equal(s.websites.length,1);
 s.move({x:500,y:400});s.move({x:608,y:384});await s.entry.pending;assert.equal(s.websites.length,2);s.entry.dispose();assert.equal(s.websites[1].closed,true);
});
test('a late panel is closed after departure, never closing an unrelated application',async()=>{
 let resolve;const website={closed:false,close:async()=>{website.closed=true;}},s=setup(()=>new Promise(r=>{resolve=r;}));await s.entry.start();
 s.move({x:608,y:384});const pending=s.entry.pending;s.move({x:500,y:400});resolve(website);await pending;assert.equal(website.closed,true);assert.equal(s.entry.website,null);s.entry.dispose();
});
test('rapid departure and reentry wait for the old panel before opening one current generation',async()=>{
 let resolve,calls=0;const websites=[],s=setup(()=>{calls++;const website={closed:false,close:async()=>{website.closed=true;}};websites.push(website);return calls===1?new Promise(r=>{resolve=()=>r(website);}):Promise.resolve(website);});
 await s.entry.start();s.move({x:608,y:384});s.move({x:500,y:400});s.move({x:608,y:384});resolve();await new Promise(r=>setTimeout(r));assert.equal(calls,2);assert.equal(websites[0].closed,true);assert.equal(websites[1].closed,false);s.entry.dispose();
});
test('late initial positions cannot undo newer movement or open a panel after disposal',async()=>{
 const s=setup();let initial;s.entry.wa.player.getPosition=()=>new Promise(resolve=>{initial=resolve;});const starting=s.entry.start();
 s.move({x:608,y:384});await s.entry.pending;initial({x:500,y:400});await starting;assert.equal(s.entry.active,true);assert.equal(s.websites.length,1);s.entry.dispose();
 const closed=setup();let late;closed.entry.wa.player.getPosition=()=>new Promise(resolve=>{late=resolve;});const pending=closed.entry.start();closed.entry.dispose();late({x:608,y:384});await pending;assert.equal(closed.websites.length,0);
});
test('the dedicated gallery bundle retains every original controller source without modifying the shared bundles',()=>{
 const read=name=>fs.readFileSync(new URL('../castle/'+name,import.meta.url));
 const original=JSON.parse(read('expansion.bundle.manifest.json')),gallery=JSON.parse(read('upper-gallery.bundle.manifest.json'));
 const normalize=sources=>new Map(sources.map(row=>[row.path.split('?')[0],row.sha256]));
 const previous=normalize(original.sources),current=normalize(gallery.sources);
 assert.equal(gallery.entry,'castle/gallery.js');assert.equal(gallery.runtimeModuleRequests,1);assert.equal(gallery.sources.length,current.size);
 assert.equal(current.size,previous.size+2);for(const [name,digest]of previous)assert.equal(current.get(name),digest);
 assert.ok(current.has('castle/gallery.js')&&current.has('castle/homes-entry.js'));
 assert.equal(crypto.createHash('sha256').update(read('upper-gallery.bundle.js')).digest('hex'),gallery.sha256);
 assert.equal(crypto.createHash('sha256').update(read('expansion.bundle.js')).digest('hex'),original.sha256);
});

test('the published probe preserves gallery artwork, furniture, exits and existing groups and adds only one isolated quiet entry',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../castle/'+name,import.meta.url)));
 const original=read('obergeschoss.tmj'),probe=read('obergeschoss-homes-pilot.tmj');assert.deepEqual(probe.tilesets,original.tilesets);
 assert.deepEqual(probe.layers.slice(0,-1),original.layers);assert.deepEqual(homeEntryArea(probe),{x:576,y:320,width:128,height:160});
 const allowed=new Set(['castleRevision','script','castleNativeRoomUrl']);
 assert.deepEqual(probe.properties.filter(p=>!allowed.has(p.name)&&p.name!=='castleHomesPilot'),original.properties.filter(p=>!allowed.has(p.name)));
 assert.equal(probe.properties.find(p=>p.name==='script').value,'upper-gallery.bundle.js?v='+HOME_ENTRY_VERSION);
 assert.equal(probe.properties.find(p=>p.name==='castleNativeRoomUrl').value,'https://together.deine-schule.com/~/castle-preview/zimmerprobe.wam');
});

test('the preview entrance uses the original native gallery and differs from the accepted probe only in its native return URL',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../castle/'+name,import.meta.url)));
 const probe=read('obergeschoss-homes-pilot.tmj'),preview=read('obergeschoss-homes.tmj');
 const native=preview.properties.find(p=>p.name==='castleNativeRoomUrl');assert.equal(native.value,'https://together.deine-schule.com/~/castle-preview/obergeschoss.wam');
 native.value=probe.properties.find(p=>p.name==='castleNativeRoomUrl').value;assert.deepEqual(preview,probe);
 assert.deepEqual(homeEntryArea(preview),homeEntryArea(probe));
});
