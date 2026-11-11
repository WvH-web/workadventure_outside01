'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),clientSource=fs.readFileSync(path.join(root,'ops/castle-school/public/round-client.js'),'utf8'),
  presenceSource=fs.readFileSync(path.join(root,'ops/castle-school/public/presence.js'),'utf8');
const ROUND='10000000-0000-4000-8000-000000000001',NONCE='10000000-0000-4000-8000-000000000002',LEASE='a'.repeat(48),OTHER='b'.repeat(48);
const origin='https://together.deine-schule.com',now=1800000000000;
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};}
function fixture(){
  const localStorage=storage(),sessionStorage=storage(),listeners=new Map(),timers=new Map(),calls=[],teleports=[],warnings=[];let sequence=0,time=now,fetcher;
  localStorage.setItem('authToken','synthetic-token');localStorage.setItem('localUser',JSON.stringify({uuid:'synthetic-account'}));
  const context=vm.createContext({localStorage,sessionStorage,URL,AbortController,location:{origin},console:{warn:value=>warnings.push(value)},
    Date:class extends Date{static now(){return time;}},Math:Object.assign(Object.create(Math),{random:()=>0}),
    window:{addEventListener:(key,callback)=>listeners.set(key,callback),removeEventListener:(key,callback)=>{if(listeners.get(key)===callback)listeners.delete(key);}},
    setTimeout:(callback,delay)=>{const id=++sequence;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    fetch:async(...args)=>{calls.push(args);return fetcher(...args);}});
  vm.runInContext(clientSource.replace(/\bexport /g,'')+'\nObject.assign(globalThis,{RoundClient,retryAfterMs,recoveryDeadline,recoveryDelay,LEASE_KEY,JOURNEY_KEY});',context);
  function answer(change={}){return {round:{id:ROUND},leaseId:LEASE,checkedAt:time,expiresAt:time+90000,destination:{mapId:'bibliothek',arrival:{x:100,y:100},bounds:{x:0,y:0,width:300,height:300},playUri:origin+'/~/castle-preview/bibliothek.wam#start'},...change};}
  const ok=value=>({ok:true,status:200,json:async()=>value,headers:{get:()=>null}});
  const error=(status,code='unavailable',retry='1')=>({ok:false,status,json:async()=>({error:code}),headers:{get:()=>retry}});
  function install(){
    context.WA={onInit:async()=>{},room:{getTiledMap:async()=>({properties:[{name:'castleMapId',value:'bibliothek'}]})},
      player:{state:{loadVariable:()=>null},teleport:async(...args)=>teleports.push(args),getPosition:async()=>({x:100,y:100}),onPlayerMove:()=>({unsubscribe:()=>{}})}};
    vm.runInContext(presenceSource.replace(/^import .*?;\r?\n/,''),context);
  }
  return {context,localStorage,sessionStorage,listeners,timers,calls,teleports,warnings,answer,ok,error,install,
    fetch:value=>fetcher=value,advance:value=>time+=value,
    client:()=>vm.runInContext('new RoundClient()',context),tick:()=>vm.runInContext('tick()',context),
    active:()=>vm.runInContext('current',context),delay:()=>[...timers.values()].at(-1)?.delay};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('Retry-After supports seconds and HTTP dates, bounded to two minutes',()=>{
  const {retryAfterMs:parse}=fixture().context;
  assert.equal(parse('3',now),3000);assert.equal(parse('999999999999999999',now),120000);
  assert.equal(parse(new Date(now+6000).toUTCString(),now),6000);
  for(const value of [undefined,null,{},'', 'not a date','3\n', 'x'.repeat(81),new Date(now-1000).toUTCString()])assert.equal(parse(value,now),0);
});

test('recovery has a finite last-confirmed deadline, backoff and spread; permanent decisions never retry',()=>{
  const {recoveryDelay:delay,recoveryDeadline:deadline}=fixture().context,error={code:'unavailable',status:503,retryAfterMs:3000};
  assert.equal(delay(error,now+90000,0,now,()=>0),3500);
  assert.equal(delay(error,now+90000,4,now,()=>0.999),9499);
  assert.equal(delay({...error,status:429,code:'rate_limited'},now+90000,1,now,()=>0),3500);
  for(const change of [{code:'not_allowed',status:403},{code:'stale_membership',status:409},{code:'unauthorized',status:401},{code:'cancelled'},{status:400}])assert.equal(delay({...error,...change},now+90000,0,now,()=>0),null);
  for(const end of [now,now-1,now+3500,now+120001,Infinity,NaN])assert.equal(delay(error,end,0,now,()=>0),null);
  for(const attempt of [-1,31,0.5])assert.equal(delay(error,now+90000,attempt,now,()=>0),null);
  assert.equal(delay(error,now+90000,0,now,()=>1),null);
  assert.equal(deadline({expiresAt:now+5000,confirmedUntil:now+10000},{createdAt:now-85000}),now+5000);
  assert.equal(deadline({expiresAt:now+5000},null),now+5000);
  assert.equal(deadline({expiresAt:NaN},null),0);
  assert.equal(deadline(null,{createdAt:now}),now+90000);
});

test('only matching fresh server answers renew the opaque lease, using server TTL not browser clock alignment',()=>{
  const f=fixture(),client=f.client();client.remember(f.answer({checkedAt:1000,expiresAt:91000}));
  assert.equal(client.lease().confirmedUntil,now+90000);f.advance(20000);
  assert.equal(client.confirmLease(LEASE,f.answer()),true);assert.equal(client.lease().confirmedUntil,now+110000);
  assert.throws(()=>client.confirmLease(LEASE,f.answer({leaseId:OTHER})),/unavailable/);
  client.remember(f.answer({leaseId:OTHER}));assert.equal(client.confirmLease(LEASE,f.answer()),false);assert.equal(client.lease().leaseId,OTHER);
  for(const change of [{checkedAt:undefined},{checkedAt:NaN},{expiresAt:now-1},{expiresAt:now+140001}])assert.throws(()=>client.remember(f.answer(change)),/unavailable/);
});

test('HTTP retry metadata is retained and numeric AbortError codes become unavailable, never an automatic request replay',async()=>{
  const f=fixture(),client=f.client();f.fetch(async()=>f.error(503));
  await assert.rejects(client.api('round-heartbeat',{leaseId:LEASE}),error=>error.code==='unavailable'&&error.status===503&&error.retryAfterMs===1000);
  f.fetch(async()=>{throw Object.assign(Error('Aborted'),{name:'AbortError',code:20});});
  await assert.rejects(client.api('round-create',{}),error=>error.code==='unavailable');assert.equal(f.calls.length,2);
  assert.equal(f.timers.size,0);client.dispose();
});

test('a canceled old-account request cannot reinstate a registration or retry it',async()=>{
  const f=fixture(),client=f.client();client.remember(f.answer());let release;
  f.fetch(()=>new Promise(resolve=>release=resolve));const pending=client.api('round-heartbeat',{leaseId:LEASE});
  f.localStorage.setItem('localUser',JSON.stringify({uuid:'different-synthetic-account'}));client.sync();release(f.ok(f.answer()));
  await assert.rejects(pending,error=>error.code==='cancelled');assert.equal(client.lease(),null);assert.equal(f.calls.length,1);
});

test('presence retries only a fresh confirmation after transient overload, renews expiry, and makes no cached teleport',async()=>{
  const f=fixture(),client=f.client();client.remember(f.answer());f.install();await flush();f.fetch(async()=>f.error(503));
  await f.tick();assert.equal(client.lease().leaseId,LEASE);assert.equal(f.active(),null);assert.equal(f.delay(),1500);assert.deepEqual(f.teleports,[]);
  f.advance(1500);f.fetch(async()=>f.ok(f.answer()));await f.tick();
  assert.equal(client.lease().confirmedUntil,now+91500);assert.equal(f.active().mapId,'bibliothek');assert.equal(f.delay(),20000);
  assert.deepEqual(f.calls.map(([url])=>url),['/castle-school/round-heartbeat','/castle-school/round-heartbeat']);
});

test('server revocation after a transient lookup failure clears the client instead of recreating membership',async()=>{
  const f=fixture(),client=f.client();client.remember(f.answer());f.install();await flush();f.fetch(async()=>f.error(503));await f.tick();
  f.fetch(async()=>f.error(409,'stale_membership'));await f.tick();assert.equal(client.lease(),null);assert.equal(f.active(),null);
  assert.ok(f.calls.every(([url])=>url.endsWith('/round-heartbeat')));await f.tick();assert.equal(f.calls.length,2);
});

test('auth denials, expired deadlines and oversized retry hints clear both handles without cached movement',async()=>{
  for(const [status,code,hint,advance] of [[401,'unauthorized','1',0],[403,'not_allowed','1',0],[503,'unavailable','120',0],[503,'unavailable','1',90001]]){
    const f=fixture(),client=f.client();client.remember(f.answer());client.write(f.context.JOURNEY_KEY,{roundId:ROUND,nonce:NONCE,mode:'join',mapId:'bibliothek',sourceMap:'halle',createdAt:now});
    f.install();await flush();f.advance(advance);f.fetch(async()=>f.error(status,code,hint));await f.tick();
    assert.equal(client.lease(),null);assert.equal(f.sessionStorage.getItem(f.context.JOURNEY_KEY),null);assert.deepEqual(f.teleports,[]);
  }
});

test('uncounted visit confirmation can retry only within its existing journey window',async()=>{
  const f=fixture(),client=f.client();client.write(f.context.JOURNEY_KEY,{roundId:ROUND,nonce:NONCE,mode:'visit',mapId:'bibliothek',sourceMap:'halle',createdAt:now});
  f.install();await flush();f.fetch(async()=>f.error(503));await f.tick();assert.ok(client.journey());assert.equal(f.delay(),1500);assert.deepEqual(f.teleports,[]);
  f.fetch(async()=>f.ok(f.answer()));await f.tick();assert.equal(client.journey(),null);assert.equal(client.lease(),null);assert.equal(f.teleports.length,1);
  assert.ok(f.calls.every(([url])=>url.endsWith('/round-visit')));
});

test('leave failures are not recoverable and a late overload cannot clear a newer registration',async()=>{
  const f=fixture(),client=f.client();client.remember(f.answer());f.install();await flush();
  f.context.WA.player.getPosition=async()=>({x:8000,y:8000});
  f.fetch(async url=>url.endsWith('heartbeat')?f.ok(f.answer()):f.error(503));await f.tick();assert.equal(client.lease(),null);
  assert.deepEqual(f.calls.map(([url])=>url),['/castle-school/round-heartbeat','/castle-school/round-leave']);await f.tick();assert.equal(f.calls.length,2);
  client.remember(f.answer());let release;f.fetch(()=>new Promise(resolve=>release=resolve));const pending=f.tick();
  client.remember(f.answer({leaseId:OTHER}));release(f.error(503));await pending;assert.equal(client.lease().leaseId,OTHER);
});

test('page departure cancels pending confirmation without renewing, retrying or moving',async()=>{
  const f=fixture(),client=f.client();client.remember(f.answer());f.install();await flush();let release;
  f.fetch(()=>new Promise(resolve=>release=resolve));const pending=f.tick();f.listeners.get('pagehide')();release(f.ok(f.answer()));await pending;
  assert.equal(f.timers.size,0);assert.deepEqual(f.teleports,[]);assert.equal(f.active(),undefined);
});
