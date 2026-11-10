'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit:takeSeat,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const live=process.argv.includes('--live'),origin='https://together.deine-schule.com',url=origin+'/castle-piano/';
const root=path.resolve(__dirname,'..'),privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=path.join(privateRoot,'qa/piano-native-'+(live?'live':'candidate')),prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
async function main(){
  fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,'result.json'),{force:true});writeAudio();const users=[],errors=[];let stage='entry';
  const routed=[],map=JSON.parse(fs.readFileSync(path.join(root,'castle/musikzimmer.tmj'))),revision=map.properties.find(property=>property.name==='castleRevision').value;
  const browser=await chromium.launch({...(process.argv.includes('--bundled')||!live?{}:{channel:'chrome'}),headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function configureContext(context){
    await context.addInitScript(()=>{
      window.__pianoMeters=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);
        if(location.pathname==='/castle-piano/'&&destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);window.__pianoMeters.push(meter);}return result;};
    });
    if(!live)await context.route(prefix+'**',async route=>{
      const parsed=new URL(route.request().url()),name=parsed.pathname.slice(new URL(prefix).pathname.length);
      if(name!=='musikzimmer.tmj'&&!/^[a-z][a-z0-9-]*(?:\.bundle)?\.js$/.test(name)||!fs.existsSync(path.join(root,'castle',name)))return route.continue();
      routed.push({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'castle',name))).digest('hex')});
      return route.fulfill({contentType:name.endsWith('.tmj')?'application/json':'text/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(root,'castle',name))});
    });
  }
  async function enter(number){
    const user=await join(browser,number,{roomId:'musikzimmer',roomUrl:origin+'/~/castle-preview/musikzimmer.wam#start',outputDir:output,
      label:'Klavierprobe',seats:12,groups:3,revision,schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),
      mobile:number===2,parking:[[96,432],[800,432]],characterTextureId:'wvh-event-mira-v1',configureContext});users.push(user);
    const microphone=user.page.getByTestId('microphone-button');await microphone.click();await user.page.waitForTimeout(200);await microphone.click();
    assert.equal(await user.page.evaluate(()=>JSON.parse(localStorage.getItem('requestedMicrophoneStateKey'))),true);return user;
  }
  async function panel(user,destination=url){
    for(let n=0;n<100;n++){const frame=user.page.frames().find(frame=>frame.url()===destination);if(frame)return frame;await user.page.waitForTimeout(200);}throw Error('Owned music panel missing');
  }
  const count=(frame,n)=>frame.waitForFunction(n=>document.querySelectorAll('#players .player').length===n,n);
  async function start(frame){await frame.getByText('Bereit',{exact:true}).waitFor({timeout:20000});await frame.locator('#start').click();await frame.getByText('Gemeinsam verbunden',{exact:true}).waitFor({timeout:30000});}
  async function sit(user,id){await user.page.bringToFront();await takeSeat(user,id);}
  async function heard(frame){for(let n=0;n<60;n++){
    const energy=await frame.evaluate(()=>Math.max(0,...window.__pianoMeters.map(meter=>{const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((sum,n)=>sum+n*n,0)/values.length);})));if(energy>.0002)return energy;await frame.waitForTimeout(50);
  }throw Error('No decoded sampled piano sound in native receiver panel');}
  async function press(user,frame,note){const key=frame.locator('[data-note="'+note+'"]');await key.scrollIntoViewIfNeeded();const box=await key.boundingBox();await user.page.mouse.move(box.x+box.width/2,box.y+box.height-24);await user.page.mouse.down();}
  async function conversation(a,b){
    const before=[await stats(a),await stats(b)],started=Date.now();let after;
    do{await a.page.waitForTimeout(2000);after=[await stats(a),await stats(b)];
      if(after.every((value,index)=>value.energy>before[index].energy)&&after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room))){const proof={before,after,milliseconds:Date.now()-started};fs.writeFileSync(path.join(output,'voice-ok.private.json'),JSON.stringify(proof,null,2)+'\n');return proof;}
    }while(Date.now()-started<25000);
    const peers=[];for(const user of [a,b])peers.push(await user.page.evaluate(async()=>({rooms:window.__qaNativeRooms,peers:await Promise.all((window.__qaPeers||[]).map(async peer=>({state:peer.connectionState,senders:peer.getSenders().map(sender=>({kind:sender.track?.kind,enabled:sender.track?.enabled,muted:sender.track?.muted,ready:sender.track?.readyState})),sources:[...(await peer.getStats()).values()].filter(value=>value.type==='media-source'&&value.kind==='audio').map(value=>({energy:value.totalAudioEnergy,level:value.audioLevel}))})))})));
    fs.writeFileSync(path.join(output,'voice-wait.private.json'),JSON.stringify({before,after,peers},null,2)+'\n');throw Error('Both musicians must still decode native table conversation');
  }
  async function stand(user){
    await user.page.bringToFront();
    const buttons=await user.page.getByText('Aufstehen',{exact:true}).all();let clicked=false;
    for(const button of buttons)if(await button.isVisible()){await button.click();clicked=true;break;}
    assert.ok(clicked,'Standing must use the real visible map command');await user.script.waitForFunction(()=>!castleActivities.rounds.value&&!castleActivities.website,undefined,{polling:200,timeout:10000});
  }
  try{
    const a=await enter(1),b=await enter(2),chairs=await a.script.evaluate(()=>castleRoom.layout.seats.filter(seat=>seat.audioGroup==='buchclub').map(seat=>seat.id));
    stage='shared-picker';await sit(a,chairs[0]);await a.page.getByRole('button',{name:'Schlossklavier',exact:true}).click();const af=await panel(a);await start(af);
    const round=await a.script.evaluate(()=>castleActivities.rounds.value.round);assert.equal(round.choice,'piano');stage='late-mobile-musician';
    await sit(b,chairs[1]);const bf=await panel(b);await start(bf);await count(af,2);await count(bf,2);assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);
    stage='native-music-and-voice';await press(a,af,60);await bf.locator('[data-note="60"].peer').waitFor();const energyAtoB=await heard(bf);await a.page.mouse.up();await bf.locator('[data-note="60"].peer').waitFor({state:'hidden'});
    const mobileKey=bf.locator('[data-note="64"]');await mobileKey.scrollIntoViewIfNeeded();const box=await mobileKey.boundingBox(),touch=await b.context.newCDPSession(b.page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height-25,id:1}]});
    await af.locator('[data-note="64"].peer').waitFor();const energyBtoA=await heard(af);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    await af.locator('[data-note="64"].peer').waitFor({state:'hidden'});const audio=await conversation(a,b);
    assert.equal(await bf.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    for(const [user,label]of [[a,'desktop'],[b,'mobile']])await user.page.screenshot({path:path.join(output,label+'.private.png')});
    const pixels=await sharp(await b.page.locator('canvas:visible').first().screenshot()).stats();assert.ok(pixels.channels.slice(0,3).every(channel=>channel.stdev>12));
    stage='creator-stands';await stand(a);await count(bf,1);assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);
    await press(b,bf,67);await heard(bf);await b.page.mouse.up();
    stage='last-stands-and-choir';await stand(b);await sit(a,chairs[0]);await a.page.getByRole('button',{name:'Band und Chor',exact:true}).click();
    const collection=await panel(a,origin+'/castle-content/collection.html?kind=music');await collection.locator('body').waitFor();assert.equal(await a.script.evaluate(()=>castleActivities.rounds.value.round.choice),'choir');await stand(a);
    stage='instrument-approach';await a.page.bringToFront();await a.script.evaluate(async()=>{await WA.player.teleport(112,272);await castleRoom.syncPosition();castleActivities.refresh();});
    await a.script.waitForFunction(()=>castleActivities.active?.settings.id==='music-piano');
    const button=a.page.getByRole('button',{name:'Schlossklavier',exact:true}).first();if(!await button.isVisible())await a.page.getByTestId('apps-button').click();await a.page.getByRole('button',{name:'Schlossklavier',exact:true}).first().click();await panel(a);
    await a.script.evaluate(async()=>{await WA.player.teleport(432,608);await castleRoom.syncPosition();castleActivities.refresh();});await a.script.waitForFunction(()=>!castleActivities.website);
    stage='clean-movement';await b.page.bringToFront();await b.script.evaluate(async()=>{await WA.player.teleport(432,608);await castleRoom.syncPosition();});
    const before=await b.script.evaluate(()=>WA.player.getPosition());await b.page.keyboard.down('ArrowRight');await b.page.waitForTimeout(180);await b.page.keyboard.up('ArrowRight');
    assert.ok((await b.script.evaluate(()=>WA.player.getPosition())).x>before.x+2);
    errors.push(...users.flatMap(user=>user.errors));assert.deepEqual(errors,[]);if(!live)assert.ok(routed.some(file=>file.name==='expansion.bundle.js'));
    const proof={passed:true,browserVersion:await browser.version(),normalMicrosoftPupils:2,realNativeWorkAdventure:true,publicPianoService:true,realPublicPianoWebSocketHandshake:true,
      candidateMapOnlyInsideTestBrowsers:!live,publishedPreview:live,revision,sourceFiles:Object.fromEntries(['musikzimmer.tmj','expansion.bundle.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'castle',name))).digest('hex')])),
      visibleGroupPicker:true,lateJoinSharesChoice:true,desktopAndMobileTouchHeardBothWays:true,energyAtoB,energyBtoA,
      nativeTableConversationDecodedBoth:true,nativeMicrophonesActivatedWithUi:true,standingClosesOnlyOwnedPiano:true,remainingMusicianContinues:true,lastStandingResetsChoice:true,
      existingBandAndChoirPreserved:true,visibleInstrumentApproachWorks:true,noMobileHorizontalOverflow:true,nonblankNativeCanvas:true,
      normalMovementAfterClosure:true,schoolOverrides:false,loadApprovalFor400:false,errors,audio,routed};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,audio:undefined},null,2));
  }catch(error){const loaders=[];for(const user of users)loaders.push(await user.script.evaluate(()=>({scripts:[...document.scripts].map(script=>({src:script.src,type:script.type,bytes:script.textContent.length,piano:script.textContent.includes('castle-piano/')})),resources:performance.getEntriesByType('resource').map(entry=>entry.name)})).catch(()=>null));
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,loaders,
    diagnostics:users.map(user=>user.diagnostics),scriptLoads:users.map(user=>user.scriptLoads),routed,errors:users.flatMap(user=>user.errors)},null,2)+'\n');console.error(JSON.stringify({passed:false,stage,errorType:error.name}));
    let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png')}).catch(()=>{});process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Native piano probe stopped: '+error.name);process.exitCode=1;});
