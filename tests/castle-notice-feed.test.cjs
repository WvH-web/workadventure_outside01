const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const load = () => import('data:text/javascript;base64,' + fs.readFileSync(path.join(__dirname,'../castle/notice-feed.js')).toString('base64'));
const stamp = Date.parse('2026-11-10T12:00:00Z');
const item = {id:1,title:'Leserunde',body:'Gemeinsam im Schloss',expiresAt:'2026-11-10T12:01:00Z',eventStart:null,eventEnd:null};
const payload = (items=[item]) => ({version:1,checkedAt:stamp,items});
const response = value => new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json; charset=utf-8'}});
test('accepts only bounded public notice contracts',async()=>{
  const {validateNotices}=await load();assert.deepEqual(validateNotices(payload()),payload());
  for(const value of [null,{...payload(),checkedAt:'now'},{...payload(),version:2},payload([{...item,id:0}]),payload([item,item]),payload([{...item,title:''}]),payload([{...item,expiresAt:'tomorrow'}]),payload([{...item,expiresAt:'2026-02-30T12:00:00Z'}]),payload([{...item,eventEnd:'2026-11-10T13:00:00Z'}]),payload([{...item,body:'x'.repeat(1201)}])])assert.throws(()=>validateNotices(value));
});
test('monotonic expiry uses server time, not device date or delayed transit',async()=>{
  const {NoticeFeed}=await load();let clock=100;
  const feed=new NoticeFeed({clock:()=>clock,fetcher:async(_url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');clock+=500;return response(payload());}});
  await feed.refresh();assert.equal(feed.current().length,1);clock+=59499;assert.equal(feed.current().length,1);clock++;assert.equal(feed.current().length,0);feed.dispose();
});
test('withdrawal replaces the visible list without reloading',async()=>{
  const {NoticeFeed}=await load();let value=payload();const feed=new NoticeFeed({clock:()=>100,fetcher:async()=>response(value)});
  await feed.refresh();assert.equal(feed.current().length,1);value=payload([]);await feed.refresh();assert.deepEqual(feed.current(),[]);assert.equal(feed.available,true);feed.dispose();
});
test('errors clear old scheduled announcements rather than displaying a withdrawn copy',async()=>{
  const {NoticeFeed}=await load();let fail=false;const feed=new NoticeFeed({fetcher:async()=>{if(fail)throw Error('offline');return response(payload());}});
  await feed.refresh();assert.equal(feed.current().length,1);fail=true;await feed.refresh();assert.deepEqual(feed.current(),[]);assert.equal(feed.available,false);feed.dispose();
});
test('late older responses cannot restore withdrawn announcements',async()=>{
  const {NoticeFeed}=await load();let resolve;const feed=new NoticeFeed({fetcher:()=>new Promise(done=>{resolve=done;})});
  const first=feed.refresh(),old=resolve,second=feed.refresh();resolve(response(payload([])));await second;old(response(payload()));await first;assert.deepEqual(feed.current(),[]);feed.dispose();
});
test('dispose blocks a late response',async()=>{
  const {NoticeFeed}=await load();let resolve;const feed=new NoticeFeed({fetcher:()=>new Promise(done=>{resolve=done;})});const pending=feed.refresh();feed.dispose();resolve(response(payload()));await pending;assert.equal(feed.available,false);assert.deepEqual(feed.current(),[]);
});
test('formats school time explicitly across the daylight-saving change',async()=>{
  const {eventLabel}=await load();assert.match(eventLabel({...item,eventStart:'2027-07-10T11:00:00Z'}),/13:00.*Schulzeit/);assert.match(eventLabel({...item,eventStart:'2026-11-10T12:00:00Z'}),/13:00/);assert.equal(eventLabel(item),'');
});
