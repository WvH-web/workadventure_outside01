'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs'),{allocation}=require('./castle-legacy-storage.cjs');
storage.configure();
const base=path.resolve(__dirname,'../../output'),workspace=path.dirname(base);
if(fs.realpathSync(base).toLowerCase()!==base.toLowerCase()||fs.lstatSync(base).isSymbolicLink())throw Error('Unexpected local upload parent');
const names=['wvh-castle-homes-calls.zip','wvh-castle-homes-owned.zip','wvh-castle-homes-progressive.zip','wvh-castle-homes-media.zip'];
const transport=path.join(workspace,'tools/workadventure-upgrade-20261107/remote.ps1'),script=path.join(__dirname,'inspect-castle-upload-retention.py');
const proof=JSON.parse(cp.execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-File',transport,'-ScriptPath',script],{encoding:'utf8',windowsHide:true,timeout:60000}));
if(proof.passed!==true||proof.readOnly!==true||proof.schoolDataRead!==false||Object.keys(proof.archives).sort().join()!==names.slice().sort().join())throw Error('Invalid retained upload proof');
const reportFile=path.join(storage.outputPath('completed-upload-cleanup'),Date.now()+'-'+crypto.randomUUID()+'.json'),rows=[];
const before=fs.statfsSync(base,{bigint:true});let failure;
try{
  for(const name of names){
    const file=path.resolve(base,name);if(path.dirname(file)!==base)throw Error('Upload cleanup escaped its exact parent');
    if(!fs.existsSync(file)){rows.push({name,removed:false,reason:'already-absent'});continue;}
    const expected=proof.archives[name];if(expected.retainedReleaseVerified!==true||!/^[a-f0-9]{64}$/.test(expected.archiveSha256))throw Error('Unverified retained release');
    if(fs.lstatSync(file).isSymbolicLink())throw Error('Unexpected linked upload');
    if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected.archiveSha256){rows.push({name,removed:false,reason:'archive-hash-does-not-match-completed-release'});continue;}
    const measured=allocation([file]);fs.unlinkSync(file);rows.push({name,removed:true,...measured});
  }
}catch(error){failure=error;throw error;}finally{
  const after=fs.statfsSync(base,{bigint:true});
  const result={passed:!failure,...(failure?{errorType:failure.name}:{}),rows,retentionProof:proof,hardlinkAdjustedAllocatedBytesRemoved:rows.filter(row=>row.removed).reduce((sum,row)=>sum+row.lastLinkAllocatedBytes,0),
    volumeFreeDeltaDuringOperation:Number(after.bavail*after.bsize-before.bavail*before.bsize),concurrentVolumeActivityPossible:true,
    offsiteRuntimeBackupUntouched:true,serverChanged:false};
  fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({passed:true,removed:rows.filter(row=>row.removed).length,skipped:rows.filter(row=>!row.removed).length,
  hardlinkAdjustedAllocatedBytesRemoved:rows.filter(row=>row.removed).reduce((sum,row)=>sum+row.lastLinkAllocatedBytes,0),backupsAndSchoolDataUntouched:true}));
