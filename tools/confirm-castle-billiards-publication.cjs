'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
require('./castle-local-storage.cjs').configure();
const root=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]||''),attempt=JSON.parse(fs.readFileSync(input));
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:2000000}).toString(),raw=spec=>execFileSync('git',['show',spec],{cwd:root,windowsHide:true,maxBuffer:2000000});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function main(){
 assert.equal(attempt.publicationConfirmed,false);assert.deepEqual(attempt.files,['castle/spielesaal.tmj']);
 for(const key of ['sourceCommit','publicationCommit','previousPublicationCommit'])assert.match(attempt[key],/^[a-f0-9]{40}$/);
 assert.equal(git(['ls-remote','origin','refs/heads/gh-pages']).trim().split(/\s+/)[0],attempt.publicationCommit,'Only an already confirmed exact remote commit may be recorded');
 assert.equal(git(['rev-parse',attempt.publicationCommit+'^']).trim(),attempt.previousPublicationCommit);
 assert.equal(git(['diff-tree','--no-commit-id','--name-status','-r',attempt.previousPublicationCommit,attempt.publicationCommit]).trim(),'M\tcastle/spielesaal.tmj');
 const bytes=raw(attempt.publicationCommit+':castle/spielesaal.tmj');assert.equal(sha(bytes),sha(raw(attempt.sourceCommit+':castle/spielesaal.tmj')));
 assert.equal(sha(bytes),sha(raw(attempt.previousPublicationCommit+':castle/spielesaal-billard2-preview.tmj')));
 const value={version:1,sourceCommit:attempt.sourceCommit,publicationCommit:attempt.publicationCommit,previousPublicationCommit:attempt.previousPublicationCommit,
  files:{'castle/spielesaal.tmj':sha(bytes)},onlyAdditionalPublicFiles:false,onlyCanonicalGameHallChanged:true,
  previousCanonicalSha256:sha(raw(attempt.previousPublicationCommit+':castle/spielesaal.tmj'))};
 const target=path.join(path.dirname(input),'publication.json');fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:true,remoteCommitConfirmed:true,noNewPush:true,publicationCommit:value.publicationCommit,manifest:target}));
}
try{main();}catch(error){console.error('Existing publication confirmation stopped: '+error.name+': '+error.message);process.exitCode=1;}
