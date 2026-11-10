import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GreatHall} from '../castle/hall.js';

const map = JSON.parse(fs.readFileSync(new URL('../castle/grosse-halle.tmj',import.meta.url)));
function fixture() {
  const calls = {buttons:new Map(),opened:[],deleted:[],closed:0};
  const room = {position:{x:0,y:0}};
  const wa = {
    room:{website:{create:async data=>{calls.board=data;return data},delete:async name=>calls.deleted.push(name)}},
    ui:{website:{open:async data=>{calls.widget=data;return {close:async()=>calls.closed++}}},
      actionBar:{addButton:b=>calls.buttons.set(b.id,b),removeButton:id=>calls.buttons.delete(id)}},
    nav:{openCoWebSite:async(...args)=>calls.opened.push(args)},
  };
  return {calls,room,wa,hall:new GreatHall(wa,room,map)};
}
test('hall presents the board and a same-origin microphone-only widget without altering native media',async()=>{
  const f=fixture();
  await f.hall.start();
  try {
    assert.deepEqual(f.calls.board.position,{x:1343,y:429,width:120,height:96});
    assert.equal(f.calls.board.url,new URL('../castle/hall-board.html?v=20261110-notices1',import.meta.url).href);
    assert.equal(f.calls.widget.url,'https://together.deine-schule.com/castle-audio/');
    assert.equal(f.calls.widget.allowApi,true);
    assert.equal(f.calls.widget.allowPolicy,'microphone; autoplay');
    assert.equal(f.calls.widget.margin.right,'64px');
    assert.equal(f.calls.buttons.size,0);
    f.room.position={x:1350,y:450};f.hall.refresh();
    await f.calls.buttons.get('hall-action-noticeboard').callback();
    assert.equal(f.calls.opened[0][0],new URL('../castle/hall-notices.html?v=20261110-notices1',import.meta.url).href);
    assert.match(fs.readFileSync(new URL('../castle/hall-notices.html',import.meta.url),'utf8'),/workadventure_museum_open\.php\?board=hallnotice01/);
    assert.equal(f.calls.opened[0][1],false);
    f.room.position={x:1370,y:760};f.hall.refresh();
    assert.equal(f.calls.buttons.has('hall-action-noticeboard'),false);
    await f.calls.buttons.get('hall-action-games').callback();
    assert.equal(f.calls.opened[1][0],'https://together.deine-schule.com/castle-school/games');
    f.room.position={x:0,y:0};f.hall.refresh();
    assert.equal(f.calls.buttons.size,0);
  } finally {f.hall.dispose();f.hall.dispose();}
  assert.equal(f.calls.closed,1);
  assert.deepEqual(f.calls.deleted,['hall-noticeboard']);
});
test('a late audio widget is closed when the hall has already been left',async()=>{
  const f=fixture();let resolve;
  f.wa.ui.website.open=()=>new Promise(r=>{resolve=r});
  const start=f.hall.start();
  await new Promise(r=>setImmediate(r));
  f.hall.dispose();
  resolve({close:async()=>f.calls.closed++});
  await start;
  assert.equal(f.calls.closed,1);
  assert.equal(f.calls.buttons.size,0);
});
test('a late noticeboard is removed without starting hall audio after departure',async()=>{
  const f=fixture();let resolve;
  f.wa.room.website.create=()=>new Promise(r=>{resolve=r});
  const start=f.hall.start();f.hall.dispose();resolve({name:'hall-noticeboard'});
  await start;
  assert.deepEqual(f.calls.deleted,['hall-noticeboard']);
  assert.equal(f.calls.widget,undefined);
});
