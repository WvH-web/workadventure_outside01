'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../output/castle-piano-vendor');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const packages=[
  {name:'tone',version:'15.1.22',integrity:'sha512-TCScAGD4sLsama5DjvTUXlLDXSqPealhL64nsdV1hhr6frPWve0DeSo63AKnSJwgfg55fhvxj0iPPRwPN5o0ag=='},
  {name:'ws',version:'8.22.0',integrity:'sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg=='},
];
async function download(url){
  const response=await fetch(url,{headers:{'User-Agent':'castle-piano-vendor'},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Vendor HTTP '+response.status);
  const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>4000000)throw Error('Oversized vendor file');chunks.push(chunk);}return Buffer.concat(chunks);
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  for(const item of packages){
    const raw=await download('https://registry.npmjs.org/'+item.name+'/-/'+item.name+'-'+item.version+'.tgz');
    if('sha512-'+crypto.createHash('sha512').update(raw).digest('base64')!==item.integrity)throw Error('Vendor archive integrity mismatch');
    const file=path.join(out,item.name+'-'+item.version+'.tgz');fs.writeFileSync(file,raw);
    const names=execFileSync('tar',['-tzf',file],{encoding:'utf8'}).trim().split(/\r?\n/);
    console.log(JSON.stringify({package:item.name,version:item.version,bytes:raw.length,archiveSha256:sha(raw),
      selected:names.filter(name=>item.name==='tone'?/build\/Tone\.js|license/i.test(name):true)}));
  }
  if(process.argv.includes('--install'))await install();
}
async function install(){
  const directory=path.join(root,'ops/castle-piano'),manifest={version:1,packages:[],files:[],samples:{commit:'869b6f8d9cddb47d966238c012041480b1ce517a',
    author:'Alexander Holm',license:'CC-BY-3.0',source:'https://github.com/Tonejs/audio/tree/869b6f8d9cddb47d966238c012041480b1ce517a/salamander'}};
  function write(file,raw){const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,raw);manifest.files.push({path:file,bytes:raw.length,sha256:sha(raw)});}
  const lock=JSON.parse(fs.readFileSync(path.join(directory,'package-lock.json'),'utf8'));
  for(const [name,locked]of Object.entries(lock.packages)){
    if(!name)continue;const folder=path.join(directory,name),meta=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
    if(!['MIT','0BSD'].includes(meta.license))throw Error('Review dependency license: '+meta.name);
    const notices=fs.readdirSync(folder).filter(file=>/^(?:licen[cs]e|copying|copyright)/i.test(file)&&fs.statSync(path.join(folder,file)).isFile());
    if(!notices.length)throw Error('Missing license notice');
    const record={name:meta.name,version:meta.version,license:meta.license,integrity:locked.integrity,notices:[]};
    for(const file of notices){const target='public/vendor/licenses/'+meta.name.replace(/[^a-z0-9-]/gi,'_')+'-'+meta.version+'-'+file;
      write(target,fs.readFileSync(path.join(folder,file)));record.notices.push(target);}
    manifest.packages.push(record);
  }
  for(const item of packages){const locked=manifest.packages.find(entry=>entry.name===item.name);if(locked?.version!==item.version||locked.integrity!==item.integrity)throw Error('Installed dependency differs from reviewed archive');}
  const wsArchive=path.join(out,'ws-8.22.0.tgz'),wsNames=execFileSync('tar',['-tzf',wsArchive],{encoding:'utf8'}).trim().split(/\r?\n/);
  if(wsNames.length!==19||new Set(wsNames).size!==19)throw Error('Unexpected ws source archive');
  for(const name of wsNames){const relative=name.slice('package/'.length);
    if(!name.startsWith('package/')||! /^(?:LICENSE|README\.md|package\.json|index\.js|browser\.js|wrapper\.mjs|lib\/[a-z-]+\.js)$/.test(relative))throw Error('Unexpected vendor source path');
    write('vendor/ws/'+relative,execFileSync('tar',['-xOf',wsArchive,name],{maxBuffer:2000000}));
  }
  const esbuild=require('../village/node_modules/esbuild');if(esbuild.version!=='0.17.17')throw Error('Review audio compiler');
  const built=esbuild.buildSync({absWorkingDir:root,entryPoints:['ops/castle-piano/audio-entry.js'],outfile:'ops/castle-piano/public/vendor/tone.js',
    bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,charset:'ascii',legalComments:'external',metafile:true,logLevel:'silent'});
  for(const output of built.outputFiles)write(path.relative(directory,output.path).replaceAll('\\','/'),output.contents);
  manifest.compiler={name:'esbuild',version:esbuild.version,sourceModules:Object.keys(built.metafile.inputs).length};
  const metadata=JSON.parse((await download('https://api.github.com/repos/Tonejs/audio/contents/salamander?ref='+manifest.samples.commit)).toString());
  const wanted=['C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5','Ds5','Fs5','A5','C6'].map(note=>note+'.mp3').concat('README');
  for(const name of wanted){const item=metadata.find(file=>file.name===name);if(!item||item.type!=='file'||item.size>200000)throw Error('Missing bounded piano sample');
    const raw=await download('https://raw.githubusercontent.com/Tonejs/audio/'+manifest.samples.commit+'/salamander/'+name);
    if(raw.length!==item.size||crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex')!==item.sha)throw Error('Piano sample differs from pinned Git blob');
    write('public/samples/'+name,raw);
  }
  fs.writeFileSync(path.join(directory,'vendor-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({installed:true,files:manifest.files.length,packageVersions:manifest.packages.map(item=>item.name+'@'+item.version),
    audioSamples:13,sampleBytes:manifest.files.filter(item=>item.path.endsWith('.mp3')).reduce((sum,item)=>sum+item.bytes,0),
    audioBundleBytes:manifest.files.find(item=>item.path==='public/vendor/tone.js').bytes}));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={packages,download,sha};
