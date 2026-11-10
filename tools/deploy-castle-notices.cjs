'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {ftp,quote:q,output:privateRoot}=require('./castle-portal-ftp.cjs');
const output=path.join(privateRoot,'notices'),source=path.resolve(__dirname,'../../_castle_notices_20261110');
const remote='/schooltools/verwaltung',origin='https://deutsche-online-schule.com';
const files=['src/WorkAdventure/CastleNoticeRepository.php','api/workadventure_castle_notices.php','admin/workadventure_castle_notices.php',
 'assets/css/workadventure_castle_notices.css','config/sql/PATCH_workadventure_castle_notices_v1.sql','tests/workadventure_castle_notices.php',
 'tests/workadventure_castle_notices_render.php','admin/workadventure_museum.php'];
const guards=['src/Auth/Auth.php','config/bootstrap.php','src/WorkAdventure/CastleOfferRepository.php','api/workadventure_castle_offers.php'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function main(){
 const publish=process.argv.includes('--publish');if(process.argv.slice(2).some(arg=>!['--publish','--check'].includes(arg)))throw Error('Unknown mode');
 fs.mkdirSync(output,{recursive:true});
 const id=crypto.randomBytes(10).toString('hex'),token=crypto.randomBytes(32).toString('hex');
 const before=path.join(output,id,'before');fs.mkdirSync(before,{recursive:true});
 for(const file of ['admin/workadventure_museum.php',...guards]){const local=path.join(before,file);fs.mkdirSync(path.dirname(local),{recursive:true});ftp(['get '+q(remote+'/'+file)+' '+q(local)],'notice-baseline-'+id+'-'+file.replace(/[^a-z0-9]/g,'-'));}
 const baseline=cp.spawnSync('git',['show','db4c304c4c6f73ea6ffbf9ed8df645165b404d8a:admin/workadventure_museum.php'],{cwd:source,encoding:'utf8',windowsHide:true});
 if(baseline.status!==0||baseline.stdout.replaceAll('\r\n','\n')!==fs.readFileSync(path.join(before,'admin/workadventure_museum.php'),'utf8').replaceAll('\r\n','\n'))throw Error('Live museum source differs from reviewed base; no overwrite');
 const old=Object.fromEntries(['admin/workadventure_museum.php',...guards].map(file=>[file,sha(fs.readFileSync(path.join(before,file)))]));
 const hashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(source,file)))]));
 const stage='config/castle_notices_stage_'+id,name='__castle_notices_'+id+'.php';
 const expected=Buffer.from(JSON.stringify({old,hashes,stage})).toString('base64');
 const probe=String.raw`<?php
declare(strict_types=1);ini_set('display_errors','0');header('Content-Type: application/json');header('Cache-Control: no-store');
if(!hash_equals('${sha(token)}',hash('sha256',(string)($_SERVER['HTTP_X_CASTLE_INSTALL']??'')))){http_response_code(404);exit;}
try{
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')throw new RuntimeException('Method');
 $action=json_decode((string)file_get_contents('php://input'),true,8,JSON_THROW_ON_ERROR)['action']??'';
 $expected=json_decode(base64_decode('${expected}'),true,32,JSON_THROW_ON_ERROR);$base=__DIR__;$stage=$base.'/'.$expected['stage'];
 require $base.'/config/app.php';require $base.'/config/database.php';$db=getDB();
 foreach($expected['old'] as $file=>$hash)if(!array_key_exists($file,$expected['hashes'])&&hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Unrelated source changed');
 if(in_array($action,['check','migrate','prepublish'],true)){
  foreach($expected['old'] as $file=>$hash)if(hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Live baseline changed');
  foreach($expected['hashes'] as $file=>$hash){if(hash_file('sha256',$stage.'/'.$file)!==$hash)throw new RuntimeException('Stage mismatch');if(!isset($expected['old'][$file])&&is_file($base.'/'.$file))throw new RuntimeException('Destination exists');if(str_ends_with($file,'.php'))token_get_all((string)file_get_contents($stage.'/'.$file),TOKEN_PARSE);}
 }
 if($action==='check'){
  if((int)$db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workadventure_castle_notices'")->fetchColumn()!==0)throw new RuntimeException('Table already exists');
  require $stage.'/tests/workadventure_castle_notices.php';$fixtures=castleNoticeFixtures($db,true);
  require $stage.'/tests/workadventure_castle_notices_render.php';$renders=castleNoticeRenderFixtures($db);
  $db->exec('DROP TEMPORARY TABLE workadventure_castle_notices');
  echo json_encode(['php'=>PHP_VERSION,'fixtures'=>$fixtures,'renders'=>$renders,'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE],JSON_THROW_ON_ERROR);
 }elseif($action==='migrate'){
  if((int)$db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workadventure_castle_notices'")->fetchColumn()!==0)throw new RuntimeException('Concurrent migration');
  $db->exec((string)file_get_contents($stage.'/config/sql/PATCH_workadventure_castle_notices_v1.sql'));
  echo json_encode(['rows'=>(int)$db->query('SELECT COUNT(*) FROM workadventure_castle_notices')->fetchColumn()]);
 }elseif($action==='prepublish'){echo json_encode(['ready'=>true]);
 }elseif($action==='verify'){
  $count=0;foreach($expected['hashes'] as $file=>$hash){if(str_starts_with($file,'tests/'))continue;if(hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Published source mismatch');if(str_ends_with($file,'.php')&&function_exists('opcache_invalidate'))@opcache_invalidate($base.'/'.$file,true);$count++;}
  require $base.'/src/WorkAdventure/CastleNoticeRepository.php';$feed=(new \WorkAdventure\CastleNoticeRepository($db))->publicFeed(\WorkAdventure\CastleNoticeRepository::now());
  echo json_encode(['filesVerified'=>$count,'activeNotices'=>count($feed['items']),'guardsUnchanged'=>true,'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE]);
 }elseif($action==='rollback-check'){
  foreach($expected['hashes'] as $file=>$hash)if(is_file($base.'/'.$file)&&hash_file('sha256',$base.'/'.$file)!==$hash&&hash_file('sha256',$base.'/'.$file)!==($expected['old'][$file]??null))throw new RuntimeException('Concurrent source edit');echo json_encode(['ready'=>true]);
 }else throw new RuntimeException('Action');
}catch(Throwable $error){http_response_code(503);$message=$error instanceof RuntimeException?$error->getMessage():'Protected operation failed';echo json_encode(['error'=>preg_match('/^(Fixture failed: [a-z0-9-]+|[A-Za-z ]{1,80})$/D',$message)?$message:'Protected operation failed']);}
`;
 const local=path.join(output,id,name);fs.writeFileSync(local,probe);
 const dirs=['','src','src/WorkAdventure','api','admin','assets','assets/css','config','config/sql','tests'];
 let uploaded=false,started=false;
 const publicFiles=files.filter(file=>!file.startsWith('tests/'));
 async function action(action){const response=await fetch(origin+remote+'/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Castle-Install':token},body:JSON.stringify({action}),signal:AbortSignal.timeout(45000)});const text=await response.text();if(!response.ok){fs.writeFileSync(path.join(output,id,action+'-failure.txt'),text);throw Error('Protected notice '+action+' failed (HTTP '+response.status+')');}return JSON.parse(text);}
 try{
  ftp(dirs.map(dir=>'mkdir '+q(remote+'/'+stage+(dir?'/'+dir:''))).concat(files.map(file=>'put '+q(path.join(source,file))+' '+q(remote+'/'+stage+'/'+file))),'notice-stage-'+id);
  if((await fetch(origin+remote+'/'+stage+'/tests/workadventure_castle_notices.php')).status!==403)throw Error('Staging is not protected');
  ftp(['put '+q(local)+' '+q(remote+'/'+name)],'notice-probe-'+id);uploaded=true;
  const check=await action('check');if(check.sessionStarted||check.fixtures.realSchoolRowsWritten||check.fixtures.passed<45)throw Error('Fixture preflight failed');
  const renderDir=path.join(output,'renders');fs.mkdirSync(renderDir,{recursive:true});
  for(const [key,html] of Object.entries(check.renders))fs.writeFileSync(path.join(renderDir,key+'.html'),html);
  delete check.renders;fs.writeFileSync(path.join(output,'preflight.json'),JSON.stringify(check,null,2));
  console.log(JSON.stringify({preflight:'passed',php:check.php,isolatedFixtures:check.fixtures.passed,sessionStarted:false,realSchoolRowsWritten:false}));
  if(!publish)return;
  const migration=await action('migrate');if(migration.rows!==0)throw Error('New notice table not empty');await action('prepublish');
  started=true;ftp(publicFiles.map(file=>'put '+q(path.join(source,file))+' '+q(remote+'/'+file)),'notice-publish-'+id);
  const verified=await action('verify');if(verified.sessionStarted||verified.filesVerified!==publicFiles.length)throw Error('Live source verification failed');
  const api=origin+remote+'/api/workadventure_castle_notices.php';const response=await fetch(api,{signal:AbortSignal.timeout(15000)}),feed=await response.json();
  if(response.status!==200||response.headers.get('set-cookie')||response.headers.get('cache-control')!=='no-store'||response.headers.get('access-control-allow-origin')!=='*'||feed.version!==1||!Array.isArray(feed.items))throw Error('Public feed failed');
  for(const [suffix,method,status] of [['','POST',405],['?board=hallnotice01','GET',404]]){const rejected=await fetch(api+suffix,{method});if(rejected.status!==status||rejected.headers.get('set-cookie'))throw Error('Public endpoint rejection failed');}
  const admin=await fetch(origin+remote+'/admin/workadventure_castle_notices.php',{redirect:'manual'});
  if(admin.status!==302||!admin.headers.get('location')?.startsWith(origin+remote+'/login.php?'))throw Error('Admin guard failed');
  const evidence={id,files:hashes,php:check.php,isolatedFixtures:check.fixtures.passed,verified,publicFeedSessionless:true,adminGuardHttp:302,
   noPupilDataUsed:true,noNoticesPublished:true,existingCalendarAuthAndOffersUnchanged:true,realAdminBrowserLoginTested:false,sourceCommit:cp.spawnSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8',windowsHide:true}).stdout.trim()};
  fs.writeFileSync(path.join(output,'deployment.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 }catch(error){
  if(started){await action('rollback-check');ftp(['put '+q(path.join(before,'admin/workadventure_museum.php'))+' '+q(remote+'/admin/workadventure_museum.php'),...publicFiles.filter(file=>file!=='admin/workadventure_museum.php').map(file=>'rm '+q(remote+'/'+file))],'notice-rollback-'+id);}
  throw error;
 }finally{
  if(uploaded){ftp(['rm '+q(remote+'/'+name)],'notice-remove-probe-'+id);if((await fetch(origin+remote+'/'+name)).status!==404)throw Error('Installer cleanup not confirmed');}
  ftp(files.map(file=>'rm '+q(remote+'/'+stage+'/'+file)).concat([...dirs].reverse().map(dir=>'rmdir '+q(remote+'/'+stage+(dir?'/'+dir:'')))),'notice-remove-stage-'+id,true);
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
