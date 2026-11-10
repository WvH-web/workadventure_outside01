'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {AdmissionGate}=require('../ops/castle-school/admission.cjs');
const key=value=>String(value).padStart(43,'x'),unavailable=error=>error.status===503&&error.code==='unavailable';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('bounded FIFO workers never exceed concurrency and releases are idempotent',async()=>{
 const gate=new AdmissionGate({concurrency:2,maxPending:4}),order=[];
 const a=await gate.acquire(key(1)),b=await gate.acquire(key(2));
 const c=gate.acquire(key(3)).then(release=>{order.push(3);return release;}),d=gate.acquire(key(4)).then(release=>{order.push(4);return release;});
 assert.equal(gate.active,2);assert.equal(gate.waiting.length,2);a();a();const cr=await c;
 assert.deepEqual(order,[3]);assert.equal(gate.active,2);b();const dr=await d;assert.deepEqual(order,[3,4]);cr();dr();gate.close();
 assert.equal(gate.active,0);assert.equal(gate.waiting.length,0);assert.equal(gate.counts.size,0);
});
test('one account cannot occupy the whole waiting room and overflow does not retain identity keys',async()=>{
 const gate=new AdmissionGate({concurrency:1,maxPending:2,maxPerKey:2}),a=await gate.acquire(key(1)),b=gate.acquire(key(1));
 await assert.rejects(gate.acquire(key(1)),error=>error.status===429&&error.retryAfter===1);
 const c=gate.acquire(key(2));await assert.rejects(gate.acquire(key(3)),unavailable);assert.equal(gate.counts.size,2);
 a();const br=await b;br();const cr=await c;cr();gate.close();assert.equal(gate.counts.size,0);
});
test('waiting deadlines are finite and a delayed timer cannot grant an expired entry',async()=>{
 let now=100;const gate=new AdmissionGate({concurrency:1,waitMs:20,now:()=>now}),a=await gate.acquire(key(1));
 const b=assert.rejects(gate.acquire(key(2)),unavailable);now+=21;a();await b;assert.equal(gate.active,0);assert.equal(gate.counts.size,0);gate.close();
 const timed=new AdmissionGate({concurrency:1,waitMs:15}),release=await timed.acquire(key(1));
 await assert.rejects(timed.acquire(key(2)),unavailable);release();timed.close();
});
test('cancelled waiters release their place, but cancelling active work cannot overrun upstream limits',async()=>{
 const gate=new AdmissionGate({concurrency:1,maxPending:1}),activeAbort=new AbortController(),a=await gate.acquire(key(1),{signal:activeAbort.signal});
 activeAbort.abort();assert.equal(gate.active,1);
 const abort=new AbortController(),b=assert.rejects(gate.acquire(key(2),{signal:abort.signal}),unavailable);abort.abort();await b;
 const c=gate.acquire(key(3));a();const release=await c;release();gate.close();assert.equal(gate.counts.size,0);
});
test('shutdown rejects only queued work and leaves no timers or keys once the worker finishes',async()=>{
 const gate=new AdmissionGate({concurrency:1}),a=await gate.acquire(key(1));const b=assert.rejects(gate.acquire(key(2)),unavailable);
 gate.close();gate.close();await b;await assert.rejects(gate.acquire(key(3)),unavailable);assert.equal(gate.active,1);a();
 assert.equal(gate.counts.size,0);assert.equal(gate.waiting.length,0);
});
test('aborted requests and invalid limits cannot create retained work',async()=>{
 for(const options of [{concurrency:0},{maxPending:1025},{maxPerKey:0},{waitMs:0},{now:1}])assert.throws(()=>new AdmissionGate(options));
 const gate=new AdmissionGate(),abort=new AbortController();abort.abort();await assert.rejects(gate.acquire(key(1),{signal:abort.signal}),unavailable);
 assert.throws(()=>gate.acquire('not-an-opaque-key'));assert.equal(gate.counts.size,0);gate.close();await tick();
});
