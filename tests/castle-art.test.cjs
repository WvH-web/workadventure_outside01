'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {ArtSessions,BOARDS,COOKIE,cookieFrom,cookieHeader,internalToken}=require('../ops/castle-art/sessions.cjs');
const {artRoute,manifest}=require('../ops/castle-art/routes.cjs');
const {createArtServer}=require('../ops/castle-art/server.cjs');
const {SignJWT,jwtVerify}=require('../ops/hall-audio/node_modules/jose');
const code=value=>error=>error.code===value;
const boardKey='a'.repeat(64),secret='synthetic-art-test-key-not-a-school-key';
function domain(){let now=Date.now();const sessions=new ArtSessions({clock:()=>now}),actor=(id,staff=false)=>sessions.actor(id,staff,now+3600000),a=actor('synthetic-a');
  const open=(who=a,client=crypto.randomUUID(),cookie)=>sessions.complete(sessions.begin(client,who),who,cookie);
  return {sessions,actor,a,open,clock:()=>now,advance:ms=>{now+=ms;sessions.sweep();}};}
test('unmodified upstream and proxy sources are pinned and available with their licenses',()=>{
  const root=path.resolve(__dirname,'../ops/castle-art'),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
  assert.equal(manifest.wbo.version,'2.18.33');assert.equal(manifest.wbo.commit,'90ae10b5e46e8efeb9b0c8ad918524e336b3fedc');
  assert.equal(sha(fs.readFileSync(path.join(root,manifest.wbo.archive))),manifest.wbo.sha256);assert.equal(manifest.proxy.version,'0.5.6');
  for(const file of manifest.files)assert.equal(sha(fs.readFileSync(path.join(root,file.path))),file.sha256);
  assert.ok(manifest.clientAssets.length>100);assert.equal(manifest.wbo.license,'AGPL-3.0-or-later');
});
test('art cookies are opaque, bounded, path-scoped and never expose school data',()=>{
  const f=domain(),value=f.open(),serialized=cookieHeader(value.cookie,value.lease,{clock:f.clock});
  assert.match(serialized,new RegExp('^'+COOKIE+'=[a-f0-9]{64};'));assert.match(serialized,/Path=\/castle-art\/; Max-Age=45; HttpOnly; SameSite=Strict; Secure$/);
  assert.equal(cookieFrom('other=abc; '+COOKIE+'='+value.cookie),value.cookie);
  for(const header of ['',COOKIE+'=bad',COOKIE+'='+value.cookie+'; '+COOKIE+'='+value.cookie,'x'.repeat(8193)])assert.equal(cookieFrom(header),null);
  const json=JSON.stringify(value.context);assert.doesNotMatch(json,/synthetic|identifier|age|classId|gradeLevel|token|userSecret|client/);
  assert.equal(value.context.boards.length,3);assert.equal(value.context.staff,false);
});
test('same-account renewal reuses the lease without disconnecting an active drawing',()=>{
  const f=domain(),id=crypto.randomUUID(),first=f.open(f.a,id);let closed=0;f.sessions.track(first.lease,'ws',()=>closed++);f.advance(14000);
  const next=f.open(f.a,id,first.cookie);assert.equal(next.cookie,first.cookie);assert.equal(next.context.generation,first.context.generation);assert.equal(closed,0);assert.equal(next.context.leaseMs,45000);
});
test('account changes revoke the old lease and late old profile responses cannot set a cookie',()=>{
  const f=domain(),client=crypto.randomUUID(),old=f.open(f.a,client);let closed=0;f.sessions.track(old.lease,'ws',()=>closed++);
  const pending=f.sessions.begin(client,f.a),b=f.actor('synthetic-b'),newer=f.sessions.begin(client,b);
  assert.equal(closed,1);assert.throws(()=>f.sessions.complete(pending,f.a,old.cookie),code('account_changed'));
  const current=f.sessions.complete(newer,b,old.cookie);assert.notEqual(current.cookie,old.cookie);assert.equal(f.sessions.leases.size,1);
  assert.throws(()=>f.sessions.get(current.cookie,f.a),code('not_allowed'));
});
test('role or verified token expiry changes close old sockets and create a new frame generation',()=>{
  const f=domain(),client=crypto.randomUUID(),staff=f.actor('synthetic-a',true),old=f.open(staff,client);let closed=0;f.sessions.track(old.lease,'ws',()=>closed++);
  const next=f.open(f.a,client,old.cookie);assert.equal(closed,1);assert.equal(next.context.staff,false);assert.notEqual(next.context.generation,old.context.generation);
  const refreshed={...f.a,expiresAt:f.a.expiresAt+300000},last=f.open(refreshed,client,next.cookie);assert.notEqual(last.cookie,next.cookie);
});
test('lease timeout, explicit revocation and shutdown close every owned resource exactly once',()=>{
  const f=domain(),a=f.open(),b=f.open(f.a);let closed=0;for(const value of [a,b]){f.sessions.track(value.lease,'ws',()=>closed++);f.sessions.track(value.lease,'http',()=>closed++);}
  f.sessions.revokeActor(f.a.id);assert.equal(closed,4);f.sessions.close();assert.equal(closed,4);
  const short=f.open({...f.a,expiresAt:f.clock()+1000});assert.equal(short.context.leaseMs,1000);f.advance(1001);assert.throws(()=>f.sessions.get(short.cookie),code('school_required'));
});
test('pending clients, active sessions and per-lease sockets/requests are bounded',()=>{
  const f=domain(),value=f.open();for(let n=0;n<6;n++)f.sessions.track(value.lease,'ws',()=>{});assert.throws(()=>f.sessions.track(value.lease,'ws',()=>{}),code('rate_limited'));
  for(let n=0;n<32;n++)f.sessions.track(value.lease,'http',()=>{});assert.throws(()=>f.sessions.track(value.lease,'http',()=>{}),code('rate_limited'));
  assert.throws(()=>f.sessions.begin('arbitrary-browser-name',f.a),code('invalid_request'));
  const tiny=new ArtSessions({maxSessions:1,clock:f.clock}),a=tiny.actor('test',false,f.clock()+3600000);tiny.begin(crypto.randomUUID(),a);tiny.begin(crypto.randomUUID(),a);assert.throws(()=>tiny.begin(crypto.randomUUID(),a),code('unavailable'));
});
test('private WBO JWTs grant only the three real school boards and cap expiry at the verified login',async()=>{
  const f=domain(),pupil=f.open(),staff=f.open(f.actor('synthetic-staff',true));
  for(const [value,role]of [[pupil,'editor'],[staff,'moderator']]){
    const token=internalToken(value.lease,boardKey,f.clock()),{payload}=await jwtVerify(token,new TextEncoder().encode(boardKey));
    assert.deepEqual(payload.roles,BOARDS.map(board=>role+':'+board.id));assert.equal(payload.exp,Math.floor(value.lease.tokenExpires/1000));assert.deepEqual(Object.keys(payload).sort(),['exp','iat','roles']);
  }
});
test('route boundaries expose code, not arbitrary boards, server files, imports or token URLs',()=>{
  const origin='https://together.deine-schule.com',board=BOARDS[0].id;
  for(const url of ['/castle-art/','/castle-art/source/wbo-2.18.33.tar.gz','/castle-art/wbo/js/board_main.js','/castle-art/wbo/boards/'+board+'?lang=de','/castle-art/wbo/preview/'+board])assert.doesNotThrow(()=>artRoute(url,origin));
  for(const url of ['/castle-art/wbo/boards/anonymous','/castle-art/wbo/preview/other','/castle-art/wbo/random','/castle-art/wbo/','/castle-art/server.cjs','/castle-art/wbo/../runtime.env',
    '/castle-art/wbo/%2e%2e/server.mjs','/castle-art/wbo/boards/'+board+'?token=evil','/castle-art/wbo/socket.io/?EIO=4&transport=websocket&board=other',
    'https://evil.invalid/castle-art/wbo/boards/'+board,'/castle-art/wbo/board.html'])assert.throws(()=>artRoute(url,origin));
  assert.equal(artRoute('/castle-art/wbo/socket.io/?EIO=4&transport=websocket&board='+board+'&baselineSeq=0',origin,{upgrade:true}).socket,true);
});
async function fixture(t){
  const config={origin:'http://127.0.0.1',target:'',secret,boardSecret:boardKey,trustedProxyIps:[]},profiles=new Map(),seen=[];let lookups=0;
  const backend=http.createServer((req,res)=>{seen.push({url:req.url,headers:req.headers});res.setHeader('Set-Cookie','wvh_castle_art=attacker; Path=/');res.setHeader('Cache-Control','public,max-age=999999');
    if(req.url.startsWith('/favicon.svg')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');}else{res.setHeader('Content-Type','application/json');res.end('{"ok":true}');}});
  await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));config.target='http://127.0.0.1:'+backend.address().port;
  const lookup=async id=>{lookups++;return {version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:Date.now()};};
  const sessions=new ArtSessions(),server=createArtServer({config,lookup,sessions});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await new Promise(resolve=>{backend.close(resolve);backend.closeAllConnections();});});
  async function actor(id,kind='student'){
    profiles.set(id,kind==='student'?{kind,eligible:true,age:9,gradeLevel:3,classId:17}:{kind,eligible:kind==='staff'||kind==='parent',age:null,gradeLevel:null,classId:null});
    const token=await new SignJWT({identifier:id,tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(secret));return {id,token,clientId:crypto.randomUUID()};
  }
  async function api(actor,route,data,extra={}){
    const response=await fetch(config.origin+'/castle-art/'+route,{method:data===undefined?'GET':'POST',headers:{...(actor?.token?{Authorization:'Bearer '+actor.token}:{}),...(actor?.cookie?{Cookie:actor.cookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
    const bytes=await response.arrayBuffer(),type=response.headers.get('content-type')||'';return {status:response.status,headers:response.headers,value:type.includes('json')?JSON.parse(Buffer.from(bytes).toString('utf8')):Buffer.from(bytes)};
  }
  async function join(actor){const result=await api(actor,'session',{clientId:actor.clientId});assert.equal(result.status,200);actor.cookie=result.headers.get('set-cookie').split(';')[0];return result;}
  return {config,server,backend,sessions,profiles,seen,actor,api,join,get lookups(){return lookups;}};
}
test('HTTP access comes from a fresh school profile, not a visible board link or token teacher tags',async t=>{
  const f=await fixture(t),pupil=await f.actor('art-pupil@invalid.local'),staff=await f.actor('art-staff@invalid.local','staff');
  assert.equal((await f.api(null,'')).status,200);assert.equal((await f.api(null,'health')).value.ready,true);
  assert.equal((await f.api(null,'wbo/boards/'+BOARDS[0].id)).status,401);assert.equal((await f.api(null,'session',{clientId:pupil.clientId})).status,401);
  for(const kind of ['unknown','parent']){const a=await f.actor('art-'+kind+'@invalid.local',kind);assert.equal((await f.api(a,'session',{clientId:a.clientId})).status,403);}
  assert.equal((await f.join(pupil)).value.staff,false);assert.equal((await f.join(staff)).value.staff,true);
  const before=f.lookups;await f.api(pupil,'session',{clientId:pupil.clientId});assert.equal(f.lookups,before+1);
});
test('the reverse proxy strips school credentials and injects only a private board-scoped token',async t=>{
  const f=await fixture(t),a=await f.actor('art-pupil@invalid.local');await f.join(a);const result=await f.api(a,'wbo/boards/'+BOARDS[0].id+'?lang=de',undefined,{'X-Castle-School-Key':'not-forwarded','X-Real-IP':'203.0.113.3'});
  assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('x-frame-options'),'SAMEORIGIN');
  const last=f.seen.at(-1),url=new URL(last.url,'http://internal');assert.equal(url.pathname,'/boards/'+BOARDS[0].id);assert.ok(url.searchParams.get('token'));
  assert.equal(last.headers.authorization,undefined);assert.equal(last.headers['x-castle-school-key'],undefined);assert.equal(last.headers['x-real-ip'],'127.0.0.1');assert.match(last.headers.cookie,/^wbo-user-secret-v1=[a-f0-9]{32}$/);
  const {payload}=await jwtVerify(url.searchParams.get('token'),new TextEncoder().encode(boardKey));assert.ok(payload.roles.every(role=>role.startsWith('editor:')));assert.ok(!JSON.stringify(last).includes(a.token));
});
test('revocation, invalid profile responses and role changes cannot reuse a prior drawing authorization',async t=>{
  const f=await fixture(t),a=await f.actor('art-staff@invalid.local','staff');await f.join(a);const firstCookie=a.cookie;
  f.profiles.set(a.id,{kind:'student',eligible:true,age:9,gradeLevel:3,classId:17});const changed=await f.join(a);assert.equal(changed.value.staff,false);assert.notEqual(a.cookie,firstCookie);
  assert.equal((await f.api({...a,cookie:firstCookie},'wbo/boards/'+BOARDS[0].id)).status,401);
  f.profiles.set(a.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});assert.equal((await f.api(a,'session',{clientId:a.clientId})).status,403);assert.equal((await f.api(a,'wbo/boards/'+BOARDS[0].id)).status,401);
  f.profiles.set(a.id,{kind:'student',eligible:true,age:9,gradeLevel:3,classId:17});await f.join(a);
  f.profiles.set(a.id,{kind:'student',eligible:true,age:9,gradeLevel:3,classId:null});assert.equal((await f.api(a,'session',{clientId:a.clientId})).status,503);assert.equal((await f.api(a,'wbo/boards/'+BOARDS[0].id)).status,401);
});
test('wrong origins, forged cookies, extra role data and credential query parameters are rejected',async t=>{
  const f=await fixture(t),a=await f.actor('art-pupil@invalid.local');await f.join(a);
  assert.equal((await f.api(a,'session',{clientId:a.clientId},{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await f.api(a,'session',{clientId:a.clientId,staff:true})).status,400);
  assert.equal((await f.api({...a,cookie:COOKIE+'='+'f'.repeat(64)},'wbo/boards/'+BOARDS[0].id)).status,401);
  assert.equal((await f.api(a,'wbo/boards/'+BOARDS[0].id+'?token=evil')).status,400);
  assert.equal((await f.api(a,'wbo/boards/'+BOARDS[0].id,{})).status,405);
  assert.equal((await f.api(a,'leave',{clientId:a.clientId})).value.left,true);assert.equal((await f.api(a,'wbo/boards/'+BOARDS[0].id)).status,401);
});
