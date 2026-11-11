'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const managed=require('../tools/castle-local-storage.cjs'),legacy=require('../tools/castle-legacy-storage.cjs');
const base=process.platform==='win32'?managed.outputPath('legacy-storage-unit-fixtures'):os.tmpdir();
function fixture(t){
  const root=fs.mkdtempSync(path.join(base,'legacy-'));fs.mkdirSync(path.join(root,'source'));fs.mkdirSync(path.join(root,'target'));
  t.after(()=>{assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(base));fs.rmSync(root,{recursive:true});});return root;
}
function seed(root){const source=path.join(root,'source','sample');fs.mkdirSync(source);fs.mkdirSync(path.join(source,'empty'));fs.writeFileSync(path.join(source,'item.png'),'synthetic bytes');return source;}

test('hardlink allocation is credited only once and only if every link is removed',t=>{
  const root=fixture(t),a=path.join(root,'a'),b=path.join(root,'b');fs.writeFileSync(a,Buffer.alloc(8192,7));fs.linkSync(a,b);
  assert.equal(legacy.allocation([a]).lastLinkAllocatedBytes,0);assert.equal(legacy.allocation([a]).sharedFilesNotCredited,1);
  assert.equal(legacy.allocation([a,b]).lastLinkAllocatedBytes,Number(fs.statSync(a,{bigint:true}).blocks*512n));
  assert.equal(legacy.allocation([a,b]).uniqueFiles,1);assert.throws(()=>legacy.allocation([a,a]),/Duplicate/);
});

test('verified migration preserves all files, empty directories and the original path without a C duplicate',t=>{
  const root=fixture(t),source=seed(root),sourceBase=path.dirname(source),targetBase=path.join(root,'target');
  const result=legacy.relocate(sourceBase,'sample',targetBase,{minAgeMs:0});assert.equal(result.fullHashComparison,true);assert.equal(result.originalPathUsable,true);
  assert.equal(fs.readFileSync(path.join(source,'item.png'),'utf8'),'synthetic bytes');assert.ok(fs.statSync(path.join(source,'empty')).isDirectory());
  assert.equal(fs.lstatSync(source).isSymbolicLink(),true);assert.equal(fs.readdirSync(sourceBase).length,1);
  assert.equal(legacy.relocate(sourceBase,'sample',targetBase).alreadyOnD,true);
});

test('a recent, protected or linked source is refused before copying',t=>{
  const root=fixture(t),source=seed(root),sourceBase=path.dirname(source),targetBase=path.join(root,'target');
  assert.throws(()=>legacy.relocate(sourceBase,'sample',targetBase),/recently/);assert.equal(fs.readdirSync(targetBase).length,0);
  fs.writeFileSync(path.join(source,'active.sqlite'),'keep');assert.throws(()=>legacy.relocate(sourceBase,'sample',targetBase,{minAgeMs:0}),/Protected/);
  assert.throws(()=>legacy.relocate(sourceBase,'../escape',targetBase,{minAgeMs:0}),/Invalid/);
});

test('a foreign destination is never overwritten and a changed retired copy is never deleted',t=>{
  const root=fixture(t),source=seed(root),sourceBase=path.dirname(source),targetBase=path.join(root,'target');
  fs.mkdirSync(path.join(targetBase,'sample'));assert.throws(()=>legacy.relocate(sourceBase,'sample',targetBase,{minAgeMs:0}),/already exists/);
  fs.rmdirSync(path.join(targetBase,'sample'));
  assert.throws(()=>legacy.relocate(sourceBase,'sample',targetBase,{minAgeMs:0,beforeRemove:retired=>fs.writeFileSync(path.join(retired,'changed.txt'),'preserve')}),/changed/);
  const retired=fs.readdirSync(sourceBase).find(name=>name.startsWith('sample-retiring-'));assert.ok(retired);
  assert.equal(fs.readFileSync(path.join(sourceBase,retired,'changed.txt'),'utf8'),'preserve');assert.equal(fs.readFileSync(path.join(source,'item.png'),'utf8'),'synthetic bytes');
});
