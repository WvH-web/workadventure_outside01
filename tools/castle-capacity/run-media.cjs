'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),crypto=require('node:crypto');
const {parseReport}=require('./report.cjs');
const workspace=path.resolve(__dirname,'../../..'),privateRoot=path.join(os.homedir(),'.codex/private/workadventure-school-test-accounts/qa');
const handoff=path.join(privateRoot,'capacity-handoff.private.json'),output=require('../castle-local-storage.cjs').outputPath('castle-capacity/media');
const cli=path.join(require('../castle-local-storage.cjs').outputPath('castle-capacity/private/bin'),'lk.exe');
let runOutput=output;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function remote(operation,room){
 if(!['observe','cleanup'].includes(operation))throw Error('Invalid remote capacity operation');
 if(operation==='cleanup'){
  if(!/^castle-capacity-[a-f0-9]{24}$/.test(room))throw Error('Invalid cleanup room');
  const file=path.join(runOutput,'cleanup-request.json');fs.writeFileSync(file,JSON.stringify({room}));
  const transfer=path.join(workspace,'tools/workadventure-upgrade-20261107/transfer.ps1');
  const command="& '"+transfer.replaceAll("'","''")+"' -Mode put -LocalPath '"+file.replaceAll("'","''")+"' -RemotePath '/tmp/wvh-castle-capacity-cleanup-request.json'";
  await new Promise((resolve,reject)=>{const child=cp.spawn('pwsh.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:'ignore'}),timer=setTimeout(()=>child.kill(),30000);
   child.once('error',()=>{clearTimeout(timer);reject(Error('Cleanup request transfer failed'));});child.once('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error('Cleanup request transfer failed'));});});
 }
 const script=path.join(__dirname,operation+'.py'),helper=path.join(workspace,'tools/workadventure-upgrade-20261107/remote.ps1');
 return new Promise((resolve,reject)=>{
  const command="& '"+helper.replaceAll("'","''")+"' -ScriptPath '"+script.replaceAll("'","''")+"'";
  const child=cp.spawn('pwsh.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',settled=false;const timer=setTimeout(()=>child.kill(),30000);
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>200000)child.kill();});child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>200000)child.kill();});
  child.on('error',()=>{if(!settled){settled=true;clearTimeout(timer);reject(Error('Remote resource guard could not start'));}});
  child.on('close',code=>{clearTimeout(timer);if(settled)return;settled=true;
   if(code!==0){fs.writeFileSync(path.join(runOutput,'remote-'+operation+'-failure.private.log'),stdout+'\n'+stderr);reject(Error('Remote resource guard failed'));return;}
   try{resolve(JSON.parse(stdout.trim()));}catch{reject(Error('Invalid resource-guard response'));}
  });
 });
}
async function main(){
 fs.mkdirSync(output,{recursive:true});if(!fs.existsSync(handoff))throw Error('Fresh private capacity handoff required');
 const credentials=JSON.parse(fs.readFileSync(handoff,'utf8'));fs.unlinkSync(handoff);
 const url=new URL(credentials.url);
 if(credentials.version!==1||url.protocol!=='wss:'||url.hostname!=='together.deine-schule.com'||url.username||url.password||url.search||url.hash||
  !/^castle-capacity-[a-f0-9]{24}$/.test(credentials.room)||credentials.prefix!=='castlecap'+credentials.room.slice('castle-capacity-'.length)||credentials.expiresAt*1000<=Date.now())throw Error('Invalid or expired private handoff');
 runOutput=path.join(output,credentials.room);fs.mkdirSync(runOutput,{recursive:false});
 const env={...process.env,NO_COLOR:'1',TERM:'dumb',LIVEKIT_URL:credentials.url,LIVEKIT_API_KEY:credentials.apiKey,LIVEKIT_API_SECRET:credentials.apiSecret};
 const stages=[],samples=[];let active,cleanup,failed;
 const sample=async()=>{const value=await remote('observe');if(value.room!==credentials.room)throw Error('Resource guard is bound to a different test');samples.push(value);if(!value.safeToContinue)throw Error('Media probe stopped to preserve existing service or resource headroom');return value;};
 try{
  if(os.freemem()<1.5*1024**3)throw Error('Insufficient local resource headroom');await sample();
  for(const [subscribers,duration] of [[25,20],[100,30],[200,40],[400,60]]){
   const started=Date.now(),args=['--legacy-auth','--quiet','perf','load-test','--room',credentials.room,'--identity-prefix',credentials.prefix,
    '--audio-publishers','1','--video-publishers','0','--subscribers',String(subscribers),'--num-per-second','10','--duration',duration+'s'];
   let stdout='',stderr='',done=false,exit;active=cp.spawn(cli,args,{env,cwd:runOutput,windowsHide:true,stdio:['ignore','pipe','pipe']});
   const completion=new Promise((resolve,reject)=>{active.once('error',()=>{done=true;reject(Error('Official media load tool could not start'));});active.once('close',code=>{done=true;exit=code;resolve();});});
   active.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>2000000)active.kill();});active.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>2000000)active.kill();});
   console.log(JSON.stringify({phase:'running',audioPublisher:1,subscribers,holdSeconds:duration,syntheticOnly:true}));
   try{
    while(!done){await pause(3000);if(done)break;if(Date.now()-started>(duration+Math.ceil((subscribers+1)/10)+90)*1000)throw Error('Media stage deadline exceeded');
     if(os.freemem()<1.5*1024**3)throw Error('Local test-generator resources exhausted');await sample();}
    await completion;
   }catch(error){active.kill();await completion.catch(()=>{});throw error;}
   finally{
    const redact=text=>text.replaceAll(credentials.apiKey,'[key]').replaceAll(credentials.apiSecret,'[secret]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[token]');
    fs.writeFileSync(path.join(runOutput,'media-'+subscribers+'.stdout.private.log'),redact(stdout));fs.writeFileSync(path.join(runOutput,'media-'+subscribers+'.stderr.private.log'),redact(stderr));active=null;
   }
   if(exit!==0)throw Error('Official media load tool failed');
   const parsed=parseReport(stdout,subscribers),proof={...parsed,holdSeconds:duration,elapsedMs:Date.now()-started,externalWindowsGenerator:true};stages.push(proof);console.log(JSON.stringify({phase:'passed',...proof}));
   await pause(6000);let clear=await sample();for(let retry=0;clear.media.ownParticipants>0&&retry<10;retry++){await pause(2000);clear=await sample();}
   if(clear.media.ownParticipants>0)throw Error('Previous synthetic peers did not disconnect');
  }
 }catch(error){failed=error.message;}
 finally{
  if(active){active.kill();await new Promise(resolve=>active.once('close',resolve));}
  cleanup=await remote('cleanup',credentials.room);if(cleanup.room!==credentials.room||!cleanup.ownTestRoomRemoved||!cleanup.privateHandoffRemoved)throw Error('Media test cleanup not confirmed');
  if(!cleanup.existingPlatformAndMapsUnchanged)failed=failed||'Existing platform changed during the media probe';
  delete env.LIVEKIT_API_KEY;delete env.LIVEKIT_API_SECRET;delete credentials.apiKey;delete credentials.apiSecret;
 }
 const result={passed:!failed,scope:'external synthetic LiveKit audio fan-out only',schoolLoginLoadTested:false,nativeAvatarsLoadTested:false,camerasOrClassroomVideoTested:false,
  fullCastleApprovalFor400:false,stages,samples,cleanup,...(failed?{error:failed}:{}),checkedAt:new Date().toISOString()};
 fs.writeFileSync(path.join(runOutput,'media-result.private.json'),JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(output,'media-result.private.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({passed:result.passed,stages:stages.length,highestPassedSubscribers:Math.max(0,...stages.map(row=>row.subscribers)),cleanupConfirmed:true,fullCastleApprovalFor400:false,...(failed?{error:failed}:{})}));
 if(failed)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
