'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../tools/castle-game-host-stage.cjs'),'utf8');
const offers=require('../ops/castle-school/offers.cjs'),errors=require('../ops/hall-audio/errors.cjs');
function fixture(identifiers=['a@invalid.local','b@invalid.local']){
  let config,lookups=0,lookupOptions,listener,listen;
  const profile={version:1,kind:'student',eligible:true,age:13,gradeLevel:7,classId:17,checkedAt:Date.now()};
  const server={prependListener:(name,handler)=>{listener={name,handler};},listen:(port,host)=>{listen={port,host};}};
  const modules={
    '/srv/release/castle-school/server.cjs':{createSchoolServer:value=>{config=value;return server;}},
    '/srv/release/castle-school/lookup.cjs':{createLookup:value=>{lookupOptions=value;return async()=>{lookups++;return profile;};}},
    '/srv/release/castle-school/offers.cjs':offers,'/srv/release/hall-audio/errors.cjs':errors};
  vm.runInNewContext(source,{require:name=>{assert.ok(Object.hasOwn(modules,name));return modules[name];},
    process:{env:{SECRET_KEY:'synthetic-only',CASTLE_SCHOOL_LOOKUP_KEY:'fixture-only',CASTLE_TEST_IDENTIFIERS:JSON.stringify(identifiers)},once:()=>{}},
    console:{log:()=>{}},Date,Set,JSON});
  return {config,profile,lookups:()=>lookups,lookupOptions,listener,listen};
}
test('native preflight restricts the real school lookup to exactly two approved accounts without replacing their profiles',async()=>{
  const f=fixture();assert.equal(f.config.config.origin,'https://together.deine-schule.com');
  assert.equal(f.lookupOptions.url,'https://www.deine-schule.com/workadventure-castle-context.php');
  await assert.rejects(()=>f.config.lookup('other@invalid.local'),error=>error.status===403);assert.equal(f.lookups(),0);
  assert.equal(await f.config.lookup('a@invalid.local'),f.profile);assert.equal(f.lookups(),1);
  assert.deepEqual(f.listen,{port:3211,host:'0.0.0.0'});
});
test('a missing, duplicated, broadened or noncanonical native test account list fails before starting',()=>{
  for(const ids of [null,[],['a@invalid.local'],['a@invalid.local','a@invalid.local'],['a@invalid.local','b@invalid.local','c@invalid.local'],
    ['A@invalid.local','b@invalid.local'],['a@invalid.local','not-an-email']])assert.throws(()=>fixture(ids));
});
test('the preflight has one clearly synthetic catalog and updater, no live provider or portal request',async()=>{
  const f=fixture(),catalog=await f.config.getOffers();assert.equal(catalog.length,7);
  assert.deepEqual(catalog.filter(offer=>offer.rule.published).map(offer=>offer.id),['gamesarea01']);
  assert.equal(catalog.find(offer=>offer.id==='gamesarea01').targetUrl,'https://games.example.test/room/?code=one');
  await assert.rejects(()=>f.config.updateRoomLink({resourceId:'gamesarea01',pin:'wrong',targetUrl:'https://games.example.test/room/?code=two'}),error=>error.status===403);
  assert.equal((await f.config.getOffers()).find(offer=>offer.id==='gamesarea01').targetUrl,'https://games.example.test/room/?code=one');
  await f.config.updateRoomLink({resourceId:'gamesarea01',pin:'998877',targetUrl:'https://games.example.test/room/?code=two'});
  assert.equal((await f.config.getOffers()).find(offer=>offer.id==='gamesarea01').targetUrl,'https://games.example.test/room/?code=two');
  const headers={};f.listener.handler({}, {setHeader:(name,value)=>{headers[name]=value;}});
  assert.deepEqual(headers,{'X-Castle-Test-Catalog':'synthetic-loopback-only'});assert.equal(f.lookups(),0);
});
