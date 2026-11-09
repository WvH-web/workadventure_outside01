import test from 'node:test';
import assert from 'node:assert/strict';
import {CastleCommunity} from '../castle/community.js';
const request='castleRoundTravelV1',ready='castleRoundTravelReadyV1',failed='castleRoundTravelFailedV1';
const nonce='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const value=(extra={})=>({v:1,nonce,mapId:'bibliothek',createdAt:Date.now(),...extra});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const buttons=new Map(),handlers=new Map(),state=new Map(),closed=[],opened=[],sequence=[],hooks=new Set();
  const wa={ui:{actionBar:{addButton:button=>buttons.set(button.id,button),removeButton:id=>buttons.delete(id)},
    website:{open:async options=>{opened.push(options);return {id:'registration-bridge',close:async()=>closed.push('bridge')};}},
    displayActionMessage:message=>sequence.push(['message',message.message])},
    player:{state:{loadVariable:key=>state.get(key),onVariableChange:key=>({subscribe:callback=>{handlers.set(key,callback);return {unsubscribe:()=>handlers.delete(key)};}}),
      saveVariable:async(key,val,options)=>{state.set(key,val);sequence.push(['state',key,val,options]);}}},
    nav:{openCoWebSite:async(...args)=>{opened.push(args);return {id:'round-panel',close:async()=>{closed.push('round-panel');sequence.push(['close']);}};}}};
  const room={layout:{id:'bibliothek'},stand:async()=>{sequence.push(['stand']);},onBeforeTravel:callback=>{hooks.add(callback);return()=>hooks.delete(callback);},
    async travelTo(url){await this.stand();for(const hook of hooks)await hook();sequence.push(['nav',url]);return true;}};
  const community=new CastleCommunity(wa,room);return {community,wa,room,buttons,handlers,state,closed,opened,sequence,hooks};
}
test('community creates only its own offscreen no-media bridge and one visible command, without reading any credentials',async()=>{
  const f=fixture();f.community.start();f.community.start();await f.community.bridgePending;
  assert.equal(f.opened.length,1);assert.deepEqual(f.opened[0],{url:'https://together.deine-schule.com/castle-school/presence',allowApi:true,allowPolicy:'',visible:true,
    position:{vertical:'top',horizontal:'left'},size:{width:'1px',height:'1px'},margin:{left:'-2px',top:'-2px'}});
  assert.equal(f.buttons.size,1);assert.equal(f.buttons.get('castle-rounds-bibliothek').label,'Runden');
  const first=f.community.open(),second=f.community.open();assert.equal(first,second);await first;
  assert.deepEqual(f.opened[1],['https://together.deine-schule.com/castle-school/rounds',true,'',60,0]);
  f.community.dispose();await settle();assert.equal(f.buttons.size,0);assert.equal(f.handlers.size,0);assert.equal(f.hooks.size,0);
  assert.deepEqual(f.closed.sort(),['bridge','round-panel']);
});
test('a same-room invitation stands up before acknowledging travel and never takes a chair',async()=>{
  const f=fixture();f.community.start();await f.community.bridgePending;await f.community.open();
  await f.community.travel(value());
  assert.deepEqual(f.sequence.map(item=>item[0]),['stand','close','state']);
  assert.equal(f.state.get(ready),nonce);assert.deepEqual(f.sequence.at(-1)[3],{public:false,persist:false});
  assert.ok(!f.sequence.some(item=>item[0]==='nav'));f.community.dispose();
});
test('cross-room invitations use the existing full departure cleanup and a canonical public castle URL',async()=>{
  const f=fixture();f.community.start();await f.community.bridgePending;await f.community.open();
  await f.community.travel(value({mapId:'atelier'}));
  assert.deepEqual(f.sequence.map(item=>item[0]),['stand','close','nav']);
  assert.equal(f.sequence.at(-1)[1],'https://together.deine-schule.com/~/castle-preview/atelier.wam#start');f.community.dispose();
});
test('unsupported clients, foreign destinations, extra fields and stale requests never offer or execute a broken transfer',async()=>{
  const f=fixture();delete f.wa.ui.website;f.community.start();assert.equal(f.buttons.size,0);
  for(const extra of [{mapId:'lehrerzimmer'},{mapId:'https://evil.invalid/'},{url:'https://evil.invalid/'},{createdAt:Date.now()-60000},{nonce:'invented'}])
    await f.community.travel(value(extra));
  assert.equal(f.sequence.length,0);f.community.dispose();
});
test('an already saved request is not replayed when a room controller is recreated',async()=>{
  const f=fixture(),old=value();f.state.set(request,old);f.community.start();await f.community.bridgePending;
  f.handlers.get(request)(old);await settle();assert.equal(f.sequence.length,0);f.community.dispose();
});
test('a late bridge response after departure is closed without adding a stale room command',async()=>{
  const f=fixture();let resolve;f.wa.ui.website.open=()=>new Promise(done=>resolve=done);
  f.community.start();await settle();f.community.dispose();resolve({close:async()=>f.closed.push('late-bridge')});await f.community.bridgePending;
  assert.equal(f.buttons.size,0);assert.deepEqual(f.closed,['late-bridge']);
});
test('a late panel response is closed only once after departure, not left in the following map',async()=>{
  const f=fixture();f.community.start();await f.community.bridgePending;
  let resolve;f.wa.nav.openCoWebSite=()=>new Promise(done=>resolve=done);const pending=f.community.open();await settle();f.community.dispose();
  resolve({close:async()=>f.closed.push('late-panel')});await pending;assert.ok(f.closed.includes('late-panel'));
});
test('a newer invitation wins while an old stand response is pending; only its nonce is acknowledged',async()=>{
  const f=fixture();let resolve;f.room.stand=()=>new Promise(done=>resolve=done);
  f.community.start();await f.community.bridgePending;
  const older=value(),a=f.community.travel(older);await settle();const oldDone=resolve;
  const b=f.community.travel(value({nonce:second,createdAt:older.createdAt+1}));await settle();oldDone();resolve();await Promise.all([a,b]);
  assert.equal(f.state.get(ready),second);assert.equal(f.sequence.filter(item=>item[0]==='state').length,1);
  await f.community.travel(older);assert.equal(f.state.get(ready),second);f.community.dispose();
});
test('a busy or failed transfer leaves normal room controls alone and reports only a private failure nonce',async()=>{
  const f=fixture();f.room.riding=true;f.community.start();await f.community.bridgePending;await f.community.travel(value());
  assert.equal(f.state.get(failed),nonce);assert.ok(!f.sequence.some(item=>item[0]==='stand'||item[0]==='nav'));f.community.dispose();
});
