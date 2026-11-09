'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const {validateProfile, validateRules, decision} = require('../ops/castle-school/policy.cjs');
const {createLookup} = require('../ops/castle-school/lookup.cjs');
const {createSchoolServer} = require('../ops/castle-school/server.cjs');
const {createVerifier} = require('../ops/hall-audio/auth.cjs');
const now = 1794196800000, clock = () => now;
const student = (extra = {}) => ({version:1,kind:'student',eligible:true,age:16,gradeLevel:10,classId:17,checkedAt:now,...extra});
const role = kind => student({kind,age:null,gradeLevel:null,classId:null});
const baseRule = {id:'game',published:true,audiences:['staff','student','parent'],staffPreview:true,minAge:16,maxAge:18,gradeLevels:[10,11],classIds:[17]};
const rule = extra => validateRules([{...baseRule,...extra}])[0];
const secret = 'synthetic-castle-school-test-secret-only-1234';

test('age, grade and exact class are independent server-side AND conditions', () => {
  const allowed = rule({}); assert.equal(decision(student(),allowed).allowed,true);
  for (const extra of [{age:15},{age:19},{age:null},{gradeLevel:9},{gradeLevel:null},{classId:18},{classId:null},{eligible:false}]) {
    assert.equal(decision(student(extra),allowed).allowed,false,JSON.stringify(extra));
  }
  assert.equal(decision(student({age:18,gradeLevel:11}),allowed).allowed,true);
});
test('missing birthdates never invent ages; unrestricted school-owned content need not require one', () => {
  assert.equal(decision(student({age:null}),rule({minAge:0,maxAge:null})).allowed,true);
  assert.equal(decision(student({age:null}),rule({minAge:0,maxAge:18})).allowed,false);
});
test('parents never borrow a child age or class and staff preview requires a fresh real staff role', () => {
  assert.equal(decision(role('parent'),rule({})).allowed,false);
  assert.equal(decision(role('parent'),rule({minAge:0,maxAge:null,gradeLevels:null,classIds:null})).allowed,true);
  assert.deepEqual(decision(role('staff'),rule({published:false})),{allowed:true,mode:'preview'});
  assert.equal(decision(role('staff'),rule({published:false,staffPreview:false})).allowed,false);
  assert.equal(decision(role('staff'),rule({audiences:['student']})).allowed,false);
  assert.equal(decision(student(),rule({published:false})).allowed,false);
  assert.equal(decision(role('parent'),rule({published:false})).allowed,false);
});
test('unknown, ambiguous and inactive school identities cannot acquire permissions', () => {
  for (const kind of ['unknown','ambiguous','student','staff','parent']) {
    const profile = {version:1,kind,eligible:false,age:null,gradeLevel:null,classId:null,checkedAt:now};
    validateProfile(profile,now); assert.equal(decision(profile,rule({})).allowed,false);
  }
});
test('profiles fail closed on stale, future, malformed, extra or contradictory data', () => {
  validateProfile(student(),now);
  for (const extra of [{checkedAt:now-10001},{checkedAt:now+10001},{age:'16'},{age:-1},{age:121},{gradeLevel:14},{classId:0},
    {classId:null},{name:'Never returned'},{birthdate:'2010-11-09'},{version:2},{kind:'administrator'},
    {kind:'parent'},{eligible:false}]) assert.throws(()=>validateProfile(student(extra),now));
});
test('rule configuration is exact and cannot silently ignore unknown constraints or empty lists', () => {
  for (const extra of [{minimumAge:18},{minAge:15.5},{minAge:-1},{maxAge:15},{gradeLevels:[]},{classIds:[]},
    {audiences:[]},{audiences:['guest']},{gradeLevels:[1,1]},{gradeLevels:[14]},{classIds:[0]},{published:'true'},
    {id:'../game'},{groups:[9]}]) assert.throws(()=>rule(extra));
  assert.throws(()=>validateRules([baseRule,baseRule]));
  const frozen=rule({});assert.ok(Object.isFrozen(frozen));assert.ok(Object.isFrozen(frozen.classIds));
});
test('all seven existing game resources start unapproved for students, not as assumed provider age approvals', () => {
  const rules=validateRules(JSON.parse(fs.readFileSync(require.resolve('../ops/castle-school/rules.json'))));
  assert.equal(rules.length,7);assert.ok(rules.some(r=>r.id==='haxballarea01'));assert.ok(rules.some(r=>r.id==='stumbleguysgame'));
  for(const r of rules){assert.equal(decision(student({age:25}),r).allowed,false);assert.equal(decision(role('staff'),r).mode,'preview');}
});

