import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CastleRoom,readLayout,isNativeMeetingRoom,nativeRoomUrl} from '../castle/room.js';

const map = JSON.parse(fs.readFileSync(new URL('../castle/grosse-halle.tmj',import.meta.url)));
const roomId='https://together.deine-schule.com/_/global/wvh-web.github.io/workadventure_outside01/castle/grosse-halle.tmj';
test('only a WAM room with the explicit native marker defers media to WorkAdventure',()=>{
  assert.equal(isNativeMeetingRoom({room:{id:roomId}},{nativeMeetings:true}),false);
  assert.equal(isNativeMeetingRoom({room:{id:roomId.replace('.tmj','.wam')}},{nativeMeetings:true}),true);
  assert.equal(isNativeMeetingRoom({room:{id:roomId.replace('.tmj','.wam')}},{nativeMeetings:false}),false);
  assert.equal(isNativeMeetingRoom({room:{id:'not a URL'}},{nativeMeetings:true}),false);
});
test('legacy room forwarding preserves the nearest real arrival marker, never an exit',()=>{
  for(const layer of map.layers.filter(l=>l.name==='start'||l.properties?.some(p=>p.name==='startLayer'&&p.value===true))) {
    const index=layer.data.findIndex(Boolean);
    assert.ok(index>=0);
    const url=new URL(nativeRoomUrl(roomId,map,{x:index%map.width*32+16,y:Math.floor(index/map.width)*32+16}));
    assert.ok(url.pathname.endsWith('/grosse-halle.wam'));
    assert.equal(url.hash,'#'+layer.name);
    assert.equal(url.search,'');
  }
  assert.equal(new URL(nativeRoomUrl(roomId,map,null)).hash,'#start');
  assert.throws(()=>nativeRoomUrl(roomId.replace('.tmj','.wam'),map,null),/TMJ/);
});
test('native meeting mode never duplicates rooms or disables their captured audio',async()=>{
  let proximityChanges=0,joins=0;
  const layout=readLayout(map);
  layout.nativeMeetings=true;
  const wa={room:{id:roomId.replace('.tmj','.wam')},
    spaces:{joinSpace:async()=>{joins++;throw Error('Must not join a second space')}},
    controls:{restorePlayerControls(){},disablePlayerProximityMeeting(){proximityChanges++},restorePlayerProximityMeeting(){proximityChanges++}},
    ui:{actionBar:{removeButton(){}}},player:{state:{saveVariable:async()=>{}}}};
  const room=new CastleRoom(wa,layout);
  for(const desired of [
    {id:'area-tafel-nord',area:true},
    {id:'area-tafel-sued',area:true},
    {id:'quiet',quiet:true},null,
  ]) {
    room.desired=desired;await room.routeAudio();
    assert.equal(room.activeId,desired?.id||null);
  }
  room.dispose();
  assert.equal(joins,0);
  assert.equal(proximityChanges,0);
});

test('the return command names its actual destination and preserves the original default',async()=>{
  assert.equal(readLayout(map).returnLabel,'Grosse Halle');
  const labeled=structuredClone(map);labeled.properties.push({name:'castleReturnLabel',type:'string',value:'Wandelgang'},
    {name:'castleHallUrl',type:'string',value:'https://together.deine-schule.com/~/castle-preview/erdgeschoss.wam'});
  const buttons=[],observable={subscribe:()=>({unsubscribe(){}})};
  const wa={room:{id:roomId.replace('.tmj','.wam')},nav:{goToRoom:async()=>{}},
    players:{configureTracking:async()=>{},onVariableChange:()=>observable},
    player:{state:{saveVariable:async()=>{}},getPosition:async()=>({x:80,y:80}),onPlayerMove:()=>({unsubscribe(){}})},
    ui:{actionBar:{addButton:b=>buttons.push(b),removeButton(){}}},controls:{restorePlayerControls(){}}};
  const room=new CastleRoom(wa,readLayout(labeled));room.refresh=()=>{};room.syncPosition=async()=>{};
  try{await room.start();assert.equal(buttons.find(b=>b.id==='castle-return-hall').label,'Wandelgang');}
  finally{room.dispose();}
});
