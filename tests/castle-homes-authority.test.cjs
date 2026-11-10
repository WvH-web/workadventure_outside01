'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createHomeAuthority}=require('../ops/castle-homes/authority.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {SignJWT}=require(require.resolve('jose',{paths:[require('node:path').join(__dirname,'../ops/hall-audio')]}));
const key='b'.repeat(64),secret='synthetic-home-test-verifier-never-used-live',start=1794348000000;
const pupil=(id=7,grade=3,age=9)=>({sub:'wvh:student:'+id,role:'student',grade,age,moderator:false,read_only:false});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function fixture(run,options={}){
 let now=start;const identities=new Map([['a@invalid.local',pupil()],['b@invalid.local',pupil(8,7,13)]]),invalid=[],calls=[];
 let lookup=async id=>{calls.push(id);return identities.get(id)??null;};
 const verify=createSchoolVerifier(secret,{clock:()=>now,fetcher:async()=>{throw Error('No real Microsoft requests in this test');}});
 const authority=createHomeAuthority({key,verify,lookup:id=>lookup(id),clock:()=>now,onInvalid:sid=>invalid.push(sid),...options});
 async function header(id='a',exp=Math.floor(now/1000)+3600){return 'Bearer '+await new SignJWT({identifier:id+'@invalid.local',tags:['teacher'],username:'Private synthetic display name'})
  .setProtectedHeader({alg:'HS256'}).setExpirationTime(exp).sign(new TextEncoder().encode(secret));}
 function signed(subject,sid,{nonce=crypto.randomBytes(20).toString('hex'),timestamp=String(Math.floor(now/1000))}={}){
  const raw=JSON.stringify({subject,sid});return {raw,headers:{timestamp,nonce,signature:crypto.createHmac('sha256',key).update(timestamp+'\n'+nonce+'\n'+raw).digest('hex')}};
 }
 async function check(subject,sid,options){const request=signed(subject,sid,options),result=await authority.check(request.raw,request.headers);
  assert.equal(result.signature,crypto.createHmac('sha256',key).update(request.headers.nonce+'\n'+result.body).digest('hex'));return JSON.parse(result.body);}
 try{await run({authority,header,identities,calls,invalid,signed,check,clock:()=>now,advance:ms=>now+=ms,setLookup:fn=>lookup=fn});}finally{authority.close();}
}

test('real signed school identity creates protocol-compatible ownership, with no teacher authority from token tags',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header()),[encoded,signature]=grant.ticket.split('.'),claim=JSON.parse(Buffer.from(encoded,'base64url'));
 assert.equal(signature,crypto.createHmac('sha256',key).update(encoded).digest('hex'));
 assert.equal(claim.sub,'wvh:student:7');assert.equal(claim.role,'student');assert.equal(claim.moderator,false);assert.equal(claim.read_only,false);
 assert.equal(claim.iss,'wvh-portal');assert.equal(claim.aud,'sternenhueter');assert.equal(claim.sid,grant.sid);assert.ok(claim.exp<=Math.floor(f.clock()/1000)+90);
 assert.match(claim.alias,/^Schlossfreund [A-F0-9]{8}$/);assert.equal(JSON.stringify(claim).includes('@invalid.local'),false);assert.equal(JSON.stringify(claim).includes('Private'),false);
 assert.equal(grant.validUntil,start+45000);assert.equal(f.authority.valid(grant.sid),true);
 const active=await f.check(claim.sub,grant.sid);assert.equal(active.active,true);assert.equal(active.expires,start/1000+3600);
 f.advance(20000);const renewed=await f.authority.open(await f.header(),{previousSid:grant.sid});assert.equal(renewed.sid,grant.sid);assert.equal(renewed.validUntil,start+65000);
 assert.equal(JSON.parse(Buffer.from(renewed.ticket.split('.')[0],'base64url')).alias,claim.alias);
}));

test('every renewal and introspection rereads role, grade and unknown age; withdrawal immediately revokes this grant',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header());f.identities.set('a@invalid.local',pupil(7,7,null));
 const result=await f.check('wvh:student:7',grant.sid);assert.equal(result.grade,7);assert.equal(result.age,null);assert.equal(f.calls.length,2);
 f.identities.set('a@invalid.local',null);assert.equal((await f.check('wvh:student:7',grant.sid)).active,false);
 assert.equal(f.authority.valid(grant.sid),false);assert.deepEqual(f.invalid,[grant.sid]);
 assert.equal((await f.check('wvh:student:7',grant.sid)).active,false);assert.equal(f.calls.length,3);
}));

