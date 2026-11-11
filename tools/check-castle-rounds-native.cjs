'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const candidate=process.argv.includes('--recovery-candidate'),recovery=process.argv.includes('--recovery-published')||candidate;
const brothers=process.argv.includes('--brother-probe'),live=process.argv.includes('--live')||brothers||recovery;
const attemptArg=process.argv.find(arg=>arg.startsWith('--attempt='));assert.ok(!attemptArg||recovery&&/^--attempt=[1-9]$/.test(attemptArg));
const suffix=attemptArg&&attemptArg!=='--attempt=1'?'-attempt-'+attemptArg.split('=')[1]:'';
const root=path.resolve(__dirname,'..'),privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const outputName='rounds-native-'+(recovery?'recovery-'+(candidate?'candidate':'published')+suffix:brothers?'brothers':live?'live':'stage');
let output=path.join(privateRoot,'qa',outputName);const origin='https://together.deine-schule.com';
const prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
const crypto=require('node:crypto'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const modules=Object.fromEntries(['presence.js','round-client.js'].map(name=>[name,fs.readFileSync(path.join(root,'ops/castle-school/public',name))]));
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
    context.on('response',response=>{const name=new URL(response.url()).pathname.slice('/castle-school/'.length);
      if(response.url()===origin+'/castle-school/'+name&&Object.hasOwn(modules,name)){
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
    stage='same-room-create';const roundId=await create(a,'bibliothek-lesekamin','read');
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
