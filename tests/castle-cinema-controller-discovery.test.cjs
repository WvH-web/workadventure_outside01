'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {roomController}=require('../tools/check-cinema-live.cjs');

test('unready unrelated frames cannot stall discovery of the actual room controller',async()=>{
  const probes=[],pending={url:()=> 'https://foreign.invalid/player?secret=not-retained',evaluate:()=>new Promise(()=>{})};
  const actual={url:()=> 'about:srcdoc',evaluate:async(callback,id)=>{assert.equal(typeof callback,'function');return id==='kino';}};
  const never={url:()=> 'https://never.invalid/',evaluate:()=>{throw Error('Search must stop at its actual match');}};
  assert.equal(await roomController([pending,actual,never],'kino',{milliseconds:5,onProbe:probe=>probes.push(probe)}),actual);
  assert.equal(probes.length,2);assert.deepEqual(probes[0],{url:'https://foreign.invalid/player',timedOut:true,found:false});
  assert.equal(probes[1].found,true);
});

test('wrong rooms and navigation failures do not manufacture a room controller',async()=>{
  const wrong={url:()=> 'about:blank',evaluate:async()=>false},closed={url:()=> 'about:blank',evaluate:async()=>{throw Error('Detached frame');}};
  assert.equal(await roomController([wrong,closed],'kino',{milliseconds:5}),null);
});

test('the hidden cinema control frame uses explicit interval polling rather than animation-frame polling',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../tools/check-castle-cinema-sync-native.cjs'),'utf8');
  assert.match(source,/waitForFunction\(\(\)=>castleCinema\.dismissed&&!castleCinema\.website,undefined,\{polling:200,timeout:10000\}\)/);
});
