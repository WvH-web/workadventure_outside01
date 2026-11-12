'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
require('./castle-local-storage.cjs').configure();
const record=JSON.parse(fs.readFileSync(process.argv[2]||'')),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const api='https://api.github.com/repos/WvH-web/workadventure_outside01/actions/runs';
async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Publication observation HTTP '+response.status);return response.json();}
async function main(){
 assert.equal(record.onlyAdditionalPublicFiles,true);assert.match(record.publicationCommit,/^[a-f0-9]{40}$/);
 const count=Object.keys(record.files).length;assert.ok([2,7].includes(count));
 if(count===2)assert.deepEqual(Object.keys(record.files).sort(),['castle/spielesaal-billard2-preview.tmj','castle/art/spielesaal-billard-20261112/fronts-r2.png'].sort());
 let run;for(let n=0;n<20;n++){const data=await json(api+'?head_sha='+record.publicationCommit+'&per_page=10');run=data.workflow_runs.find(item=>item.name==='pages build and deployment');if(run)break;await pause(3000);}
 assert.ok(run,'Exact Pages job not yet found');console.log(JSON.stringify({run:run.id,commit:record.publicationCommit,status:run.status}));
 const started=Date.now();while(run.status!=='completed'){
  if(Date.now()-started>720000){console.log(JSON.stringify({observationWindowEnded:true,run:run.id,status:run.status,commit:record.publicationCommit}));return;}
  await pause(10000);run=await json(api+'/'+run.id);assert.equal(run.head_sha,record.publicationCommit);
 }assert.equal(run.conclusion,'success');
 for(const [name,digest]of Object.entries(record.files)){
  assert.ok(/^castle\/(?:spielesaal-billard2?-preview\.tmj|billiards-preview\.bundle\.(?:js|manifest\.json)|art\/spielesaal-billard-20261112\/(?:floor|fronts(?:-r2)?|marker|fire)\.png)$/.test(name));
  let matched=false;for(let n=0;n<10;n++){
   const response=await fetch('https://wvh-web.github.io/workadventure_outside01/'+name+'?v='+record.publicationCommit.slice(0,12),{signal:AbortSignal.timeout(20000)});
   if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===digest){matched=true;break;}await pause(3000);
  }assert.ok(matched,'Published candidate bytes differ: '+name);
 }
 const result={passed:true,publicationCommit:record.publicationCommit,run:run.id,additionalFilesVerified:count,existingMapsActivated:false};
 fs.writeFileSync(path.join(path.dirname(process.argv[2]),'public-check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
main().catch(error=>{console.error('Billiards asset observation stopped: '+error.name+': '+error.message);process.exitCode=1;});
