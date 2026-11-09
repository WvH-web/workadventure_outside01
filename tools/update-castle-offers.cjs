'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ftp,quote:q,output}=require('./castle-portal-ftp.cjs');
const files=['src/WorkAdventure/CastleOfferRepository.php','assets/css/workadventure_castle.css'];
const source=path.resolve(__dirname,'../../_castle_offer_permissions_20261109');
const root='/schooltools/verwaltung',origin='https://deutsche-online-schule.com';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function main(){
 const record=JSON.parse(fs.readFileSync(path.join(output,'deployment.json'),'utf8'));
 const id=crypto.randomBytes(12).toString('hex'),token=crypto.randomBytes(32).toString('hex');
 const before={},after={},backup=path.join(output,'update-'+id);fs.mkdirSync(backup);
 for(const file of files){
  const local=path.join(backup,path.basename(file));ftp(['get '+q(root+'/'+file)+' '+q(local)],'update-baseline-'+path.basename(file).toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  before[file]=sha(fs.readFileSync(local));after[file]=sha(fs.readFileSync(path.join(source,file)));
  if(before[file]!==record.files[file])throw Error('Live offer baseline changed; update stopped');
 }
 if(files.every(file=>before[file]===after[file])){console.log('Offer source already matches reviewed update.');return;}
 const data=Buffer.from(JSON.stringify({before,after})).toString('base64');
 const name='__castle_offer_update_'+id+'.php',local=path.join(output,name);
 fs.writeFileSync(local,String.raw`<?php
declare(strict_types=1);header('Content-Type: application/json');header('Cache-Control: no-store');
if(!hash_equals('${sha(token)}',hash('sha256',(string)($_SERVER['HTTP_X_CASTLE_UPDATE']??'')))){http_response_code(404);exit;}
try{
 $phase=json_decode((string)file_get_contents('php://input'),true,8,JSON_THROW_ON_ERROR)['phase']??'';
 if(!in_array($phase,['before','after','rollback-check','rollback'],true))throw new RuntimeException('Phase');
 $data=json_decode(base64_decode('${data}'),true,32,JSON_THROW_ON_ERROR);
 foreach(['src/Auth/Auth.php'=>'e2314464f0aee5b57edc865530adebcf06a3fe5e1c86a1318d11ded91abfbfec','config/bootstrap.php'=>'aa82f112e398b81c2f3e6d58a772e56376bfda6e11ef17571db9bc184a159e5b'] as $file=>$hash)if(hash_file('sha256',__DIR__.'/'.$file)!==$hash)throw new RuntimeException('Unrelated source changed');
 foreach($data['before'] as $file=>$hash){
  $actual=hash_file('sha256',__DIR__.'/'.$file);
  if($phase==='rollback-check'){$ok=in_array($actual,[$hash,$data['after'][$file]],true);}else{$ok=$actual===($phase==='after'?$data['after'][$file]:$hash);}
  if(!$ok)throw new RuntimeException('Concurrent source change');
  if(str_ends_with($file,'.php'))token_get_all((string)file_get_contents(__DIR__.'/'.$file),TOKEN_PARSE);
  if($phase!=='before'&&function_exists('opcache_invalidate'))@opcache_invalidate(__DIR__.'/'.$file,true);
 }
 if($phase==='after'){require __DIR__.'/src/WorkAdventure/CastleOfferRepository.php';if(\WorkAdventure\CastleOfferRepository::providerMinimum('https://garticphone.com:8443')!==16)throw new RuntimeException('Provider floor');}
 echo json_encode(['ready'=>true,'php'=>PHP_VERSION,'filesVerified'=>count($data['before'])]);
}catch(Throwable){http_response_code(503);echo json_encode(['error'=>'Protected source check failed']);}
`);
 let uploaded=false,published=false;
 async function check(phase){const response=await fetch(origin+root+'/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Castle-Update':token},body:JSON.stringify({phase}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Protected offer update check failed: '+phase);return response.json();}
 try{
  ftp(['put '+q(local)+' '+q(root+'/'+name)],'update-probe-'+id);uploaded=true;
  await check('before');published=true;
  ftp(files.map(file=>'put '+q(path.join(source,file))+' '+q(root+'/'+file)),'offer-update-'+id);
  const result=await check('after');
  record.files={...record.files,...after};record.followup={id,php:result.php,filesVerified:result.filesVerified,providerFloorIncludesNondefaultPorts:true,mobileClassNamesFullWidth:true};
  fs.writeFileSync(path.join(output,'deployment.json'),JSON.stringify(record,null,2));
  console.log(JSON.stringify(record.followup,null,2));
 }catch(error){
  if(published){await check('rollback-check');ftp(files.map(file=>'put '+q(path.join(backup,path.basename(file)))+' '+q(root+'/'+file)),'offer-update-rollback-'+id);await check('rollback');}
  throw error;
 }finally{
  if(uploaded){ftp(['rm '+q(root+'/'+name)],'remove-update-probe-'+id);if((await fetch(origin+root+'/'+name,{signal:AbortSignal.timeout(15000)})).status!==404)throw Error('Update probe cleanup not confirmed');console.log('Temporary update probe removed (HTTP 404).');}
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