const lookupOptions={url:'https://www.deine-schule.com/workadventure-castle-context.php',key:'a'.repeat(64),clock};
test('each lookup is fresh and sends only a verified identifier to the exact internal endpoint', async () => {
  const requests=[];let allowed=true;
  const lookup=createLookup({...lookupOptions,fetcher:async(url,options)=>{
    requests.push({url,options});return Response.json(allowed?student():student({eligible:false,age:null,gradeLevel:null,classId:null}));
  }});
  assert.equal((await lookup('school@invalid.local')).eligible,true);allowed=false;
  assert.equal((await lookup('school@invalid.local')).eligible,false);assert.equal(requests.length,2);
  assert.deepEqual(JSON.parse(requests[0].options.body),{identifier:'school@invalid.local'});
  assert.equal(requests[0].options.redirect,'error');assert.equal(requests[0].options.headers['X-Castle-School-Key'],'a'.repeat(64));
  assert.ok(!JSON.stringify(requests[0]).includes('Authorization'));
  assert.throws(()=>createLookup({...lookupOptions,url:'https://example.invalid/lookup'}));
});
test('anonymous identifiers never cause a database lookup and never become school members', async () => {
  const lookup=createLookup({...lookupOptions,fetcher:()=>{throw Error('Must not fetch')}});
  for(const id of ['anonymous-id','a@b\n.example','a'.repeat(255)+'@invalid.local'])assert.equal((await lookup(id)).eligible,false);
});
test('upstream errors, redirects, old or oversized data never reuse a previous authorization', async () => {
  for(const fetcher of [async()=>{throw Error('private secret must not escape')},async()=>new Response('wrong',{status:500}),
    async()=>new Response('bad',{headers:{'content-type':'text/plain'}}),async()=>Response.json(student({checkedAt:now-10001})),
    async()=>new Response(' '.repeat(5000),{headers:{'content-type':'application/json'}})]) {
    const lookup=createLookup({...lookupOptions,fetcher});await assert.rejects(lookup('school@invalid.local'),e=>e.code==='unavailable'&&!e.message.includes('secret'));
  }
});
test('upstream timeouts abort, and concurrency is bounded without indefinite queuing', async () => {
  const lookup=createLookup({...lookupOptions,timeout:25,concurrency:1,fetcher:async(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}))});
  const pending=assert.rejects(lookup('one@invalid.local'),e=>e.code==='unavailable');
  await assert.rejects(lookup('two@invalid.local'),e=>e.code==='unavailable');await pending;
});

