'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const secret='synthetic-school-identity-secret',opaque='opaque-provider-subject-not-a-mail',access='opaque-microsoft-access-token-never-decode';
const upn='synthetic-pupil@invalid.local',user={id:'01234567-89ab-cdef-0123-456789abcdef',userPrincipalName:upn};
const code=value=>error=>error.code===value;
async function token(payload={},key=secret){return 'Bearer '+await new SignJWT({identifier:opaque,accessToken:access,tags:['teacher'],...payload}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(key));}
function response(value=user){return new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});}
test('opaque Microsoft subjects resolve through the fixed authenticated Graph endpoint, not browser names or roles',async()=>{
  let seen;const verify=createSchoolVerifier(secret,{fetcher:async(url,options)=>{seen={url,options};return response();}}),value=await verify(await token({username:'different@invalid.local',email:'spoof@invalid.local'}));
  assert.equal(value.identifier,opaque);assert.equal(value.schoolIdentifier,upn);assert.ok(value.expiresAt>Date.now());
  assert.equal(seen.url,'https://graph.microsoft.com/v1.0/me?$select=id,userPrincipalName');assert.equal(seen.options.redirect,'error');assert.equal(seen.options.headers.Authorization,'Bearer '+access);
  assert.deepEqual(Object.keys(value).sort(),['expiresAt','identifier','name','schoolIdentifier','tags']);assert.equal(JSON.stringify(value).includes(access),false);
});
test('the WorkAdventure signature is verified before any provider request',async()=>{
  let calls=0;const verify=createSchoolVerifier(secret,{fetcher:async()=>{calls++;return response();}});
  await assert.rejects(verify(await token({},'not-the-key')),code('unauthorized'));assert.equal(calls,0);
});
test('signed legacy email identities remain supported and unknown subjects do not invent a school email',async()=>{
  let calls=0;const verify=createSchoolVerifier(secret,{fetcher:async()=>{calls++;return response();}});
  assert.equal((await verify(await token({identifier:'Legacy@invalid.local'}))).schoolIdentifier,'legacy@invalid.local');
  for(const accessToken of [undefined,'','bad\r\nheader','x'.repeat(16385)])assert.equal((await verify(await token({accessToken,email:upn}))).schoolIdentifier,'');assert.equal(calls,0);
});
test('short identity-only cache is bounded, expires and coalesces concurrent requests without caching school permissions',async()=>{
  let now=Date.now(),calls=0;let release,started;const blocker=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>started=resolve),header=await token();
  const verify=createSchoolVerifier(secret,{clock:()=>now,fetcher:async()=>{calls++;started();await blocker;return response();}});
  const first=verify(header),second=verify(header);await entered;assert.equal(calls,1);release();await first;await second;await verify(header);assert.equal(calls,1);
  now+=30001;await verify(header);assert.equal(calls,2);
});
test('the identity cache cannot mix independent access tokens or grow beyond its limit',async()=>{
  let calls=0;const verify=createSchoolVerifier(secret,{maxEntries:1,fetcher:async()=>{calls++;return response();}});
  await verify(await token());await assert.rejects(verify(await token({accessToken:access+'-other'})),code('unavailable'));assert.equal(calls,1);
});
for(const [label,reply,expected]of [
  ['expired provider token',()=>new Response('{}',{status:401}),'unauthorized'],
  ['provider denial',()=>new Response('{}',{status:403}),'unauthorized'],
  ['provider throttle',()=>new Response('{}',{status:429}),'unavailable'],
  ['HTML instead of profile',()=>new Response('<html/>',{headers:{'Content-Type':'text/html'}}),'unavailable'],
  ['oversized profile',()=>response({...user,extra:'x'.repeat(5000)}),'unavailable'],
  ['display name instead of principal',()=>response({id:user.id,mail:upn,displayName:upn}),'unavailable'],
  ['invalid principal',()=>response({...user,userPrincipalName:'not-an-email'}),'unavailable'],
  ['missing object id',()=>response({userPrincipalName:upn}),'unavailable'],
  ['provider network error',()=>{throw Error('private-provider-diagnostics');},'unavailable'],
])test(label+' fails closed without disclosing provider details',async()=>{
  const verify=createSchoolVerifier(secret,{fetcher:async()=>reply()});await assert.rejects(verify(await token()),error=>error.code===expected&&!String(error).includes('private-provider'));
});
test('provider timeouts abort the request and do not become a successful cache entry',async()=>{
  let calls=0;const verify=createSchoolVerifier(secret,{timeout:20,fetcher:async(_url,{signal})=>{calls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout'))));}});
  await assert.rejects(verify(await token()),code('unavailable'));await assert.rejects(verify(await token()),code('unavailable'));assert.equal(calls,2);
});
test('a synchronous provider failure does not poison the pending-request map',async()=>{
  let calls=0;const verify=createSchoolVerifier(secret,{fetcher:()=>{calls++;throw Error('provider failed synchronously');}}),header=await token();
  await assert.rejects(verify(header),code('unavailable'));await assert.rejects(verify(header),code('unavailable'));assert.equal(calls,2);
});
