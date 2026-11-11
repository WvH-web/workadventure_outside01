'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const http=require('node:http'),net=require('node:net');
const {setTimeout:delay}=require('node:timers/promises');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {createLookup}=require('../ops/castle-school/lookup.cjs');
const {SignJWT}=require(require.resolve('jose',{paths:[require('node:path').join(__dirname,'../ops/hall-audio')]}));
const {checkedCatalog}=require('./fixtures/castle-offers.cjs');
const secret='synthetic-admission-test-key-never-used-in-production';
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function fixture(run,{admissionOptions,graphMs=0,profileMs=0}={}){
 let now=Date.now(),graphActive=0,profileActive=0,maximumGraph=0,maximumProfiles=0;
 const clock=()=>now,profiles=new Map(),calls=new Map(),blocks=new Map(),graphCalls=new Map();
 const verify=createSchoolVerifier(secret,{clock,fetcher:async(_url,{headers,signal})=>{
  const id=headers.Authorization.slice('Bearer synthetic-opaque-access-token-'.length);graphCalls.set(id,(graphCalls.get(id)||0)+1);
  graphActive++;maximumGraph=Math.max(maximumGraph,graphActive);
  try{await delay(graphMs,undefined,{signal});return new Response(JSON.stringify({id:'01234567-89ab-cdef-0123-'+crypto.createHash('sha256').update(id).digest('hex').slice(0,12),userPrincipalName:id+'@invalid.local'}),{headers:{'Content-Type':'application/json'}});}
  finally{graphActive--;}
 }});
 const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:'a'.repeat(64),clock,fetcher:async(_url,{body,signal})=>{
  const {identifier}=JSON.parse(body),id=identifier.replace('@invalid.local','');calls.set(id,(calls.get(id)||0)+1);
  profileActive++;maximumProfiles=Math.max(maximumProfiles,profileActive);
  try{
   const block=blocks.get(id);if(block){block.entered.resolve();await block.release.promise;}
   await delay(profileMs,undefined,{signal});
   return new Response(JSON.stringify({version:1,kind:'student',eligible:true,age:13,gradeLevel:7,classId:17,checkedAt:now,...profiles.get(id)}),{headers:{'Content-Type':'application/json'}});
  }finally{profileActive--;}
 }});
 const server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret,trustedProxyIps:[]},verify,lookup,
  getOffers:async()=>checkedCatalog(now),updateRoomLink:async()=>({updated:true}),clock,admissionOptions});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/castle-school/';
 async function headers(id,extra={}){
  const token=await new SignJWT({identifier:'opaque-'+id,accessToken:'synthetic-opaque-access-token-'+id,username:'Private synthetic name',tags:['teacher'],...extra})
   .setProtectedHeader({alg:'HS256'}).setExpirationTime(extra.exp??Math.floor(now/1000)+3600).sign(new TextEncoder().encode(secret));
  return {Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin'};
 }
 async function request(route,body,auth,options={}){
  const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:auth,...(body===undefined?{}:{body:JSON.stringify(body)}),...options});
  return {status:response.status,value:await response.json(),headers:response.headers};
 }
 const api=async(id,route='round-context',body,options={})=>request(route,body,await headers(id),options);
 async function burst(count){
  const auth=await Promise.all(Array.from({length:count},(_,index)=>headers('pupil-'+index)));
  if(process.platform!=='win32')return Promise.allSettled(auth.map(value=>request('round-context',undefined,value,{signal:AbortSignal.timeout(6500)})));
  // Windows loopback refused 168/400 simultaneous connects even against a bare echo server.
  // Establish transport first, then send all 400 real HTTP requests together; no client request queue.
  const sockets=[],agent=new http.Agent({keepAlive:false,maxSockets:count});
  try{
   for(let index=0;index<count;index+=16)await Promise.all(Array.from({length:Math.min(16,count-index)},()=>new Promise((resolve,reject)=>{
    const socket=net.createConnection({port:server.address().port,host:'127.0.0.1'});sockets.push(socket);
    socket.setTimeout(3000,()=>socket.destroy(Error('Synthetic transport setup timed out')));
    socket.once('error',reject);socket.once('connect',()=>{socket.setTimeout(0);socket.removeListener('error',reject);resolve();});
   })));
   const available=[...sockets];agent.createConnection=()=>{assert.ok(available.length);return available.shift();};
   return await Promise.allSettled(auth.map(value=>new Promise((resolve,reject)=>{
    const req=http.get(base+'round-context',{agent,headers:value},res=>{
     let body='';res.on('data',chunk=>{body+=chunk;if(body.length>100000)res.destroy(Error('Oversized synthetic response'));});
     res.once('error',reject);res.once('end',()=>{try{resolve({status:res.statusCode,value:JSON.parse(body),headers:new Headers(res.headers)});}catch(error){reject(error);}});
    });
    req.setTimeout(6500,()=>req.destroy(Error('Synthetic HTTP request timed out')));req.once('error',reject);
   })));
  }finally{agent.destroy();for(const socket of sockets)socket.destroy();}
 }
 function block(id){const value={entered:deferred(),release:deferred()};blocks.set(id,value);return value;}
 try{await run({server,api,headers,request,burst,profiles,calls,graphCalls,block,advance:ms=>{now+=ms;},clock,
  stats:()=>({maximumGraph,maximumProfiles,graphActive,profileActive,profileRequests:[...calls.values()].reduce((a,b)=>a+b,0),providerRequests:[...graphCalls.values()].reduce((a,b)=>a+b,0)})});}
 finally{for(const block of blocks.values())block.release.resolve();server.closeAdmissions();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}

