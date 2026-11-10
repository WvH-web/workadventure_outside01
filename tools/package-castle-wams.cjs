'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ids=require('./castle-map-ids.cjs'),{createWam}=require('./castle-wam.cjs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'castle'),archive=path.resolve(root,'../output/wvh-castle-preview-wams.zip');
for(const id of ids){const map=JSON.parse(fs.readFileSync(path.join(directory,id+'.tmj'),'utf8'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,id+'.wam'),'utf8')),createWam(map));}
execFileSync('tar',['-a','-cf',archive,...ids.map(id=>id+'.wam')],{cwd:directory,stdio:'inherit'});
console.log(JSON.stringify({nativeWrappers:ids.length,onlySeparateCastlePreview:true}));
