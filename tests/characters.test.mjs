import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {characters,characterById} from '../castle/characters-data.js';
import {CastleNpcs} from '../castle/npcs.js';
import {activitySettings} from '../castle/activities.js';
test('twelve distinct fictional guests cover different ages and use existing native sprites',()=>{
  assert.equal(characters.length,12);assert.equal(new Set(characters.map(c=>c.id)).size,12);
  assert.ok(characters.some(c=>c.age<18));assert.ok(characters.some(c=>c.age>65));
  for(const c of characters){
    assert.match(c.id,/^[a-z]+$/);assert.equal(characterById(c.id),c);
    const url=new URL(c.sprite);assert.equal(url.origin,'https://together.deine-schule.com');
    assert.match(decodeURIComponent(url.pathname),/^\/resources\/characters\/pipoya\/[^/]+\.png$/);
    assert.ok(c.questions.length>=2);for(const [question,answer]of c.questions){assert.ok(question.length<80);assert.ok(answer.length>30);assert.doesNotMatch(answer,/<|https?:/);}
  }
  assert.equal(characterById('https://untrusted.invalid'),null);
});
test('generated event collection adds unique native IDs without replacing existing default IDs',()=>{
  const collection=JSON.parse(fs.readFileSync(new URL('../castle/event-avatars.json',import.meta.url)));
  assert.equal(collection.name,'Eventgaeste');assert.equal(collection.textures.length,12);
  for(const [i,c]of characters.entries())assert.deepEqual(collection.textures[i],{
    id:'wvh-event-'+c.id+'-v1',name:c.name,url:new URL(c.sprite).pathname.slice(1),position:i});
});
test('native castle characters load known tilesets and draw only their owned native layers, without iframes',async()=>{
  const loaded=[],draws=[],map=JSON.parse(fs.readFileSync(new URL('../castle/erdgeschoss.tmj',import.meta.url)));
  const wa={room:{loadTileset:async url=>{loaded.push(new URL(url).pathname);return loaded.length===1?2000:2100;},setTiles:tiles=>draws.push(tiles)}};
  const npcs=new CastleNpcs(wa,map),started=npcs.start();assert.equal(npcs.start(),started);await started;
  assert.equal(loaded.length,2);assert.ok(loaded[1].endsWith('/amir.json'));assert.equal(npcs.figures.length,1);
  assert.equal(draws[0].length,4);assert.deepEqual(draws[0][0],{x:22,y:12,tile:2101,layer:'castle-npc-sprites'});
  npcs.dispose();npcs.dispose();await npcs.start();assert.equal(draws.length,2);
  assert.ok(draws[1].every(t=>t.tile===null&&['castle-npc-sprites','castle-npc-labels'].includes(t.layer)));
});
test('late native sprite loads cannot draw into the following map',async()=>{
  const map=JSON.parse(fs.readFileSync(new URL('../castle/erdgeschoss.tmj',import.meta.url))),draws=[];let resolve;
  const npcs=new CastleNpcs({room:{loadTileset:()=>new Promise(r=>{resolve=r}),setTiles:t=>draws.push(t)}},map);
  const pending=npcs.start();npcs.dispose(false);resolve(2000);await pending;assert.deepEqual(draws,[]);
});
test('character dialogues accept only known exact owned URLs and never get map access',()=>{
  const object=url=>({properties:[{name:'castleActivityUrl',value:url},{name:'castleActivityApi',value:true}]});
  for(const c of characters)assert.equal(activitySettings(object('characters.html?npc='+c.id)).api,false);
  for(const url of ['characters.html?npc=unknown','characters.html?npc=mira&url=https://evil.invalid','https://evil.invalid/characters.html?npc=mira'])assert.throws(()=>activitySettings(object(url)));
});
