'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const fixture=require('./fixtures/castle-piano.cjs'),WebSocket=require('../ops/castle-piano/vendor/ws');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(check){const end=Date.now()+3000;for(;;){const value=check();if(value)return value;if(Date.now()>end)throw Error('Piano transport observation timed out');await pause(10);}}
async function socket(f,actor,extra={}){
  const states=[],ws=new WebSocket(f.config.origin.replace('http','ws')+'/castle-piano/socket',['castle-piano-v1','visit.'+actor.context.generation],
    {origin:f.config.origin,headers:{Cookie:actor.cookie},...extra});
  ws.on('message',raw=>states.push(JSON.parse(raw.toString('utf8'))));ws.on('error',()=>{});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('unexpected-response',(_,response)=>{response.resume();reject(Object.assign(Error('Rejected upgrade'),{status:response.statusCode}));});ws.once('error',reject);});
  await wait(()=>states.some(value=>value.type==='state'));return {ws,states,send:value=>ws.send(JSON.stringify({id:crypto.randomUUID(),...value})),latest:()=>states.filter(value=>value.type==='state').at(-1)};
}
test('all pinned sample/library files retain integrity and all license links exist',()=>{
  const root=path.resolve(__dirname,'../ops/castle-piano'),manifest=JSON.parse(fs.readFileSync(path.join(root,'vendor-manifest.json'),'utf8'));
  for(const file of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.path))).digest('hex'),file.sha256);
  assert.equal(manifest.samples.commit,'869b6f8d9cddb47d966238c012041480b1ce517a');assert.equal(manifest.files.filter(file=>file.path.endsWith('.mp3')).length,13);
  const html=fs.readFileSync(path.join(root,'public/credits.html'),'utf8');for(const match of html.matchAll(/href="\.\/(vendor\/licenses\/[^"\s]+)"/g))assert.ok(fs.existsSync(path.join(root,'public',match[1])));
});
test('public keyboard code reveals no performance, school profile or private server files',async t=>{
  const f=await fixture(t);for(const route of ['', 'piano.js','audio.js','projection.js','piano.css','keys.css','vendor/tone.js','credits.html','samples/869b6f8d9cddb47d966238c012041480b1ce517a/C4.mp3'])assert.equal((await f.api(null,route)).status,200);
  for(const route of ['server.cjs','rooms.cjs','vendor-manifest.json','samples/C4.mp3','socket','health?token=secret'])assert.equal((await f.api(null,route)).status,404);
  const page=await f.api(null,'');assert.match(page.headers.get('content-security-policy'),/worker-src 'none'/);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self'/);
  assert.equal(page.headers.get('cache-control'),'no-store');assert.match((await f.api(null,'samples/869b6f8d9cddb47d966238c012041480b1ce517a/C4.mp3')).headers.get('cache-control'),/immutable/);
  assert.equal((await f.api(null,'health')).value.ready,true);assert.equal((await f.api(null,'session',{})).status,401);
});
test('fresh school checks authorize each renewal, not token teacher tags or supplied ages',async t=>{
  const f=await fixture(t),a=await f.actor('piano-synthetic-a@invalid.local');assert.equal((await f.join(a)).value.staff,false);
  const n=f.calls;assert.equal((await f.join(a)).status,200);assert.equal(f.calls,n+1);
  for(const kind of ['parent','unknown'])assert.equal((await f.join(await f.actor('piano-'+kind+'@invalid.local',kind))).status,403);
  assert.equal((await f.join(a,{age:20})).status,400);assert.equal((await f.api(a,'session',{clientId:a.clientId,roomId:'elsewhere',mode:'together',takeover:false})).status,400);
  assert.equal((await f.api(a,'session',{}, {Origin:'https://foreign.invalid'})).status,403);assert.equal((await f.api(a,'session',{}, {'Sec-Fetch-Site':'cross-site'})).status,403);
  const staff=await f.actor('piano-staff@invalid.local','staff');assert.equal((await f.join(staff)).value.staff,true);
});
test('two actual WebSockets share owner-separated notes; late join and creator departure retain the peer',async t=>{
  const f=await fixture(t),a=await f.actor('piano-a@invalid.local'),b=await f.actor('piano-b@invalid.local');await f.join(a);await f.join(b);
  const sa=await socket(f,a);sa.send({type:'down',note:60,velocity:90});await wait(()=>sa.latest().members[0]?.keys.length===1);
  const sb=await socket(f,b);assert.equal(sb.latest().members.find(member=>member.voiceId===a.context.voiceId).keys[0].note,60);
  sb.send({type:'down',note:60,velocity:70});await wait(()=>sa.latest().members.every(member=>member.keys.length===1));
  sa.send({type:'up',note:60});await wait(()=>sb.latest().members.find(member=>member.voiceId===a.context.voiceId).keys.length===0);
  assert.equal(sb.latest().members.find(member=>member.voiceId===b.context.voiceId).keys.length,1);sa.ws.close();await wait(()=>sb.latest().members.length===1);
  assert.equal(sb.latest().members[0].keys.length,1);assert.doesNotMatch(JSON.stringify(sb.states),/@invalid|classId|gradeLevel|identifier|token|Synthetic/);
});
test('revoked profile, lookup failure, role change and lease expiry close the real old transport',async t=>{
  const f=await fixture(t),a=await f.actor('piano-revoke@invalid.local');await f.join(a);let s=await socket(f,a);
  f.profiles.set(a.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});assert.equal((await f.join(a)).status,403);await wait(()=>s.ws.readyState===3);
  f.profiles.set(a.id,{kind:'student',eligible:true,age:12,gradeLevel:7,classId:17});await f.join(a);s=await socket(f,a);
  f.failLookup(true);assert.equal((await f.join(a)).status,503);await wait(()=>s.ws.readyState===3);f.failLookup(false);
  await f.join(a);s=await socket(f,a);f.advance(45001);await wait(()=>s.ws.readyState===3);assert.equal(f.rooms.leases.size,0);
});
test('upgrade requires the same-origin opaque cookie and current generation, never a token in the URL',async t=>{
  const f=await fixture(t),a=await f.actor('piano-cookie@invalid.local');await f.join(a);
  await assert.rejects(()=>socket(f,a,{origin:'https://foreign.invalid'}),error=>error.status===403);
  await assert.rejects(()=>socket(f,a,{headers:{}}),error=>error.status===401);
  await assert.rejects(()=>socket(f,{...a,context:{...a.context,generation:'f'.repeat(24)}}),error=>error.status===409);
  const sa=await socket(f,a);await assert.rejects(()=>socket(f,a),error=>error.status===409);sa.ws.close();await wait(()=>sa.ws.readyState===3);
  assert.equal((await f.join(a,{mode:'practice'})).status,200);await assert.rejects(()=>socket(f,a),error=>error.status===403);
});
test('renewal is stable; account takeover and practice mode terminate the old shared connection',async t=>{
  const f=await fixture(t),a=await f.actor('piano-takeover@invalid.local');await f.join(a);let sa=await socket(f,a);sa.send({type:'down',note:64,velocity:90});
  await wait(()=>sa.latest().members[0].keys.length===1);const before=a.context.generation;assert.equal((await f.join(a)).value.generation,before);assert.equal(sa.ws.readyState,1);
  const other={...a,clientId:crypto.randomUUID()};assert.equal((await f.join(other)).value.error,'session_in_use');assert.equal(sa.ws.readyState,1);
  assert.equal((await f.join(other,{takeover:true})).status,200);await wait(()=>sa.ws.readyState===3);sa=await socket(f,other);
  assert.equal((await f.join(other,{mode:'practice'})).status,200);await wait(()=>sa.ws.readyState===3);assert.equal(f.rooms.rooms.get('musiksalon').members.size,0);
});
test('fresh staff moderation clears all held notes without handing pupils control over peers',async t=>{
  const f=await fixture(t),a=await f.actor('piano-moderate@invalid.local'),staff=await f.actor('piano-teacher@invalid.local','staff');await f.join(a);await f.join(staff);
  const s=await socket(f,a);s.send({type:'down',note:60,velocity:90});await wait(()=>s.latest().members[0].keys.length===1);
  assert.equal((await f.api(a,'panic',{clientId:a.clientId,roomId:'musiksalon'})).status,403);
  const n=f.calls;assert.equal((await f.api(staff,'panic',{clientId:staff.clientId,roomId:'musiksalon'})).status,200);assert.equal(f.calls,n+1);await wait(()=>s.latest().members[0].keys.length===0);
  assert.equal((await f.api(a,'leave',{clientId:a.clientId})).value.left,true);await wait(()=>s.ws.readyState===3);
});
