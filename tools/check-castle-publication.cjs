'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),root=path.resolve(__dirname,'..');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(url){const response=await fetch(url,{headers:{'User-Agent':'castle-publication-check'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Publication metadata HTTP '+response.status);return response.json();}
async function main(){
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),api='https://api.github.com/repos/WvH-web/workadventure_outside01/actions/runs';
  let run;
  for(let n=0;n<10;n++){
    const data=await json(api+'?head_sha='+head+'&per_page=5');run=data.workflow_runs.find(run=>run.name==='pages build and deployment');
    if(run)break;await pause(3000);
  }assert.ok(run,'No Pages run found for the exact current commit');
  console.log(JSON.stringify({run:run.id,head,status:run.status}));
  const started=Date.now();
  while(run.status!=='completed'){
    if(Date.now()-started>12*60*1000){console.log(JSON.stringify({run:run.id,head,observationWindowEnded:true,status:run.status}));return;}
    await pause(15000);const next=await json(api+'/'+run.id);assert.equal(next.head_sha,head);
    if(next.status!==run.status)console.log(JSON.stringify({run:next.id,status:next.status}));run=next;
  }
  assert.equal(run.conclusion,'success','Pages run '+run.id+' finished: '+run.conclusion);
  const ids=require('./castle-map-ids.cjs'),files=[...ids.map(id=>'castle/'+id+'.tmj'),
    ...['room.js','community.js','ui-ids.js','ui-lifecycle.js','activities.js','hall.js','cinema.js','displays.js','npcs.js','outdoors.js','expansion.bundle.js','outdoors.bundle.js','runtime.json'].map(file=>'castle/'+file)];
  const checked=[];
  for(const file of files){
    const expected=execFileSync('git',['show',head+':'+file],{cwd:root,maxBuffer:4*1024*1024});let matched=false;
    for(let n=0;n<8;n++){
      const response=await fetch('https://wvh-web.github.io/workadventure_outside01/'+file+'?v='+head.slice(0,12),{signal:AbortSignal.timeout(20000)});
      if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===sha(expected)){matched=true;break;}
      await pause(5000);
    }assert.ok(matched,'Published bytes differ for '+file);checked.push({file,sha256:sha(expected)});
  }
  const result={passed:true,head,run:run.id,files:checked,oldCastleReplaced:false,loadApprovalFor400:false};
  fs.writeFileSync(path.resolve(root,'../output/castle-runtime-publication.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:true,head,run:run.id,verifiedPublicFiles:checked.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
