import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CastleRoom,readLayout,isNativeMeetingRoom,nativeRoomUrl} from '../castle/room.js';
import {clearPreviousCastleUi} from '../castle/ui-lifecycle.js';
import {ownedUi,legacyUi} from '../castle/ui-ids.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),mapIds=require('../tools/castle-map-ids.cjs');

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
  try{await room.start();assert.equal(buttons.find(b=>b.id==='castle-return-hall-grosse-halle').label,'Wandelgang');}
  finally{room.dispose();}
});

test('every seat turns on a body-clear floor pair instead of teleporting into protected furniture',()=>{
  let seats=0;
  for(const id of mapIds){
    const tiled=JSON.parse(fs.readFileSync(new URL('../castle/'+id+'.tmj',import.meta.url))),layout=readLayout(tiled);
    const grid=tiled.layers.find(l=>l.name==='collisions').data;
    for(const seat of layout.seats){
      seats++;const alignment=layout.facingPaths[seat.id];assert.ok(alignment,id+' '+seat.id);
      const end={x:alignment.to.x,y:alignment.to.y-16},direction={up:[0,-32],down:[0,32],left:[-32,0],right:[32,0]}[seat.facing];
      assert.deepEqual([end.x-alignment.from.x,end.y-alignment.from.y],direction);
      for(const p of [alignment.from,end])for(const x of [p.x-8,p.x+8])for(const y of [p.y-8,p.y+8,p.y+24]){
        assert.ok(x>=0&&y>=0&&x<tiled.width*32&&y<tiled.height*32,id+' alignment bounds');
        assert.equal(grid[Math.floor(y/32)*tiled.width+Math.floor(x/32)],0,id+' '+seat.id+' alignment collision');
      }
    }
  }
  assert.ok(seats>200);
});

test('arrival removes only known previous castle commands and keeps all current and unrelated controls',()=>{
  const buttons=new Set([...Object.values(ownedUi).flat(),...legacyUi,'external-meeting','teacher-room-return']);
  const wa={ui:{actionBar:{removeButton:id=>buttons.delete(id)}}};
  clearPreviousCastleUi(wa,'oberstufe');
  assert.deepEqual([...buttons].sort(),[...ownedUi.oberstufe,'external-meeting','teacher-room-return'].sort());
  const before=[...buttons];clearPreviousCastleUi(wa,'unknown-map');assert.deepEqual([...buttons],before);
});

test('late disposal of an old room cannot remove the new room return or stand command',()=>{
  const buttons=new Set(['castle-return-hall-museum','castle-stand-museum','castle-return-hall-oberstufe','castle-stand-oberstufe']);
  const wa={room:{id:roomId.replace('.tmj','.wam')},
    ui:{actionBar:{removeButton:id=>buttons.delete(id)}},controls:{restorePlayerControls(){}},
    player:{state:{saveVariable:async()=>{}}}};
  const oldRoom=new CastleRoom(wa,{...readLayout(map),id:'museum',nativeMeetings:true});
  oldRoom.dispose();
  assert.deepEqual([...buttons].sort(),['castle-return-hall-oberstufe','castle-stand-oberstufe']);
});

test('generated ownership covers each mapped activity and never assigns one command to different rooms',()=>{
  const all=Object.values(ownedUi).flat();assert.equal(new Set(all).size,all.length);
  assert.deepEqual(Object.keys(ownedUi).sort(),[...mapIds].sort());
  for(const id of mapIds){
    const tiled=JSON.parse(fs.readFileSync(new URL('../castle/'+id+'.tmj',import.meta.url)));
    assert.ok(ownedUi[id].includes('castle-rounds-'+id));
    for(const area of tiled.layers.flatMap(l=>l.objects||[])){
      const activity=area.properties?.find(p=>p.name==='castleActivityId')?.value;
      if(activity)assert.ok(ownedUi[id].includes('castle-activity-'+id+'-'+activity));
    }
  }
});

test('departure waits for registered cleanup, supports unsubscription and never traps navigation after a failed cleanup',async()=>{
  const order=[],wa={room:{id:roomId.replace('.tmj','.wam')},nav:{goToRoom:async()=>order.push('navigate')},
    ui:{actionBar:{removeButton(){}}},controls:{restorePlayerControls(){}},player:{state:{saveVariable:async()=>{}}}};
  const room=new CastleRoom(wa,{...readLayout(map),hallUrl:'https://together.deine-schule.com/~/castle-preview/erdgeschoss.wam'});
  room.stand=async()=>order.push('stand');const remove=room.onBeforeTravel(async()=>{await Promise.resolve();order.push('clean')});
  try{
    await room.returnToHall();assert.deepEqual(order,['stand','clean','navigate']);remove();order.length=0;
    room.onBeforeTravel(async()=>{throw Error('unavailable')});await room.returnToHall();assert.deepEqual(order,['stand','navigate']);
  }finally{room.dispose()}
});
