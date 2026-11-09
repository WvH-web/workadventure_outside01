import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeMapImagePassive} from '../castle/passive-image.js';
test('decoration configures only its own iframe and never traverses parent documents or asks for input or media access',()=>{
  const attrs={},frame={style:{transform:'scale(2)'},setAttribute:(k,v)=>attrs[k]=v};
  const view={frameElement:frame,get parent(){throw Error('No parent traversal')},get document(){throw Error('No document access')}};
  assert.equal(makeMapImagePassive(view),true);assert.deepEqual(frame.style,{transform:'scale(2)',pointerEvents:'none'});
  assert.equal(frame.tabIndex,-1);assert.equal(frame.inert,true);assert.deepEqual(attrs,{'aria-hidden':'true'});
  assert.equal(makeMapImagePassive(view),true);
  frame.style.pointerEvents='auto';assert.equal(frame.inert,true);assert.equal(frame.tabIndex,-1);
});
test('standalone and cross-origin pages fail closed instead of touching unrelated windows',()=>{
  assert.equal(makeMapImagePassive({frameElement:null}),false);
  assert.equal(makeMapImagePassive({get frameElement(){throw Error('cross origin')}}),false);
});
test('passive image documents use only external owned scripts and styles under the existing strict content policy',()=>{
  for(const name of ['npc-sprite','display']){
    const html=fs.readFileSync(new URL('../castle/'+name+'.html',import.meta.url),'utf8');
    assert.doesNotMatch(html,/<style|<script(?![^>]*\bsrc=)/i);assert.match(html,new RegExp(name+'\\.css'));assert.match(html,new RegExp(name+'\\.js'));
    const js=fs.readFileSync(new URL('../castle/'+name+'.js',import.meta.url),'utf8');assert.match(js,/makeMapImagePassive/);assert.doesNotMatch(js,/iframe_api|WA\.|localStorage|cookie|navigator/);
  }
});
