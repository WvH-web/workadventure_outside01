'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const storage=require('../tools/castle-local-storage.cjs');
const base=process.platform==='win32'?storage.outputPath('storage-unit-fixtures'):os.tmpdir();
function fixture(t){
  const root=fs.mkdtempSync(path.join(base,'castle-storage-'));
  fs.writeFileSync(path.join(root,storage.MARKER),JSON.stringify({version:1,owner:storage.OWNER}));
  fs.mkdirSync(path.join(root,'temp'));
  t.after(()=>{assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(base));fs.rmSync(root,{recursive:true});});
  return root;
}
function run(root,changes={}){
  const id='run-'+crypto.randomUUID(),directory=path.join(root,'temp',id);fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory,storage.RUN_MARKER),JSON.stringify({version:1,owner:storage.OWNER,id,pid:1234567,createdAt:Date.now()-2*86400000,...changes}));
  fs.writeFileSync(path.join(directory,'disposable.txt'),'synthetic temporary data');return directory;
}
const inactive={isAlive:()=>false,isActive:()=>false};

test('outputs require a marked root and reject traversal and linked ancestors before writing',t=>{
  const root=fixture(t),options={root};assert.equal(storage.outputPath('group/proof',options),path.join(root,'output','group','proof'));
  for(const name of ['../foreign','/absolute','a//b','a/../b','a\\..\\b','x:drive'])assert.throws(()=>storage.outputPath(name,options));
  const keep=path.join(root,'keep');fs.mkdirSync(keep);fs.symlinkSync(keep,path.join(root,'output','linked'),'junction');
  assert.throws(()=>storage.outputPath('linked/must-not-exist',options),/junction/);assert.equal(fs.existsSync(path.join(keep,'must-not-exist')),false);
  fs.writeFileSync(path.join(root,storage.MARKER),'{}');assert.throws(()=>storage.outputPath('foreign',options),/Unowned/);
});

test('only old stopped owned runs are removed; output evidence is never swept',t=>{
  const root=fixture(t),directory=run(root),output=storage.outputPath('retained-proof',{root});fs.writeFileSync(path.join(output,'result.json'),'{}');
  assert.equal(storage.cleanRun(directory,{root,...inactive}),true);assert.equal(fs.existsSync(directory),false);
  assert.equal(fs.existsSync(path.join(output,'result.json')),true);assert.throws(()=>storage.cleanRun(output,{root,...inactive}),/outside/);
});

test('live owners, active browser paths and recent abandoned runs are retained',t=>{
  const root=fixture(t),old=run(root),recent=run(root,{createdAt:Date.now()});
  assert.equal(storage.cleanRun(old,{root,isAlive:()=>true,isActive:()=>false}),false);
  assert.equal(storage.cleanRun(old,{root,isAlive:()=>false,isActive:()=>true}),false);
  assert.equal(storage.cleanRun(recent,{root,...inactive}),false);
  assert.equal(fs.existsSync(old),true);assert.equal(fs.existsSync(recent),true);
});

test('a completed current run may clean up immediately, but never while its browser remains active',t=>{
  const root=fixture(t),directory=run(root,{pid:process.pid,createdAt:Date.now()});
  assert.equal(storage.cleanRun(directory,{root,own:true,isActive:()=>true}),false);
  assert.equal(storage.cleanRun(directory,{root,own:true,isActive:()=>false}),true);
});

test('foreign markers, links and future dates refuse cleanup rather than deleting outside data',t=>{
  const root=fixture(t),foreign=run(root,{owner:'another-project'}),future=run(root,{createdAt:Date.now()+120000}),linked=run(root),keep=path.join(root,'keep');
  fs.mkdirSync(keep);fs.writeFileSync(path.join(keep,'important.txt'),'keep');fs.symlinkSync(keep,path.join(linked,'linked'),'junction');
  for(const directory of [foreign,future,linked])assert.throws(()=>storage.cleanRun(directory,{root,...inactive}));
  assert.equal(fs.readFileSync(path.join(keep,'important.txt'),'utf8'),'keep');
});

test('sweeping skips unmarked and unsafe entries while cleaning an eligible run',t=>{
  const root=fixture(t),old=run(root);run(root,{owner:'foreign'});fs.mkdirSync(path.join(root,'temp','unmarked'));
  const result=storage.sweep({root,...inactive});assert.deepEqual(result,{removed:1,skipped:2});assert.equal(fs.existsSync(old),false);
});
