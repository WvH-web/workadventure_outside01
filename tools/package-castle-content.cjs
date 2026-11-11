'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'castle'),destination=path.resolve(root,'../output/wvh-castle-content.zip');
const files=['collection.html','collection.css','collection.js','catalog.js','tour-state.js','vendor/lucide.min.js','vendor/LICENSE',
  'npc-sprite.html','npc-sprite.css','npc-sprite.js','characters-data.js','passive-image.js','display.html','display.css','display.js'];
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function packageContent(target=destination){
 for(const file of files)if(!fs.lstatSync(path.join(source,file)).isFile())throw Error('Expected regular static content file');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 execFileSync('tar',['-a','-cf',target,...files],{cwd:source,stdio:'inherit'});
 return {files:files.length,archiveSha256:digest(fs.readFileSync(target)),privateConfigurationIncluded:false};
}
module.exports={files,packageContent};
if(require.main===module)console.log(JSON.stringify(packageContent()));
