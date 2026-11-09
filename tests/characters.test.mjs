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
test('native-scale characters create only their own transparent map images, without media or API grants',()=>{
  const created=[],removed=[],map=JSON.parse(fs.readFileSync(new URL('../castle/erdgeschoss.tmj',import.meta.url)));
  const wa={room:{website:{create:c=>{created.push(c);return {name:c.name};},delete:async name=>{removed.push(name);}}}};
  const npcs=new CastleNpcs(wa,map);npcs.start();npcs.start();assert.equal(created.length,1);
  assert.equal(created[0].name,'castle-npc-erdgeschoss-amir');assert.equal(created[0].allowApi,false);assert.equal(created[0].allow,'');
  assert.deepEqual([created[0].position.width,created[0].position.height],[96,64]);
  assert.equal(new URL(created[0].url).searchParams.get('npc'),'amir');
  assert.equal(new URL(created[0].url).origin,'https://together.deine-schule.com');
  npcs.dispose();npcs.dispose();npcs.start();assert.deepEqual(removed,['castle-npc-erdgeschoss-amir']);
});
test('NPC images match the host dark color scheme and are not created after disposal',()=>{
  const map=JSON.parse(fs.readFileSync(new URL('../castle/erdgeschoss.tmj',import.meta.url)));
  const npcs=new CastleNpcs({room:{website:{create:()=>{throw Error('Late character');}}}},map);npcs.dispose();npcs.start();
  const html=fs.readFileSync(new URL('../castle/npc-sprite.html',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../castle/npc-sprite.css',import.meta.url),'utf8');
  assert.match(css,/color-scheme:dark/);assert.match(css,/background:transparent/);assert.doesNotMatch(html,/iframe_api|camera|microphone/);
});
test('character dialogues accept only known exact owned URLs and never get map access',()=>{
  const object=url=>({properties:[{name:'castleActivityUrl',value:url},{name:'castleActivityApi',value:true}]});
  for(const c of characters)assert.equal(activitySettings(object('characters.html?npc='+c.id)).api,false);
  for(const url of ['characters.html?npc=unknown','characters.html?npc=mira&url=https://evil.invalid','https://evil.invalid/characters.html?npc=mira'])assert.throws(()=>activitySettings(object(url)));
});
