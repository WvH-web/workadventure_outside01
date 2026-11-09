import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {characters,characterById} from '../castle/characters-data.js';
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
test('eight native inhabitants are static 32px map tiles using exact approved avatar URLs',()=>{
  for(const id of ['erdgeschoss','obergeschoss','museum','musikzimmer','oberstufe','spielesaal','atelier','sternwarte']){
    const map=JSON.parse(fs.readFileSync(new URL('../castle/'+id+'.tmj',import.meta.url)));
    const slot=map.layers.flatMap(l=>l.objects||[]).find(o=>o.properties?.some(p=>p.name==='castleNpcId'));
    const key=slot.properties.find(p=>p.name==='castleNpcId').value,c=characterById(key);assert.ok(c);
    const sheet=map.tilesets.find(t=>t.name==='Castle NPC '+key),layer=map.layers.find(l=>l.name==='castle-npc-sprites');
    assert.equal(sheet.image,c.sprite);assert.deepEqual([sheet.tilewidth,sheet.tileheight,sheet.tilecount],[32,32,12]);
    assert.equal(layer.data[Math.floor((slot.y+48)/32)*map.width+Math.floor((slot.x+48)/32)],sheet.firstgid+1);
    assert.equal(layer.data.filter(Boolean).length,1);
  }
});
test('NPC labels and sprites load with their map below the avatar plane, without asynchronous render scripts',()=>{
  const map=JSON.parse(fs.readFileSync(new URL('../castle/erdgeschoss.tmj',import.meta.url)));
  const labels=map.layers.find(l=>l.name==='castle-npc-labels');assert.equal(labels.data.filter(Boolean).length,3);
  assert.ok(map.layers.indexOf(labels)<map.layers.findIndex(l=>l.name==='floorLayer'));
  assert.match(map.properties.find(p=>p.name==='script').value,/^displays\.js\?/);
  const image=fs.readFileSync(new URL('../castle/art/characters-20261108/labels.png',import.meta.url));
  assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],[96,384]);
});
test('character dialogues accept only known exact owned URLs and never get map access',()=>{
  const object=url=>({properties:[{name:'castleActivityUrl',value:url},{name:'castleActivityApi',value:true}]});
  for(const c of characters)assert.equal(activitySettings(object('characters.html?npc='+c.id)).api,false);
  for(const url of ['characters.html?npc=unknown','characters.html?npc=mira&url=https://evil.invalid','https://evil.invalid/characters.html?npc=mira'])assert.throws(()=>activitySettings(object(url)));
});
