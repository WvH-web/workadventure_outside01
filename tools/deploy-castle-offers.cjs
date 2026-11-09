'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ftp,quote:q,output}=require('./castle-portal-ftp.cjs');
const source=path.resolve(__dirname,'../../_castle_offer_permissions_20261109');
const remote='/schooltools/verwaltung',origin='https://deutsche-online-schule.com';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const files=['src/WorkAdventure/CastleOfferRepository.php','api/workadventure_castle_offers.php',
 'admin/workadventure_castle.php','assets/css/workadventure_castle.css','assets/js/workadventure_castle.js',
 'config/sql/PATCH_workadventure_castle_offers_v1.sql','tests/workadventure_castle_offers.php',
 'admin/workadventure_museum.php','api/workadventure_museum_open.php'];
const old={
 'admin/workadventure_museum.php':'7d64e2bf45ada2cabeeb115682c84ad660e57138c9bcf6040703238cbdb3d46c',
 'api/workadventure_museum_open.php':'7c3d23423e6114c37bd1e900e8c9c7a4ce83e12777afb78b204db84f23eef727',
 'src/Auth/Auth.php':'e2314464f0aee5b57edc865530adebcf06a3fe5e1c86a1318d11ded91abfbfec',
 'config/bootstrap.php':'aa82f112e398b81c2f3e6d58a772e56376bfda6e11ef17571db9bc184a159e5b',
};
async function main(){
 const id=crypto.randomBytes(12).toString('hex'),token=crypto.randomBytes(32).toString('hex');
 const stage='config/castle_offer_stage_'+id,name='__castle_install_'+id+'.php';
 const hashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(source,file)))]));
 const secret=path.join(output,'workadventure_castle_secret.php');
 const secretBytes=fs.readFileSync(secret);const key=secretBytes.toString().match(/'key'=>'([a-f0-9]{64})'/)?.[1];
 if(!key)throw Error('Protected catalog configuration missing');
 const secretPath='config/workadventure_castle_secret.php';
 const expected=Buffer.from(JSON.stringify({old,hashes,stage,secretPath,secretSha:sha(secretBytes)})).toString('base64');
 const probe=String.raw`<?php
declare(strict_types=1);ini_set('display_errors','0');
header('Content-Type: application/json');header('Cache-Control: no-store');
if(!hash_equals('${sha(token)}',hash('sha256',(string)($_SERVER['HTTP_X_CASTLE_INSTALL']??'')))){http_response_code(404);exit;}
try{
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')throw new RuntimeException('Method');
 $action=json_decode((string)file_get_contents('php://input'),true,8,JSON_THROW_ON_ERROR)['action']??'';
 $expected=json_decode(base64_decode('${expected}'),true,32,JSON_THROW_ON_ERROR);$base=__DIR__;$stage=$base.'/'.$expected['stage'];
 require $base.'/config/app.php';require $base.'/config/database.php';$db=getDB();
 $ids=['stumbleguysgame','haxballarea01','gamesarea01','gamesarea02','gamesarea03','gamesarea04','gamesarea05'];
 $readLinks=static function()use($db,$ids){$stmt=$db->prepare('SELECT board_key,title,target_url,content_type,is_active,updated_at FROM workadventure_museum_boards WHERE board_key IN ('.implode(',',array_fill(0,count($ids),'?')).') ORDER BY board_key');$stmt->execute($ids);return hash('sha256',json_encode($stmt->fetchAll(PDO::FETCH_ASSOC),JSON_THROW_ON_ERROR));};
 foreach($expected['old'] as $file=>$hash)if(!array_key_exists($file,$expected['hashes']) && hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Unrelated source changed');
 if($action==='check'){
  foreach($expected['old'] as $file=>$hash)if(hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Live baseline changed');
  foreach($expected['hashes'] as $file=>$hash){
   if(hash_file('sha256',$stage.'/'.$file)!==$hash)throw new RuntimeException('Staged source changed');
   if(str_ends_with($file,'.php'))token_get_all((string)file_get_contents($stage.'/'.$file),TOKEN_PARSE);
   if(!isset($expected['old'][$file]) && is_file($base.'/'.$file))throw new RuntimeException('New destination already exists');
  }
  if(is_file($base.'/'.$expected['secretPath']))throw new RuntimeException('Private configuration already exists');
  $table=$db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workadventure_castle_offers'")->fetchColumn();
  if((int)$table!==0)throw new RuntimeException('Policy table already exists');
  require $stage.'/tests/workadventure_castle_offers.php';$fixtures=castleOfferFixtures($db);
  echo json_encode(['php'=>PHP_VERSION,'fixtures'=>$fixtures,'linksSha256'=>$readLinks(),'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE,
    'createSourceDirectory'=>!is_dir($base.'/src/WorkAdventure')],JSON_THROW_ON_ERROR);
 }elseif($action==='migrate'){
  if((int)$db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workadventure_castle_offers'")->fetchColumn()!==0)throw new RuntimeException('Concurrent migration');
  $sql=(string)file_get_contents($stage.'/config/sql/PATCH_workadventure_castle_offers_v1.sql');
  if(hash('sha256',$sql)!==$expected['hashes']['config/sql/PATCH_workadventure_castle_offers_v1.sql'])throw new RuntimeException('Migration changed');
  $db->exec($sql);echo json_encode(['newDraftRows'=>(int)$db->query('SELECT COUNT(*) FROM workadventure_castle_offers WHERE is_published=0')->fetchColumn(),'linksSha256'=>$readLinks()]);
 }elseif($action==='prepublish'){
  foreach($expected['old'] as $file=>$hash)if(hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Live baseline changed');
  foreach($expected['hashes'] as $file=>$hash)if(!isset($expected['old'][$file]) && is_file($base.'/'.$file))throw new RuntimeException('New destination already exists');
  if(is_file($base.'/'.$expected['secretPath']))throw new RuntimeException('Private configuration already exists');
  echo json_encode(['ready'=>true]);
 }elseif($action==='rollback-check'){
  foreach($expected['hashes'] as $file=>$hash)if(is_file($base.'/'.$file) && hash_file('sha256',$base.'/'.$file)!==$hash && hash_file('sha256',$base.'/'.$file)!==($expected['old'][$file]??null))throw new RuntimeException('Concurrent source edit');
  if(is_file($base.'/'.$expected['secretPath']) && hash_file('sha256',$base.'/'.$expected['secretPath'])!==$expected['secretSha'])throw new RuntimeException('Concurrent configuration edit');
  echo json_encode(['ready'=>true]);
 }elseif($action==='verify'){
  $count=0;foreach($expected['hashes'] as $file=>$hash){if(str_starts_with($file,'tests/'))continue;if(hash_file('sha256',$base.'/'.$file)!==$hash)throw new RuntimeException('Published source mismatch');$count++;if(str_ends_with($file,'.php')&&function_exists('opcache_invalidate'))@opcache_invalidate($base.'/'.$file,true);}
  if(hash_file('sha256',$base.'/'.$expected['secretPath'])!==$expected['secretSha'])throw new RuntimeException('Private configuration mismatch');
  if(function_exists('opcache_invalidate'))@opcache_invalidate($base.'/'.$expected['secretPath'],true);
  require $base.'/src/WorkAdventure/CastleOfferRepository.php';$offers=(new \WorkAdventure\CastleOfferRepository($db))->runtime();
  if(count($offers)!==7 || array_filter($offers,static fn($o)=>$o['rule']['published']))throw new RuntimeException('Unexpected publication');
  echo json_encode(['filesVerified'=>$count,'draftOffers'=>count($offers),'linksSha256'=>$readLinks(),'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE]);
 }else throw new RuntimeException('Unknown action');
}catch(Throwable $error){http_response_code(503);$message=$error instanceof RuntimeException?$error->getMessage():'Protected operation failed';echo json_encode(['error'=>preg_match('/^(Fixture failed: [a-z0-9-]+|[A-Za-z ]{1,80})$/D',$message)?$message:'Protected operation failed']);}
`;
 const local=path.join(output,name);fs.writeFileSync(local,probe);
 const stageDirs=['','src','src/WorkAdventure','api','admin','assets','assets/css','assets/js','config','config/sql','tests'];
 let probeUploaded=false,publishStarted=false,migrated=false;
 const publishedFiles=files.filter(f=>!f.startsWith('tests/'));
 async function action(action){
  const response=await fetch(origin+remote+'/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Castle-Install':token},body:JSON.stringify({action}),signal:AbortSignal.timeout(45000)});
  if(!response.ok){fs.writeFileSync(path.join(output,'install-'+id+'-'+action+'-failure.txt'),await response.text());throw Error('Protected portal '+action+' failed (HTTP '+response.status+')');}
  return response.json();
 }
 try{
  ftp(stageDirs.map(dir=>'mkdir '+q(remote+'/'+stage+(dir?'/'+dir:''))).concat(files.map(file=>'put '+q(path.join(source,file))+' '+q(remote+'/'+stage+'/'+file))), 'stage-'+id);
  const denied=await fetch(origin+remote+'/'+stage+'/tests/workadventure_castle_offers.php',{signal:AbortSignal.timeout(15000)});
  if(denied.status!==403)throw Error('Protected staging directory is not denied');
  ftp(['put '+q(local)+' '+q(remote+'/'+name)],'probe-'+id);probeUploaded=true;
  const check=await action('check');if(check.sessionStarted||check.fixtures.passed!==59||check.fixtures.realSchoolRowsWritten)throw Error('Unexpected PHP fixture result');
  fs.writeFileSync(path.join(output,'preflight-'+id+'.json'),JSON.stringify(check,null,2));
  console.log(JSON.stringify({php:check.php,isolatedFixtures:check.fixtures.passed,stagingDenied:true,preflightPassed:true}));
  const migration=await action('migrate');migrated=true;
  if(migration.newDraftRows!==7||migration.linksSha256!==check.linksSha256)throw Error('Unexpected draft migration result');
  await action('prepublish');
  if(check.createSourceDirectory)ftp(['mkdir '+q(remote+'/src/WorkAdventure')],'create-source-'+id);
  publishStarted=true;
  // The FTP account can publish source; the shared Windows PHP worker cannot rename it.
  ftp(publishedFiles.map(file=>'put '+q(path.join(source,file))+' '+q(remote+'/'+file)).concat(['put '+q(secret)+' '+q(remote+'/'+secretPath)]),'publish-'+id);
  const verify=await action('verify');
  if(verify.sessionStarted||verify.linksSha256!==check.linksSha256||verify.filesVerified!==publishedFiles.length)throw Error('Portal source verification failed');
  const api=origin+remote+'/api/workadventure_castle_offers.php';
  const catalog=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json','X-Castle-School-Key':key},body:'{}',signal:AbortSignal.timeout(15000)});
  const value=await catalog.json();if(catalog.status!==200||catalog.headers.get('set-cookie')||value.version!==1||value.offers?.length!==7||value.offers.some(o=>o.rule.published))throw Error('Private catalog API check failed');
  const negatives=[];
  for(const item of [{method:'GET',status:405},{method:'POST',status:401,body:'{}'},{method:'POST',status:400,body:'[]',key:true},{method:'POST',status:400,body:'{"identifier":"synthetic@invalid.local"}',key:true}]){
   const response=await fetch(api,{method:item.method,headers:{'Content-Type':'application/json',...(item.key?{'X-Castle-School-Key':key}:{})},...(item.body?{body:item.body}:{}),signal:AbortSignal.timeout(15000)});
   if(response.status!==item.status||response.headers.get('set-cookie'))throw Error('Private catalog rejection failed');negatives.push(response.status);
  }
  if((await fetch(origin+remote+'/'+secretPath,{signal:AbortSignal.timeout(15000)})).status!==403)throw Error('Private configuration is not denied');
  const admin=await fetch(origin+remote+'/admin/workadventure_castle.php',{redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(admin.status!==302||!admin.headers.get('location')?.startsWith(origin+remote+'/login.php?'))throw Error('Admin authentication guard failed');
  const evidence={id,files:hashes,php:check.php,isolatedFixtures:59,newDraftRows:7,sharedLinksUnchanged:true,authAndBootstrapUnchanged:true,
   privateApiReady:true,privateApiCreatesNoSession:true,rejectionStatuses:negatives,secretConfigHttp:403,anonymousAdminHttp:302,
   newCastleLaunchIntegrationComplete:false,realAdminBrowserLoginTested:false};
  fs.writeFileSync(path.join(output,'deployment.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
 }catch(error){
  if(publishStarted){
   await action('rollback-check');
   const restore=Object.keys(old).filter(file=>files.includes(file)).map(file=>'put '+q(path.join(output,'before',file))+' '+q(remote+'/'+file));
   const remove=publishedFiles.filter(file=>!Object.hasOwn(old,file)).concat(secretPath).map(file=>'rm '+q(remote+'/'+file));
   ftp(restore.concat(remove),'rollback-'+id,true);
  }
  console.error('Portal install stopped; new policy table, if created, contains draft rows only: '+migrated);throw error;
 }finally{
  if(probeUploaded){ftp(['rm '+q(remote+'/'+name)],'remove-probe-'+id);if((await fetch(origin+remote+'/'+name,{signal:AbortSignal.timeout(15000)})).status!==404)throw Error('Installer probe cleanup not confirmed');}
  const cleanup=files.map(file=>'rm '+q(remote+'/'+stage+'/'+file)).concat([...stageDirs].reverse().map(dir=>'rmdir '+q(remote+'/'+stage+(dir?'/'+dir:''))));
  ftp(cleanup,'remove-stage-'+id,true);
  console.log('Temporary installer removed; protected staging cleanup attempted.');
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