test('400 simultaneous signed requests receive fresh decisions through at most sixteen provider/profile workers', {timeout:15000},async t=>fixture(async f=>{
 const started=performance.now(),settled=await f.burst(400);
 const rows=settled.filter(row=>row.status==='fulfilled').map(row=>row.value);
 t.diagnostic(JSON.stringify({httpStatuses:rows.reduce((out,row)=>(out[row.status]=(out[row.status]||0)+1,out),{}),
  networkFailures:settled.filter(row=>row.status==='rejected').reduce((out,row)=>{const code=row.reason.cause?.code||row.reason.name;out[code]=(out[code]||0)+1;return out;},{})}));
 assert.equal(rows.filter(row=>row.status===200).length,400);
 const stats=f.stats();assert.equal(stats.profileRequests,400);assert.equal(stats.providerRequests,400);assert.ok(stats.maximumGraph<=16);assert.ok(stats.maximumProfiles<=16);
 for(const row of rows){assert.equal(row.value.account.kind,'student');assert.equal(row.headers.get('cache-control'),'no-store');
  for(const privateValue of ['@invalid.local','Private synthetic name','gradeLevel','classId','accessToken'])assert.equal(JSON.stringify(row.value).includes(privateValue),false);}
 t.diagnostic(JSON.stringify({scope:'controlled synthetic HTTP burst; no real provider or database requests',requests:400,successful:400,
  elapsedMs:Math.round(performance.now()-started),transportPreconnected:process.platform==='win32',...stats,normalMicrosoftLoginLoadTested:false,fullCastleApprovalFor400:false}));
},{graphMs:50,profileMs:55}));

test('class and role changes while waiting are read after admission, never from the earlier request',async()=>fixture(async f=>{
 const block=f.block('a'),first=f.api('a');await block.entered.promise;
 const second=f.api('b','round-create',{targetId:'mittelstufe-spieltisch',kind:'chess',capacity:2});
 await delay(20);f.profiles.set('b',{age:9,gradeLevel:3,classId:99});block.release.resolve();
 assert.equal((await first).status,200);assert.equal((await second).status,403);
 const result=await f.api('b');assert.equal(result.status,200);assert.ok(result.value.targets.some(target=>target.mapId==='grundschule'));
 assert.equal(result.value.targets.some(target=>target.mapId==='mittelstufe'),false);assert.equal(result.value.rounds.length,0);
},{admissionOptions:{concurrency:1}}));

test('a token that expires in the queue never reaches provider or school lookup',async()=>fixture(async f=>{
 const block=f.block('a'),first=f.api('a');await block.entered.promise;
 const auth=await f.headers('b',{exp:Math.floor(f.clock()/1000)+2}),second=f.request('round-context',undefined,auth);
 await delay(20);f.advance(3000);block.release.resolve();assert.equal((await first).status,200);assert.equal((await second).status,401);
 assert.equal(f.graphCalls.get('b'),undefined);assert.equal(f.calls.get('b'),undefined);assert.equal((await f.api('c')).status,200);
},{admissionOptions:{concurrency:1}}));

test('disconnecting a queued HTTP request frees its place without creating or renewing a registration',async()=>fixture(async f=>{
 const block=f.block('a'),first=f.api('a');first.catch(()=>{});await block.entered.promise;
 const auth=await f.headers('b'),closed=deferred(),received=deferred();f.server.on('request',(req,res)=>{if(req.headers.authorization===auth.Authorization){res.once('close',()=>closed.resolve());received.resolve();}});
 const abort=new AbortController(),second=f.request('round-context',undefined,auth,{signal:abort.signal});second.catch(()=>{});
 const bounded=async promise=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Synthetic request lifecycle event was not observed')),5000);})]);}finally{clearTimeout(timer);}};
 try{await bounded(received.promise);abort.abort();await assert.rejects(second,error=>error.name==='AbortError');await bounded(closed.promise);}
 finally{abort.abort();}
 const third=f.api('c');await delay(20);block.release.resolve();assert.equal((await first).status,200);assert.equal((await third).status,200);
 assert.equal(f.graphCalls.get('b'),undefined);assert.equal(f.calls.get('b'),undefined);
},{admissionOptions:{concurrency:1,maxPending:1}}));

test('queue timeout gives bounded retry information without consulting the provider or school',async()=>fixture(async f=>{
 const block=f.block('a'),first=f.api('a');await block.entered.promise;const second=await f.api('b');
 assert.equal(second.status,503);assert.equal(second.headers.get('retry-after'),'1');assert.equal(f.graphCalls.get('b'),undefined);
 block.release.resolve();assert.equal((await first).status,200);assert.equal((await f.api('c')).status,200);
},{admissionOptions:{concurrency:1,waitMs:30}}));

test('one verified identity cannot fill the queue and shutdown rejects queued work without ending the active request',async()=>fixture(async f=>{
 const block=f.block('a'),first=f.api('a');await block.entered.promise;
 const b1=f.api('b'),b2=f.api('b');await delay(20);const overflow=await f.api('b');
 assert.equal(overflow.status,429);assert.equal(overflow.headers.get('retry-after'),'1');
 f.server.closeAdmissions();assert.equal((await b1).status,503);assert.equal((await b2).status,503);
 block.release.resolve();assert.equal((await first).status,200);
},{admissionOptions:{concurrency:1,maxPending:4,maxPerKey:2}}));