test('forged, expired and replayed private requests cannot consult school records or extend the browser lease',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header()),request=f.signed('wvh:student:7',grant.sid);
 await assert.rejects(f.authority.check(request.raw,{...request.headers,signature:'0'.repeat(64)}),error=>error.status===403);assert.equal(f.calls.length,1);
 await f.authority.check(request.raw,request.headers);await assert.rejects(f.authority.check(request.raw,request.headers),error=>error.status===403);
 const stale=f.signed('wvh:student:7',grant.sid,{timestamp:String(start/1000-31)});await assert.rejects(f.authority.check(stale.raw,stale.headers),error=>error.status===403);
 assert.equal(f.calls.length,2);assert.equal((await f.check('wvh:student:8',grant.sid)).active,false);assert.equal(f.authority.valid(grant.sid),true);
 f.advance(45001);assert.equal(f.authority.valid(grant.sid),false);assert.equal((await f.check('wvh:student:7',grant.sid)).active,false);assert.deepEqual(f.invalid,[grant.sid]);
}));

test('account switching closes the former browser grant before a new school decision, without taking its inventory identity',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header());f.identities.set('b@invalid.local',null);
 await assert.rejects(f.authority.open(await f.header('b'),{previousSid:grant.sid}),error=>error.status===403);
 assert.equal(f.authority.valid(grant.sid),false);assert.deepEqual(f.invalid,[grant.sid]);
 f.identities.set('b@invalid.local',pupil(8,7,13));const second=await f.authority.open(await f.header('b'),{previousSid:grant.sid});
 assert.notEqual(second.sid,grant.sid);assert.equal(JSON.parse(Buffer.from(second.ticket.split('.')[0],'base64url')).sub,'wvh:student:8');
}));

test('an expired queued token never reaches the canonical school lookup',async()=>fixture(async f=>{
 const block=deferred(),entered=deferred();f.setLookup(async id=>{f.calls.push(id);if(id==='a@invalid.local'){entered.resolve();await block.promise;}return pupil();});
 const first=f.authority.open(await f.header());await entered.promise;
 const second=f.authority.open(await f.header('b',start/1000+2));const denied=assert.rejects(second,error=>error.status===401);
 f.advance(3000);block.resolve();await first;await denied;assert.deepEqual(f.calls,['a@invalid.local']);
},{admissionOptions:{concurrency:1}}));

test('late renewal cannot recreate a withdrawn grant or revoke a newer successful decision',async()=>fixture(async f=>{
 const original=await f.authority.open(await f.header()),block=deferred(),entered=deferred();let first=true;
 f.setLookup(async()=>{if(first){first=false;entered.resolve();await block.promise;return pupil();}return null;});
 const old=f.authority.open(await f.header(),{previousSid:original.sid});const oldRejected=assert.rejects(old,error=>error.status===403);await entered.promise;
 await assert.rejects(f.authority.open(await f.header(),{previousSid:original.sid}),error=>error.status===403);block.resolve();await oldRejected;
 assert.equal(f.authority.valid(original.sid),false);assert.deepEqual(f.invalid,[original.sid]);
 f.setLookup(async()=>pupil());const current=await f.authority.open(await f.header());const wait=deferred(),started=deferred();first=true;
 f.setLookup(async()=>{if(first){first=false;started.resolve();await wait.promise;return pupil(7,3,9);}return pupil(7,7,13);});
 const obsolete=f.authority.open(await f.header(),{previousSid:current.sid});const obsoleteRejected=assert.rejects(obsolete,error=>error.status===403);await started.promise;
 const latest=await f.authority.open(await f.header(),{previousSid:current.sid});wait.resolve();await obsoleteRejected;
 assert.equal(f.authority.valid(latest.sid),true);assert.equal((await f.check('wvh:student:7',latest.sid)).grade,7);
}));

