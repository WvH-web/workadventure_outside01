'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const OWNER='wvh-workadventure-local-qa',MARKER='.castle-local-storage.json',RUN_MARKER='.castle-test-run.json';
const RUN=/^run-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
let current;
const same=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
function read(file){const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||stat.size>4096)throw Error('Invalid local storage marker file');return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function real(directory){if(fs.lstatSync(directory).isSymbolicLink()||!same(fs.realpathSync(directory),path.resolve(directory)))throw Error('Local QA storage cannot traverse a junction');return directory;}
function layout(root=process.env.CASTLE_QA_ROOT||'D:\\CodexScratch\\WorkAdventure'){
  if(!path.isAbsolute(root))throw Error('Absolute local QA root required');root=real(path.resolve(root));
  const marker=read(path.join(root,MARKER));if(marker.version!==1||marker.owner!==OWNER)throw Error('Unowned local QA directory');
  return {root,temp:path.join(root,'temp'),output:path.join(root,'output'),cache:path.join(root,'cache'),nodeModules:marker.nodeModules};
}
function ownedDirectory(root,target){
  real(root);const relative=path.relative(root,path.resolve(target));
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Directory is outside project storage');
  let current=root;for(const part of relative.split(path.sep)){current=path.join(current,part);if(!fs.existsSync(current))fs.mkdirSync(current);real(current);}return current;
}
function outputPath(name,options={}){
  if(typeof name!=='string'||!name||path.isAbsolute(name)||name.split(/[\\/]/).some(part=>!part||part==='.'||part==='..'||!/^[a-zA-Z0-9._-]+$/.test(part)))throw Error('Invalid QA output name');
  const value=layout(options.root),target=path.resolve(value.output,name);return ownedDirectory(value.root,target);
}
function alive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
function active(directory){
  if(process.platform!=='win32')return true;
  const value=cp.execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'castle-test-path-active.ps1'),'-Directory',directory],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();
  if(!['true','false'].includes(value))throw Error('Could not confirm browser cleanup safety');return value==='true';
}
function plainTree(directory){
  real(directory);
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);if(fs.lstatSync(file).isSymbolicLink())throw Error('Refusing linked QA temporary content');
    if(entry.isDirectory())plainTree(file);
  }
}
function cleanRun(directory,options={}){
  const value=layout(options.root),absolute=path.resolve(directory);
  if(!same(path.dirname(absolute),value.temp)||!RUN.test(path.basename(absolute)))throw Error('Cleanup is outside owned temporary runs');
  real(value.temp);real(absolute);const marker=read(path.join(absolute,RUN_MARKER));
  if(marker.version!==1||marker.owner!==OWNER||marker.id!==path.basename(absolute)||!Number.isSafeInteger(marker.pid)||marker.pid<1||
    !Number.isFinite(marker.createdAt)||marker.createdAt>Date.now()+60000)throw Error('Invalid temporary run marker');
  const own=marker.pid===process.pid&&options.own===true;
  if(!own&&((options.isAlive||alive)(marker.pid)||Date.now()-marker.createdAt<86400000))return false;
  if((options.isActive||active)(absolute))return false;
  plainTree(absolute);fs.rmSync(absolute,{recursive:true,force:false});return true;
}
function sweep(options={}){
  const value=layout(options.root),result={removed:0,skipped:0};if(!fs.existsSync(value.temp))return result;real(value.temp);
  for(const entry of fs.readdirSync(value.temp,{withFileTypes:true}).slice(0,100)){
    if(!entry.isDirectory()||!RUN.test(entry.name)){result.skipped++;continue;}
    try{if(cleanRun(path.join(value.temp,entry.name),options))result.removed++;else result.skipped++;}catch{result.skipped++;}
  }return result;
}
function configure(){
  if(current)return current;
  const value=layout();ownedDirectory(value.root,value.temp);
  const disk=fs.statfsSync(value.temp);if(disk.bavail*disk.bsize<2*1024**3)throw Object.assign(Error('Insufficient QA scratch capacity'),{code:'INSUFFICIENT_SCRATCH_SPACE'});
  sweep();const id='run-'+crypto.randomUUID(),directory=path.join(value.temp,id);fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory,RUN_MARKER),JSON.stringify({version:1,owner:OWNER,id,pid:process.pid,createdAt:Date.now()}),{flag:'wx',mode:0o600});
  process.env.TEMP=process.env.TMP=directory;process.env.npm_config_cache=path.join(value.cache,'npm');process.env.PIP_CACHE_DIR=path.join(value.cache,'pip');
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(value.cache,'playwright');
  current={...value,directory};
  process.once('exit',()=>{try{if(fs.existsSync(directory)&&!cleanRun(directory,{own:true}))process.stderr.write('Local QA temp retained while a browser may still be active.\n');}catch{process.stderr.write('Local QA temp cleanup deferred; evidence directories were not touched.\n');}});
  return current;
}
function dependencyDirectory(){try{return layout().nodeModules;}catch{return undefined;}}
module.exports={OWNER,MARKER,RUN_MARKER,layout,outputPath,cleanRun,sweep,configure,dependencyDirectory};
if(require.main===module){if(process.argv[2]!=='--cleanup')throw Error('Use --cleanup');console.log(JSON.stringify(sweep()));}
