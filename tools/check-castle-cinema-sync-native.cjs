'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {createStage}=require('./castle-cinema-stage.cjs'),{join,sit,move,stats,writeAudio,audioFixture,roomController}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com',filmOrigin='https://deutsche-online-schule.com';
const filmUrl=filmOrigin+'/kino/public/kino.php',output=storage.outputPath('cinema-sync-native/'+new Date().toISOString().replace(/[:.]/g,'-'));
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const policyNames=['content-security-policy','x-frame-options','permissions-policy','referrer-policy','x-content-type-options'];
async function bounded(operation,milliseconds,label){
  let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error(label+' exceeded its test deadline'),{name:'ProbeDeadlineError'})),milliseconds);})]);}
  finally{clearTimeout(timer);}
}
async function publicState(){const response=await fetch(filmUrl+'?state=1',{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);return response.json();}
async function main(){
  let stage,browser,transportStage=false,stopping=false,phase='public-idle-check';const users=[],failures=[],cancellations=[],documents=[],media=[],results=[],timings=[],audio=[],frameProbes=[];
  const progress=()=>fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify({phase,at:new Date().toISOString(),
    pages:browser?.contexts().flatMap(context=>context.pages().map(page=>{try{const url=new URL(page.url());return url.origin+url.pathname;}catch{return 'new-page';}}))||[]},null,2)+'\n');
  const baseline=await publicState();assert.equal(baseline.mode,'idle','Do not replace or start an actual public screening');
  const publicResponse=await fetch(filmUrl,{signal:AbortSignal.timeout(15000)});assert.equal(publicResponse.status,200);
  const policies=Object.fromEntries(policyNames.filter(name=>publicResponse.headers.has(name)).map(name=>[name,publicResponse.headers.get(name)]));
  const heartbeat=setInterval(progress,5000);progress();
  try{
    phase='real-php-stage-start';progress();stage=await createStage({output});writeAudio();phase='browser-launch';progress();
    browser=await chromium.launch({channel:'chrome',headless:true,timeout:45000,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
      '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    async function configure(context,number){
      assert.equal((await context.cookies(filmOrigin)).filter(cookie=>cookie.name==='kino_viewer_token').length,0,'Do not reuse an existing cinema age authorization');
      await context.route(filmOrigin+'/kino/**',async route=>{
        const request=route.request(),url=new URL(request.url());
        try{
          assert.equal(request.headers().authorization,undefined,'The cinema must not receive WorkAdventure authorization');
          if(!transportStage)return await route.continue();
          assert.ok(url.pathname.startsWith('/kino/public/'));const file=url.pathname.slice('/kino/public/'.length);
          assert.ok(file==='kino.php'||file==='sync-test-film.webm'||Object.hasOwn(stage.files,'public/'+file));
          assert.ok(!url.search||file==='kino.php'&&['?state=1','?client_log=1'].includes(url.search));
          assert.ok(file==='kino.php'&&url.search==='?client_log=1'?request.method()==='POST':request.method()==='GET');
          const response=await route.fetch({url:(file==='sync-test-film.webm'?stage.mediaBase:stage.base)+'/'+file+url.search,maxRedirects:0,timeout:20000});
          const allowedStatuses=file==='kino.php'&&url.search==='?client_log=1'?[200,429]:file==='sync-test-film.webm'?[200,206]:[200];
          assert.ok(allowedStatuses.includes(response.status()));
          if(Object.hasOwn(stage.files,'public/'+file)&&file!=='kino.php')assert.equal(sha(await response.body()),stage.files['public/'+file]);
          if(file==='kino.php'&&!url.search)documents.push({number,sha256:sha(await response.body()),realPhpRendered:true});
          if(file==='sync-test-film.webm'){
            assert.equal(response.headers()['accept-ranges'],'bytes');
            media.push({number,status:response.status(),range:request.headers().range||null,contentRange:response.headers()['content-range']||null,authorizationForwarded:false});
          }
          const headers={...response.headers()};
          for(const name of policyNames){delete headers[name];if(Object.hasOwn(policies,name))headers[name]=policies[name];}
          await route.fulfill({response,headers});
        }catch(error){
          let detached=false;try{detached=request.frame().isDetached();}catch{}
          const record={number,path:url.pathname,errorType:error.name};
          if(error.name!=='AssertionError'&&(stopping||detached))cancellations.push({...record,reason:stopping?'shutdown':'detached-frame'});
          else failures.push(record);
          await route.abort().catch(()=>{});
        }
      });
    }
    async function controller(user,id){
      for(let n=0;n<100;n++){
        const frame=await roomController(user.page.frames(),id);if(frame){user.script=frame;return frame;}
        await user.page.waitForTimeout(250);
      }throw Error('Native destination controller missing');
    }
    async function film(user){
      for(let n=0;n<100;n++){const frame=user.page.frames().find(frame=>frame.url().startsWith(filmUrl));if(frame)return frame;await user.page.waitForTimeout(200);}
      throw Error('Actual cinema side frame missing');
    }
    for(let number=1;number<=2;number++){
      const map=JSON.parse(fs.readFileSync(path.join(root,'castle/kino.tmj')));
      const user=await bounded(join(browser,number,{roomId:'kino',roomUrl:origin+'/~/castle-preview/kino.wam#foyer',outputDir:output,label:'Filmprobe',
        seats:64,groups:4,revision:map.properties.find(property=>property.name==='castleRevision').value,
        schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),mobile:number===2,
        characterTextureId:'wvh-event-mira-v1',stubCinema:false,configureContext:context=>configure(context,number),
        onPhase:step=>{phase='participant-'+number+'-'+step;progress();},
        onFrameProbe:probe=>{frameProbes.push({number,...probe});fs.writeFileSync(path.join(output,'frame-probes.json'),JSON.stringify(frameProbes,null,2)+'\n');}}),110000,'Native cinema entry '+number);
      users.push(user);const frame=await film(user);await frame.locator('html[data-kino-theme="castle"]').waitFor();
      assert.equal(await frame.locator('#startBtn').count(),0);assert.equal(await frame.locator('video').count(),0);
    }
    const [a,b]=users;results.push({case:'actual-public-foyer',normalMicrosoftPupils:2,oneMobileTouch:true,actualPublicPageEmbedded:true,publicFilmStarted:false});
    phase='real-php-stage-in-native-frame';transportStage=true;
    for(const user of users){const frame=await film(user);await frame.goto(filmUrl,{waitUntil:'domcontentloaded'});await frame.locator('html[data-kino-theme="castle"]').waitFor();}
    stage.command('start');
    for(const user of users){const frame=await film(user);await frame.locator('#startBtn').waitFor({state:'visible',timeout:30000});}
    phase='late-playback-and-real-media';
    let af=await film(a);await af.locator('#startBtn').click();await af.locator('video').waitFor();
    await a.page.waitForTimeout(7000);let bf=await film(b);await bf.locator('#startBtn').click();await bf.locator('video').waitFor();
    async function aligned(label,limit=22000){
      const started=Date.now();let sample;
      do{
        const state=await stage.state(),at=Date.now();assert.equal(state.mode,'live');assert.equal(state.paused,false);
        const videos=[];
        for(const user of users){const frame=await film(user);videos.push(await frame.locator('video').evaluate(video=>({time:video.currentTime,paused:video.paused,
          readyState:video.readyState,error:video.error?.code||null,frames:video.getVideoPlaybackQuality().totalVideoFrames,src:video.currentSrc,
          duration:video.duration,seeking:video.seeking,seekable:Array.from({length:video.seekable.length},(_,index)=>[video.seekable.start(index),video.seekable.end(index)])})).catch(()=>null));}
        const target=state.offset_sec+(Date.now()-at)/1000;
        sample={label,elapsedMilliseconds:Date.now()-started,target,videos};
        if(videos.every(video=>video&&!video.paused&&video.readyState>=2&&video.error===null&&video.frames>0&&Math.abs(video.time-target)<=3.5)
          &&Math.abs(videos[0].time-videos[1].time)<=3.5){timings.push(sample);return;}
        await a.page.waitForTimeout(500);
      }while(Date.now()-started<limit);
      fs.writeFileSync(path.join(output,'timing-failure.private.json'),JSON.stringify(sample,null,2)+'\n');throw Error('Actual movie clocks did not converge: '+label);
    }
    await aligned('late-join');
    af=await film(a);await af.locator('video').evaluate(video=>{window.__qaCinemaVideo=video;window.__qaCinemaDocument=crypto.randomUUID();});
    const instance=await af.evaluate(()=>window.__qaCinemaDocument);
    for(const seat of ['kino-0-3','kino-lounge-0-nw','kino-5-7']){
      await sit(a,seat);af=await film(a);assert.equal(await af.evaluate(()=>window.__qaCinemaDocument),instance);
      assert.equal(await af.locator('video').evaluate(video=>window.__qaCinemaVideo===video),true);
    }
    await aligned('seat-change');af=await film(a);await af.locator('video').evaluate(video=>{video.currentTime=0;});await aligned('real-five-second-drift-recovery');
    for(const [number,user]of users.entries()){
      const frame=await film(user);assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const pixels=await sharp(await frame.locator('video').screenshot()).stats();assert.ok(pixels.channels.slice(0,3).every(channel=>channel.stdev>20));
      await user.page.screenshot({path:path.join(output,'playing-'+(number+1)+'.private.png')});
    }
    results.push({case:'actual-media-sync',realHtmlVideoDecodedBoth:true,startClickStaggeredSevenSeconds:true,lateJoinAligned:true,
      seatChangePreservesVideoAndFrame:true,intentionalLocalDriftCorrectedByRealPlayer:true,desktopAndMobileVideoNonblank:true});
    async function quiet(label){
      await a.page.waitForTimeout(2500);const before=[await stats(a),await stats(b)];await a.page.waitForTimeout(2500);const after=[await stats(a),await stats(b)];
      assert.ok(after.every((sample,index)=>sample.energy===before[index].energy));audio.push({label,before,after});return after;
    }
    phase='actual-film-with-native-zones';await sit(a,'kino-0-3');await sit(b,'kino-0-4');
    const front=await quiet('quiet-front');assert.ok(front.every(sample=>sample.rooms.length===0));await aligned('quiet-front');
    await sit(a,'kino-lounge-0-nw');await sit(b,'kino-lounge-0-so');
    const before=[await stats(a),await stats(b)],started=Date.now();let after;
    do{
      await a.page.waitForTimeout(1500);after=[await stats(a),await stats(b)];
      if(after.every((sample,index)=>sample.energy>before[index].energy)&&after[0].rooms.some(room=>room.endsWith('area-kino-lounge-0')&&after[1].rooms.includes(room)))break;
    }while(Date.now()-started<27000);
    assert.ok(after.every((sample,index)=>sample.energy>before[index].energy));
    assert.ok(after[0].rooms.some(room=>room.endsWith('area-kino-lounge-0')&&after[1].rooms.includes(room)));
    audio.push({label:'rear-conversation-with-actual-film',before,after});await aligned('conversation-rear');
    await sit(b,'kino-lounge-1-so');const separated=await quiet('separate-rear-tables');
    assert.ok(!separated[0].rooms.some(room=>separated[1].rooms.includes(room)));await aligned('separate-rear-tables');
    results.push({case:'native-zones-during-film',frontQuietBoth:true,rearDecodedSpeechBoth:true,separateRearTablesIsolated:true,movieContinuesAcrossAllZones:true});
    phase='real-shared-pause-and-resume';stage.command('pause');
    for(const user of users){const frame=await film(user);await frame.locator('#playerPauseShield').waitFor({state:'visible',timeout:30000});assert.equal(await frame.locator('video').count(),0);}
    const paused=await stage.state();await a.page.waitForTimeout(3000);assert.equal((await stage.state()).offset_sec,paused.offset_sec);
    stage.command('resume');await aligned('shared-resume',35000);results.push({case:'shared-pause',pauseStopsBothActualPlayers:true,pausedClockDoesNotAdvance:true,resumeReturnsBothToServerClock:true});
    phase='closure-travel-and-reentry';
    await a.script.evaluate(()=>castleCinema.website.close());
    await a.script.waitForFunction(()=>castleCinema.dismissed&&!castleCinema.website,undefined,{polling:200,timeout:10000});
    const requests=a.filmRequests;await a.page.waitForTimeout(2300);assert.equal(a.filmRequests,requests);assert.ok(!a.page.frames().some(frame=>frame.url().startsWith(filmUrl)));
    await a.page.getByRole('button',{name:'Kino',exact:true}).click();await aligned('manual-reopen');
    await a.script.evaluate(()=>castleRoom.returnToHall()).catch(error=>{if(!/Execution context was destroyed|Frame was detached/.test(error.message))throw error;});
    await controller(a,'grosse-halle');assert.ok(!a.page.frames().some(frame=>frame.url().startsWith(filmUrl)));
    await a.script.evaluate(()=>WA.nav.goToRoom('https://together.deine-schule.com/~/castle-preview/kino.wam#foyer')).catch(error=>{if(!/Execution context was destroyed|Frame was detached/.test(error.message))throw error;});
    await controller(a,'kino');await aligned('map-reentry',35000);
    results.push({case:'movie-frame-lifecycle',manualCloseRespected:true,explicitReopenAtCurrentTime:true,leavingClosesActualPlayer:true,reentryUsesCurrentServerClock:true});
    phase='normal-end-and-age-boundary';stage.command('end');
    for(const user of users){const frame=await film(user);await frame.locator('video').waitFor({state:'detached',timeout:30000});await frame.locator('#startBtn').waitFor({state:'detached'});}
    stage.command('fsk12');
    for(const [index,user]of users.entries()){
      const frame=await film(user);await frame.locator('#ageGatePanel').waitFor({state:'visible',timeout:30000});
      assert.equal(await frame.locator('video').count(),0);assert.equal(await frame.locator('#startBtn').count(),0);
      await user.page.screenshot({path:path.join(output,'age-boundary-'+(index+1)+'.private.png')});
    }
    const denied=await stage.state();assert.equal(denied.fsk.allowed,false);assert.equal(denied.video_ref,'');assert.equal(denied.provider,'');stage.command('end');
    results.push({case:'end-and-unverified-age',endStopsBothPlayers:true,noFollowUpProviderLoaded:true,unverifiedFsk12Denied:true,restrictedVideoReferenceHidden:true});
    phase='final-production-and-ui-check';const afterPublic=await publicState();assert.equal(afterPublic.mode,baseline.mode);assert.equal(afterPublic.sync_token,baseline.sync_token);
    assert.deepEqual(users.flatMap(user=>user.errors),[]);assert.deepEqual(failures,[]);assert.ok(media.some(item=>item.number===1)&&media.some(item=>item.number===2));
    const proof={passed:true,normalMicrosoftPupils:2,oneMobileTouch:true,realNativeWorkAdventure:true,mapsOrSchoolProfilesReplaced:false,
      actualPublicFoyerTested:true,productionFilmOrDatabaseChanged:false,productionFilmPlaybackTested:false,
      actualPhpMirrorStage:true,currentLivePhpSourceFetched:false,syntheticDatabaseAndTestFilm:true,minimalSchemaNotProductionMigration:true,
      providerOrMicrosoftKeysCopied:false,productionEmbedPoliciesPreserved:true,policies,source:stage.sourceManifest,videoSha256:stage.videoSha256,
      results,timings,audio,documents,media,cancellations,frameProbes,routeFailures:failures,errors:[],fullCastleApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({passed:true,normalMicrosoftPupils:2,cases:results.length,actualPhpMirrorStage:true,realDecodedVideoBoth:true,
      productionFilmPlaybackTested:false,productionChanged:false,timingChecks:timings.length}));
  }catch(error){
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({passed:false,phase,errorType:error.name,error:error.message,routeFailures:failures,
      results,timings,audio,media,documents,frameProbes,productionFilmOrDatabaseChanged:false},null,2)+'\n');
    if(browser){let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png'),timeout:5000}).catch(()=>{});}
    console.error(JSON.stringify({passed:false,phase,errorType:error.name}));process.exitCode=1;
  }finally{
    clearInterval(heartbeat);stopping=true;try{if(browser)await bounded(browser.close(),20000,'Owned browser close');}finally{if(stage)await stage.close();}
  }
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:'Isolated cinema probe stopped'}));process.exitCode=1;});
