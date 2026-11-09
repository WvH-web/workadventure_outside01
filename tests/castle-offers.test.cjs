'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {IDS,validateOffers,offerDecision,offerMetadata,approvedRoomChange,target,schoolDay}=require('../ops/castle-school/offers.cjs');
const {createOfferLookup,createRoomLinkUpdater}=require('../ops/castle-school/catalog.cjs');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {offerCatalog,checkedCatalog}=require('./fixtures/castle-offers.cjs');
const now=Date.UTC(2026,10,9,12),clock=()=>now;
const student=(extra={})=>({version:1,kind:'student',eligible:true,age:16,gradeLevel:10,classId:17,checkedAt:now,...extra});
const staff=()=>student({kind:'staff',age:null,gradeLevel:null,classId:null});
const selected=patch=>checkedCatalog(now,{gamesarea01:patch})[2];
const opts={key:'c'.repeat(64),clock};

test('portal catalog is exact, complete, bounded and immutable',()=>{
  const catalog=checkedCatalog(now);assert.deepEqual(catalog.map(o=>o.id),IDS);assert.ok(Object.isFrozen(catalog));assert.ok(Object.isFrozen(catalog[0].rule));
  const invalid=[d=>{d.extra=true},d=>{d.checkedAt=now-10001},d=>{d.checkedAt=now+10001},d=>{d.offers.pop()},d=>{d.offers[1]=d.offers[0]},
    d=>{d.offers[0].rule.extra=true},d=>{d.offers[0].rule.id='gamesarea01'},d=>{d.offers[0].revision=0},d=>{d.offers[0].presentation='arbitrary'},
    d=>{d.offers[0].title=''},d=>{d.offers[0].targetUrl='javascript:alert(1)'},d=>{d.offers[0].targetUrl='https://together.deine-schule.com/'},
    d=>{d.offers[0].rule.classIds=[]},d=>{d.offers[0].rule.reviewed='true'},d=>{d.offers[0].rule.validUntil='2026-02-30'},
    d=>{d.offers[0].rule.validFrom='2028-01-01'},d=>{d.offers[0].rule.reviewedOrigin='https://games.example.test/not-an-origin'},
    d=>{d.offers[0].rule.reviewedPath='/room/../'}];
  for(const mutate of invalid){const data=offerCatalog(now);mutate(data);assert.throws(()=>validateOffers(data,now));}
});
test('launch rules combine age, grade, exact class, publication and current target',()=>{
  const offer=selected({});assert.equal(offerDecision(student(),offer,now).allowed,true);
  for(const extra of [{age:15},{age:19},{age:null},{gradeLevel:9},{gradeLevel:null},{classId:18},{eligible:false}])assert.equal(offerDecision(student(extra),offer,now).allowed,false);
  for(const patch of [{targetUrl:null},{rule:{published:false}},{rule:{reviewed:false}},{rule:{validUntil:null}},
    {rule:{validFrom:'2026-11-10'}},{rule:{validUntil:'2026-11-08'}},{targetUrl:'https://another.example.test/room/'},
    {targetUrl:'https://games.example.test/other/'},{targetUrl:'https://games.example.test/roomish'}])assert.equal(offerDecision(student(),selected(patch),now).allowed,false);
});
test('date boundaries use Berlin school time including DST, not the browser or UTC day',()=>{
  assert.equal(schoolDay(Date.UTC(2026,10,8,23,30)),'2026-11-09');assert.equal(schoolDay(Date.UTC(2026,6,8,22,30)),'2026-07-09');
  const offer=selected({rule:{validFrom:'2026-11-09',validUntil:'2026-11-09'}});
  assert.equal(offerDecision(student(),offer,Date.UTC(2026,10,8,22,59)).allowed,false);
  assert.equal(offerDecision(student(),offer,Date.UTC(2026,10,8,23,0)).allowed,true);
  assert.equal(offerDecision(student(),offer,Date.UTC(2026,10,9,22,59)).allowed,true);
  assert.equal(offerDecision(student(),offer,Date.UTC(2026,10,9,23,0)).allowed,false);
});
test('only explicitly named staff may preview drafts, expired or changed-provider offers',()=>{
  for(const patch of [{rule:{published:false}},{rule:{reviewed:false}},{rule:{validUntil:'2026-11-08'}},{targetUrl:'https://another.example.test/room/'}]){
    const offer=selected(patch);assert.deepEqual(offerDecision(staff(),offer,now),{allowed:true,mode:'preview'});
    assert.equal(offerDecision(student(),offer,now).allowed,false);
  }
  assert.equal(offerDecision(staff(),selected({rule:{published:false,staffPreview:false}}),now).allowed,false);
  assert.equal(offerDecision(staff(),selected({rule:{audiences:['student']}}),now).allowed,false);
  assert.equal(offerDecision(staff(),selected({targetUrl:null}),now).allowed,false);
});
test('provider floor includes explicit ports and cannot be overridden by class approval',()=>{
  for(const host of ['garticphone.com','www.garticphone.com','garticphone.com:8443']){
    const offer=selected({targetUrl:'https://'+host+'/de',rule:{minAge:0,reviewedOrigin:'https://'+host,reviewedPath:'/de'}});
    assert.equal(offerDecision(student({age:17}),offer,now).allowed,false);
  }
});
test('room updates stay in reviewed origin and prefix; preview only changes the current path room code',()=>{
  const offer=selected({});
  for(const url of ['https://games.example.test/room/?code=two','https://games.example.test/room/second#room'])assert.equal(approvedRoomChange(student(),offer,url,now),true);
  for(const url of ['https://other.example.test/room/','https://games.example.test/roomish','https://games.example.test/room/../other/','http://games.example.test/room/'])assert.equal(approvedRoomChange(student(),offer,url,now),false);
  const draft=selected({rule:{published:false,reviewedOrigin:null,reviewedPath:null}});
  assert.equal(approvedRoomChange(staff(),draft,'https://games.example.test/room/?code=new',now),true);
  assert.equal(approvedRoomChange(staff(),draft,'https://games.example.test/room/second',now),false);
  assert.equal(approvedRoomChange(student(),draft,'https://games.example.test/room/?code=new',now),false);
});
test('metadata never contains a target, identity or the actual age/class policy',()=>{
  const meta=offerMetadata(student(),selected({}),now);
  assert.deepEqual(Object.keys(meta).sort(),['allowed','id','mode','presentation','revision','status','title']);
  assert.equal(meta.status,'ready');assert.equal(offerMetadata(student(),selected({targetUrl:null}),now).status,'not_configured');
  assert.equal(offerMetadata(staff(),selected({rule:{published:false}}),now).status,'preview');
});
test('target parser excludes own origin, IP variants, credentials, path encoding and unsafe schemes',()=>{
  for(const value of ['http://games.example.test/','javascript:alert(1)','https://a:b@games.example.test/','https://127.1/','https://0x7f000001/',
    'https://[::1]/','https://together.deine-schule.com/','https://games.example.test/a%2fb','https://games.example.test/a\\b'])assert.equal(target(value),null,value);
  assert.equal(target('https://games.example.test/room/?code=a%2Fb#room').href,'https://games.example.test/room/?code=a%2Fb#room');
});
test('catalog metadata has at most a one-second shared cache; every launch requests fresh data',async()=>{
  let time=now,calls=0,url='https://games.example.test/room/?code=one';const requests=[];
  const lookup=createOfferLookup({...opts,clock:()=>time,fetcher:async(endpoint,options)=>{calls++;requests.push({endpoint,options});return Response.json(offerCatalog(time,{gamesarea01:{targetUrl:url}}));}});
  await Promise.all([lookup({fresh:false}),lookup({fresh:false})]);assert.equal(calls,1);
  url='https://games.example.test/room/?code=two';assert.match((await lookup({fresh:false}))[2].targetUrl,/one$/);
  assert.match((await lookup())[2].targetUrl,/two$/);assert.equal(calls,2);
  time+=1000;assert.match((await lookup({fresh:false}))[2].targetUrl,/two$/);assert.equal(calls,3);
  const {endpoint,options}=requests[0];assert.equal(endpoint,'https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_castle_offers.php');
  assert.equal(options.body,'{}');assert.equal(options.redirect,'error');assert.equal(options.headers['X-Castle-School-Key'],opts.key);
  assert.ok(!JSON.stringify(requests).includes('identifier'));assert.ok(!JSON.stringify(requests).includes('Authorization'));
});
test('invalidating while an old metadata request is pending cannot repopulate the cache',async()=>{
  let release,calls=0;const old=new Promise(resolve=>release=resolve);
  const lookup=createOfferLookup({...opts,fetcher:async()=>++calls===1?old:Response.json(offerCatalog(now,{gamesarea01:{title:'New title'}}))});
  const pending=lookup({fresh:false});lookup.invalidate();assert.equal((await lookup({fresh:false}))[2].title,'New title');
  release(Response.json(offerCatalog(now)));await pending;assert.equal((await lookup({fresh:false}))[2].title,'New title');assert.equal(calls,2);
});
test('catalog failures, stale responses and oversized data fail closed without a cached launch',async()=>{
  let failed=false;const lookup=createOfferLookup({...opts,fetcher:async()=>failed?new Response('bad',{status:500}):Response.json(offerCatalog(now))});
  await lookup({fresh:false});failed=true;await assert.rejects(lookup(),error=>error.code==='unavailable');
  for(const fetcher of [async()=>Response.json(offerCatalog(now-11000)),async()=>new Response(' '.repeat(33000),{headers:{'content-type':'application/json'}}),async()=>new Response('{}',{headers:{'content-type':'text/plain'}})])await assert.rejects(createOfferLookup({...opts,fetcher})(),error=>error.code==='unavailable');
});
test('catalog timeout and concurrent calls are bounded',async()=>{
  const lookup=createOfferLookup({...opts,timeout:20,concurrency:1,fetcher:async(_url,{signal})=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}))});
  const pending=assert.rejects(lookup());await assert.rejects(lookup());await pending;
});
test('moderator updates forward only a PIN and target to the exact legacy controller',async()=>{
  let request;const updater=createRoomLinkUpdater({fetcher:async(url,options)=>{request={url,options};return Response.json({board:'gamesarea01',target_url:'https://games.example.test/room/?code=two',message_type:'success'});}});
  await updater({resourceId:'gamesarea01',targetUrl:'https://games.example.test/room/?code=two',pin:'998877'});
  assert.equal(request.url,'https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum_open.php?board=gamesarea01&format=json');
  assert.deepEqual(request.options.headers,{'Content-Type':'application/x-www-form-urlencoded'});
  assert.deepEqual(Object.fromEntries(new URLSearchParams(request.options.body)),{target_url:'https://games.example.test/room/?code=two',pin:'998877'});
  assert.equal(request.options.redirect,'error');assert.ok(!request.url.includes('998877'));
});
test('a wrong PIN is an error even when the submitted URL already equals the stored URL',async()=>{
  const data={resourceId:'gamesarea01',targetUrl:'https://games.example.test/room/?code=one',pin:'998877'};
  for(const body of [{board:data.resourceId,target_url:data.targetUrl,message_type:'error'},
    {board:data.resourceId,target_url:data.targetUrl},{board:'wrong',target_url:data.targetUrl,message_type:'success'},
    {board:data.resourceId,target_url:'https://games.example.test/room/?code=old',message_type:'success'}]){
    const update=createRoomLinkUpdater({fetcher:async()=>Response.json(body)});await assert.rejects(update(data),error=>['wrong_pin','unavailable'].includes(error.code));
  }
});

