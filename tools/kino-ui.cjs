const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../output/kino-ui-20261108');
const privateDir=path.join(out,'private');fs.mkdirSync(privateDir,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const q=s=>'"'+s.replaceAll('"','""')+'"';
function ftp(commands,label,xml){
  const script=path.join(privateDir,label+'.txt');
  fs.writeFileSync(script,'\uFEFFoption batch abort\noption confirm off\noption transfer binary\nopen dos@deutsche-online-schule.com\n'+commands.join('\n')+'\nexit\n');
  const args=['/script='+script];if(xml)args.push('/xmllog='+xml);
  const result=cp.spawnSync('C:/Program Files (x86)/WinSCP/WinSCP.com',args,{encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(privateDir,label+'.private.log'),((result.stdout||'')+(result.stderr||'')).replace(/(\w+:\/\/)[^\s]+@/gi,'$1[redacted]@'));
  if(result.status!==0)throw Error('Cinema transfer failed; inspect private log '+label);
}
const assetNames=['castle-embed-20261108.css','castle-embed-20261108.js','castle-reload-20261108.svg','castle-chat-20261108.svg','castle-icons-LICENSE-20261108.txt'];
function prepare(){
  const sourceFile=path.join(out,'before/kino.php'),before=fs.readFileSync(sourceFile,'utf8');
  const snapshot=JSON.parse(fs.readFileSync(path.join(out,'source.manifest.json')));
  if(hash(sourceFile)!==snapshot.files.find(f=>f.name==='kino.php').sha256)throw Error('Source snapshot changed');
  const nl=before.match(/<\/style>(\r?\n)<\/head>/)?.[1]||'\n',anchor='</head>';
  if(before.split(anchor).length!==2)throw Error('Expected exactly one head insertion point');
  const includes=fs.readFileSync(path.join(root,'ops/kino-ui/head-includes.html'),'utf8').trimEnd().replace(/\r?\n/g,nl);
  const candidate=before.replace(anchor,includes+nl+'</head>');
  const file=path.join(out,'candidate-kino.php');fs.writeFileSync(file,candidate);
  const php='C:/xampp/php/php.exe';
  for(const args of [['-l',file],[path.join(root,'ops/kino-ui/verify-source.php'),sourceFile,file]]){
    const check=cp.spawnSync(php,args,{encoding:'utf8',windowsHide:true});
    if(check.status!==0)throw Error('Cinema PHP validation failed: '+check.stderr+check.stdout);
    console.log(check.stdout.trim());
  }
  const manifest={beforeHash:hash(sourceFile),candidateHash:hash(file),candidate:file,
    assets:assetNames.map(name=>({name,sha256:hash(path.join(root,'ops/kino-ui',name))})),state:'prepared'};
  fs.writeFileSync(path.join(out,'deployment.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Cinema UI prepared; only two static head includes change the PHP page.');
}
function fetchSource(){
  const dir=path.join(out,'before');fs.mkdirSync(dir,{recursive:true});
  const files=['kino.php','foyer.css','foyer.js'];
  const remote={'kino.php':'/kino/public/kino.php','foyer.css':'/kino/public/assets/foyer.css','foyer.js':'/kino/public/assets/foyer.js'};
  for(const file of files){
    if(fs.existsSync(path.join(dir,file)))throw Error('Source snapshot already exists; refusing to replace it');
  }
  ftp(files.map(file=>'get '+q(remote[file])+' '+q(path.join(dir,file))),'read-source');
  const manifest={files:files.map(file=>({name:file,remote:remote[file],sha256:hash(path.join(dir,file)),bytes:fs.statSync(path.join(dir,file)).size}))};
  fs.writeFileSync(path.join(out,'source.manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({sourceSnapshot:manifest,configurationOrViewerDataDownloaded:false},null,2));
}
function inventory(label){
  const xml=path.join(privateDir,label+'.xml');
  ftp(['ls "/kino/public/"','ls "/kino/public/assets/"'],label,xml);
  const result=cp.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(root,'ops/kino-ui/inventory.ps1'),'-XmlPath',xml],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw Error('Cinema inventory could not be parsed');
  return new Set(JSON.parse(result.stdout).map(n=>n.toLowerCase()));
}
function download(remote,name,label){
  const file=path.join(privateDir,name);ftp(['get '+q(remote)+' '+q(file)],label);return file;
}
async function verifyHttp(){
  const base='https://deutsche-online-schule.com/kino/public/';
  for(const name of assetNames){
    const response=await fetch(base+'assets/'+name+'?ui_check='+Date.now(),{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Cinema asset HTTP '+response.status+': '+name);
    const bytes=Buffer.from(await response.arrayBuffer()),expected=hash(path.join(root,'ops/kino-ui',name));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Cinema HTTP asset differs: '+name);
  }
  let ready=false;
  for(let i=0;i<8;i++){
    const r=await fetch(base+'kino.php?ui_check='+Date.now(),{signal:AbortSignal.timeout(20000)}),html=await r.text();
    if(r.ok&&html.includes('assets/castle-embed-20261108.css')&&html.includes('assets/castle-embed-20261108.js')){ready=true;break}
    await new Promise(r=>setTimeout(r,2000));
  }
  if(!ready)throw Error('Cinema page did not activate the new appearance');
  console.log('Live cinema page and five static assets are HTTP-verified.');
}
async function deploy(){
  const manifestFile=path.join(out,'deployment.json'),m=JSON.parse(fs.readFileSync(manifestFile));
  if(m.state!=='prepared'||m.assets.length!==assetNames.length||m.candidate!==path.join(out,'candidate-kino.php'))throw Error('Unexpected or already-used cinema deployment');
  if(hash(m.candidate)!==m.candidateHash)throw Error('Prepared PHP source changed');
  for(const [i,name]of assetNames.entries())if(m.assets[i].name!==name||hash(path.join(root,'ops/kino-ui',name))!==m.assets[i].sha256)throw Error('Prepared assets changed');
  const token='20261108-'+crypto.randomBytes(8).toString('hex');
  const stage='kino.ui-stage-'+token+'.php',backup='kino.ui-before-'+token+'.php',remote='/kino/public/';
  const names=inventory('inventory-'+token);
  for(const name of [...assetNames,stage,backup])if(names.has(name.toLowerCase()))throw Error('New cinema target already exists: '+name);
  const before=download(remote+'kino.php','live-before-'+token+'.php','drift-'+token);
  if(hash(before)!==m.beforeHash)throw Error('Live cinema changed since the snapshot; no files were changed');
  let activationStarted=false;
  try{
    ftp(assetNames.map(name=>'put '+q(path.join(root,'ops/kino-ui',name))+' '+q(remote+'assets/'+name)),'assets-'+token);
    ftp(['put '+q(m.candidate)+' '+q(remote+stage)],'stage-'+token);
    if(hash(download(remote+stage,'staged-'+token+'.php','stage-read-'+token))!==m.candidateHash)throw Error('Staged cinema source differs');
    const smoke=await fetch('https://deutsche-online-schule.com'+remote+stage,{signal:AbortSignal.timeout(20000)});
    if(!smoke.ok||!(await smoke.text()).includes('assets/castle-embed-20261108.css'))throw Error('Staged cinema page did not render');
    if(hash(download(remote+'kino.php','race-'+token+'.php','race-'+token))!==m.beforeHash)throw Error('Concurrent cinema edit; activation stopped');
    m.state='activating';m.token=token;fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');activationStarted=true;
    ftp(['mv '+q(remote+'kino.php')+' '+q(remote+backup),'mv '+q(remote+stage)+' '+q(remote+'kino.php')],'activate-'+token);
    if(hash(download(remote+'kino.php','deployed-'+token+'.php','readback-'+token))!==m.candidateHash)throw Error('Live cinema source differs');
    if(hash(download(remote+backup,'backup-'+token+'.php','backup-read-'+token))!==m.beforeHash)throw Error('Cinema backup differs');
    await verifyHttp();
    ftp(['rm '+q(remote+backup)],'cleanup-'+token);
    m.state='verified';m.phpLogicUnchanged=true;m.localBackup=before;activationStarted=false;
    fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');
    const mirror=path.resolve(root,'../../Webseite/kino/public');let mirrorSynced=false;
    try{if(fs.existsSync(path.join(mirror,'kino.php'))&&hash(path.join(mirror,'kino.php'))===m.beforeHash){
      const sources=[...assetNames,'foyer.css','foyer.js'].map(name=>({name,
        source:assetNames.includes(name)?path.join(root,'ops/kino-ui',name):path.join(out,'before',name),
        target:path.join(mirror,'assets',name)}));
      for(const {name,source,target}of sources)
        if(fs.existsSync(target)&&hash(target)!==hash(source))throw Error('Local cinema asset has unrelated edits: '+name);
      fs.mkdirSync(path.join(mirror,'assets'),{recursive:true});
      for(const {source,target}of sources)fs.copyFileSync(source,target);
      fs.copyFileSync(m.candidate,path.join(mirror,'kino.php'));mirrorSynced=true;
    }}catch(error){console.warn('Live UI verified; local mirror left for review: '+error.message)}
    console.log(JSON.stringify({published:true,phpLogicUnchanged:true,assets:assetNames.length,sourceHashVerified:true,localMirrorSynced:mirrorSynced,backupKeptLocally:true}));
  }catch(error){
    if(activationStarted){
      const now=inventory('rollback-inventory-'+token);
      if(now.has('kino.php')){
        const current=download(remote+'kino.php','rollback-current-'+token+'.php','rollback-read-'+token);
        if(hash(current)===m.candidateHash)ftp(['put '+q(before)+' '+q(remote+'kino.php')],'rollback-'+token);
        else if(hash(current)!==m.beforeHash)throw Error('Live cinema was edited independently; automatic rollback refused. Private backup retained.');
      }else if(now.has(backup.toLowerCase())){
        const copy=download(remote+backup,'rollback-backup-'+token+'.php','rollback-backup-read-'+token);
        if(hash(copy)!==m.beforeHash)throw Error('Rollback backup differs');
        ftp(['mv '+q(remote+backup)+' '+q(remote+'kino.php')],'rollback-rename-'+token);
      }
      if(hash(download(remote+'kino.php','restored-'+token+'.php','restored-read-'+token))!==m.beforeHash)throw Error('Rollback source verification failed; private backup retained');
      m.state='rolled-back';fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');
    }else if(m.state!=='verified'){
      const now=inventory('stage-cleanup-inventory-'+token);
      if(now.has(stage.toLowerCase()))ftp(['rm '+q(remote+stage)],'stage-cleanup-'+token);
    }
    throw error;
  }
}
if(require.main===module){
  (async()=>{if(process.argv[2]==='fetch')fetchSource();else if(process.argv[2]==='prepare')prepare();
    else if(process.argv[2]==='deploy')await deploy();else if(process.argv[2]==='verify')await verifyHttp();
    else throw Error('Expected fetch, prepare, deploy or verify command');})().catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={ftp,hash,q,out,privateDir};