async function withServer(run,{lookup=async()=>student(),rules=[baseRule],verify,clock:serverClock=clock}={}) {
  const config={origin:'https://together.deine-schule.com',secret,trustedProxyIps:[]};
  const server=createSchoolServer({config,lookup,rules,clock:serverClock,verify:verify||createVerifier(secret,{clock:serverClock})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/castle-school/';
  const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
  const token=await new SignJWT({identifier:'school@invalid.local',username:'Private Test Name',tags:['teacher'],age:99,classId:17})
    .setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(serverClock()/1000)+3600).sign(new TextEncoder().encode(secret));
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:config.origin,'Sec-Fetch-Site':'same-origin'};
  try{await run({base,headers,token});}finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections()});}
}
test('HTTP exposes decisions only, not identity, age, birthday, class or tokens',async()=>withServer(async({base,headers,token})=>{
  const response=await fetch(base+'context',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.deepEqual(body,{account:{kind:'student',schoolAccount:true},decisions:{game:{allowed:true,mode:'participant'}},checkedAt:now});
  for(const privateValue of [token,'Private Test Name','school@invalid.local','birthdate','gradeLevel','classId','"age"'])assert.ok(!JSON.stringify(body).includes(privateValue));
  const r=await fetch(base+'decision',{method:'POST',headers,body:JSON.stringify({resourceId:'game'})});assert.equal(r.status,200);
  assert.equal(r.headers.get('permissions-policy'),'microphone=(), camera=(), display-capture=()');
}));
test('HTTP rejects missing, expired, forged and wrongly signed school tokens',async()=>withServer(async({base,headers,token})=>{
  for(const auth of [undefined,'Bearer malformed','Bearer '+token.slice(0,-8)+'wrongxxx']){
    const copy={...headers};if(auth)copy.Authorization=auth;else delete copy.Authorization;
    assert.equal((await fetch(base+'context',{headers:copy})).status,401);
  }
  const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
  const expired=await new SignJWT({identifier:'school@invalid.local'}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(now/1000)-1).sign(new TextEncoder().encode(secret));
  assert.equal((await fetch(base+'context',{headers:{...headers,Authorization:'Bearer '+expired}})).status,401);
}));
test('signed teacher tags and client-supplied ages or classes cannot overrule the database',async()=>{
  let current=student({eligible:false,age:null,gradeLevel:null,classId:null}),calls=0;
  await withServer(async({base,headers})=>{
    const first=await (await fetch(base+'context',{headers})).json();assert.equal(first.account.kind,'unverified');assert.equal(first.decisions.game.allowed,false);
    const body={resourceId:'game',age:99,classId:17,role:'staff'};
    assert.equal((await fetch(base+'decision',{method:'POST',headers,body:JSON.stringify(body)})).status,400);assert.equal(calls,1);
    current=role('staff');const second=await (await fetch(base+'context',{headers})).json();assert.equal(second.account.kind,'staff');assert.equal(calls,2);
    current=student({eligible:false,age:null,gradeLevel:null,classId:null});const third=await (await fetch(base+'context',{headers})).json();assert.equal(third.decisions.game.allowed,false);assert.equal(calls,3);
  },{lookup:async()=>{calls++;return current}});
});
test('HTTP rejects cross-origin, malformed bodies, wrong methods and URL/query token transport',async()=>withServer(async({base,headers})=>{
  for(const extra of [{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await fetch(base+'context',{headers:{...headers,...extra}})).status,403);
  assert.equal((await fetch(base+'context?token=never',{headers})).status,404);
  assert.equal((await fetch(base+'decision',{headers})).status,405);
  for(const body of ['[]','null','{','{}','{"resourceId":"other"}'])assert.equal((await fetch(base+'decision',{method:'POST',headers,body})).status,400);
  assert.equal((await fetch(base+'decision',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'})).status,415);
  assert.equal((await fetch(base+'decision',{method:'POST',headers,body:JSON.stringify({resourceId:'x'.repeat(5000)})})).status,413);
}));
test('HTTP fails closed after an upstream failure and returns a bounded retry signal',async()=>{
  let down=false;await withServer(async({base,headers})=>{
    assert.equal((await fetch(base+'context',{headers})).status,200);down=true;
    const failed=await fetch(base+'context',{headers});assert.equal(failed.status,503);assert.equal(failed.headers.get('retry-after'),'3');
    assert.deepEqual(await failed.json(),{error:'unavailable'});
  },{lookup:async()=>{if(down)throw Error('sensitive database details');return student()}});
});
test('per-identity limits cannot be bypassed by spoofed forwarding headers',async()=>withServer(async({base,headers})=>{
  for(let i=0;i<90;i++)assert.equal((await fetch(base+'context',{headers:{...headers,'X-Real-IP':'10.0.0.'+i}})).status,200);
  const r=await fetch(base+'context',{headers});assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');
}));
test('rate windows expire and retain only short-lived process-salted opaque identifiers',async()=>{
  const source=fs.readFileSync(require.resolve('../ops/castle-school/server.cjs'),'utf8');
  assert.match(source,/randomBytes\(32\)/);assert.match(source,/createHmac\('sha256',rateSalt\)/);
  assert.match(source,/setInterval\(sweep,1000\)/);assert.match(source,/clearInterval\(sweeper\);limits.clear\(\)/);
  assert.doesNotMatch(source,/limit\('id:'\s*\+\s*auth.identifier/);
  let current=now;await withServer(async({base,headers})=>{
    for(let i=0;i<90;i++)assert.equal((await fetch(base+'context',{headers})).status,200);
    assert.equal((await fetch(base+'context',{headers})).status,429);current+=60001;
    assert.equal((await fetch(base+'context',{headers})).status,200);
  },{clock:()=>current,lookup:async()=>student({checkedAt:current})});
});