async function serverFixture(run,{initialProfile=student(),patches={},getOffers:customOffers,updateRoomLink:customUpdate}={}){
  let profile=initialProfile,input=offerCatalog(now,patches),profileCalls=0,updates=0;const freshFlags=[];
  const getOffers=customOffers||Object.assign(async options=>{freshFlags.push(options.fresh);return validateOffers(input,now);},{invalidate:()=>{}});
  const server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret:'not-used',trustedProxyIps:[]},clock,
    verify:async auth=>{if(auth!=='Bearer synthetic')throw new (require('../ops/hall-audio/errors.cjs').GatewayError)(401,'unauthorized');return {identifier:'synthetic-school@invalid.local'};},
    lookup:async()=>{profileCalls++;return profile;},getOffers,
    updateRoomLink:customUpdate||(async data=>{updates++;input.offers.find(offer=>offer.id===data.resourceId).targetUrl=data.targetUrl;return {updated:true};})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/castle-school/';
  const request=async(route,body,extra={})=>{const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer synthetic',Origin:'https://together.deine-schule.com',...(body===undefined?{}:{'Content-Type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});return {response,body:await response.json()};};
  try{await run({base,request,input,setProfile:value=>{profile=value;},profileCalls:()=>profileCalls,updates:()=>updates,freshFlags});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
test('actual launches recheck profile and rule; an old successful context is not authority',async()=>serverFixture(async f=>{
  const context=await f.request('context');assert.equal(context.body.decisions.gamesarea01.allowed,true);assert.ok(!JSON.stringify(context.body).includes('https://'));
  const launch=await f.request('launch',{resourceId:'gamesarea01'});assert.equal(launch.response.status,200);assert.equal(launch.body.targetUrl,'https://games.example.test/room/?code=one');
  f.setProfile(student({age:15}));const denied=await f.request('launch',{resourceId:'gamesarea01'});assert.equal(denied.response.status,403);assert.deepEqual(denied.body,{error:'not_allowed'});
  f.setProfile(student());f.input.offers[2].rule.published=false;assert.equal((await f.request('launch',{resourceId:'gamesarea01'})).response.status,403);
  assert.deepEqual(f.freshFlags,[false,true,true,true]);assert.equal(f.profileCalls(),4);
}));
test('unknown pupils, drafts, missing links and client identity/class/URL overrides cannot launch',async()=>serverFixture(async f=>{
  for(const body of [{resourceId:'gamesarea01',allowed:true},{resourceId:'gamesarea01',age:99},{resourceId:'gamesarea01',targetUrl:'https://evil.example/'},{resourceId:'unknown'}])assert.equal((await f.request('launch',body)).response.status,400);
  assert.equal(f.profileCalls(),0);
  for(const id of ['gamesarea02','gamesarea03','stumbleguysgame'])assert.equal((await f.request('launch',{resourceId:id})).response.status,403);
  f.setProfile(student({kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null}));assert.equal((await f.request('launch',{resourceId:'gamesarea01'})).response.status,403);
}));
test('two participants resolve a new room immediately without a metadata refresh or page reload',async()=>serverFixture(async f=>{
  const first=await f.request('launch',{resourceId:'gamesarea01'});assert.match(first.body.targetUrl,/one$/);
  const update=await f.request('room-link',{resourceId:'gamesarea01',targetUrl:'https://games.example.test/room/?code=two',pin:'998877'});assert.deepEqual(update.body,{updated:true,checkedAt:now});
  const second=await f.request('launch',{resourceId:'gamesarea01'});assert.match(second.body.targetUrl,/two$/);assert.equal(f.updates(),1);
  assert.ok(!JSON.stringify(update.body).includes('998877'));assert.equal(update.response.headers.get('cache-control'),'no-store');
}));
test('moderator endpoint rejects a different provider, inactive identity and excessive attempts',async()=>serverFixture(async f=>{
  const body={resourceId:'gamesarea01',targetUrl:'https://games.example.test/room/?code=two',pin:'998877'};
  assert.equal((await f.request('room-link',{...body,targetUrl:'https://evil.example/'})).response.status,403);assert.equal(f.updates(),0);
  f.setProfile(student({eligible:false,age:null,gradeLevel:null,classId:null}));assert.equal((await f.request('room-link',body)).response.status,403);assert.equal(f.updates(),0);
  f.setProfile(student());for(let n=0;n<6;n++)assert.equal((await f.request('room-link',body)).response.status,200);
  assert.equal((await f.request('room-link',body)).response.status,429);assert.equal(f.updates(),6);
}));
test('fresh launch failures never fall back to previously allowed metadata or URL',async()=>{
  let down=false;await serverFixture(async f=>{
    assert.equal((await f.request('launch',{resourceId:'gamesarea01'})).response.status,200);down=true;
    const failure=await f.request('launch',{resourceId:'gamesarea01'});assert.equal(failure.response.status,503);assert.deepEqual(failure.body,{error:'unavailable'});
  },{getOffers:async()=>{if(down)throw Error('private upstream details');return checkedCatalog(now);}});
});
test('owned UI is same-origin framed with no media capture, no query bypass and no private file serving',async()=>serverFixture(async f=>{
  const page=await fetch(f.base+'games');assert.equal(page.status,200);assert.equal(page.headers.get('x-frame-options'),'SAMEORIGIN');
  assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self'/);assert.match(page.headers.get('permissions-policy'),/microphone=\(\), camera=\(\)/);
  assert.match(await page.text(),/Raumlink/);
  for(const path of ['games?token=x','rules.json','runtime.env','public/games.html'])assert.equal((await fetch(f.base+path)).status,404);
  assert.equal((await fetch(f.base+'games',{method:'POST'})).status,405);
  const script=await (await fetch(f.base+'games.js')).text();assert.doesNotMatch(script,/localStorage\.setItem|sessionStorage|keydown|keyup|parent\.|getUserMedia/);
}));
