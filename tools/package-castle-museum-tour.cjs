'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {files,packageContent}=require('./package-castle-content.cjs');
const root=path.resolve(__dirname,'..'),publication=path.resolve(root,'../_castle_museum_tour_publish_20261111');
const output=path.resolve(root,'../output/castle-content-qa'),suffix=process.argv.includes('--repair=1')?'-repair-1':'';
const archive=path.join(output,'wvh-castle-museum-content'+suffix+'.zip');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function git(args,encoding='utf8'){return cp.execFileSync('git',args,{cwd:publication,encoding,maxBuffer:2000000});}
function main(){
 assert.equal(git(['status','--porcelain']).trim(),'');const head=git(['rev-parse','HEAD']).trim();assert.match(head,/^[a-f0-9]{40}$/);
 assert.equal(head,git(['rev-parse','origin/gh-pages']).trim());
 const names=['castle/museum-tour-preview.tmj','castle/museum-tour.bundle.js','castle/museum-tour.bundle.manifest.json'];
 assert.deepEqual(git(['diff-tree','--no-commit-id','--name-status','-r',head]).trim().split('\n').sort(),names.map(name=>'A\t'+name).sort());
 const publicFiles=Object.fromEntries(names.map(name=>[name,sha(git(['show',head+':'+name],null))]));
 assert.equal(publicFiles[names[0]],sha(fs.readFileSync(path.join(root,'castle/museum.tmj'))));
 const pkg=packageContent(archive);assert.equal(pkg.files,15);
 const contentFiles=Object.fromEntries(files.map(name=>[name,sha(fs.readFileSync(path.join(root,'castle',name)))]));
 const value={version:1,head,onlyAdditionalPublicFiles:true,publicFiles,contentArchiveSha256:pkg.archiveSha256,contentFiles};
 fs.writeFileSync(path.join(output,'museum-tour-publication'+suffix+'.json'),JSON.stringify(value,null,2)+'\n');
 console.log(JSON.stringify({prepared:true,sourceCommit:head,onlyAdditionalPublicFiles:true,staticFiles:pkg.files,archiveSha256:pkg.archiveSha256,credentialsIncluded:false}));
}
if(require.main===module)main();
