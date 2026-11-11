'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const {checkedCalls,checkedCallBody,NAMESPACE,URL,API}=require('../ops/castle-homes/calls.cjs');
const {createRehearsal}=require('../tools/castle-home-rehearsal.cjs');
const {client,socket}=require('../tools/castle-home-test-client.cjs');
const {checkedControl,createControlProxy,PREFIX}=require('../ops/castle-homes/control-proxy.cjs');
const path=require('node:path'),source=process.env.STERNENHUETER_SOURCE||(process.platform==='linux'?require('../ops/castle-homes/service.cjs').SOURCE:path.join(__dirname,'../../sternenhueter'));
const WS=require(require.resolve('ws',{paths:[path.join(source,'dorfplatz')]}));
const callConfig=()=>({url:URL,apiURL:API,apiKey:'isolated-key',apiSecret:'s'.repeat(40),namespace:NAMESPACE,roles:['student','teacher'],fixedGroups:true});
const join=()=>({action:'join',surface:'bedroom',mode:'group',requestId:crypto.randomUUID()});
test('only the fixed school SFU, dedicated room namespace and approved roles can be configured',()=>{
 const value=callConfig(),checked=checkedCalls(value);value.roles.push('parent');assert.deepEqual(checked.roles,['student','teacher']);assert.ok(Object.isFrozen(checked.roles));
 assert.equal(checkedCalls(null),null);
 for(const delta of [{url:'wss://foreign.invalid'},{apiURL:'https://foreign.invalid'},{namespace:'sterne-video-colleague'},{fixedGroups:false},{roles:['parent']},{apiSecret:'short'},{extra:true}])assert.throws(()=>checkedCalls({...callConfig(),...delta}));
 const local={...callConfig(),url:'ws://127.0.0.1:1234',apiURL:'http://127.0.0.1:1234'};assert.throws(()=>checkedCalls(local));assert.ok(checkedCalls(local,{allowInsecureLocal:true}));
 for(const apiURL of ['http://remote.invalid:1234','http://user:pass@127.0.0.1:1234','http://127.0.0.1:1234/?secret=x'])assert.throws(()=>checkedCalls({...local,apiURL},{allowInsecureLocal:true}));
});
test('call requests cannot claim a village, nearby mode, another owner, role, scope or group assignment',()=>{
 const check=body=>checkedCallBody(Buffer.from(JSON.stringify(body)),'/api/proximity');assert.deepEqual(check(join()).mode,'group');
 for(const delta of [{surface:'village'},{mode:'nearby'},{owner:'another'},{role:'teacher'},{scope:'elsewhere'},{assignment:'stolen'},{requestId:'bad'}])assert.throws(()=>check({...join(),...delta}));
 for(const action of ['pulse','leave']){assert.ok(check({action,client:'a'.repeat(40)}));assert.throws(()=>check({action,client:'a'.repeat(40),scope:'elsewhere'}));}
 assert.throws(()=>checkedCallBody(Buffer.from('null'),'/api/proximity'));
 const report={contact:'received-contact',reason:'worry',note:'Synthetic report',requestId:crypto.randomUUID()};assert.ok(checkedCallBody(Buffer.from(JSON.stringify(report)),'/api/proximity/reports'));
 assert.throws(()=>checkedCallBody(Buffer.from(JSON.stringify({...report,reporter:'someone'})),'/api/proximity/reports'));
});
test('the loopback control bridge accepts no foreign room, recording, token issuance or arbitrary SFU method',async()=>{
 const own=PREFIX+'a'.repeat(12)+'-'+'b'.repeat(40),route='/twirp/livekit.RoomService/',body=value=>Buffer.from(JSON.stringify(value));
 assert.equal(checkedControl(route+'DeleteRoom',body({room:own})),'delete');
 for(const value of [{room:'unrelated-table'},{room:own,extra:true},{room:own+'/escape'}])assert.throws(()=>checkedControl(route+'DeleteRoom',body(value)));
 for(const name of ['CreateRoom','CreateIngress','StartRoomCompositeEgress','UpdateParticipant'])assert.throws(()=>checkedControl(route+name,body({room:own})));
 const seen=[],token='Bearer '+'a'.repeat(50),upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;seen.push({path:req.url,authorization:req.headers.authorization,raw});res.setHeader('Content-Type','application/json');if(req.headers.authorization!==token){res.writeHead(401);res.end('{"code":"unauthenticated"}');return;}res.end(req.url.endsWith('ListRooms')?JSON.stringify({rooms:[{name:own,numParticipants:2},{name:'unrelated-table',metadata:'Private foreign metadata'}]}):'{}');});
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));let proxy;
 try{
  proxy=await createControlProxy({address:async()=>'127.0.0.1',port:0,upstreamPort:upstream.address().port});const base='http://127.0.0.1:'+proxy.server.address().port;
  const post=(name,value,authorization=token)=>fetch(base+route+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(value)});
  assert.equal((await post('DeleteRoom',{room:own},'')).status,403);assert.equal(seen.length,0);
  assert.equal((await post('DeleteRoom',{room:'unrelated-table'})).status,503);assert.equal(seen.length,0);
  const listed=await post('ListRooms',{});assert.equal(listed.status,200);assert.deepEqual(await listed.json(),{rooms:[{name:own,numParticipants:2}]});
  assert.equal((await post('ListRooms',{},'Bearer '+'x'.repeat(50))).status,401);
  assert.equal((await post('DeleteRoom',{room:own})).status,200);assert.equal(seen.at(-1).raw,JSON.stringify({room:own}));
 }finally{await proxy?.close();upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));}
});
async function fixture(run){
 const calls=[],rooms=new Set();let retireFails=false;
 const server=http.createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;const value=JSON.parse(body||'{}');calls.push({path:req.url,room:value.room});
  res.setHeader('Content-Type','application/json');
  if(req.url.endsWith('/ListRooms')){res.end(JSON.stringify({rooms:[...rooms].map(name=>({name}))}));return;}
  if(req.url.endsWith('/DeleteRoom')){if(retireFails){res.writeHead(503);res.end(JSON.stringify({code:'unavailable',msg:'Synthetic retirement fault'}));return;}rooms.delete(value.room);res.end('{}');return;}
  res.writeHead(404);res.end('{}');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='127.0.0.1:'+server.address().port;
 let rehearsal;const clients=[],sockets=[];
 try{
  rehearsal=await createRehearsal({moderationFixture:true,calls:{...callConfig(),url:'ws://'+origin,apiURL:'http://'+origin}});
  const [a,b,m]=['a','b','m'].map(id=>client(rehearsal.gateway.url,rehearsal.tokens[id]));clients.push(a,b,m);
  async function enter(c,code){assert.equal((await c.api('visits',{action:'enter',...(code?{code}:{})})).status,200);const ws=await socket(c,rehearsal.gateway.url,WS);sockets.push(ws);await ws.wait(value=>value.type==='room-state');return ws;}
  await a.open();await b.open();await m.open();for(const c of clients)await c.api('guest',{});await run({a,b,m,enter,calls,rooms,profiles:rehearsal.profiles,rehearsal,setRetireFails:value=>retireFails=value});
 }finally{for(const ws of sockets)ws.ws.terminate();await Promise.allSettled(clients.map(c=>c.leave()));await rehearsal?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('real engine assigns a fixed room group only after connected visits, with server-scoped media tokens',async()=>fixture(async({a,b,enter,rehearsal})=>{
 assert.equal((await a.api('proximity',join())).status,409);const own=(await a.api('bedroom')).value;await enter(a);await enter(b);
 const va=(await a.api('proximity',join())).value,vb=(await b.api('proximity',join())).value;assert.equal(va.status,'alone');assert.equal(vb.status,'alone');
 await a.api('proximity',{action:'leave',client:va.client});await b.api('proximity',{action:'leave',client:vb.client});await a.api('visits',{action:'open'});await enter(b,own.code);
 const first=(await a.api('proximity',join())).value,second=(await b.api('proximity',join())).value,paired=(await a.api('proximity',{action:'pulse',client:first.client})).value;
 assert.equal(paired.assignment,second.assignment);assert.equal(paired.peers.length,1);assert.deepEqual(paired.modes,['group']);
 const claims=JSON.parse(Buffer.from(paired.grant.token.split('.')[1],'base64url'));assert.match(claims.video.room,new RegExp('^'+NAMESPACE+'-'));assert.equal(claims.video.room,paired.assignment);
 assert.deepEqual(claims.video.canPublishSources,['microphone','camera']);assert.equal(claims.video.canPublishData,false);assert.equal(claims.video.roomAdmin,false);assert.equal(claims.video.roomRecord,false);assert.equal(claims.video.canUpdateOwnMetadata,false);
 assert.ok(claims.exp-claims.nbf<=45);assert.equal(JSON.stringify(claims).includes('wvh:student:'),false);
 for(const c of [a,b])assert.equal((await c.api('moderation/proximity')).status,403);
 assert.equal((await b.api('proximity',{...join(),surface:'village'})).status,400);assert.equal((await b.api('proximity',{...join(),mode:'nearby'})).status,400);
 assert.equal((await a.request('view/'+a.view+'/proximity.js')).status,200);assert.equal((await a.request('view/'+a.view+'/castle-room-proximity-original.js')).status,200);
 const shell=await a.request('');assert.equal(shell.headers.get('permissions-policy'),'camera=(self), microphone=(self), display-capture=()');assert.match(shell.value,/data-room-calls="enabled"/);
 assert.equal(rehearsal.requests.some(row=>row.path==='/api/proximity'&&row.authorizationForwarded),false);
}));
test('reports come only from a released shared circle and only the approved moderator can pause a reported participant',async()=>fixture(async({a,b,m,enter})=>{
 assert.deepEqual((await a.api('proximity/reports')).value.contacts,[]);const own=(await a.api('bedroom')).value;await enter(a);await a.api('visits',{action:'open'});await enter(b,own.code);
 const first=(await a.api('proximity',join())).value,second=(await b.api('proximity',join())).value;await a.api('proximity',{action:'pulse',client:first.client});
 const contact=(await a.api('proximity/reports')).value.contacts[0];assert.ok(contact);assert.equal((await m.api('proximity/reports')).value.contacts.length,0);
 const report={contact:contact.id,reason:'worry',note:'Isolated fixture only',requestId:crypto.randomUUID()};assert.equal((await b.api('proximity/reports',report)).status,404);
 assert.equal((await a.api('proximity/reports',report)).status,200);assert.equal((await b.api('moderation/proximity')).status,403);
 const reports=(await m.api('moderation/proximity')).value.reports;assert.equal(reports.length,1);assert.equal(reports[0].note,report.note);
 assert.equal((await m.api('moderation/proximity',{id:reports[0].id,action:'timeout'})).status,200);assert.equal((await b.api('proximity',{action:'pulse',client:second.client})).status,403);
 assert.equal((await b.api('bedroom')).status,200);assert.equal((await a.api('proximity',{action:'pulse',client:first.client})).value.status,'alone');
}));
test('owner closure, code rotation and school withdrawal retire old assignments; failed retirement blocks every new grant',async()=>fixture(async({a,b,enter,calls,setRetireFails,profiles})=>{
 const own=(await a.api('bedroom')).value;await enter(a);await a.api('visits',{action:'open'});await enter(b,own.code);
 const first=(await a.api('proximity',join())).value,second=(await b.api('proximity',join())).value,old=second.assignment;assert.ok(old);
 setRetireFails(true);await a.api('visits',{action:'rotate'});await delay(300);assert.equal((await a.api('proximity',{action:'pulse',client:first.client})).status,409);
 assert.equal((await b.api('proximity',{action:'pulse',client:second.client})).status,409);
 const nextA=(await a.api('proximity',join())).value;assert.equal(nextA.status,'waiting');assert.equal(nextA.grant,null);
 const code=(await a.api('bedroom')).value.code;await enter(b,code);const waiting=(await b.api('proximity',join())).value;assert.equal(waiting.status,'waiting');assert.equal(waiting.grant,null);
 setRetireFails(false);await delay(350);assert.ok(calls.some(call=>call.path.endsWith('/DeleteRoom')&&call.room===old));
 const next=(await b.api('proximity',{action:'pulse',client:waiting.client})).value;assert.ok(next.assignment);assert.notEqual(next.assignment,old);
 const paired=(await a.api('proximity',{action:'pulse',client:nextA.client})).value;assert.equal(paired.assignment,next.assignment);
 profiles.set('b@invalid.local',{...profiles.get('b@invalid.local'),read_only:true});await assert.rejects(b.renew());await delay(350);
 assert.equal((await a.api('proximity',{action:'pulse',client:nextA.client})).value.status,'alone');
 await a.api('visits',{action:'close'});assert.equal((await b.api('proximity',join())).status,401);
 assert.equal((await a.api('proximity',{action:'pulse',client:nextA.client})).status,409);
}));
