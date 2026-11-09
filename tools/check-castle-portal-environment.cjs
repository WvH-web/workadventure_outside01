const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ftp,quote,output}=require('./castle-portal-ftp.cjs');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function main(){
  const id=crypto.randomBytes(12).toString('hex'),token=crypto.randomBytes(32).toString('hex');
  const name='__castle_inventory_'+id+'.php',local=path.join(output,name),remote='/schooltools/verwaltung/'+name;
  const source=`<?php
header('Content-Type: application/json');header('Cache-Control: no-store');
if(!hash_equals('${hash(token)}',hash('sha256',(string)($_SERVER['HTTP_X_CASTLE_PROBE']??'')))){http_response_code(404);exit;}
try{require __DIR__.'/config/app.php';require __DIR__.'/config/database.php';$db=getDB();
$count=$db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workadventure_castle_offers'")->fetchColumn();
echo json_encode(['php'=>PHP_VERSION,'database'=>$db->getAttribute(PDO::ATTR_SERVER_VERSION),'base'=>BASE_PATH,'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE,'policyTableExists'=>(int)$count>0,'authSha256'=>hash_file('sha256',__DIR__.'/src/Auth/Auth.php'),'museumSha256'=>hash_file('sha256',__DIR__.'/admin/workadventure_museum.php')]);
}catch(Throwable){http_response_code(503);echo json_encode(['error'=>'unavailable']);}`;
  fs.writeFileSync(local,source);let uploaded=false;
  try{
    ftp(['put '+quote(local)+' '+quote(remote)],'environment-probe-upload');uploaded=true;
    const response=await fetch('https://deutsche-online-schule.com'+remote,{headers:{'X-Castle-Probe':token},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Protected environment check failed (HTTP '+response.status+')');
    const result=await response.json();if(result.sessionStarted)throw Error('Read-only API configuration unexpectedly starts a session');
    fs.writeFileSync(path.join(output,'environment.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{
    if(uploaded){ftp(['rm '+quote(remote)],'environment-probe-remove');const check=await fetch('https://deutsche-online-schule.com'+remote,{signal:AbortSignal.timeout(15000)});if(check.status!==404)throw Error('Environment probe removal not confirmed');console.log('Temporary environment check removed (HTTP 404).');}
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
