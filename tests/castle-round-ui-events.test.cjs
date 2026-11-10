'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../ops/castle-school/public/unowned-ui.js'),'utf8');
function fixture(top=false){const listeners=[],host={addEventListener:(...args)=>listeners.push(args)};host.parent=top?host:{};
  vm.runInNewContext(source,{window:host,location:{origin:'https://together.deine-schule.com'}});assert.equal(listeners.length,1);assert.equal(listeners[0][0],'message');assert.equal(listeners[0][2],true);
  let stopped=0;return {host,send:change=>{listeners[0][1]({source:host.parent,origin:'https://together.deine-schule.com',data:{type:'buttonClickedEvent'},stopImmediatePropagation:()=>stopped++,...change});return stopped;}};}
test('the early round-helper guard suppresses only popup clicks from its own trusted parent',()=>{
  const f=fixture();assert.equal(f.send({}),1);for(const change of [{source:{}},{origin:'https://other.invalid'},{data:{type:'setPlayerVariable'}},{data:{type:'getState'}},{data:null}])assert.equal(f.send(change),1);
  assert.equal(fixture(true).send({}),0);
});
test('both helper documents load their guard before the native iframe API; other pages do not',()=>{
  const root=path.resolve(__dirname,'../ops/castle-school/public');for(const name of ['presence.html','rounds.html']){
    const html=fs.readFileSync(path.join(root,name),'utf8');assert.ok(html.indexOf('/castle-school/unowned-ui.js')>=0);assert.ok(html.indexOf('/castle-school/unowned-ui.js')<html.indexOf('/iframe_api.js'));
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root,'games.html'),'utf8'),/unowned-ui/);
});
