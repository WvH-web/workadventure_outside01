'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const hostPublished=process.argv.includes('--game-host-published');
const candidate=process.argv.includes('--recovery-candidate'),recovery=process.argv.includes('--recovery-published')||candidate||hostPublished;
assert.ok(!hostPublished||!candidate&&!process.argv.includes('--brother-probe'));
const brothers=process.argv.includes('--brother-probe'),live=process.argv.includes('--live')||brothers||recovery;
const attemptArg=process.argv.find(arg=>arg.startsWith('--attempt='));assert.ok(!attemptArg||recovery&&/^--attempt=[1-9]$/.test(attemptArg));
const suffix=attemptArg&&attemptArg!=='--attempt=1'?'-attempt-'+attemptArg.split('=')[1]:'';
const root=path.resolve(__dirname,'..'),privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const outputName='rounds-native-'+(hostPublished?'game-host-published'+suffix+'/'+new Date().toISOString().replace(/[:.]/g,'-'):recovery?'recovery-'+(candidate?'candidate':'published')+suffix:brothers?'brothers':live?'live':'stage');
let output=path.join(privateRoot,'qa',outputName);const origin='https://together.deine-schule.com';
const prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
const crypto=require('node:crypto'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const moduleNames=hostPublished?['games.html','games.js','games.css','rounds.html','rounds.js','round-client.js','presence.html','presence.js']:['presence.js','round-client.js'];
const modules=Object.fromEntries(moduleNames.map(name=>[name,fs.readFileSync(path.join(root,'ops/castle-school/public',name))]));
async function main(){
  if(recovery){const disk=fs.statfsSync(root);if(disk.bavail*disk.bsize<1024**3)throw Object.assign(Error('Insufficient local space for two browser profiles'),{code:'INSUFFICIENT_DISK_SPACE'});}
  if(process.platform==='win32')output=require('./castle-local-storage.cjs').outputPath(outputName);
  const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
  const {join,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
  fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,'result.json'),{force:true});writeAudio();let stage='entry',recoveryAudio;const users=[],results=[],served=[],roundRequests=[];
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function routes(context){
    await context.route(origin+'/castle-school/**',async route=>{
      const url=new URL(route.request().url());return route.fulfill({response:await route.fetch({url:'http://127.0.0.1:13212'+url.pathname+url.search,maxRedirects:0})});
    });
    await context.route(prefix+'**',async route=>{
      const url=new URL(route.request().url()),name=url.pathname.slice(new URL(prefix).pathname.length);
      if(!/^[a-z][a-z0-9-]*(?:\.bundle)?\.(?:tmj|js)$/.test(name))return route.continue();
      const file=path.join(root,'castle',name);if(!fs.existsSync(file))return route.continue();
      let body=fs.readFileSync(file);
      if(name.endsWith('.tmj')){
        const map=JSON.parse(body);map.properties=map.properties.filter(property=>property.name!=='castleCommunity');
        map.properties.push({name:'castleCommunity',type:'bool',value:true});body=Buffer.from(JSON.stringify(map));
      }
      return route.fulfill({contentType:name.endsWith('.tmj')?'application/json':'text/javascript',headers:{'access-control-allow-origin':'*'},body});
    });
  }
  const contextNumbers=new Map();
  async function recoveryRoutes(context){
    if(candidate)for(const [name,body]of Object.entries(modules))await context.route(origin+'/castle-school/'+name,route=>route.fulfill({contentType:'text/javascript',body}));
    context.on('request',request=>{if(request.url().startsWith(origin+'/castle-school/round-')&&!request.url().endsWith('.js'))roundRequests.push({number:contextNumbers.get(context),route:new URL(request.url()).pathname});});
    context.on('response',response=>{const route=new URL(response.url()).pathname.slice('/castle-school/'.length),name=['games','rounds','presence'].includes(route)?route+'.html':route;
      if(response.url()===origin+'/castle-school/'+route&&Object.hasOwn(modules,name)){
        const pending=response.body().then(raw=>{assert.equal(response.status(),200);assert.equal(sha(raw),sha(modules[name]));return sha(raw);});
        pending.catch(()=>{});served.push([contextNumbers.get(context)+':'+name,pending]);
      }
    });
  }
  async function enter(number){
    const map=JSON.parse(fs.readFileSync(path.join(root,'castle/bibliothek.tmj')));
    const user=await join(browser,number,{roomId:'bibliothek',roomUrl:origin+'/~/castle-preview/bibliothek.wam#start',outputDir:output,
      label:'Rundenprobe',seats:13,groups:3,revision:map.properties.find(property=>property.name==='castleRevision').value,
      schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1||brothers?'A':'B')+'.private.json'),mobile:number===2,
      allowDuplicateTestSession:brothers&&number===2,
      parking:[[96,432],[800,432]],characterTextureId:'wvh-event-mira-v1',
      ...(recovery?{configureContext:async context=>{contextNumbers.set(context,number);await recoveryRoutes(context);}}:live?{}:{configureContext:routes})});
    users.push(user);await user.script.waitForFunction(()=>window.castleRoom.community?.bridge,undefined,{polling:200,timeout:20000});return user;
  }
  async function controller(user,id){
    for(let n=0;n<100;n++){
      for(const frame of user.page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false)){
        await frame.waitForFunction(()=>window.castleRoom.community?.bridge,undefined,{polling:200,timeout:20000});user.script=frame;return;
      }await user.page.waitForTimeout(300);
    }throw Error('Destination controller missing');
  }
  async function panel(user){
    const button=user.page.getByRole('button',{name:'Runden',exact:true}).first();
    if(!await button.isVisible()){
      const apps=user.page.getByTestId('apps-button');if(await apps.isVisible())await apps.click();
      else{await user.page.getByTestId('action-user').click();if(!await button.isVisible()&&await apps.isVisible())await apps.click();}
    }await button.click();
    for(let n=0;n<80;n++){
      const frame=user.page.frames().find(frame=>frame.url()===origin+'/castle-school/rounds');
      if(frame){await frame.locator('#target option').first().waitFor({state:'attached'});return frame;}
      await user.page.waitForTimeout(250);
    }throw Error('Native round panel missing');
  }
  async function arrived(user,mapId){
    await controller(user,mapId);
    await user.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundJourneyV1'),undefined,{timeout:25000});
    await user.script.waitForFunction(()=>!castleRoom.community.website,undefined,{polling:200,timeout:10000});
  }
  async function refresh(frame){
    const response=frame.page().waitForResponse(response=>response.url()===origin+'/castle-school/round-context'&&response.frame()===frame);
    await frame.locator('#refresh').click();await (await response).finished();await frame.waitForTimeout(150);
  }
  async function count(frame,n){await frame.locator('.round small').first().filter({hasText:n+' von '}).waitFor();}
  async function create(user,targetId,kind){
    const frame=await panel(user);await frame.locator('#create-panel').evaluate(element=>{element.open=true;});
    await frame.locator('#target').selectOption(targetId);await frame.locator('#kind').selectOption(kind);
    await frame.getByRole('button',{name:'Runde anbieten',exact:true}).click();
    const mapId=targetId.startsWith('atelier-')?'atelier':'bibliothek';await arrived(user,mapId);
    const membership=await user.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')||'null'));
    assert.ok(membership?.roundId);return membership.roundId;
  }
  async function sample(a,b){
    const before=[await stats(a),await stats(b)],started=Date.now(),samples=[];let after;
    do{
      await a.page.waitForTimeout(2000);after=[await stats(a),await stats(b)];samples.push({milliseconds:Date.now()-started,values:after});
      if(after.every((value,index)=>value.energy>before[index].energy)&&after[0].rooms.some(room=>room.endsWith('area-lesekamin')&&after[1].rooms.includes(room)))
        return {before,after,connectionAndAudioWaitMilliseconds:Date.now()-started,samples};
    }while(Date.now()-started<25000);
    fs.writeFileSync(path.join(output,'audio-wait-failure.private.json'),JSON.stringify({before,after,samples},null,2)+'\n');
    throw Error('Both native participants must decode non-silent table audio within 25 seconds');
  }
  try{
    const a=await enter(1),b=await enter(2);
    if(brothers){
      stage='same-account-transient-boundary';
      const own=await a.page.evaluate(()=>JSON.parse(localStorage.getItem('localUser')).uuid);
      assert.ok(typeof own==='string'&&own.length>0);assert.equal(own,await b.page.evaluate(()=>JSON.parse(localStorage.getItem('localUser')).uuid));
      const key='castlePrivateProbe'+Date.now().toString(36),nonce=require('node:crypto').randomUUID();
      await a.script.evaluate(({key,nonce})=>WA.player.state.saveVariable(key,nonce,{public:false,persist:false}),{key,nonce});
      let observed=false;
      try{await b.script.waitForFunction(({key,nonce})=>WA.player.state.loadVariable(key)===nonce,{key,nonce},{polling:200,timeout:12000});observed=true;}
      catch(error){if(error.name!=='TimeoutError')throw error;}
      for(const user of [a,b])await user.script.evaluate(key=>WA.player.state.saveVariable(key,undefined,{public:false,persist:false}),key);
      const proof={passed:!observed,normalMicrosoftSameAccountConnections:2,sameAccountVerified:true,transientPrivateStateReachedOtherConnection:observed,
        requestFreshnessWindowMilliseconds:10000,observedForMilliseconds:12000,probeVariableRemoved:true,gameOrSeatChanged:false};
      fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
      if(observed)process.exitCode=1;return;
    }
    stage='same-room-create';const roundId=await create(a,'bibliothek-lesekamin',hostPublished?'talk':'read');
    stage='mobile-directory';let bf=await panel(b);await count(bf,1);assert.equal(await bf.locator('#target option[value^="grundschule-"]').count(),0);
    stage='mobile-join';
    await bf.locator('.round').getByRole('button',{name:'Mitmachen',exact:true}).click();await arrived(b,'bibliothek');
    stage='native-table-audio';await a.page.waitForTimeout(2000);const audio=await sample(a,b);
    const bridge=await a.page.locator('iframe[src="'+origin+'/castle-school/presence"]').first().boundingBox();
    assert.ok(bridge&&bridge.width<=2&&bridge.height<=2,'Membership bridge stays an invisible one-pixel surface');
    let af=await panel(a);await count(af,2);assert.equal(await af.locator('#target option[value^="mittelstufe-"]').count(),0);
    assert.equal(await af.locator('#target option[value="bibliothek-buchclub"]').count(),1);
    await a.page.screenshot({path:path.join(output,'rounds-desktop.private.png')});
    bf=await panel(b);await count(bf,2);assert.equal(await bf.locator('#target option[value="bibliothek-buchclub"]').count(),live?1:0);
    assert.equal(await bf.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await b.page.screenshot({path:path.join(output,'rounds-mobile.private.png')});
    stage='audio-with-directory';await sample(a,b);
    if(hostPublished){
      stage='published-game-boundary';
      const frameAt=async(user,route)=>{
        for(let n=0;n<80;n++){
          const found=user.page.frames().find(frame=>{try{return new URL(frame.url()).origin===origin&&new URL(frame.url()).pathname==='/castle-school/'+route;}catch{return false;}});
          if(found)return found;await user.page.waitForTimeout(250);
        }throw Error('Published sidebar navigation missing');
      };
      for(const [index,user]of users.entries()){
        const roundsFrame=index===0?af:bf,before=await user.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));
        const pageCount=user.page.context().pages().length;
        await roundsFrame.getByRole('link',{name:'Spielangebote',exact:true}).click();
        const gamesFrame=await frameAt(user,'games');await gamesFrame.locator('#games-list button').last().waitFor({state:'attached'});
        await gamesFrame.locator('#account').filter({hasText:'Schulzugang'}).waitFor();
        assert.equal(await gamesFrame.locator('#games-list button').count(),7);
        await gamesFrame.locator('#back-rounds').waitFor({state:'visible'});
        if(index===1)await gamesFrame.locator('#offer-select').selectOption('haxballarea01');
        else await gamesFrame.locator('[data-game-id="haxballarea01"]').click();
        await gamesFrame.locator('#availability').filter({hasText:'nicht freigegeben'}).waitFor();
        assert.equal(await gamesFrame.locator('#lobby').isVisible(),false);assert.equal(await gamesFrame.locator('#frame-slot iframe').count(),0);
        const boundary=await user.page.evaluate(async roundId=>{
          const headers={Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'};
          const call=async(route,body)=>{const response=await fetch('/castle-school/'+route,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});return {status:response.status,value:await response.json()};};
          const context=await call('context'),membership=JSON.parse(sessionStorage.getItem('castleRoundMembershipV1'));
          const denied=[];for(const resourceId of ['gamesarea01','gamesarea02','gamesarea03','gamesarea04','gamesarea05','stumbleguysgame','haxballarea01']){
            const response=await call('launch',{resourceId});denied.push(response.status===403&&response.value.error==='not_allowed'&&!Object.hasOwn(response.value,'targetUrl'));
          }
          const confirmation=await call('round-game-confirm',{leaseId:membership.leaseId,resourceId:'haxballarea01',revision:1,targetUrl:'https://www.haxball.com/play'});
          const launch=await call('round-game-launch',{roundId});
          return {status:context.status,student:context.value.account?.kind==='student',ownRound:context.value.round?.id===roundId&&context.value.round?.mine===true,
            allDraftsDenied:context.value.offers?.length===7&&context.value.offers.every(offer=>offer.allowed===false&&!Object.hasOwn(offer,'targetUrl'))&&Object.values(context.value.decisions).every(decision=>decision.allowed===false),
            allLaunchesDenied:denied.length===7&&denied.every(Boolean),confirmationDenied:confirmation.status===403&&confirmation.value.error==='not_allowed',
            noGameInvented:launch.status===409&&launch.value.error==='game_not_ready'};
        },roundId);
        assert.equal(boundary.status,200);assert.ok(Object.entries(boundary).every(([key,value])=>key==='status'||value===true));
        assert.equal(await gamesFrame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await user.page.screenshot({path:path.join(output,'game-boundary-'+(index+1)+'.private.png')});
        await gamesFrame.getByRole('link',{name:'Treffpunktrunden',exact:true}).click();
        const returned=await frameAt(user,'rounds');await returned.locator('#target option').first().waitFor({state:'attached'});await count(returned,2);
        const after=await user.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));
        assert.equal(after.leaseId,before.leaseId);assert.equal(after.roundId,before.roundId);assert.equal(user.page.context().pages().length,pageCount);
        await user.script.evaluate(()=>castleRoom.community.closePanel());
      }
      await sample(a,b);af=await panel(a);bf=await panel(b);
      results.push({case:'published-game-boundary',normalMicrosoftPupils:2,oneMobileTouch:true,actualPublishedSources:true,
        allSevenRealDraftsDenied:true,noTargetUrlDisclosure:true,explicitHostCannotBypassDraft:true,noGameInvented:true,
        sameSidebarBothDirections:true,sameLeaseBothDirections:true,noExtraTab:true,ownRoundBundled:true,tableAudioAfterPanelReturn:true});
    }
    stage='creator-leaves';await af.getByRole('button',{name:'Abmelden',exact:true}).click();await af.locator('#mine').waitFor({state:'hidden'});
    await refresh(bf);await count(bf,1);
    const oldLease=await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'));
    await bf.locator('.round').getByRole('button',{name:'Zur Runde',exact:true}).click();await arrived(b,'bibliothek');
    const renewed=await b.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));
    assert.notEqual(renewed.leaseId,JSON.parse(oldLease).leaseId,'Explicit reentry rotates the lease, not just its timestamp');
    const heartbeat=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===200,{timeout:30000});
    await (await heartbeat).finished();
    if(recovery){
      assert.ok(Number.isFinite(renewed.confirmedUntil));
      await b.page.waitForFunction(before=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')).confirmedUntil>before,renewed.confirmedUntil);
      stage='bounded-recovery';let injected=0;const checkpoint=roundRequests.length;
      await b.page.context().route(origin+'/castle-school/round-heartbeat',route=>{injected++;return route.fulfill({status:503,contentType:'application/json',headers:{'Retry-After':'1'},body:'{"error":"unavailable"}'});},{times:1});
      const before=await b.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));
      const failed=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===503,{timeout:30000});
      await (await failed).finished();
      const held=await b.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));
      assert.equal(held.leaseId,before.leaseId);assert.equal(held.confirmedUntil,before.confirmedUntil);
      const fresh=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===200,{timeout:12000});
      await (await fresh).finished();await b.page.waitForFunction(before=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')).confirmedUntil>before,before.confirmedUntil);
      const after=await b.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')));assert.equal(after.leaseId,before.leaseId);assert.equal(injected,1);
      assert.deepEqual(roundRequests.slice(checkpoint).filter(row=>row.number===2).map(row=>row.route),['/castle-school/round-heartbeat','/castle-school/round-heartbeat']);
      recoveryAudio=await sample(a,b);
      bf=await panel(b);await refresh(bf);await count(bf,1);await b.script.evaluate(()=>castleRoom.community.closePanel());
      results.push({case:'bounded-recovery',oneExplicitPreAdmission503:true,sameLeaseRetained:true,noCachedDeadlineExtension:true,
        freshRealServerRenewal:true,noCreateOrJoinReplay:true,noModuleInterception:!candidate});
    }
    results.push({case:'native-library',normalMicrosoftPupils:2,oneMobileTouch:true,tableAudioDecodedBoth:true,
      directoryDoesNotMuteConversation:true,onePixelPrivateBridge:true,
      ...(live?{realGradeFiltering:true,stageClassOverrideNotPublished:true}:{realGradeAndClassFiltering:true}),
      creatorDepartureKeepsPeer:true,explicitReentryWorks:true,heartbeatWithoutOpenDirectory:true});
    stage='cross-room-create';const otherId=await create(a,'atelier-buchclub','draw');
    assert.ok(a.page.url().includes('/atelier.wam'));af=await panel(a);await count(af,1);
    bf=await panel(b);await refresh(bf);await bf.locator('[data-round-id="'+otherId+'"]').waitFor();
    stage='cross-room-visit';await bf.locator('[data-round-id="'+otherId+'"]').getByRole('button',{name:'Treffpunkt besuchen',exact:true}).click();await arrived(b,'atelier');
    assert.equal(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),null);
    await refresh(af);assert.equal(await af.locator('[data-round-id="'+roundId+'"]').count(),0);await count(af,1);
    stage='last-physical-departure';const point=await a.script.evaluate(()=>castleRoom.layout.seats.find(seat=>seat.audioGroup!=='buchclub'));
    assert.ok(point);await a.script.evaluate(async point=>{await WA.player.teleport(point.standX,point.standY);await castleRoom.syncPosition();},point);
    await a.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundMembershipV1'),undefined,{timeout:15000});
    await refresh(af);await af.locator('.round').waitFor({state:'detached'});
    stage='cleanup-and-movement';await a.script.evaluate(()=>castleRoom.community.closePanel());
    const position=await a.script.evaluate(()=>WA.player.getPosition());await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(180);await a.page.keyboard.up('ArrowRight');
    assert.ok((await a.script.evaluate(()=>WA.player.getPosition())).x>position.x+2);
    const canvas=await sharp(await b.page.locator('canvas:visible').first().screenshot()).stats();assert.ok(canvas.channels.slice(0,3).every(channel=>channel.stdev>12));
    results.push({case:'native-travel',crossMapArrivalReauthorized:true,visitReleasesPreviousMembership:true,
      lastPhysicalDepartureRemovesAnnouncement:true,normalMovementAfterClosure:true,nonblankNativeCanvas:true,noSeatOrGameClaimed:true});
    const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
    const proof={passed:true,results,errors,stageOnly:!live,realNativeWorkAdventure:true,mapsModifiedOnlyInsideTestBrowsers:!live,
      productionSchoolAndWebConfigChanged:false,realClassOverrideOnlyInStage:!live,publishedPreview:live,loadApprovalFor400:false,audio};
    if(recovery){
      const observed={};for(const [key,pending]of served)observed[key]=await pending;
      for(const number of [1,2])for(const [name,body]of Object.entries(modules))assert.equal(observed[number+':'+name],sha(body));
      proof.recovery={candidate,moduleInterception:candidate,mapInterception:false,schoolDecisionInterception:false,
        explicitFaultInjection:{route:'round-heartbeat',status:503,count:1},naturalHeartbeatFault:true,
        moduleSha256:Object.fromEntries(Object.entries(modules).map(([name,body])=>[name,sha(body)])),observed,audio:recoveryAudio};
    }
    if(hostPublished)proof.gameHostPublication={actualPublishedRoutes:true,providerCatalogSubstituted:false,providerContentSubstituted:false,
      realExternalGameTested:false,realProviderStudentApproval:false,serverOrMapInterception:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,audio:undefined},null,2));
  }catch(error){
    const state=[];
    for(const user of users)state.push(await user.script.evaluate(()=>({room:castleRoom.layout.id,
      community:{pending:Boolean(castleRoom.community?.pending),website:castleRoom.community?.website?.id,
        generation:castleRoom.community?.generation,panelGeneration:castleRoom.community?.panelGeneration},
      request:WA.player.state.loadVariable('castleRoundTravelV1'),ready:WA.player.state.loadVariable('castleRoundTravelReadyV1'),
      position:WA.player.getPosition(),
      framePaths:[...document.querySelectorAll('iframe')].map(frame=>{try{return new URL(frame.src).pathname;}catch{return '';}})})).catch(()=>null));
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,stack:error.stack,
      errors:users.flatMap(user=>user.errors),diagnostics:users.map(user=>user.diagnostics),
      audio:await Promise.all(users.map(user=>stats(user).catch(()=>null))),state},null,2)+'\n');
    let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png')}).catch(()=>{});
    console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Native round probe stopped: '+(error.code||error.name));process.exitCode=1;});
