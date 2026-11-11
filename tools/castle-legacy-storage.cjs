'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const samePath=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
function plain(directory){if(fs.lstatSync(directory).isSymbolicLink()||!samePath(fs.realpathSync(directory),path.resolve(directory)))throw Error('Unexpected linked legacy storage');}
function child(base,name){
  if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid legacy directory name');plain(base);
  const target=path.resolve(base,name);if(path.dirname(target)!==path.resolve(base))throw Error('Legacy path escaped its parent');return target;
}
function snapshot(root,minAgeMs=86400000){
  plain(root);const files={},directories=[];
  function walk(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name),relative=path.relative(root,file),stat=fs.lstatSync(file);
      if(stat.isSymbolicLink())throw Error('Refusing linked legacy content');
      if(stat.isDirectory()){directories.push(relative);walk(file);}
      else{
        if(!stat.isFile()||/\.(?:sqlite3?|db)(?:-wal|-shm)?$/i.test(entry.name)||/(?:^|[._-])(?:credentials?|passwords?|secrets?|tokens?)(?:[._-]|$)|^\.env/i.test(entry.name))throw Error('Protected or unsupported legacy content');
        if(minAgeMs>0&&Date.now()-stat.mtimeMs<minAgeMs)throw Error('Legacy output was modified recently');
        files[relative]={bytes:stat.size,sha256:sha(file)};
      }
    }
  }walk(root);return {files:Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))),directories:directories.sort()};
}
function allocation(files){
  const groups=new Map(),seen=new Set();let logical=0n;
  for(const file of files){
    const absolute=path.resolve(file),key=process.platform==='win32'?absolute.toLowerCase():absolute;if(seen.has(key))throw Error('Duplicate cleanup path');seen.add(key);
    const stat=fs.lstatSync(absolute,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.ino===0n||stat.nlink<1n||typeof stat.blocks!=='bigint'||stat.blocks<0n)throw Error('File allocation is not safely measurable');
    const identity=stat.dev+':'+stat.ino,prior=groups.get(identity)||{paths:0n,links:stat.nlink,bytes:stat.blocks*512n};
    if(prior.links!==stat.nlink||prior.bytes!==stat.blocks*512n)throw Error('File allocation changed while measuring');
    prior.paths++;groups.set(identity,prior);logical+=stat.size;
  }
  let reclaimable=0n,shared=0;
  for(const group of groups.values()){
    if(group.paths>group.links)throw Error('Invalid hardlink inventory');
    if(group.paths===group.links)reclaimable+=group.bytes;else shared++;
  }
  return {logicalBytes:Number(logical),lastLinkAllocatedBytes:Number(reclaimable),sharedFilesNotCredited:shared,uniqueFiles:groups.size};
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function relocate(sourceBase,name,targetBase,options={}){
  const source=child(sourceBase,name),target=child(targetBase,name),minAgeMs=options.minAgeMs??86400000;
  if(fs.lstatSync(source).isSymbolicLink()){
    if(!samePath(fs.realpathSync(source),target))throw Error('Foreign existing legacy link');
    return {alreadyOnD:true,newBytesFreed:0};
  }
  if(fs.existsSync(target))throw Error('Legacy destination already exists');
  const before=snapshot(source,minAgeMs),measured=allocation(Object.keys(before.files).map(name=>path.join(source,name))),freeBefore=fs.statfsSync(sourceBase,{bigint:true});
  const retired=child(sourceBase,name+'-retiring-'+crypto.randomUUID());let renamed=false,linked=false;
  try{
    fs.cpSync(source,target,{recursive:true,force:false,errorOnExist:true,preserveTimestamps:true});
    assert.ok(same(before,snapshot(target,0))&&same(before,snapshot(source,minAgeMs)),'Legacy copy or source changed');
    fs.renameSync(source,retired);renamed=true;
    fs.symlinkSync(target,source,'junction');linked=true;
    assert.ok(samePath(fs.realpathSync(source),target));
    assert.ok(same(before,snapshot(target,0))&&same(before,snapshot(retired,minAgeMs)),'Legacy content changed before cleanup');
    if(options.beforeRemove)options.beforeRemove(retired);
    assert.ok(same(before,snapshot(retired,minAgeMs)),'Retired source changed');plain(retired);
    fs.rmSync(retired,{recursive:true,force:false});
    const freeAfter=fs.statfsSync(sourceBase,{bigint:true});
    return {passed:true,source,target,files:Object.keys(before.files).length,fullHashComparison:true,originalPathUsable:true,
      manifestSha256:crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),...measured,
      volumeFreeDeltaDuringOperation:Number(freeAfter.bavail*freeAfter.bsize-freeBefore.bavail*freeBefore.bsize),
      concurrentVolumeActivityPossible:true,directoryMetadataNotCounted:true};
  }catch(error){
    if(renamed&&!linked&&!fs.existsSync(source))fs.renameSync(retired,source);
    if(!linked&&fs.existsSync(source)&&fs.existsSync(target)&&same(before,snapshot(source,minAgeMs))){
      const copy=snapshot(target,0);if(Object.entries(copy.files).every(([name,value])=>same(value,before.files[name]))){plain(target);fs.rmSync(target,{recursive:true});}
    }
    throw error;
  }
}
module.exports={allocation,snapshot,relocate};
if(require.main===module){
  const name=process.argv[2];if(!['schulschloss-20261107','teacher-lounge-20261107'].includes(name))throw Error('Choose an explicitly reviewed legacy QA directory');
  const sourceBase=path.resolve(__dirname,'../../output'),targetBase=storage.outputPath('legacy-output');
  const report=path.join(storage.outputPath('legacy-migrations'),name+'.json');
  if(fs.existsSync(report)&&!fs.lstatSync(path.join(sourceBase,name)).isSymbolicLink())throw Error('A prior migration report already exists');
  const result=relocate(sourceBase,name,targetBase);
  if(!result.alreadyOnD)fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
}
