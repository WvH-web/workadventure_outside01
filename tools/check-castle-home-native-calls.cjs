'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com',base=origin+'/castle-homes/';
const preview=process.argv.includes('--preview'),roomUrl=origin+'/~/castle-preview/'+(preview?'obergeschoss':'zimmerprobe')+'.wam';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(privateRoot,'qa/'+(preview?'homes-native-preview':'homes-native-calls'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function main(){
 fs.mkdirSync(output,{recursive:true});writeAudio();const users=[];let stage='entry';
 const source=fs.readFileSync(path.join(root,'castle/'+(preview?'obergeschoss-homes.tmj':'obergeschoss-homes-pilot.tmj'))),map=JSON.parse(source),script=fs.readFileSync(path.join(root,'castle/upper-gallery.bundle.js'));
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
  '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function configureContext(context){
  await context.addInitScript(()=>{
   if(location.origin!=='https://together.deine-schule.com')return;
   if(window===top)window.__qaHeldHomeTracks=[];
   if(!location.pathname.startsWith('/castle-homes/view/')||!navigator.mediaDevices)return;
   const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__qaHomeCaptures=[];
   navigator.mediaDevices.getUserMedia=async constraints=>{
    const stream=await capture(constraints);window.__qaHomeCaptures.push({audio:!!constraints.audio,video:!!constraints.video});
    for(const track of stream.getTracks())top.__qaHeldHomeTracks.push({track,view:location.pathname});return stream;
   };
  });
 }
 async function enter(number){
  const user=await join(browser,number,{roomId:'obergeschoss',roomUrl:roomUrl+'#start',outputDir:output,
   label:'Zimmer-Uebergang',seats:10,groups:2,revision:'20261111-homes2',schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),
   mobile:number===2,parking:[[432,608],[832,608]],characterTextureId:'wvh-event-mira-v1',configureContext});users.push(user);
  const mic=user.page.getByTestId('microphone-button');await mic.click();await user.page.waitForTimeout(150);await mic.click();
  for(let n=0;n<50&&!user.entry;n++){for(const frame of user.page.frames())if(await frame.evaluate(()=>!!window.castleHomeEntry).catch(()=>false))user.entry=frame;if(!user.entry)await user.page.waitForTimeout(200);}
  assert.ok(user.entry);await user.entry.waitForFunction(()=>castleHomeEntry.started);return user;
 }
 async function nativeConversation(a,b){
  const before=[await stats(a),await stats(b)],until=Date.now()+30000;let after;
  while(Date.now()<until){await a.page.waitForTimeout(1000);after=[await stats(a),await stats(b)];
   if(after.every((row,i)=>row.energy>before[i].energy)&&after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room)))return {before,after};
  }throw Error('Native book-club speech did not decode both ways');
 }
 async function quiet(a,b){
  for(let n=0;n<60;n++){
   const before=[await stats(a),await stats(b)];if(before.every(row=>row.rooms.length===0)){await a.page.waitForTimeout(3000);const after=[await stats(a),await stats(b)];if(after.every((row,i)=>row.rooms.length===0&&row.energy===before[i].energy))return {before,after};}
   await a.page.waitForTimeout(200);
  }throw Error('Native table/proximity audio crossed into the private-room entry');
 }
 async function home(user){
  for(let n=0;n<100;n++){const frame=user.page.frames().find(frame=>frame.url()===base);if(frame){const inner=frame.frameLocator('iframe[title="Dein Schlosszimmer"]');await inner.locator('#loading').waitFor({state:'attached',timeout:30000});await inner.locator('#loading').waitFor({state:'hidden',timeout:60000});return {root:frame,inner};}await user.page.waitForTimeout(200);}
  throw Error('Automatic side panel absent');
 }
 async function call(user){
  await user.home.inner.getByRole('button',{name:'Zimmergespraech oeffnen',exact:true}).click();await user.home.inner.getByRole('button',{name:'Am Gespraech teilnehmen',exact:true}).click();
  assert.equal(await user.home.inner.locator('body').evaluate(()=>window.__qaHomeCaptures.length),0);
  await user.home.inner.getByRole('button',{name:'Mikrofon einschalten',exact:true}).click();await user.home.inner.getByRole('button',{name:'Mikrofon ausschalten',exact:true}).waitFor();
 }
 async function heard(user){
  const audio=user.home.inner.locator('.proximity-tiles audio').first();await audio.waitFor({state:'attached',timeout:25000});
  const rms=await audio.evaluate(async element=>{const c=new AudioContext();await c.resume();const input=c.createMediaStreamSource(element.srcObject),meter=c.createAnalyser();meter.fftSize=2048;input.connect(meter);const values=new Float32Array(2048);let rms=0;
   for(let n=0;n<30;n++){meter.getFloatTimeDomainData(values);rms=Math.max(rms,Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length));await new Promise(resolve=>setTimeout(resolve,100));}input.disconnect();await c.close();return rms;});assert.ok(rms>.002);return rms;
 }
 try{
  stage='anonymous-boundary';const anonymous=await browser.newContext(),anon=await anonymous.newPage();await anon.goto(roomUrl);await anon.waitForURL(url=>url.hostname==='login.microsoftonline.com',{timeout:30000});await anonymous.close();
  const a=await enter(1),b=await enter(2),chairs=await a.script.evaluate(()=>castleRoom.layout.seats.filter(seat=>seat.audioGroup==='buchclub').map(seat=>seat.id));
  stage='native-table-before';await sit(a,chairs[0]);await sit(b,chairs[1]);const before=await nativeConversation(a,b);
  stage='automatic-private-entry';for(const [user,p]of [[a,[608,384]],[b,[672,416]]]){await user.page.bringToFront();await user.script.evaluate(async p=>{await castleRoom.stand();await WA.player.teleport(p[0],p[1]);await castleRoom.syncPosition();},p);await user.page.keyboard.press('ArrowRight');user.home=await home(user);}
  const isolatedBefore=await quiet(a,b);
  for(const user of users){const element=await user.home.root.frameElement(),allow=await element.getAttribute('allow');assert.match(allow,/microphone/);assert.match(allow,/camera/);assert.equal(await user.home.inner.locator('body').evaluate(()=>typeof window.WA),'undefined');}
  stage='private-visit';if(!await a.home.inner.locator('.room-social-panel').isVisible())await a.home.inner.locator('.social-tab').click();await a.home.inner.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  const code=await a.home.inner.locator('body').evaluate(async()=>{const response=await fetch('../api/bedroom');return (await response.json()).code;});
  if(!await b.home.inner.locator('.room-social-panel').isVisible())await b.home.inner.locator('.social-tab').click();await b.home.inner.getByRole('textbox',{name:'Einladungscode für ein Zimmer',exact:true}).fill(code);await b.home.inner.getByRole('button',{name:'Besuchen',exact:true}).click();await b.home.inner.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();
  stage='private-speech';await call(a);await call(b);const decoded=[await heard(a),await heard(b)],isolatedDuring=await quiet(a,b);
  for(const [user,label]of [[a,'desktop'],[b,'mobile']]){assert.equal(await user.page.evaluate(()=>JSON.parse(localStorage.getItem('requestedMicrophoneStateKey'))),true);assert.equal(await user.home.inner.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,label+'.private.png')});const bitmap=await sharp(await user.page.locator('canvas:visible').first().screenshot()).stats();assert.ok(bitmap.channels.slice(0,3).every(channel=>channel.stdev>12));}
  stage='departure';for(const user of users){await user.script.evaluate(async()=>{await WA.player.teleport(832,608);await castleRoom.syncPosition();});await user.page.bringToFront();await user.page.keyboard.press('ArrowRight');await user.entry.waitForFunction(()=>!castleHomeEntry.active&&!castleHomeEntry.website);}
  assert.ok(users.every(user=>!user.page.frames().some(frame=>frame.url().startsWith(base))));
  for(const user of users)assert.equal(await user.page.evaluate(()=>__qaHeldHomeTracks.length>0&&__qaHeldHomeTracks.every(row=>row.track.readyState==='ended')),true,'All actual held room microphone tracks must end when its iframe closes');
  stage='native-table-after';await sit(a,chairs[0]);await sit(b,chairs[1]);const after=await nativeConversation(a,b);
  for(const user of users)assert.equal(user.filmRequests,0);assert.deepEqual(users.flatMap(user=>user.errors),[]);
  const proof={passed:true,browserVersion:browser.version(),normalMicrosoftPupils:2,realNativeWorkAdventure:true,realPublicRoomService:true,realPublicRoomMedia:true,
   anonymousRedirectedToMicrosoft:true,automaticSidePanelOnEntry:true,actualPrivateVisit:true,decodedPrivateSpeechBoth:decoded,nativeConversationDecodedBeforeAndAfter:true,
   quietEntryWithoutNativeSpeechBeforeAndDuring:true,privateMicrophoneCaptureOnlyAfterExplicitClick:true,mapApiNotGranted:true,microphonePreferenceUnchanged:true,
   departureClosesOwnedPanelAndEndsActualTracks:true,desktopAndMobileRendered:true,noHorizontalOverflow:true,networkResponsesSubstituted:false,
   schoolOverrides:false,existingMapsChanged:preview,previewGalleryOnly:preview,roomUrl,probeWrapperOnly:!preview,candidateMapSha256:sha(source),entryScriptSha256:sha(script),errors:[],loadApprovalFor400:false,
   before,isolatedBefore,isolatedDuring,after};
  fs.writeFileSync(path.join(output,'result.private.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,before:undefined,isolatedBefore:undefined,isolatedDuring:undefined,after:undefined}));
 }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,diagnostics:users.map(user=>user.diagnostics),errors:users.flatMap(user=>user.errors)},null,2)+'\n');let n=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++n)+'.private.png')}).catch(()=>{});console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;}
 finally{for(const user of users){await user.home?.root.locator('#leave').click({timeout:2000}).catch(()=>{});await user.script.evaluate(async()=>{await castleRoom.stand();await WA.player.teleport(432,608);}).catch(()=>{});}await browser.close();}
}
main().catch(error=>{console.error('Native room media probe: '+error.name);process.exitCode=1;});
