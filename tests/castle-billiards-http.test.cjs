'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createBilliardsServer}=require('../ops/castle-billiards/server.cjs'),{BilliardsRooms}=require('../ops/castle-billiards/rooms.cjs'),{PhysicsPool}=require('../ops/castle-billiards/physics-pool.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const secret='isolated-billiards-http-test-key-not-used-by-school';
async function fixture(t,admit=()=>true){
 let now=Date.now(),calls=0;const clock=()=>now,pool=new PhysicsPool({size:1}),rooms=new BilliardsRooms({pool,clock}),profiles=new Map();
 const lookup=async id=>{calls++;return {version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:now};};
 const config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]},server=createBilliardsServer({config,lookup,rooms,clock,admit});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 async function actor(id,kind='student'){
  profiles.set(id,kind==='student'?{kind,eligible:true,age:9,gradeLevel:3,classId:17}:{kind,eligible:['staff','parent'].includes(kind),age:null,gradeLevel:null,classId:null});
  const token=await new SignJWT({identifier:id,username:'Synthetic billiards test',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(now/1000)+600).sign(new TextEncoder().encode(secret));return {id,token};
 }
 async function api(actor,route,body,headers={}){
  const response=await fetch(config.origin+'/castle-billiards/'+route,{method:body===undefined?'GET':'POST',headers:{...(actor?{Authorization:'Bearer '+actor.token}:{}),...(actor?.session?{'X-Billiards-Session':actor.session}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();return {status:response.status,headers:response.headers,value:response.headers.get('content-type')?.includes('json')?JSON.parse(text):text};
 }
 async function join(actor,tableId='tisch-1'){const value=await api(actor,'session',{tableId});assert.equal(value.status,200);actor.session=value.value.sessionId;return value.value;}
 async function stream(actor){
  const controller=new AbortController(),response=await fetch(config.origin+'/castle-billiards/events',{signal:controller.signal,headers:{Authorization:'Bearer '+actor.token,'X-Billiards-Session':actor.session}});assert.equal(response.status,200);
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  const next=async()=>{for(;;){const index=buffer.indexOf('\n\n');if(index>=0){const event=buffer.slice(0,index);buffer=buffer.slice(index+2);const line=event.split('\n').find(line=>line.startsWith('data: '));if(line)return {expired:event.includes('event: expired'),value:JSON.parse(line.slice(6))};continue;}const part=await reader.read();if(part.done)return null;buffer+=decoder.decode(part.value,{stream:true});}};
  t.after(()=>controller.abort());return {next,controller};
 }
 const cmd=(actor,action,version,fields={})=>api(actor,'command',{id:crypto.randomUUID(),action,version,...fields});
 return {actor,api,join,stream,cmd,rooms,profiles,get calls(){return calls;},advance:ms=>{now+=ms;rooms.sweep();}};
}
test('only reviewed static game files and licenses are served, never backend, positions or credentials',async t=>{
 const f=await fixture(t);for(const route of ['', 'renderer.js','billiards.js','billiards.css','credits.html','vendor/three/build/three.module.js','vendor/three/LICENSE','licenses/tailuge.GPL-3.0','licenses/lucide.LICENSE','licenses/eventsource-parser.LICENSE'])assert.equal((await f.api(null,route)).status,200);
 for(const route of ['server.cjs','rooms.cjs','vendor/core.cjs','state.json','vendor-manifest.json','?authToken=x'])assert.equal((await f.api(null,route)).status,404);
 assert.equal((await f.api(null,'session',{})).status,401);assert.equal((await f.api(null,'health')).value.ready,true);
 const page=await f.api(null,'');assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self'/);assert.equal(page.headers.get('permissions-policy'),'microphone=(), camera=(), display-capture=()');
});
test('fresh school membership, not client claims, grants or revokes every game endpoint',async t=>{
 const f=await fixture(t),pupil=await f.actor('pupil@invalid.local');
 for(const kind of ['unknown','parent','ambiguous'])assert.equal((await f.api(await f.actor(kind+'@invalid.local',kind),'session',{})).status,403);
 await f.join(pupil);const before=f.calls;await f.api(pupil,'state');await f.api(pupil,'ping',{});assert.equal(f.calls,before+2);
 f.profiles.set(pupil.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});assert.equal((await f.api(pupil,'state')).status,403);assert.equal(f.rooms.sessions.size,0);
});

test('pilot admission is checked afresh and revocation removes a previously occupied place',async t=>{
 const admitted=new Set(['a@invalid.local']),f=await fixture(t,auth=>admitted.has(auth?.schoolIdentifier||auth?.identifier));
 const a=await f.actor('a@invalid.local'),other=await f.actor('other@invalid.local'),staff=await f.actor('staff@invalid.local','staff');
 for(const actor of [other,staff])assert.equal((await f.api(actor,'session',{})).value.error,'preview_only');
 await f.join(a);const stream=await f.stream(a);await stream.next();await f.cmd(a,'claim',0,{seat:0});
 assert.equal(f.rooms.snapshot(a.session).board.seats[0].occupied,true);
 admitted.delete(a.id);assert.equal((await f.api(a,'ping',{})).value.error,'preview_only');
 assert.equal(f.rooms.sessions.size,0);assert.equal(f.rooms.tables.get('tisch-1').seats[0],null);
 admitted.add(other.id);await f.join(other);assert.equal((await f.api(other,'state')).status,200);
});

test('only fresh staff membership grants reset and an expired signed session cannot act',async t=>{
 const f=await fixture(t),pupil=await f.actor('pupil@invalid.local'),staff=await f.actor('staff@invalid.local','staff');
 await f.join(pupil);await f.join(staff);const sp=await f.stream(pupil),ss=await f.stream(staff);await sp.next();await ss.next();assert.equal((await f.cmd(pupil,'reset',0)).status,403);
 assert.equal((await f.cmd(staff,'reset',0)).status,200);
 f.profiles.set(staff.id,{kind:'student',eligible:true,age:13,gradeLevel:7,classId:19});
 assert.equal((await f.cmd(staff,'reset',1)).status,403);
 f.advance(601000);assert.equal((await f.api(pupil,'state')).status,401);
});
test('wrong origin, profile injection, session theft, token corruption and excess data are rejected',async t=>{
 const f=await fixture(t),a=await f.actor('a@invalid.local'),b=await f.actor('b@invalid.local');await f.join(a);await f.join(b);
 assert.equal((await f.api(a,'session',{}, {Origin:'https://foreign.invalid'})).status,403);assert.equal((await f.api(a,'session',{}, {'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await f.api(a,'session',{age:99})).status,400);assert.equal((await f.api(a,'state',{})).status,405);assert.equal((await f.api({...b,session:a.session},'state')).status,403);
 assert.equal((await f.api({...a,token:a.token.slice(0,-2)+'xx'},'state')).status,401);assert.equal((await f.api(a,'session',{text:'x'.repeat(5000)})).status,413);
 assert.equal((await f.api(a,'session',{}, {'Content-Type':'text/plain'})).status,415);
});
test('two real HTTP clients and spectator receive the same authoritative shot, including its actual trajectory',async t=>{
 const f=await fixture(t),a=await f.actor('a@invalid.local'),b=await f.actor('b@invalid.local'),watch=await f.actor('watch@invalid.local');for(const actor of [a,b,watch])await f.join(actor);
 const sa=await f.stream(a),sb=await f.stream(b),sc=await f.stream(watch);await sa.next();await sb.next();await sc.next();
 assert.equal((await f.cmd(a,'claim',0,{seat:0})).status,200);assert.equal((await f.cmd(b,'claim',0,{seat:1})).status,200);
 const shot={angle:0,power:2.8,offset:{x:0,y:0}};assert.equal((await f.cmd(watch,'shoot',0,{shot})).value.error,'not_a_player');assert.equal((await f.cmd(b,'shoot',0,{shot})).value.error,'not_your_turn');
 const result=await f.cmd(a,'shoot',0,{shot});assert.equal(result.status,200);assert.equal(result.value.board.state.shots,1);assert.ok(result.value.board.animation.frames.length>4);
 let event;for(let i=0;i<15;i++){event=await sc.next();if(event.value.board.state.version===1&&event.value.board.animation?.frames)break;}
 assert.deepEqual(event.value.board.state,result.value.board.state);assert.deepEqual(event.value.board.animation.frames,result.value.board.animation.frames);
 assert.doesNotMatch(JSON.stringify(event.value),/@invalid|identifier|actor|classId|gradeLevel|token/);
 const ping=await f.api(b,'ping',{});assert.equal(ping.value.board.animation.frames,undefined);
});
test('an independent table cannot observe another table trajectory or inherit its occupied seats',async t=>{
 const f=await fixture(t),a=await f.actor('a@invalid.local'),b=await f.actor('b@invalid.local');await f.join(a);await f.join(b,'tisch-2');
 const sa=await f.stream(a),sb=await f.stream(b);await sa.next();await sb.next();await f.cmd(a,'claim',0,{seat:0});
 const state=await f.api(b,'state');assert.equal(state.value.board.id,'tisch-2');assert.deepEqual(state.value.board.seats.map(seat=>seat.occupied),[false,false]);assert.equal(state.value.board.animation,null);
});
