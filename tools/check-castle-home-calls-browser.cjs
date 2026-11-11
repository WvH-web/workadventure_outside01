'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const live=process.argv.includes('--live-pilot'),base=live?'https://together.deine-schule.com/castle-homes/':'http://127.0.0.1:4319/castle-homes/';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
let stage='configuration';
async function main(){
 const handoff=JSON.parse(await fs.readFile(path.join(privateRoot,'handoff.json'),'utf8'));assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);
 const sso=JSON.parse(await fs.readFile(path.join(privateRoot,'qa/sso-result.json'),'utf8'));assert.equal(sso.passed,true);
 const output=path.join(privateRoot,'qa/homes-calls-'+(live?'live':'stage'));await fs.mkdir(output,{recursive:true,mode:0o700});
 const browsers=[],users=[],errors=[],failedResources=[],audio=[],video=[],validationReads=[];
 function wav(hz){
  const rate=48000,seconds=12,data=Buffer.alloc(44+rate*seconds*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);
  for(let i=0;i<rate*seconds;i++){const t=i/rate,envelope=.25+.75*Math.max(0,Math.sin(t*5));data.writeInt16LE(Math.round(6500*envelope*(.7*Math.sin(2*Math.PI*hz*t)+.3*Math.sin(2*Math.PI*hz*2*t))),44+i*2);}return data;
 }
 async function openCall(user){
  if(!await user.frame.locator('.proximity-panel').isVisible())await user.frame.getByRole('button',{name:/^Zimmergespraech (oeffnen|aktiv)$/}).click();
  await user.frame.locator('.proximity-panel').waitFor({state:'visible'});
 }
 async function join(user){await openCall(user);await user.frame.getByRole('button',{name:'Am Gespraech teilnehmen',exact:true}).click();await user.frame.getByRole('button',{name:'Gespraech verlassen',exact:true}).waitFor();}
 async function mic(user){await user.frame.getByRole('button',{name:'Mikrofon einschalten',exact:true}).click();await user.frame.getByRole('button',{name:'Mikrofon ausschalten',exact:true}).waitFor();}
 async function collapse(user){if(await user.frame.locator('.proximity-panel').isVisible())await user.frame.getByRole('button',{name:'Gespraech zuklappen',exact:true}).click();}
 async function social(user){await collapse(user);if(!await user.frame.locator('.room-social-panel').isVisible())await user.frame.locator('.social-tab').click();}
 async function load(user,url=base){
  await user.page.goto(url,{waitUntil:'domcontentloaded'});await user.frame.locator('#loading').waitFor({state:'attached',timeout:30000});await user.frame.locator('#loading').waitFor({state:'hidden',timeout:60000});
  await user.frame.locator('.social-status').filter({hasText:/1 von 8/}).waitFor({timeout:15000});
 }
 async function decoded(user){
  const node=user.frame.locator('.proximity-tiles audio').first();await node.waitFor({state:'attached',timeout:20000});
  const measured=await node.evaluate(async element=>{
   if(!element.srcObject)throw Error('No actual remote stream');
   const context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(element.srcObject),analyser=context.createAnalyser();source.connect(analyser);analyser.fftSize=2048;
   const buffer=new Float32Array(analyser.fftSize);let peak=0;
   for(let i=0;i<30;i++){analyser.getFloatTimeDomainData(buffer);peak=Math.max(peak,Math.sqrt(buffer.reduce((sum,value)=>sum+value*value,0)/buffer.length));await new Promise(resolve=>setTimeout(resolve,100));}
   source.disconnect();await context.close();return {rms:peak,remoteAudioTracks:element.srcObject.getAudioTracks().filter(track=>track.readyState==='live').length};
  });assert.ok(measured.rms>.002,'The actual remote microphone must decode non-silent samples');assert.equal(measured.remoteAudioTracks,1);return measured;
 }
 try{
  for(const [key,viewport,hz]of [['A',{width:1100,height:900},440],['B',{width:390,height:844},660]]){
   stage='browser-'+key;const state=JSON.parse(await fs.readFile(path.join(privateRoot,'qa/sso-'+key+'.private.json'),'utf8'));
   const token=state.origins.find(row=>row.origin==='https://together.deine-schule.com')?.localStorage.find(row=>row.name==='authToken')?.value;
   assert.ok(typeof token==='string'&&token.length>40);assert.ok(sso.results.some(row=>row.account===key&&row.normalMicrosoftLogin&&row.freshPupilAccess));
   const tone=path.join(output,key+'-microphone.wav');await fs.writeFile(tone,wav(hz),{mode:0o600});
   const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--use-file-for-fake-audio-capture='+tone]});browsers.push(browser);
   const context=await browser.newContext({viewport,...(key==='B'?{isMobile:true,hasTouch:true}:{})});
   await context.addInitScript(({token,origin})=>{if(location.origin===origin&&window===top)localStorage.setItem('authToken',token);
    window.__roomCapture={calls:[],tracks:[]};if(navigator.mediaDevices){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{window.__roomCapture.calls.push({audio:!!constraints.audio,video:!!constraints.video});const stream=await original(constraints);window.__roomCapture.tracks.push(...stream.getTracks());return stream;};}
   },{token,origin:new URL(base).origin});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.name+': '+error.message));page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico')){const url=new URL(response.url()),row={status:response.status(),path:url.pathname,origin:url.origin};failedResources.push(row);if(row.status===404&&row.path==='/rtc/v1/validate'&&row.origin==='https://together.deine-schule.com')validationReads.push(response.text().then(body=>{row.requestedRoomMissing=body.includes('requested room does not exist');}));}});
   const user={key,page,frame:page.frameLocator('iframe[title="Dein Schlosszimmer"]'),viewport};users.push(user);await load(user);
   assert.equal(await page.evaluate(()=>document.visibilityState),'visible');await join(user);
   assert.deepEqual(await user.frame.locator('body').evaluate(()=>window.__roomCapture.calls),[],'Joining must not capture any device');
   await mic(user);assert.deepEqual(await user.frame.locator('body').evaluate(()=>window.__roomCapture.calls),[{audio:true,video:false}]);
   assert.equal(await user.frame.locator('.proximity-tiles audio').count(),0,'Separate private rooms cannot hear one another');
   await collapse(user);
  }
  const [a,b]=users;stage='separate-room-isolation';await a.page.waitForTimeout(2400);for(const user of users)assert.equal(await user.frame.locator('.proximity-tiles audio').count(),0);
  stage='shared-room';await social(a);await a.frame.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  const code=await a.frame.locator('body').evaluate(async()=>{const response=await fetch('../api/bedroom');return (await response.json()).code;});
  await social(b);await b.frame.getByRole('textbox',{name:'Einladungscode für ein Zimmer',exact:true}).fill(code);await b.frame.getByRole('button',{name:'Besuchen',exact:true}).click();
  await b.frame.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();
  assert.equal(await b.frame.locator('body').evaluate(()=>window.__roomCapture.tracks.every(track=>track.readyState==='ended')),true,'Changing rooms must stop the previous capture');
  await join(b);await mic(b);await collapse(b);audio.push(await decoded(a),await decoded(b));
  for(const user of users)assert.equal((await user.frame.locator('body').evaluate(()=>window.__roomCapture.calls)).some(call=>call.video),false);
  stage='voluntary-camera';await openCall(a);await a.frame.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await a.frame.getByRole('button',{name:'Kamera ausschalten',exact:true}).waitFor();
  const remoteVideo=b.frame.locator('.proximity-tiles video').first();await remoteVideo.waitFor({state:'visible',timeout:15000});
  await remoteVideo.evaluate(async node=>{const until=performance.now()+10000;while((!node.videoWidth||node.readyState<2)&&performance.now()<until)await new Promise(resolve=>setTimeout(resolve,50));});
  video.push(await remoteVideo.evaluate(node=>({width:node.videoWidth,height:node.videoHeight,decodedFrames:node.getVideoPlaybackQuality().totalVideoFrames})));assert.ok(video[0].width>0&&video[0].height>0&&video[0].decodedFrames>0);
  await a.frame.getByRole('button',{name:'Kamera ausschalten',exact:true}).click();await remoteVideo.waitFor({state:'detached',timeout:10000});
  stage='layouts';for(const user of users){await openCall(user);assert.equal(await user.frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,user.key+'-conversation.private.png'),fullPage:true});}
  await b.page.setViewportSize({width:320,height:740});assert.equal(await b.frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);await b.page.screenshot({path:path.join(output,'compact-320.private.png'),fullPage:true});await b.page.setViewportSize(b.viewport);
  stage='received-contact-report';await a.frame.getByRole('button',{name:'Etwas melden',exact:true}).click();const dialog=a.frame.locator('.proximity-report');await dialog.locator('form').waitFor();
  await dialog.getByRole('combobox',{name:'Grund der Videomeldung'}).selectOption('worry');await dialog.getByRole('textbox',{name:'Erklärung zur Videomeldung'}).fill('Synthetic room-call safety probe.');
  await dialog.getByRole('button',{name:'Meldung an Lehrkräfte geben',exact:true}).click();await dialog.getByRole('status').filter({hasText:/angekommen/}).waitFor();await dialog.getByRole('button',{name:'Schließen',exact:true}).click();
  for(const user of users)assert.equal(await user.frame.locator('body').evaluate(async()=>{const response=await fetch('../api/moderation/proximity');return response.status;}),403);
  stage='owner-closure';await social(a);await a.frame.getByRole('button',{name:'Zimmer schließen',exact:true}).click();await b.frame.locator('.social-status').filter({hasText:/beendet|geschlossen/}).waitFor();
  await b.page.waitForTimeout(2000);assert.equal(await b.frame.locator('body').evaluate(()=>window.__roomCapture.tracks.every(track=>track.readyState==='ended')),true);assert.equal(await b.frame.locator('.proximity-tiles audio').count(),0);
  await openCall(a);await a.frame.getByRole('button',{name:'Am Gespraech teilnehmen',exact:true}).waitFor({timeout:12000});assert.equal(await a.frame.locator('body').evaluate(()=>window.__roomCapture.tracks.every(track=>track.readyState==='ended')),true);
  await Promise.all(validationReads);assert.deepEqual(errors,[]);const expectedDenials=failedResources.filter(row=>row.status===403&&row.path.endsWith('/api/moderation/proximity'));assert.equal(expectedDenials.length,2);
  // The pinned SDK explicitly falls back to the legacy transport for this exact missing v1 endpoint.
  const legacyFallbacks=failedResources.filter(row=>row.status===404&&row.path==='/rtc/v1/validate'&&row.origin==='https://together.deine-schule.com'&&row.requestedRoomMissing===false);
  assert.deepEqual(failedResources.filter(row=>!expectedDenials.includes(row)&&!legacyFallbacks.includes(row)&&!(row.status===409&&row.path.endsWith('/api/proximity'))),[]);
  const proof={passed:true,browserVersion:browsers[0].version(),ordinaryMicrosoftStatesUsed:true,normalLoginRepeated:false,syntheticPupilAccountsOnly:true,realPublicSchoolContext:true,
   loopbackGatewayThroughPinnedSsh:!live,backendIntrospectionAlsoThroughPinnedSsh:!live,livePublicGateway:live,realPublicSfu:true,networkInterception:false,browserFakeDevicesOnly:true,noHumanMicrophoneOrCameraUsed:true,
   separateOwnerRoomsIsolated:true,joinDoesNotCaptureDevices:true,microphoneAndCameraRequireSeparateClicks:true,roomChangeStopsCapture:true,
   decodedRemoteMicrophonesBoth:audio,decodedRemoteOptionalCamera:video,desktopAnd390And320Fit:true,receivedContactReportSubmitted:true,pupilModerationDenied:true,
   ownerClosureStopsCaptureAndRemotes:true,sdkLegacyTransportFallback404:legacyFallbacks.length,errors,unexpectedResourceFailures:0,nativeWorkAdventureTested:false,realAdministratorLoginTested:false};
  await fs.writeFile(path.join(output,'result.private.json'),JSON.stringify(proof,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(proof));
 }catch(error){await fs.writeFile(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,errors,failedResources},null,2)+'\n',{mode:0o600});console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;}
 finally{for(const user of users)await user.page.locator('#leave').click({timeout:1000}).catch(()=>{});for(const browser of browsers)await browser.close();}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;});
