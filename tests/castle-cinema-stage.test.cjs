'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{EventEmitter}=require('node:events'),cp=require('node:child_process');
const {within,SOURCE_FILES,REMOTE_ASSETS,SOURCE_SHA,stop,snapshot,createMediaServer}=require('../tools/castle-cinema-stage.cjs');

test('cinema fixture copies only the reviewed public code and explicit libraries, never configuration or pupil data',()=>{
  assert.equal(new Set(SOURCE_FILES).size,SOURCE_FILES.length);
  assert.ok(SOURCE_FILES.includes('public/kino.php')&&SOURCE_FILES.includes('lib/override.php')&&SOURCE_FILES.includes('lib/age_gate.php'));
  assert.ok(SOURCE_FILES.every(name=>/^(public\/kino\.php|lib\/[a-z_]+\.php|public\/assets\/[a-z0-9.-]+)$/i.test(name)));
  assert.ok(!SOURCE_FILES.some(name=>/config\.php|\.env|\.sqlite|\.sql$|uploads/.test(name)));
  assert.match(SOURCE_SHA,/^[a-f0-9]{64}$/);
  assert.deepEqual(REMOTE_ASSETS,{'public/assets/bg_idle.png':'https://deutsche-online-schule.com/kino/public/assets/bg_idle.png'});
});

test('cinema scratch paths cannot escape into parent, root, or similarly prefixed directories',()=>{
  const base=path.resolve('synthetic-cinema-root');
  assert.equal(within(base,path.join(base,'app/kino.php')),path.join(base,'app/kino.php'));
  for(const target of [base,path.dirname(base),path.resolve(base,'../synthetic-cinema-root-foreign/file'),path.parse(base).root]){
    assert.throws(()=>within(base,target),assert.AssertionError);
  }
});

test('an unknown cinema source is rejected before a database or browser starts',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'cinema-source-'));
  try{
    for(const name of SOURCE_FILES){const target=path.join(base,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'synthetic, not the reviewed cinema');}
    assert.throws(()=>snapshot(base),/last verified cinema source/);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('fixture cleanup targets only its exact owned process handles and waits for termination',async()=>{
  const process=new EventEmitter();process.exitCode=null;process.signalCode=null;let killed=0;
  process.kill=()=>{killed++;queueMicrotask(()=>{process.exitCode=0;process.emit('close',0);});};
  await stop(process);assert.equal(killed,1);await stop(process);assert.equal(killed,1);await stop(undefined);
});

test('fixture CLI refuses absent marker/environment before making any database connection',()=>{
  const php=process.env.PHP_BIN||(process.platform==='win32'?'C:/xampp/php/php.exe':'php');
  const result=cp.spawnSync(php,[path.resolve(__dirname,'../tools/castle-cinema-fixture.php'),path.resolve('nonexistent-synthetic-root'),'initialize'],
    {env:{...process.env,CASTLE_CINEMA_FIXTURE:'0'},encoding:'utf8',windowsHide:true});
  assert.notEqual(result.status,0);assert.match(result.stderr+result.stdout,/Disposable CLI cinema fixture required/);
});

test('the synthetic film supports real byte ranges without exposing configuration or accepting authorization',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cinema-range-')),bytes=Buffer.from(Array.from({length:256},(_,index)=>index));
  fs.writeFileSync(path.join(directory,'sync-test-film.webm'),bytes);const server=createMediaServer(directory);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{
    const response=await fetch(base+'/sync-test-film.webm',{headers:{Range:'bytes=16-31'}});
    assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 16-31/256');
    assert.equal(response.headers.get('accept-ranges'),'bytes');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(16,32));
    assert.equal((await fetch(base+'/sync-test-film.webm',{headers:{Range:'bytes=999-'}})).status,416);
    assert.equal((await fetch(base+'/config.php')).status,404);
    assert.equal((await fetch(base+'/sync-test-film.webm',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/sync-test-film.webm',{headers:{Authorization:'Bearer synthetic-never-forward'}})).status,403);
  }finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});fs.rmSync(directory,{recursive:true,force:true});}
});
