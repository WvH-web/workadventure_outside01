const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('../castle-deps.cjs')('playwright');
const out = path.resolve(__dirname,'../../../output/hall-live-qa');
const credentials = JSON.parse(fs.readFileSync(path.resolve(out,'../hall-qa.private.json')));
const code = process.env.HALL_CODE;
if (!code) throw Error('Configure the private test code in this process');
fs.mkdirSync(out,{recursive:true});
const audioFixture=path.join(out,'synthetic-voice.wav');
function writeAudioFixture() {
  const rate=48000,samples=rate*2,data=Buffer.alloc(44+samples*2);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);
  data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
  let phase=0;
  for(let n=0;n<samples;n++){
    const t=n/rate;
    phase+=2*Math.PI*(180+50*Math.sin(2*Math.PI*2*t))/rate;
    const envelope=(t%0.8<0.62?0.2:0)*(0.3+0.7*Math.sin(2*Math.PI*5*t)**2);
    const voice=envelope*(Math.sin(phase)+0.35*Math.sin(phase*2)+0.2*Math.sin(phase*3));
    data.writeInt16LE(Math.round(voice*32767),44+n*2);
  }
  fs.writeFileSync(audioFixture,data);
}
writeAudioFixture();
const url=process.env.HALL_MAP_URL||'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam';
async function join(browser,number) {
  const name='Hallenprobe '+number;
  const storage=path.join(out,'participant-'+number+'.private.json');
  const context=await browser.newContext({permissions:['microphone','camera'],viewport:{width:1440,height:1000},
    ...(fs.existsSync(storage)?{storageState:storage}:{})});
  await context.addInitScript(({token,name,number})=>{
    if(location.origin==='https://together.deine-schule.com'&&window.top===window) {
      localStorage.setItem('authToken',token);localStorage.setItem('playerName',name);
      localStorage.setItem('requestedCameraStateKey','false');
      localStorage.setItem('requestedMicrophoneStateKey','true');
      localStorage.setItem('noiseSuppressionEnabled','false');
      localStorage.setItem('workadventure_pwa_install_prompt_shown','1');
    }
    window.__qaPeers=[];
    window.__qaNativeRooms=[];
    const OriginalSocket=window.WebSocket;
    window.WebSocket=class extends OriginalSocket {
      constructor(...args){
        super(...args);
        try {
          const token=new URL(args[0],location.href).searchParams.get('access_token');
          if(token){
            const claim=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            if(claim.video?.room){
              const record={room:claim.video.room,opened:false,closed:false};window.__qaNativeRooms.push(record);
              this.addEventListener('open',()=>{record.opened=true});
              this.addEventListener('close',()=>{record.closed=true});
            }
          }
        }catch{}
      }
    };
    const Original=window.RTCPeerConnection;
    if(Original)window.RTCPeerConnection=class extends Original {
      constructor(...args){super(...args);window.__qaPeers.push(this)}
    };
  },{token:credentials[String(number)],name,number});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];let expectedWrongCode=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{
    const target=new URL(response.url());
    if(target.pathname==='/castle-audio/claim'&&response.status()===403&&!expectedWrongCode){expectedWrongCode=true;return;}
    if(target.pathname.startsWith('/castle-audio/')&&response.status()>=400)
      errors.push('Hall HTTP '+response.status()+' '+target.pathname);
  });
  page.on('requestfailed',request=>{
    const target=new URL(request.url());
    if(target.pathname.startsWith('/castle-audio/'))
      errors.push('Hall request failed '+target.pathname+' '+request.failure()?.errorText);
  });
  const grants=[];
  page.on('response',async response=>{
    if(['/castle-audio/claim','/castle-audio/listen'].includes(new URL(response.url()).pathname)&&response.ok()) {
      try {grants.push(await response.json())}catch{}
    }
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  let ready=false;
  for(let n=0;n<40;n++) {
    if(await page.getByTestId('microphone-button').isVisible().catch(()=>false)){ready=true;break}
    const choose=page.locator('button.selectCharacterSceneFormSubmit');
    if(await choose.isVisible().catch(()=>false))await choose.click();
    const input=page.getByTestId('loginSceneNameInput');
    if(await input.isVisible().catch(()=>false)){await input.fill(name);await input.press('Enter')}
    const save=page.getByRole('button',{name:/^(Save|Speichern)$/i});
    if(await save.count()===1&&await save.isVisible().catch(()=>false))await save.click();
    await page.waitForTimeout(1800);
  }
  assert.ok(ready,'Native hall entry failed for test participant '+number);
  const skip=page.getByTestId('onboarding-button-welcome-skip');
  await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});
  if(await skip.isVisible().catch(()=>false))await skip.click();
  await page.getByTestId('onboarding-step').waitFor({state:'hidden',timeout:5000}).catch(()=>{});
  for(const [key,testId,wanted] of [
    ['requestedCameraStateKey','camera-button',false],
    ['requestedMicrophoneStateKey','microphone-button',true],
  ]) {
    const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'true'),key);
    if(current!==wanted) {
      const button=page.getByTestId(testId);
      if(await button.isVisible().catch(()=>false))await button.click();
    }
  }
  let script,widget;
  for(let n=0;n<40&&(!script||!widget);n++) {
    for(const frame of page.frames()) {
      if(await frame.evaluate(()=>Boolean(window.castleRoom)).catch(()=>false))script=frame;
      if(new URL(frame.url()||'about:blank').pathname==='/castle-audio/')widget=frame;
    }
    if(!script||!widget)await page.waitForTimeout(500);
  }
  assert.ok(script&&widget,'Hall controller and audio widget must initialize');
  await widget.waitForFunction(()=>document.getElementById('status')?.textContent==='Keine Ansage');
  await context.storageState({path:storage});
  console.log('Synthetic participant '+number+' entered the hall.');
  return {context,page,script,widget,errors,grants};
}
async function move(user,x,y) {
  await user.script.evaluate(async p=>{await window.castleRoom.stand();await WA.player.teleport(p.x,p.y)}, {x,y});
  await user.page.waitForTimeout(1100);
}
async function sit(user,id) {
  await user.script.evaluate(async id=>{
    const room=window.castleRoom,seat=room.layout.seats.find(s=>s.id===id);
    await WA.player.teleport(seat.standX,seat.standY);
    await room.syncPosition();
    if(!await room.sit(id))throw Error('Native seat could not be entered');
  },id);
  await user.page.waitForTimeout(1100);
}
async function stats(frame) {
  return frame.evaluate(async()=>{
    const result=[];
    for(const pc of window.__qaPeers||[]) {
      let inbound=0,outbound=0,energy=0;
      for(const s of (await pc.getStats()).values()) {
        if(s.type==='inbound-rtp'&&(s.kind==='audio'||s.mediaType==='audio')){inbound+=s.bytesReceived||0;energy+=s.totalAudioEnergy||0;}
        if(s.type==='outbound-rtp'&&(s.kind==='audio'||s.mediaType==='audio'))outbound+=s.bytesSent||0;
      }
      result.push({state:pc.connectionState,inbound,outbound,energy});
    }
    return result;
  });
}
const total=records=>records.reduce((n,r)=>n+r.inbound,0);
const energy=records=>records.reduce((n,r)=>n+r.energy,0);
const nativeRooms=user=>user.page.evaluate(()=>(window.__qaNativeRooms||[]).filter(r=>r.opened&&!r.closed).map(r=>r.room));
const claims=grant=>JSON.parse(Buffer.from(grant.token.split('.')[1],'base64url').toString()).video;
async function main() {
  const browser=await chromium.launch({channel:'chrome',headless:true,args:[
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const speaker=await join(browser,1),north=await join(browser,2),south=await join(browser,3),partner=await join(browser,4);
    await move(speaker,720,330);await sit(north,'tafel-nord-n1');await sit(south,'tafel-sued-s1');await sit(partner,'tafel-nord-s4');
    await north.page.waitForTimeout(3000);
    const tableBaseline={north:await stats(north.page.mainFrame()),partner:await stats(partner.page.mainFrame()),south:await stats(south.page.mainFrame())};
    await north.page.waitForTimeout(4500);
    const tableBefore={north:await stats(north.page.mainFrame()),partner:await stats(partner.page.mainFrame()),south:await stats(south.page.mainFrame())};
    const tablePartnersReceive=total(tableBefore.north)>total(tableBaseline.north)&&total(tableBefore.partner)>total(tableBaseline.partner);
    const tableIsolation=total(tableBefore.south)===total(tableBaseline.south);
    const tableHasAudioEnergy=energy(tableBefore.north)>energy(tableBaseline.north)&&energy(tableBefore.partner)>energy(tableBaseline.partner);
    await speaker.widget.locator('#claim').waitFor({state:'visible'});
    await speaker.widget.locator('#code').fill('invalid-synthetic-code');await speaker.widget.locator('#start').click();
    await speaker.widget.waitForFunction(()=>document.getElementById('error').textContent.includes('stimmt nicht'));
    await speaker.widget.locator('#code').fill(code);await speaker.widget.locator('#start').click();
    await speaker.widget.waitForFunction(()=>document.getElementById('status').textContent==='Du sprichst in der Halle',undefined,{timeout:30000});
    assert.equal(await speaker.widget.locator('#code').inputValue(),'');
    for(const audience of [north,south,partner]) {
      await audience.widget.waitForFunction(()=>document.querySelectorAll('#audio audio').length>0,undefined,{timeout:30000});
      const unlock=audience.widget.locator('#unlock');if(await unlock.isVisible())await unlock.click();
    }
    const initial={north:await stats(north.widget),south:await stats(south.widget)};
    await speaker.page.waitForTimeout(3500);
    const audio={north:await stats(north.widget),south:await stats(south.widget),publisher:await stats(speaker.widget)};
    assert.ok(total(audio.north)>total(initial.north)&&total(audio.south)>total(initial.south),'Both separate table groups must receive live RTP audio');
    const announcementHasAudioEnergy=energy(audio.north)>energy(initial.north)&&energy(audio.south)>energy(initial.south);
    assert.ok(announcementHasAudioEnergy,'Both groups must decode non-silent announcement audio');
    assert.ok(audio.publisher.some(s=>s.outbound>0),'Podium must send audio');
    const speakerGrant=speaker.grants.find(g=>g.leaseId),listenerGrant=north.grants.find(g=>g.token);
    assert.ok(speakerGrant&&listenerGrant,'Live grant evidence missing');
    const speakerRights=claims(speakerGrant),listenerRights=claims(listenerGrant);
    assert.equal(speakerRights.canPublish,true);assert.deepEqual(speakerRights.canPublishSources,['microphone']);
    assert.equal(listenerRights.canPublish,false);assert.equal(speakerRights.canPublishData,false);
    await speaker.page.screenshot({path:path.join(out,'hall-podium-live.png')});
    await north.page.screenshot({path:path.join(out,'hall-listener-live.png')});
    const tableGroups=await Promise.all([north,partner,south].map(u=>u.script.evaluate(()=>({
      group:window.castleRoom.activeId,position:window.castleRoom.position,
      map:WA.room.id
    }))));
    assert.equal(tableGroups[0].group,tableGroups[1].group);
    assert.notEqual(tableGroups[0].group,tableGroups[2].group);
    const tableDuring={north:await stats(north.page.mainFrame()),partner:await stats(partner.page.mainFrame()),south:await stats(south.page.mainFrame())};
    const tableConversationContinues=total(tableDuring.north)>total(tableBefore.north);
    const tableIsolationDuring=total(tableDuring.south)===total(tableBefore.south);
    const actualNativeRooms={north:await nativeRooms(north),partner:await nativeRooms(partner),south:await nativeRooms(south)};
    assert.ok(actualNativeRooms.north.some(room=>actualNativeRooms.partner.includes(room)),'Native meeting room transport must be shared by table partners');
    assert.ok(!actualNativeRooms.north.some(room=>actualNativeRooms.south.includes(room)),'Different tables must not share a native meeting transport');
    await move(speaker,720,800);
    await speaker.widget.waitForFunction(()=>document.getElementById('status').textContent==='Keine Ansage');
    for(const audience of [north,south])await audience.widget.waitForFunction(()=>!document.querySelector('#audio audio'));
    const stopped=await speaker.widget.evaluate(()=>(window.__qaPeers||[]).every(pc=>pc.connectionState==='closed'));
    assert.equal(stopped,true,'Leaving podium must close publisher media');
    const audiencePublishDenied=await north.widget.evaluate(async grant=>{
      const LK=window.LivekitClient,room=new LK.Room();let track;
      try {
        await room.connect(grant.url,grant.token);track=await LK.createLocalAudioTrack();
        try {await room.localParticipant.publishTrack(track,{source:LK.Track.Source.Microphone});return false}catch{return true}
      } finally {track?.stop();await room.disconnect()}
    },north.grants.filter(g=>g.token).at(-1));
    assert.equal(audiencePublishDenied,true,'Actual LiveKit must reject an audience microphone');
    await sit(speaker,'tafel-sued-n4');
    // Native areas use the avatar's foot point, below the scripting position.
    await move(north,962,544);await move(south,962,592);
    await north.page.waitForTimeout(2500);
    const boundaryBefore={north:await stats(north.page.mainFrame()),south:await stats(south.page.mainFrame())};
    await north.page.waitForTimeout(3500);
    const boundaryAfter={north:await stats(north.page.mainFrame()),south:await stats(south.page.mainFrame())};
    const boundaryRooms={north:await nativeRooms(north),south:await nativeRooms(south)};
    const boundaryIsolation=total(boundaryAfter.south)>total(boundaryBefore.south)&&
      total(boundaryAfter.north)>total(boundaryBefore.north)&&
      !boundaryRooms.north.some(room=>boundaryRooms.south.includes(room))&&
      boundaryRooms.north.some(room=>room.endsWith('area-tafel-nord'))&&
      boundaryRooms.south.some(room=>room.endsWith('area-tafel-sued'));
    await north.page.screenshot({path:path.join(out,'hall-table-boundary.png')});
    await move(north,720,800);await move(partner,768,800);
    await north.page.waitForTimeout(2500);
    const proximityBefore={north:await stats(north.page.mainFrame()),partner:await stats(partner.page.mainFrame())};
    await north.page.waitForTimeout(3500);
    const proximityAfter={north:await stats(north.page.mainFrame()),partner:await stats(partner.page.mainFrame())};
    const proximityRestored=total(proximityAfter.north)>total(proximityBefore.north)&&
      total(proximityAfter.partner)>total(proximityBefore.partner);
    const proof={syntheticAccounts:4,realMicrophonesUsed:false,wrongCodeRejected:true,
      hallRtpAudioAcrossTwoTableZones:audio,rights:{speaker:speakerRights,listener:listenerRights},
      tableGroups,tableBaseline,tableBefore,tableDuring,tablePartnersReceive,tableIsolation,tableHasAudioEnergy,announcementHasAudioEnergy,
      tableConversationContinues,tableIsolationDuring,actualNativeRooms,boundaryBefore,boundaryAfter,boundaryRooms,boundaryIsolation,
      proximityBefore,proximityAfter,proximityRestored,podiumDepartureStopped:true,audiencePublishDenied,
      errors:[...speaker.errors,...north.errors,...south.errors,...partner.errors]};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({participants:4,tablePartnersReceive,tableConversationContinues,tableIsolation,tableIsolationDuring,
      boundaryIsolation,proximityRestored,tableHasAudioEnergy,announcementHasAudioEnergy,hallAnnouncement:true,podiumDepartureStopped:true,audiencePublishDenied,errors:proof.errors},null,2));
    assert.ok(tablePartnersReceive&&tableConversationContinues,'Native table conversation must run before and during the announcement');
    assert.ok(tableHasAudioEnergy,'Table partners must decode non-silent audio');
    assert.ok(tableIsolation&&tableIsolationDuring,'Separate table conversations must remain isolated');
    assert.ok(boundaryIsolation,'Nearby participants across a table boundary must remain isolated');
    assert.ok(proximityRestored,'Leaving native meeting areas must restore ordinary proximity audio');
    assert.deepEqual(proof.errors,[]);
  } catch(error) {
    let number=0;
    for(const context of browser.contexts())for(const page of context.pages()) {
      number++;
      await page.screenshot({path:path.join(out,'failure-'+number+'.png')}).catch(()=>{});
      const details=[];
      for(const frame of page.frames()) {
        if(new URL(frame.url()||'about:blank').pathname==='/castle-audio/')
          details.push(await frame.locator('body').innerText().catch(()=>''));
        if(await frame.evaluate(()=>Boolean(window.castleRoom)).catch(()=>false))
          details.push(JSON.stringify(await frame.evaluate(()=>({position:castleRoom.position,group:castleRoom.activeId}))));
      }
      fs.writeFileSync(path.join(out,'failure-'+number+'.txt'),(await page.locator('body').innerText().catch(()=>''))+'\n'+details.join('\n'));
    }
    throw error;
  } finally {await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
