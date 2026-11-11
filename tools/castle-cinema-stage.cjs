'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),http=require('node:http'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs'),root=path.resolve(__dirname,'..');
const sourceDefault=path.resolve(root,'../../Webseite/kino');
const php=process.env.PHP_BIN||'C:/xampp/php/php.exe',mysqlRoot=process.env.CASTLE_CINEMA_MYSQL_ROOT||'C:/xampp/mysql';
const SOURCE_SHA='8b0b4ee271959d9e45c378150a592b72c69a05c4778420c84f6cf1bc7c6b29ad';
const SOURCE_FILES=['public/kino.php',...['app_db.php','wvh_auth.php','age_gate.php','chat.php','override.php','client_log.php','log_guard.php'].map(name=>'lib/'+name),
  ...['castle-embed-20261108.css','castle-embed-20261108.js','castle-chat-20261108.svg','castle-reload-20261108.svg','castle-icons-LICENSE-20261108.txt','foyer.css','foyer.js'].map(name=>'public/assets/'+name)];
const REMOTE_ASSETS=Object.freeze({'public/assets/bg_idle.png':'https://deutsche-online-schule.com/kino/public/assets/bg_idle.png'});
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex'),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});});
function within(base,file){const relative=path.relative(base,path.resolve(file));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));return file;}
function snapshot(source){
  assert.equal(fs.realpathSync(source).toLowerCase(),path.resolve(source).toLowerCase());
  const files={};
  for(const name of SOURCE_FILES){const file=within(source,path.join(source,name));assert.equal(fs.lstatSync(file).isSymbolicLink(),false);
    assert.equal(fs.realpathSync(file).toLowerCase(),path.resolve(file).toLowerCase());files[name]=sha(fs.readFileSync(file));}
  assert.equal(files['public/kino.php'],SOURCE_SHA,'The mirror must match the last verified cinema source; do not silently test an unknown copy');
  return files;
}
function child(command,args,options,log){
  const stream=fs.createWriteStream(log,{flags:'wx'}),process=cp.spawn(command,args,{...options,windowsHide:true,stdio:['ignore','pipe','pipe']});
  process.stdout.pipe(stream,{end:false});process.stderr.pipe(stream,{end:false});process.once('close',()=>stream.end());
  process.once('error',()=>{});return process;
}
async function stop(process){
  if(!process||process.exitCode!==null||process.signalCode!==null)return;
  let closed=false;const done=new Promise(resolve=>process.once('close',()=>{closed=true;resolve();}));
  async function settled(){let timer;try{await Promise.race([done,new Promise(resolve=>{timer=setTimeout(resolve,8000);})]);}finally{clearTimeout(timer);}}
  process.kill();await settled();
  if(!closed){process.kill('SIGKILL');await settled();}
  assert.ok(closed,'Owned cinema process did not terminate');
}
function createMediaServer(directory){
  const send=require('./castle-deps.cjs')('send');
  return http.createServer((request,response)=>{
    if(request.url!=='/sync-test-film.webm'){response.writeHead(404);response.end();return;}
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
    if(request.headers.authorization){response.writeHead(403);response.end();return;}
    response.setHeader('Cache-Control','no-store');
    send(request,'/sync-test-film.webm',{root:directory,index:false,dotfiles:'deny',acceptRanges:true,cacheControl:false,etag:false,lastModified:false})
      .on('error',error=>{response.writeHead(error.statusCode||500,error.headers||{});response.end();}).pipe(response);
  });
}
async function createStage({output,source=sourceDefault}={}){
  assert.ok(output&&path.isAbsolute(output));const local=storage.configure();within(local.output,output);
  fs.mkdirSync(output,{recursive:true});const files=snapshot(source),directory=path.join(local.directory,'cinema-php');fs.mkdirSync(directory);
  const app=path.join(directory,'app');fs.mkdirSync(app);const db=path.join(directory,'mysql'),mysqlPort=await freePort(),webPort=await freePort();assert.notEqual(mysqlPort,webPort);
  const database='castle_kino_'+crypto.randomBytes(8).toString('hex'),password=crypto.randomBytes(24).toString('hex');
  const environment={...process.env,DB_HOST:'127.0.0.1',DB_PORT:String(mysqlPort),DB_NAME:database,DB_USER:'root',DB_PASS:password,
    AZURE_TENANT_ID:'synthetic-no-network',AZURE_CLIENT_ID:'synthetic-no-network',AZURE_CLIENT_SECRET:'synthetic-no-network',
    AZURE_REDIRECT_URI:'https://invalid.local/callback',AZURE_SCOPES:'openid',CASTLE_CINEMA_FIXTURE:'1'};
  delete environment.MYSQL_PWD;delete environment.MYSQL_HOME;
  for(const name of SOURCE_FILES){
    for(const base of [app,path.join(output,'source')]){const destination=within(base,path.join(base,name));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(source,name),destination);}
  }
  const remoteAssets={};
  for(const [name,url]of Object.entries(REMOTE_ASSETS)){
    const response=await fetch(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type')?.split(';')[0],'image/png');
    let length=0;const chunks=[];
    for await(const chunk of response.body){length+=chunk.length;assert.ok(length<=8*1024**2,'Public cinema asset exceeds fixture limit');chunks.push(chunk);}
    const raw=Buffer.concat(chunks);assert.equal(raw.subarray(0,8).toString('hex'),'89504e470d0a1a0a');files[name]=sha(raw);
    for(const base of [app,path.join(output,'source')]){const destination=within(base,path.join(base,name));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,raw,{flag:'wx'});}
    remoteAssets[name]={url,sha256:files[name],bytes:raw.length,anonymousVerifiedHttps:true};
  }
  fs.writeFileSync(path.join(app,'.castle-cinema-fixture.json'),JSON.stringify({owner:'wvh-castle-cinema-fixture',database,port:mysqlPort}),{flag:'wx'});
  fs.writeFileSync(path.join(app,'config.php'),"<?php return ['site_title'=>'Schlosskino - getrennte Probe','base_url'=>'https://deutsche-online-schule.com/kino','waiting_room_webcams_enabled'=>false,'workadventure_iframe_api_url'=>''];\n",{flag:'wx'});
  const sourceManifest={lastVerifiedMirror:true,currentLivePhpSourceFetched:false,entrySha256:SOURCE_SHA,files,configCopied:false,
    realSchoolDatabaseUsed:false,realMicrosoftKeysUsed:false,schema:'minimal-synthetic-mysql-not-production-migration',
    mediaTransport:{package:'send',version:require('./castle-deps.cjs')('send/package.json').version,byteRanges:true},remoteAssets};
  fs.writeFileSync(path.join(output,'source-manifest.json'),JSON.stringify(sourceManifest,null,2)+'\n',{flag:'wx'});
  const base='http://127.0.0.1:'+webPort;let sqlServer,webServer,mediaServer,closed=false;
  const command=(action)=>{
    const result=cp.spawnSync(php,[path.join(__dirname,'castle-cinema-fixture.php'),app,action],{cwd:directory,env:environment,encoding:'utf8',windowsHide:true,timeout:20000});
    if(result.status!==0){fs.writeFileSync(path.join(output,'fixture-'+action+'-failure.private.log'),result.stdout+result.stderr);throw Error('Isolated cinema fixture command failed: '+action);}
    assert.deepEqual(JSON.parse(result.stdout),{ok:true,action,syntheticDatabaseOnly:true});
  };
  const close=async()=>{
    if(closed)return;closed=true;
    try{if(mediaServer)await new Promise(resolve=>{mediaServer.close(resolve);mediaServer.closeAllConnections();});}
    finally{try{await stop(webServer);}finally{await stop(sqlServer);}}
    for(const name of SOURCE_FILES)assert.equal(sha(fs.readFileSync(path.join(source,name))),files[name],'Original cinema mirror changed during the isolated test');
    fs.writeFileSync(path.join(output,'stopped.json'),JSON.stringify({passed:true,ownedPhpAndMysqlStopped:true,ownedMediaServerStopped:true,originalSourcesUnchanged:true,publicFilmOrDatabaseChanged:false},null,2)+'\n',{flag:'wx'});
  };
  try{
    const video=path.join(app,'public/sync-test-film.webm');
    const media=cp.spawnSync(process.env.FFMPEG_BIN||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i','testsrc2=size=320x180:rate=6',
      '-f','lavfi','-i','sine=frequency=330:sample_rate=48000','-t','480','-c:v','libvpx','-b:v','75k','-deadline','realtime','-cpu-used','8','-threads','2',
      '-c:a','libopus','-b:a','24k',video],{cwd:directory,env:environment,encoding:'utf8',windowsHide:true,timeout:120000});
    fs.writeFileSync(path.join(output,'test-film-build.private.log'),(media.stdout||'')+(media.stderr||''));
    assert.equal(media.status,0,'Synthetic test-film generation failed');
    mediaServer=createMediaServer(path.join(app,'public'));await new Promise((resolve,reject)=>{mediaServer.once('error',reject);mediaServer.listen(0,'127.0.0.1',resolve);});
    const mediaBase='http://127.0.0.1:'+mediaServer.address().port;
    const install=cp.spawnSync(path.join(mysqlRoot,'bin/mysql_install_db.exe'),['--datadir='+db,'--port='+mysqlPort,'--password='+password,'--silent'],
      {cwd:directory,env:environment,encoding:'utf8',windowsHide:true,timeout:60000});
    fs.writeFileSync(path.join(output,'mysql-initialize.private.log'),(install.stdout||'')+(install.stderr||''));assert.equal(install.status,0,'Isolated MySQL initialization failed');
    sqlServer=child(path.join(mysqlRoot,'bin/mysqld.exe'),['--no-defaults','--standalone','--console','--basedir='+mysqlRoot,'--datadir='+db,'--port='+mysqlPort,
      '--bind-address=127.0.0.1','--skip-name-resolve','--max-connections=10','--innodb-buffer-pool-size=32M','--innodb-log-file-size=8M',
      '--tmpdir='+directory,'--skip-log-bin','--secure-file-priv='+directory,'--log-error='+path.join(output,'mysql-error.private.log')],{cwd:directory,env:environment},path.join(output,'mysql-process.private.log'));
    let connected=false;
    for(let n=0;n<100;n++){
      assert.equal(sqlServer.exitCode,null,'Owned database stopped during startup');
      connected=await new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port:mysqlPort});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.setTimeout(250,()=>{socket.destroy();resolve(false)});});
      if(connected)break;await wait(200);
    }assert.ok(connected,'Owned MySQL did not become ready');command('initialize');
    webServer=child(php,['-d','display_errors=0','-d','log_errors=1','-d','error_log='+path.join(output,'php-error.private.log'),
      '-d','sys_temp_dir='+directory,'-d','session.save_path='+directory,'-S','127.0.0.1:'+webPort,'-t',path.join(app,'public')],
      {cwd:directory,env:environment},path.join(output,'php-process.private.log'));
    let ready=false;
    for(let n=0;n<80;n++){
      assert.equal(webServer.exitCode,null,'Owned PHP stopped during startup');
      try{const response=await fetch(base+'/kino.php?state=1',{signal:AbortSignal.timeout(2000)});const state=await response.json();if(response.ok&&state.mode==='idle'){ready=true;break;}}catch{}
      await wait(200);
    }assert.ok(ready,'Owned real cinema PHP did not become ready');
    return {base,mediaBase,output,files,sourceManifest,command,close,videoSha256:sha(fs.readFileSync(video)),
      async state(){const response=await fetch(base+'/kino.php?state=1',{signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);return response.json();}};
  }catch(error){await close();throw error;}
}
async function smoke(){
  const output=storage.outputPath('cinema-sync-smoke/'+new Date().toISOString().replace(/[:.]/g,'-'));let stage;
  try{
    stage=await createStage({output});assert.equal((await stage.state()).mode,'idle');
    const range=await fetch(stage.mediaBase+'/sync-test-film.webm',{headers:{Range:'bytes=0-127'}});assert.equal(range.status,206);
    assert.equal(range.headers.get('accept-ranges'),'bytes');assert.match(range.headers.get('content-range'),/^bytes 0-127\/\d+$/);assert.equal((await range.arrayBuffer()).byteLength,128);
    stage.command('start');
    const started=await stage.state();assert.equal(started.mode,'live');assert.equal(started.fsk.allowed,true);assert.ok(started.offset_sec>=12);
    stage.command('pause');assert.equal((await stage.state()).paused,true);stage.command('resume');assert.equal((await stage.state()).paused,false);
    stage.command('fsk12');const gated=await stage.state();assert.equal(gated.fsk.allowed,false);assert.equal(gated.video_ref,'');assert.equal(gated.provider,'');
    stage.command('end');assert.equal((await stage.state()).mode,'idle');
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,realPhpAndMysql:true,syntheticScreeningsOnly:true,states:['idle','live','paused','resumed','fsk-denied','ended'],productionPlaybackTested:false},null,2)+'\n');
    console.log(JSON.stringify({passed:true,realPhpAndMysql:true,syntheticScreeningsOnly:true,productionChanged:false}));
  }catch(error){
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:false,errorType:error.name,error:error.message,productionChanged:false},null,2)+'\n');throw error;
  }finally{if(stage)await stage.close();}
}
module.exports={createStage,createMediaServer,snapshot,within,SOURCE_FILES,REMOTE_ASSETS,SOURCE_SHA,freePort,stop};
if(require.main===module){assert.equal(process.argv[2],'--smoke');smoke().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:error.message}));process.exitCode=1;});}
