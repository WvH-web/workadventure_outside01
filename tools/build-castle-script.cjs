'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Reuse the repository's locked, build-only esbuild dependency; no new browser library.
const esbuild=require('../village/node_modules/esbuild');
const root=path.resolve(__dirname,'..'),file='castle/expansion.bundle.js';
const digest=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function buildCastleScript(){
  if(esbuild.version!=='0.17.17')throw Error('Review the castle compiler version before changing the generated script');
  const result=esbuild.buildSync({absWorkingDir:root,entryPoints:['castle/npcs.js'],outfile:file,write:false,bundle:true,
    format:'esm',platform:'browser',target:'es2022',minify:true,charset:'ascii',sourcemap:false,metafile:true,legalComments:'inline',logLevel:'silent'});
  const output=result.outputFiles[0],entry=Object.values(result.metafile.outputs)[0],sources=Object.keys(result.metafile.inputs);
  if(result.outputFiles.length!==1||entry.imports.length||sources.some(source=>!/^castle\/[a-z0-9-]+\.js(?:\?v=[a-z0-9-]+)?$/.test(source)))throw Error('Unexpected castle bundle dependencies');
  for(const name of ['room.js','activities.js','displays.js','characters-data.js'])
    if(sources.filter(source=>source.split('?')[0]==='castle/'+name).length!==1)throw Error('Duplicated or missing controller: '+name);
  const manifest={version:1,compiler:{name:'esbuild',version:esbuild.version},entry:'castle/npcs.js',output:file,bytes:output.contents.length,
    sha256:digest(output.contents),runtimeModuleRequests:1,sources:sources.sort().map(source=>({path:source,sha256:digest(fs.readFileSync(path.join(root,source.split('?')[0])))}))};
  fs.writeFileSync(path.join(root,file),output.contents);fs.writeFileSync(path.join(root,'castle/expansion.bundle.manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
module.exports={buildCastleScript};
if(require.main===module){const result=buildCastleScript();console.log(JSON.stringify({bytes:result.bytes,sourceModules:result.sources.length,runtimeModuleRequests:1}));}
