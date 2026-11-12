'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const storage=require('./castle-local-storage.cjs');storage.configure();
const commit='fda4e90e251ce59ad878dbb996af372f4028a325',root=path.resolve(__dirname,'..');
const output=storage.outputPath('billiards-review/'+commit),source=path.join(output,'source'),build=path.join(output,'build');
const own=path.join(root,'ops/castle-billiards'),threeIntegrity='sha512-Qiu7R+Cmh8CstZsY1uJOSWnVlfo7ZtNLV7mF8Jltk3LB3AtDu9cRZlcnRKkAk8Y4z6KKw35z7Y7Urd7jWY8etA==';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function download(url,limit){
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Vendor HTTP '+response.status);
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw Error('Oversized pinned dependency');chunks.push(chunk);}return Buffer.concat(chunks);
}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'source-manifest.json')));if(manifest.commit!==commit)throw Error('Wrong source review');
 for(const item of manifest.files){const raw=fs.readFileSync(path.join(source,item.path));if(raw.length!==item.bytes||sha(raw)!==item.sha256)throw Error('Changed upstream source: '+item.path);}
 if(!fs.existsSync(build))fs.mkdirSync(build);
 const archive=path.join(output,'three-0.187.0.tgz');let raw=fs.existsSync(archive)?fs.readFileSync(archive):await download('https://registry.npmjs.org/three/-/three-0.187.0.tgz',15000000);
 if('sha512-'+crypto.createHash('sha512').update(raw).digest('base64')!==threeIntegrity)throw Error('Three.js integrity mismatch');
 if(!fs.existsSync(archive))fs.writeFileSync(archive,raw,{flag:'wx'});
 const dependency=path.join(output,'three');if(!fs.existsSync(dependency))fs.mkdirSync(dependency);
 const deps=[];
 for(const name of ['LICENSE','package.json','build/three.cjs','build/three.module.js','build/three.core.js']){
  const bytes=execFileSync('tar',['-xOf',archive,'package/'+name],{maxBuffer:6000000});
  const file=path.join(dependency,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);deps.push({path:name,bytes:bytes.length,sha256:sha(bytes)});
 }
 const metadata=JSON.parse(fs.readFileSync(path.join(dependency,'package.json')));if(metadata.version!=='0.187.0'||metadata.license!=='MIT')throw Error('Unexpected renderer package');
 const esbuild=require('../village/node_modules/esbuild');if(esbuild.version!=='0.17.17')throw Error('Review core compiler');
 const redirects=new Set(['../aim','../watchaim','../placeball','../../network/client/matchresult']);
 const plugin={name:'reviewed-headless-boundaries',setup(api){
  api.onResolve({filter:/^@upstream\//},args=>({path:path.join(source,'src',args.path.slice(10)+'.ts')}));
  api.onResolve({filter:/^three$/},()=>({path:path.join(dependency,'build/three.module.js')}));
  api.onResolve({filter:/.*/},args=>{
   if(args.importer===path.join(source,'src/controller/rules/eightball.ts')&&redirects.has(args.path))return {path:path.join(own,'headless-signals.ts')};
  });
 }};
 const result=await esbuild.build({absWorkingDir:root,entryPoints:[path.join(own,'core-entry.ts')],outfile:path.join(build,'core.cjs'),bundle:true,
  platform:'node',format:'cjs',target:'node24',supported:{'class-static-blocks':false},write:false,metafile:true,treeShaking:true,minifySyntax:true,define:{document:'undefined'},plugins:[plugin],logLevel:'silent'});
 if(Object.values(result.metafile.outputs).some(item=>item.imports.length))throw Error('Headless bundle has an external dependency');
 for(const file of result.outputFiles)fs.writeFileSync(file.path,file.contents);
 const core=require(path.join(build,'core.cjs'));core.TableConfig.apply('eightball',8);core.Ball.id=0;
 const initial=new core.Table(core.Rack.eightBall());if(initial.balls.length!==16||!initial.allStationary()||!Number.isFinite(core.TableGeometry.tableX))throw Error('Core initialization failed');
 const record={version:1,source:'https://github.com/tailuge/billiards',commit,upstreamLicense:'GPL-3.0',compiler:{name:'esbuild',version:esbuild.version,lowerStaticBlocks:true},
  upstreamFiles:Object.keys(result.metafile.inputs).map(file=>path.relative(source,path.resolve(root,file)))
   .filter(file=>!path.isAbsolute(file)&&file!=='..'&&!file.startsWith('..'+path.sep)).map(file=>file.replaceAll('\\','/')),
  renderer:{name:'three',version:metadata.version,license:metadata.license,integrity:threeIntegrity,archiveSha256:sha(raw),files:deps},
  renderingBoundariesOnly:[...redirects],physicsAndRuleSourceUnmodified:true,coreSha256:sha(fs.readFileSync(path.join(build,'core.cjs'))),
  coreBytes:fs.statSync(path.join(build,'core.cjs')).size,externalRuntimeImports:0,liveServicesChanged:false};
 fs.writeFileSync(path.join(build,'build-manifest.json'),JSON.stringify(record,null,2)+'\n');
 if(process.argv.includes('--install')){
  const files=[];
  function install(name,bytes){const file=path.join(own,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);files.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}
  for(const name of new Set([...record.upstreamFiles,'LICENSE','README.md','package.json']))install('vendor/tailuge/'+name,fs.readFileSync(path.join(source,name)));
  for(const name of ['LICENSE','build/three.module.js','build/three.core.js'])install('public/vendor/three/'+name,fs.readFileSync(path.join(dependency,name)));
  install('vendor/core.cjs',fs.readFileSync(path.join(build,'core.cjs')));
  fs.writeFileSync(path.join(own,'vendor-manifest.json'),JSON.stringify({...record,files},null,2)+'\n');
 }
 console.log(JSON.stringify({passed:true,output:build,sourceModules:record.upstreamFiles.length,coreBytes:record.coreBytes,physicsAndRuleSourceUnmodified:true,externalRuntimeImports:0}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
