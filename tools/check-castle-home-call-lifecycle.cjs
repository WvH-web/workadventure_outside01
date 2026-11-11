'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright');
const origin='https://together.deine-schule.com',base=origin+'/castle-homes/';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const candidate=process.argv.includes('--candidate'),attempt=process.argv.find(value=>/^--attempt=[12]$/.test(value))?.split('=')[1]||'1';
const output=path.join(privateRoot,'qa/'+(candidate?'homes-call-control-candidate-'+attempt:'homes-call-lifecycle'));
let stage='configuration';

function wav(hz){
 const rate=48000,length=rate*12,data=Buffer.alloc(44+length*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(length*2,40);
 for(let i=0;i<length;i++)data.writeInt16LE(Math.round(6500*Math.sin(2*Math.PI*hz*i/rate)*(.4+.6*Math.max(0,Math.sin(i/rate*5)))),44+i*2);return data;
}

async function main(){
 await fs.mkdir(output,{recursive:true,mode:0o700});
 const handoff=JSON.parse(await fs.readFile(path.join(privateRoot,'handoff.json'),'utf8'));assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);
 const sso=JSON.parse(await fs.readFile(path.join(privateRoot,'qa/sso-result.json'),'utf8'));assert.ok(sso.passed&&['A','B'].every(key=>sso.results.some(row=>row.account===key&&row.normalMicrosoftLogin&&row.freshPupilAccess)));
 const users=[],browsers=[],errors=[],responses=[],requestFailures=[],decodings=[],videoDecodings=[],transitions=[],controlTimings=[],pendingReads=[],routed=[],servedModules=new Map();
 const candidateSources={};if(candidate)for(const [name,file]of [['proximity.js','room-call.js'],['castle-room-control.js','room-control.js']])candidateSources[name]=await fs.readFile(path.join(__dirname,'../ops/castle-homes/public',file));
 async function create(key,label,width,hz){
  const state=JSON.parse(await fs.readFile(path.join(privateRoot,'qa/sso-'+key+'.private.json'),'utf8'));
  const token=state.origins.find(row=>row.origin===origin)?.localStorage.find(row=>row.name==='authToken')?.value;assert.ok(token?.length>40);
  const tone=path.join(output,label+'-microphone.wav');await fs.writeFile(tone,wav(hz),{mode:0o600});
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--use-file-for-fake-audio-capture='+tone]});browsers.push(browser);
  const context=await browser.newContext({storageState:state,viewport:{width,height:900},...(width<500?{isMobile:true,hasTouch:true}:{})});
  if(candidate)await context.route(/^https:\/\/together\.deine-schule\.com\/castle-homes\/view\/[a-f0-9-]{36}\/(?:proximity\.js|castle-room-control\.js)$/,async route=>{
   const name=new URL(route.request().url()).pathname.split('/').at(-1);assert.ok(Object.hasOwn(candidateSources,name));routed.push(name);
   await route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:candidateSources[name]});
  });
  await context.addInitScript(()=>{
   if(location.origin!=='https://together.deine-schule.com')return;
   if(window===top){window.__qaHeldTracks=[];window.__qaCaptureEvents=[];}
   if(!location.pathname.startsWith('/castle-homes/view/')||!navigator.mediaDevices)return;
   window.__qaCaptureEvents=[];const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async constraints=>{const row={audio:!!constraints.audio,video:!!constraints.video,started:performance.now()};window.__qaCaptureEvents.push(row);top.__qaCaptureEvents.push(row);
    const stream=await capture(constraints);row.ready=performance.now();for(const track of stream.getTracks())top.__qaHeldTracks.push(track);return stream;};
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push({stage,label,name:error.name,message:error.message}));
  page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))responses.push({stage,label,status:response.status(),path:new URL(response.url()).pathname});});
  page.on('response',response=>{const pathname=new URL(response.url()).pathname;if(response.status()!==200||!/^\/castle-homes\/view\/[a-f0-9-]{36}\/(?:proximity\.js|castle-room-control\.js)$/.test(pathname))return;
   const name=pathname.split('/').at(-1);pendingReads.push(response.body().then(raw=>{const hashes=servedModules.get(name)||new Set();hashes.add(crypto.createHash('sha256').update(raw).digest('hex'));servedModules.set(name,hashes);}).catch(()=>{}));});
  page.on('response',response=>{if(!new URL(response.url()).pathname.endsWith('/api/proximity')||response.request().method()!=='POST')return;
   const at=stage;pendingReads.push((async()=>{const value=await response.json(),timing=response.request().timing();controlTimings.push({stage:at,label,status:response.status(),
    action:response.request().postDataJSON()?.action,leaseMs:value.leaseMs,active:value.active,peers:value.peers?.length,assigned:!!value.assignment,responseEndMs:timing.responseEnd,responseStartMs:timing.responseStart});})().catch(()=>{}));});
  page.on('requestfailed',request=>{if(!request.url().endsWith('/favicon.ico'))requestFailures.push({stage,label,path:new URL(request.url()).pathname,error:request.failure()?.errorText});});
  const user={key,label,browser,context,page,token,frame:page.frameLocator('iframe[title="Dein Schlosszimmer"]')};users.push(user);
  await page.goto(base,{waitUntil:'domcontentloaded'});await ready(user);return user;
 }
 async function ready(user){await user.frame.locator('#loading').waitFor({state:'attached',timeout:30000});await user.frame.locator('#loading').waitFor({state:'hidden',timeout:60000});await user.frame.locator('.social-status').filter({hasText:/[12] von 8/}).waitFor({timeout:15000});}
 async function open(user){if(!await user.frame.locator('.proximity-panel').isVisible())await user.frame.getByRole('button',{name:/^Zimmergespraech (oeffnen|aktiv)$/}).click();}
 async function join(user){await open(user);await user.frame.getByRole('button',{name:'Am Gespraech teilnehmen',exact:true}).click();await user.frame.getByRole('button',{name:'Gespraech verlassen',exact:true}).waitFor();}
 async function mic(user){await user.frame.getByRole('button',{name:'Mikrofon einschalten',exact:true}).click();await user.frame.getByRole('button',{name:'Mikrofon ausschalten',exact:true}).waitFor();}
 async function camera(user){await user.frame.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await user.frame.getByRole('button',{name:'Kamera ausschalten',exact:true}).waitFor();}
 async function social(user){if(await user.frame.locator('.proximity-panel').isVisible())await user.frame.getByRole('button',{name:'Gespraech zuklappen',exact:true}).click();if(!await user.frame.locator('.room-social-panel').isVisible())await user.frame.locator('.social-tab').click();}
 async function visit(user,code){await social(user);await user.frame.getByRole('textbox',{name:'Einladungscode für ein Zimmer',exact:true}).fill(code);await user.frame.getByRole('button',{name:'Besuchen',exact:true}).click();await user.frame.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();}
 async function quiet(user){assert.equal(await user.frame.locator('body').evaluate(()=>window.__qaCaptureEvents.length),0);assert.equal(await user.frame.locator('.proximity-tiles audio').count(),0);}
 async function capturesEnded(user){await user.page.waitForFunction(()=>new Set(__qaHeldTracks.map(track=>track.kind)).size===2&&__qaHeldTracks.every(track=>track.readyState==='ended'),{},{timeout:12000});}
 async function decoded(user){
  const node=user.frame.locator('.proximity-tiles audio').first();await node.waitFor({state:'attached',timeout:20000});
  const rms=await node.evaluate(async audio=>{const context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(audio.srcObject),meter=context.createAnalyser();meter.fftSize=2048;source.connect(meter);const values=new Float32Array(2048);let peak=0;
   for(let n=0;n<30;n++){meter.getFloatTimeDomainData(values);peak=Math.max(peak,Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length));await new Promise(resolve=>setTimeout(resolve,100));}source.disconnect();await context.close();return peak;});
  assert.ok(rms>.002);return {stage,label:user.label,rms};
 }
 async function decodedVideo(user){
  const node=user.frame.locator('.proximity-tiles video:not([aria-label="Dein Kamerabild"])').first();await node.waitFor({state:'visible',timeout:20000});
  const value=await node.evaluate(async video=>{const until=performance.now()+10000;while((video.readyState<2||!video.videoWidth||!video.getVideoPlaybackQuality().totalVideoFrames)&&performance.now()<until)await new Promise(resolve=>setTimeout(resolve,50));return {width:video.videoWidth,height:video.videoHeight,decodedFrames:video.getVideoPlaybackQuality().totalVideoFrames};});
  assert.ok(value.width>0&&value.height>0&&value.decodedFrames>0);return {stage,label:user.label,...value};
 }
 async function both(a,b){decodings.push(await decoded(a),await decoded(b));videoDecodings.push(await decodedVideo(a),await decodedVideo(b));}
 try{
  stage='normal-school-entry';const a=await create('A','owner-first-device',1100,440),b=await create('B','guest-mobile',390,660);
  stage='initial-call';await social(a);await a.frame.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  const room=await a.frame.locator('body').evaluate(async()=>{const r=await fetch('../api/bedroom');const v=await r.json();return {code:v.code,id:v.me.id};});
  const originalGuest=await b.frame.locator('body').evaluate(async()=>{const r=await fetch('../api/bedroom');return (await r.json()).me.id;});assert.notEqual(originalGuest,room.id);
  await visit(b,room.code);for(const user of [a,b]){await quiet(user);await join(user);await mic(user);await camera(user);}await both(a,b);

  stage='offline';const captureCount=await b.page.evaluate(()=>__qaCaptureEvents.length);await b.context.setOffline(true);
  await b.page.locator('iframe[title="Dein Schlosszimmer"]').waitFor({state:'detached',timeout:10000});await capturesEnded(b);
  await b.page.locator('#message').filter({hasText:/Verbindung/}).waitFor();await a.frame.locator('.proximity-tiles audio').waitFor({state:'detached',timeout:15000});
  await a.frame.locator('.proximity-tiles video:not([aria-label="Dein Kamerabild"])').waitFor({state:'detached'});
  transitions.push({episode:'offline',actualTracksEnded:true,ownedFrameRemoved:true,remoteMediaRemoved:true});
  stage='online';await b.context.setOffline(false);await ready(b);await b.page.waitForTimeout(2200);await quiet(b);assert.equal(await b.page.evaluate(()=>__qaCaptureEvents.length),captureCount);
  await b.frame.locator('.social-status').filter({hasText:/Dein Zimmer.*1 von 8/}).waitFor();
  await visit(b,room.code);await join(b);assert.equal(await b.page.evaluate(()=>__qaCaptureEvents.length),captureCount);await mic(b);await camera(b);await both(a,b);
  transitions.push({episode:'online',roomReauthorized:true,noAutomaticCaptureOrCall:true,explicitRejoinAndBothDirectionsDecoded:true});

  stage='second-device-open';const a2=await create('A','owner-second-device',1000,880);await quiet(a2);await both(a,b);
  assert.equal(await a.page.evaluate(()=>__qaHeldTracks.some(track=>track.readyState==='live')),true);
  transitions.push({episode:'second-device-open',doesNotStealExistingCall:true,noCaptureOnNewDevice:true});
  stage='explicit-device-transfer';await join(a2);await capturesEnded(a);await a.frame.getByRole('button',{name:'Am Gespraech teilnehmen',exact:true}).waitFor();
  assert.equal(await a2.page.evaluate(()=>__qaCaptureEvents.length),0);await mic(a2);await camera(a2);await both(a2,b);
  await a.page.waitForTimeout(2500);assert.equal(await a.page.evaluate(()=>__qaHeldTracks.every(track=>track.readyState==='ended')),true);
  stage='former-device-departure';await a.page.locator('#leave').click();await both(a2,b);
  transitions.push({episode:'device-transfer',oldActualTracksEnded:true,newCaptureOnlyAfterExplicitClick:true,noAutomaticTakeback:true,formerDeviceDepartureDoesNotEndCurrentCall:true});

  stage='account-switch';const oldView=await b.page.locator('iframe').getAttribute('src'),countBeforeSwitch=await b.page.evaluate(()=>__qaCaptureEvents.length);
  await b.page.evaluate(token=>localStorage.setItem('authToken',token),a2.token);
  await b.page.waitForFunction(old=>{const next=document.querySelector('iframe')?.getAttribute('src');return next&&next!==old;},oldView);await capturesEnded(b);await ready(b);await quiet(b);
  assert.equal(await b.frame.locator('body').evaluate(async()=>{const r=await fetch('../api/bedroom');return (await r.json()).me.id;}),room.id);
  assert.equal(await b.page.evaluate(()=>__qaCaptureEvents.length),countBeforeSwitch);await a2.frame.locator('.proximity-tiles audio').waitFor({state:'detached',timeout:12000});
  await a2.frame.locator('.proximity-tiles video:not([aria-label="Dein Kamerabild"])').waitFor({state:'detached'});
  assert.equal(await a2.page.evaluate(()=>__qaHeldTracks.some(track=>track.readyState==='live')),true);
  assert.equal(await b.page.evaluate(async old=>{const r=await fetch(old.replace('/zimmer/','/api/bedroom'));return r.status;},oldView),401);
  transitions.push({episode:'account-switch',oldGuestTracksEnded:true,newAccountOwnRoomVerified:true,noAutomaticCapture:true,oldProtectedViewRejected:true,otherDeviceCallNotStolen:true});

  stage='logout';await b.page.evaluate(()=>localStorage.removeItem('authToken'));await b.page.locator('iframe').waitFor({state:'detached'});await b.page.locator('#message').filter({hasText:/erneut.*anmelden/}).waitFor();
  await a2.page.locator('#leave').click();await capturesEnded(a2);transitions.push({episode:'logout',ownedFrameRemoved:true,allOwnCapturesEnded:true});
  assert.deepEqual(errors,[]);
  const expected=response=>response.status===404&&response.path==='/rtc/v1/validate'||response.status===409&&response.path.endsWith('/api/proximity')&&['explicit-device-transfer','former-device-departure'].includes(response.stage)||response.status===401&&response.stage==='account-switch'&&response.path===oldView.replace('/zimmer/','/api/bedroom');
  const unexpected=responses.filter(response=>!expected(response));assert.deepEqual(unexpected,[]);
  const unexpectedRequests=requestFailures.filter(row=>!['offline','online','account-switch','logout'].includes(row.stage)&&row.error!=='net::ERR_ABORTED');assert.deepEqual(unexpectedRequests,[]);
  const proof={passed:true,browserVersion:browsers[0].version(),ordinaryMicrosoftStatesUsed:true,normalLoginRepeated:true,syntheticPupilsOnly:true,
   realPublicGateway:true,realPublicSchoolContext:true,realPublicSfu:true,networkResponsesSubstituted:candidate,schoolOverrides:false,browserFakeDevicesOnly:true,noHumanMicrophoneOrCameraUsed:true,
   candidateSourcesOnlyInsideTestBrowsers:candidate,candidateSources:Object.fromEntries(Object.entries(candidateSources).map(([name,raw])=>[name,crypto.createHash('sha256').update(raw).digest('hex')])),
   candidateRoutes:[...new Set(routed)].sort(),
   transitions,decodedRemoteMicrophones:decodings,decodedRemoteOptionalCameras:videoDecodings,bothActualMediaKindsEndedOnEveryExit:true,
   cameraExplicitlyEnabledAfterEveryNewConnection:true,offlineUsesActualBrowserNetworkEmulation:true,accountSwitchUsesOnlyApprovedNormalTokens:true,
   servicesRestarted:false,nativeWorkAdventureTested:false,realAdministratorLoginTested:false,loadApprovalFor400:false,
   errors,unexpectedResourceFailures:0,expectedHttpFailures:responses,requestFailures};
  await Promise.all(pendingReads);proof.controlTimings=controlTimings;proof.servedModuleSha256=Object.fromEntries([...servedModules].map(([name,hashes])=>{assert.equal(hashes.size,1);return [name,[...hashes][0]];}));
  require('./castle-home-lifecycle-proof.cjs').validate(proof,{candidate});
  await fs.writeFile(path.join(output,'result.private.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({...proof,expectedHttpFailures:responses.length,requestFailures:requestFailures.length,controlTimings:undefined}));
 }catch(error){
  await Promise.all(pendingReads);const devices=[];for(const user of users)devices.push({label:user.label,
   local:await user.page.evaluate(()=>({captures:__qaCaptureEvents,tracks:__qaHeldTracks.map(track=>({kind:track.kind,state:track.readyState,muted:track.muted}))})).catch(()=>null),
   ui:await user.frame.locator('.proximity-panel').evaluate(node=>({text:node.innerText,videos:[...node.querySelectorAll('video')].map(video=>({own:video.getAttribute('aria-label')==='Dein Kamerabild',width:video.videoWidth,height:video.videoHeight,frames:video.getVideoPlaybackQuality().totalVideoFrames})),buttons:[...node.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),disabled:b.disabled}))})).catch(()=>null)});
  await fs.writeFile(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,errors,responses,requestFailures,decodings,videoDecodings,transitions,controlTimings,devices},null,2)+'\n',{mode:0o600});
  for(const user of users)await user.page.screenshot({path:path.join(output,user.label+'-failure.private.png')}).catch(()=>{});
  console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
 }finally{
  for(const user of users){await user.context.setOffline(false).catch(()=>{});await user.page.locator('#leave').click({timeout:1000}).catch(()=>{});}for(const browser of browsers)await browser.close();
 }
}
main().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;});
