'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 const head=process.argv[2];assert.match(head,/^[a-f0-9]{40}$/);
 const preview=process.argv.includes('--preview'),files=(preview?['obergeschoss-homes.tmj']:['gallery.js','homes-entry.js','obergeschoss-homes-pilot.tmj','upper-gallery.bundle.js','upper-gallery.bundle.manifest.json']).map(name=>'castle/'+name);
 const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-status','-r',head],{cwd:root,encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/));
 assert.equal(changes.length,files.length);assert.ok(changes.every(([status,file])=>status==='A'&&files.includes(file)));
 const api='https://api.github.com/repos/WvH-web/workadventure_outside01/actions/runs';
 const parent=execFileSync('git',['rev-parse',head+'^'],{cwd:root,encoding:'utf8'}).trim();
 const committed=Date.parse(execFileSync('git',['show','-s','--format=%cI',head],{cwd:root,encoding:'utf8'}).trim());
 // Dynamic Pages can attribute a new branch build to its parent; public bytes remain the acceptance gate.
 const matches=row=>row.name==='pages build and deployment'&&(row.head_sha===head||preview&&row.event==='dynamic'&&row.head_sha===parent&&Date.parse(row.created_at)>=committed);
 const json=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);return response.json();};
 let run;for(let n=0;n<20&&!run;n++){const value=await json(api+(preview?'?per_page=8':'?head_sha='+head+'&per_page=5'));run=value.workflow_runs.find(matches);if(!run)await pause(3000);}
 assert.ok(run);console.log(JSON.stringify({head,run:run.id,status:run.status}));
 while(run.status!=='completed'){await pause(15000);run=await json(api+'/'+run.id);assert.ok(matches(run));console.log(JSON.stringify({run:run.id,status:run.status}));}
 assert.equal(run.conclusion,'success');const checked={};
 for(const file of files){const expected=execFileSync('git',['show',head+':'+file],{cwd:root,maxBuffer:1024*1024});let matched=false;
  for(let n=0;n<12;n++){const response=await fetch('https://wvh-web.github.io/workadventure_outside01/'+file+'?v='+head.slice(0,12),{signal:AbortSignal.timeout(20000)});if(response.ok&&sha(Buffer.from(await response.arrayBuffer()))===sha(expected)){matched=true;break;}await pause(5000);}
  assert.ok(matched,file);checked[file]=sha(expected);
 }
 const proof={passed:true,head,run:run.id,workflowHead:run.head_sha,workflowTriggeredOnParent:run.head_sha!==head,publicFilesByteVerified:true,files:checked,onlyNewProbeFiles:!preview,onlyNewPreviewSource:preview,existingMapSourcesUnchanged:true};
 const output=path.resolve(root,'../output/castle-homes/native-entry/'+(preview?'preview-publication.json':'publication.json'));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
main().catch(error=>{console.error('Native entry publication check: '+error.message);process.exitCode=1;});
