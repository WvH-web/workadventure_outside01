'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.resolve(__dirname,'../tools/check-castle-rounds-native.cjs'),source=fs.readFileSync(file,'utf8');

test('low disk space stops recovery probes before browser dependencies or any result/audio writes',async()=>{
  for(const mode of ['--recovery-published','--game-host-published'])for(const available of [0,1024,1024**3-1]){
    const imported=[],writes=[],messages=[],process={argv:['node',file,mode],env:{USERPROFILE:'C:\\synthetic-test-home'},exitCode:0};
    const fileSystem={...fs,statfsSync:()=>({bavail:available,bsize:1}),
      mkdirSync:(...args)=>writes.push(['mkdir',...args]),rmSync:(...args)=>writes.push(['remove',...args]),writeFileSync:(...args)=>writes.push(['write',...args])};
    vm.runInNewContext(source,{__dirname:path.dirname(file),process,Buffer,console:{error:message=>messages.push(message)},
      require:name=>{if(name==='node:fs')return fileSystem;if(name.startsWith('node:'))return require(name);imported.push(name);throw Error('Third-party dependency loaded before disk gate');}});
    for(let n=0;n<8;n++)await Promise.resolve();
    assert.equal(process.exitCode,1);assert.deepEqual(imported,[]);assert.deepEqual(writes,[]);
    assert.deepEqual(messages,['Native round probe stopped: INSUFFICIENT_DISK_SPACE']);
  }
});