test('failed lookups, cancellation and shutdown cannot publish late grants',async()=>fixture(async f=>{
 const original=await f.authority.open(await f.header());f.setLookup(async()=>{throw Error('Private backend detail');});
 await assert.rejects(f.authority.open(await f.header(),{previousSid:original.sid}));assert.equal(f.authority.valid(original.sid),false);
 const abort=new AbortController(),entered=deferred(),wait=deferred();f.setLookup(async()=>{entered.resolve();await wait.promise;return pupil();});
 const pending=f.authority.open(await f.header(),{signal:abort.signal});const rejected=assert.rejects(pending);await entered.promise;abort.abort();wait.resolve();await rejected;
 assert.equal(f.invalid.length,1);f.authority.close();f.authority.close();await assert.rejects(f.authority.open(await f.header()),error=>error.status===503);
}));

test('only four device grants per account and a finite global pool are allowed; explicit departure frees a place',async()=>fixture(async f=>{
 const grants=[];for(let i=0;i<4;i++)grants.push(await f.authority.open(await f.header()));
 await assert.rejects(f.authority.open(await f.header()),error=>error.status===503);
 f.authority.revoke(grants[0].sid);const replacement=await f.authority.open(await f.header());assert.equal(f.authority.valid(replacement.sid),true);
 const other=await f.authority.open(await f.header('b'));assert.equal(f.authority.valid(other.sid),true);
}));

test('session validity has a two-hour hard ceiling and the signed login expiry can be shorter',async()=>fixture(async f=>{
 const long=await f.authority.open(await f.header('a',start/1000+86400));assert.equal((await f.check('wvh:student:7',long.sid)).expires,start/1000+7200);
 const short=await f.authority.open(await f.header('b',start/1000+20));assert.equal(short.validUntil,start+20000);
 f.advance(20001);assert.equal(f.authority.valid(short.sid),false);assert.equal(f.authority.valid(long.sid),true);
 f.advance(25000);f.authority.sweep();assert.equal(f.authority.valid(long.sid),false);
}));

test('the finite global grant pool cannot overwrite another pupil and an expired in-flight login cannot publish a grant',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header());await assert.rejects(f.authority.open(await f.header('b')),error=>error.status===503);
 assert.equal(f.authority.valid(grant.sid),true);f.authority.revoke(grant.sid);
 const entered=deferred(),wait=deferred();f.setLookup(async()=>{entered.resolve();await wait.promise;return pupil(8,7,13);});
 const pending=f.authority.open(await f.header('b',start/1000+2)),rejected=assert.rejects(pending,error=>error.status===401);
 await entered.promise;f.advance(3000);wait.resolve();await rejected;
 assert.equal(f.invalid.length,1);
},{maxGrants:1}));

test('a late older introspection cannot overwrite a newer verified grade or revoke its renewed grant',async()=>fixture(async f=>{
 const grant=await f.authority.open(await f.header()),entered=deferred(),wait=deferred();let first=true;
 f.setLookup(async()=>{if(first){first=false;entered.resolve();await wait.promise;return pupil(7,3,9);}return pupil(7,7,13);});
 const earlier=f.check('wvh:student:7',grant.sid);await entered.promise;
 await f.authority.open(await f.header(),{previousSid:grant.sid});wait.resolve();assert.equal((await earlier).grade,7);assert.equal(f.authority.valid(grant.sid),true);
}));

test('opaque Microsoft subjects use only the fixed provider-verified principal, never their token teacher tag or display name',async()=>{
 let graph=0,lookups=0;
 const verify=createSchoolVerifier(secret,{fetcher:async()=>{graph++;return new Response(JSON.stringify({id:'01234567-89ab-cdef-0123-012345678901',userPrincipalName:'pupil@invalid.local'}),{headers:{'Content-Type':'application/json'}});}});
 const authority=createHomeAuthority({key,verify,lookup:async identifier=>{assert.equal(identifier,'pupil@invalid.local');lookups++;return pupil();}});
 try{
  const authorization='Bearer '+await new SignJWT({identifier:'opaque-microsoft-subject',accessToken:'synthetic-provider-token-not-live',username:'teacher@invalid.local',tags:['teacher']})
   .setProtectedHeader({alg:'HS256'}).setExpirationTime('5m').sign(new TextEncoder().encode(secret));
  const result=await authority.open(authorization),claim=JSON.parse(Buffer.from(result.ticket.split('.')[0],'base64url'));
  assert.equal(claim.sub,'wvh:student:7');assert.equal(claim.moderator,false);assert.equal(graph,1);assert.equal(lookups,1);
 }finally{authority.close();}
});
