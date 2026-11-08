const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const sharp=require('./castle-deps.cjs')('sharp');
const out=path.resolve(__dirname,'../../output/cinema-live-qa');
const credentials=JSON.parse(fs.readFileSync(path.resolve(out,'../hall-qa.private.json')));
const url='https://together.deine-schule.com/~/castle-preview/kino.wam';
const filmUrl='https://deutsche-online-schule.com/kino/public/kino.php';
fs.mkdirSync(out,{recursive:true});
const audioFixture=path.join(out,'synthetic-voice.wav');
function writeAudio(){
  const rate=48000,samples=rate*2,data=Buffer.alloc(44+samples*2);
  data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);
  data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
  let phase=0;
  for(let n=0;n<samples;n++){
    const t=n/rate;phase+=2*Math.PI*(180+50*Math.sin(2*Math.PI*2*t))/rate;
    const envelope=(t%0.8<0.62?.2:0)*(.3+.7*Math.sin(2*Math.PI*5*t)**2);
    data.writeInt16LE(Math.round(envelope*(Math.sin(phase)+.35*Math.sin(2*phase)+.2*Math.sin(3*phase))*32767),44+n*2);
  }
  fs.writeFileSync(audioFixture,data);
}
async function join(browser,number,options={}){
  const roomId=options.roomId||'kino',directory=options.outputDir||out;
  const name=(options.label||'Kinoprobe')+' '+number,storage=path.join(directory,`participant-${number}.private.json`);
  const context=await browser.newContext({permissions:['microphone','camera'],viewport:number===1?{width:1440,height:1000}:{width:800,height:700},
    ...(fs.existsSync(storage)?{storageState:storage}:{})});
  let filmRequests=0;
  await context.route('https://deutsche-online-schule.com/kino/**',route=>{
    filmRequests++;
    return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Kino-Test</title><h1>Kino-Test ohne Filmstart</h1><script>window.instance=crypto.randomUUID()</script>'});
  });
  await context.addInitScript(({token,name,characterTextureId})=>{
    if(location.origin==='https://together.deine-schule.com'&&window.top===window){
      localStorage.setItem('authToken',token);localStorage.setItem('playerName',name);
      localStorage.setItem('requestedCameraStateKey','false');localStorage.setItem('requestedMicrophoneStateKey','true');
      localStorage.setItem('noiseSuppressionEnabled','false');localStorage.setItem('workadventure_pwa_install_prompt_shown','1');
      if(characterTextureId&&!sessionStorage.getItem('qaAvatarSeeded')){
        localStorage.setItem('characterTextures',JSON.stringify([characterTextureId]));sessionStorage.setItem('qaAvatarSeeded','1');
      }
    }
    window.__qaPeers=[];window.__qaNativeRooms=[];
    const Socket=window.WebSocket;
    window.WebSocket=class extends Socket{
      constructor(...args){
        super(...args);
        try{
          const token=new URL(args[0],location.href).searchParams.get('access_token');
          if(token){
            const claim=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            if(claim.video?.room){
              const record={room:claim.video.room,opened:false,closed:false};window.__qaNativeRooms.push(record);
              this.addEventListener('open',()=>{record.opened=true});this.addEventListener('close',()=>{record.closed=true});
            }
          }
        }catch{}
      }
    };
    const Peer=window.RTCPeerConnection;
    if(Peer)window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.__qaPeers.push(this)}};
  },{token:credentials[String(number)],name,characterTextureId:options.characterTextureId});
  const page=await context.newPage(),errors=[],diagnostics=[];page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{
    if(['error','warning'].includes(message.type()))diagnostics.push({type:message.type(),message:message.text()});
  });
  page.on('requestfailed',r=>diagnostics.push({request:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  await page.goto(options.roomUrl||url,{waitUntil:'domcontentloaded',timeout:60000});
  let ready=false;
  for(let n=0;n<40;n++){
    if(await page.getByTestId('microphone-button').isVisible().catch(()=>false)){ready=true;break}
    const choose=page.locator('button.selectCharacterSceneFormSubmit');if(await choose.isVisible().catch(()=>false))await choose.click();
    const input=page.getByTestId('loginSceneNameInput');if(await input.isVisible().catch(()=>false)){await input.fill(name);await input.press('Enter')}
    const save=page.getByRole('button',{name:/^(Save|Speichern)$/i});if(await save.count()===1&&await save.isVisible().catch(()=>false))await save.click();
    await page.waitForTimeout(1800);
  }
  assert.ok(ready,'Native cinema entry '+number);
  const skip=page.getByTestId('onboarding-button-welcome-skip');
  await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});
  if(await skip.isVisible().catch(()=>false))await skip.click();
  await page.getByTestId('onboarding-step').waitFor({state:'hidden',timeout:5000}).catch(()=>{});
  for(const [key,testId,wanted]of [['requestedCameraStateKey','camera-button',false],['requestedMicrophoneStateKey','microphone-button',true]]){
    const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'true'),key);
    if(state!==wanted){const b=page.getByTestId(testId);if(await b.isVisible().catch(()=>false))await b.click();}
  }
  let script;
  for(let n=0;n<60&&!script;n++){
    for(const frame of page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,roomId).catch(()=>false))script=frame;
    if(!script)await page.waitForTimeout(500);
  }
  if(!script){
    fs.writeFileSync(path.join(directory,'bootstrap-'+number+'.private.json'),JSON.stringify({errors,diagnostics,
      frames:page.frames().map(f=>{try{const u=new URL(f.url());return u.origin+u.pathname}catch{return 'unknown'}})},null,2));
  }
  assert.ok(script,'Cinema controller loaded');
  assert.equal(await script.evaluate(()=>window.castleRoom.layout.seats.length),options.seats??64);
  assert.equal(await script.evaluate(()=>window.castleRoom.layout.groups.length),options.groups??4);
  assert.equal(await script.evaluate(async()=> (await WA.room.getTiledMap()).properties.find(p=>p.name==='castleRevision')?.value),options.revision||'20261108-kino6');
  if(roomId==='kino')await script.waitForFunction(()=>Boolean(window.castleCinema),undefined,{polling:200,timeout:30000});
  // Keep entrants apart while the remaining profiles load, rather than creating a four-way call at the door.
  const parking=options.parking?.[number-1]||[240+number*64,400];
  await script.evaluate(async p=>{await WA.player.teleport(p[0],p[1]);await castleRoom.syncPosition()},parking);
  await context.storageState({path:storage});
  console.log('Synthetic '+roomId+' participant '+number+' entered.');
  return {context,page,script,errors,diagnostics,get filmRequests(){return filmRequests}};
}
async function move(u,x,y){
  await u.script.evaluate(async p=>{await castleRoom.stand();await WA.player.teleport(p.x,p.y)}, {x,y});
  await u.page.waitForTimeout(1200);
}
async function sit(u,id){
  await u.script.evaluate(async id=>{
    await castleRoom.stand();const s=castleRoom.layout.seats.find(s=>s.id===id);
    await WA.player.teleport(s.standX,s.standY);await castleRoom.syncPosition();
    if(!await castleRoom.sit(id))throw Error('Cinema seat failed: '+id);
  },id);
  await u.page.waitForTimeout(1200);
}
async function stats(u){
  return u.page.evaluate(async()=>{
    let inbound=0,energy=0,outbound=0;
    for(const pc of window.__qaPeers||[])for(const s of (await pc.getStats()).values()){
      if(s.type==='inbound-rtp'&&(s.kind==='audio'||s.mediaType==='audio')){inbound+=s.bytesReceived||0;energy+=s.totalAudioEnergy||0;}
      if(s.type==='outbound-rtp'&&(s.kind==='audio'||s.mediaType==='audio'))outbound+=s.bytesSent||0;
    }
    return {inbound,energy,outbound,rooms:(window.__qaNativeRooms||[]).filter(r=>r.opened&&!r.closed).map(r=>r.room)};
  });
}
async function pixels(page,name){
  const file=path.join(out,name+'.png');
  await page.locator('canvas:visible').first().screenshot({path:file});
  const s=await sharp(file).stats();
  assert.ok(s.channels.slice(0,3).every(c=>c.stdev>12),'Native canvas must show the room: '+name);
  return s.channels.slice(0,3).map(c=>Math.round(c.stdev*100)/100);
}
async function main(){
  writeAudio();
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const users=[];for(let i=1;i<=4;i++)users.push(await join(browser,i));
    const [a,b,c,d]=users;
    await sit(a,'kino-0-3');await move(b,464,272);await sit(c,'kino-lounge-0-nw');await sit(d,'kino-lounge-0-so');
    await a.page.waitForTimeout(3000);
    const before=await Promise.all(users.map(stats));await a.page.waitForTimeout(4500);const after=await Promise.all(users.map(stats));
    const quietFront=after[0].energy===before[0].energy&&after[1].energy===before[1].energy&&after[0].rooms.length===0&&after[1].rooms.length===0;
    const rearConversation=after[2].energy>before[2].energy&&after[3].energy>before[3].energy&&
      after[2].rooms.some(r=>r.endsWith('area-kino-lounge-0')&&after[3].rooms.includes(r));
    assert.ok(quietFront,'Quiet front must not receive table/proximity audio');
    assert.ok(rearConversation,'Rear partners must decode non-silent conversation');
    for(const u of users){
      assert.equal(u.filmRequests,1,'Cinema opens automatically once for each entrant');
      assert.ok(u.page.frames().some(f=>f.url().startsWith(filmUrl)),'Film iframe opens without a click');
    }
    await a.page.screenshot({path:path.join(out,'cinema-front-desktop.png')});
    const canvas={desktop:await pixels(a.page,'cinema-canvas-desktop')};
    await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(1500);
    await a.page.screenshot({path:path.join(out,'cinema-front-mobile.png')});canvas.mobile=await pixels(a.page,'cinema-canvas-mobile');
    await a.page.setViewportSize({width:1440,height:1000});
    await sit(d,'kino-lounge-1-so');await move(a,216,728);await move(b,264,728);
    await a.page.waitForTimeout(2500);const boundaryBefore=await Promise.all(users.map(stats));
    await a.page.waitForTimeout(4500);const boundaryAfter=await Promise.all(users.map(stats));
    const boundaryIsolation=boundaryAfter.every((s,i)=>s.energy>boundaryBefore[i].energy)&&
      boundaryAfter[0].rooms.some(r=>r.endsWith('area-kino-lounge-0')&&boundaryAfter[2].rooms.includes(r))&&
      boundaryAfter[1].rooms.some(r=>r.endsWith('area-kino-lounge-1')&&boundaryAfter[3].rooms.includes(r))&&
      !boundaryAfter[0].rooms.some(r=>boundaryAfter[1].rooms.includes(r));
    assert.ok(boundaryIsolation,'Two nearby rear conversations must stay separate');
    await a.page.screenshot({path:path.join(out,'cinema-separated-tables.png')});
    for(const id of ['kino-2-0','kino-5-7','kino-lounge-2-nw','kino-lounge-2-so']){
      await sit(a,id);await a.page.screenshot({path:path.join(out,'cinema-seat-'+id+'.png')});
    }
    for(const [name,x,y]of [['quiet',480,624],['conversation',480,736]]){
      await move(a,x,y);await a.page.screenshot({path:path.join(out,'cinema-sign-'+name+'.png')});
    }
    await sit(a,'kino-0-3');
    let player;
    for(let n=0;n<30&&!player;n++){
      player=a.page.frames().find(f=>f.url().startsWith(filmUrl));if(!player)await a.page.waitForTimeout(500);
    }
    assert.ok(player,'Existing cinema endpoint must open in a side iframe');
    await player.getByRole('heading',{name:'Kino-Test ohne Filmstart'}).waitFor();
    const instance=await player.evaluate(()=>window.instance);
    for(const id of ['kino-5-7','kino-lounge-2-no']){
      await sit(a,id);assert.equal(await player.evaluate(()=>window.instance),instance,'Seat change must preserve film iframe');
    }
    assert.equal(a.filmRequests,1,'Film page must not reload when changing seats');
    await a.page.screenshot({path:path.join(out,'cinema-film-panel.png')});
    await a.script.evaluate(()=>castleCinema.website.close());
    await a.script.waitForFunction(()=>castleCinema.dismissed&&!castleCinema.website,undefined,{polling:200});
    await a.page.waitForTimeout(1800);assert.equal(a.filmRequests,1,'Respect manual window closure');
    assert.ok(!a.page.frames().some(f=>f.url().startsWith(filmUrl)));
    await a.page.getByRole('button',{name:'Kino',exact:true}).click();
    await a.script.waitForFunction(()=>Boolean(castleCinema.website),undefined,{polling:200});
    await a.page.waitForTimeout(1000);assert.equal(a.filmRequests,2,'Explicit reopening remains available');
    await a.script.evaluate(()=>castleRoom.returnToHall()).catch(e=>{
      if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e;
    });
    let hall;
    for(let n=0;n<80&&!hall;n++){
      for(const f of a.page.frames())if(await f.evaluate(()=>window.castleRoom?.layout.id==='grosse-halle').catch(()=>false))hall=f;
      if(!hall)await a.page.waitForTimeout(500);
    }
    assert.ok(hall,'Cinema returns to the separate Great Hall');
    await a.page.waitForTimeout(2500);
    assert.equal(await hall.evaluate(()=>castleRoom.layout.id),'grosse-halle');
    assert.ok(!a.page.frames().some(f=>f.url().startsWith(filmUrl)),'Film iframe closes on leaving cinema');
    const proof={revision:'20261108-kino6',participants:4,realMicrophonesUsed:false,quietFront,rearConversation,boundaryIsolation,
      cinemaEndpoint:filmUrl,filmWasStubbed:true,filmRequests:a.filmRequests,filmIframePreservedAcrossSeats:true,
      automaticOpening:true,manualClosureRespected:true,directionalSigns:true,
      returnToSeparateHall:true,canvas,before,after,boundaryBefore,boundaryAfter,errors:users.flatMap(u=>u.errors)};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({participants:4,quietFront,rearConversation,boundaryIsolation,filmIframePreservedAcrossSeats:true,
      returnToSeparateHall:true,canvas,errors:proof.errors},null,2));
    assert.deepEqual(proof.errors,[]);
  }catch(e){
    let n=0;
    for(const context of browser.contexts())for(const page of context.pages()){
      n++;await page.screenshot({path:path.join(out,'failure-'+n+'.png')}).catch(()=>{});
      fs.writeFileSync(path.join(out,'failure-'+n+'.txt'),await page.locator('body').innerText().catch(()=>''));
    }
    throw e;
  }finally{await browser.close()}
}
module.exports={join,sit,stats,move,writeAudio,audioFixture};
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1});
