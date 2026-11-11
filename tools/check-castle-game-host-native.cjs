'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=storage.outputPath('game-host-native/'+new Date().toISOString().replace(/[:.]/g,'-'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const sources=Object.fromEntries(['games.html','games.js','games.css','rounds.html','rounds.js','round-client.js','presence.html','presence.js'].map(name=>
  [name,sha(fs.readFileSync(path.join(root,'ops/castle-school/public',name)))]));
const identity=lease=>lease&&({roundId:lease.roundId,leaseId:lease.leaseId,scope:lease.scope});
async function main(){
  writeAudio();const users=[],served=[],providerRequests=[],samples=[],results=[],routeFailures=[],routeCancellations=[];
  const navigation=new Map();let stage='entry',stopping=false,evidence;
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function configure(context,number){
    navigation.set(number,0);
    await context.route(origin+'/castle-school/**',async route=>{
      const url=new URL(route.request().url()),epoch=navigation.get(number);
      try{
        assert.equal(url.search,'');
        const response=await route.fetch({url:'http://127.0.0.1:13213'+url.pathname,maxRedirects:0});
        assert.equal(response.headers()['x-castle-test-catalog'],'synthetic-loopback-only');
        const name=url.pathname.slice('/castle-school/'.length),file=['games','rounds','presence'].includes(name)?name+'.html':name;
        if(Object.hasOwn(sources,file)){assert.equal(response.status(),200);assert.equal(sha(await response.body()),sources[file]);served.push({number,file,sha256:sources[file]});}
        return await route.fulfill({response});
      }catch(error){
        let detached=false;try{detached=route.request().frame().isDetached();}catch{}
        const controlled=epoch!==navigation.get(number);
        const value={number,path:url.pathname,errorType:error.name};
        if(error.name!=='AssertionError'&&(stopping||detached||controlled))routeCancellations.push({...value,reason:stopping?'shutdown':detached?'detached-frame':'controlled-navigation'});
        else routeFailures.push(value);
        await route.abort().catch(()=>{});
      }
    });
    await context.route('https://games.example.test/**',async route=>{
      try{
        const request=route.request(),url=new URL(request.url());assert.equal(url.pathname,'/room/');
        assert.deepEqual([...url.searchParams.keys()],['code']);assert.ok(['one','two'].includes(url.searchParams.get('code')));
        assert.equal(request.headers().authorization,undefined);providerRequests.push({number,code:url.searchParams.get('code')});
        return await route.fulfill({contentType:'text/html',headers:{'Cache-Control':'no-store','Permissions-Policy':'camera=(), microphone=()'},
          body:'<!doctype html><html lang="de"><title>Getrennte Spielprobe</title><body style="background:#f0f5f1;color:#26332e;font:16px system-ui;padding:24px"><h1 style="font-size:20px">Getrennter Testraum</h1><p>Keine echte Partie beim Anbieter.</p></body></html>'});
      }catch(error){
        const value={number,path:'provider-fixture',errorType:error.name};
        if(stopping&&error.name!=='AssertionError')routeCancellations.push({...value,reason:'shutdown'});else routeFailures.push(value);
        await route.abort().catch(()=>{});
      }
    });
  }
  async function enter(number){
    const map=JSON.parse(fs.readFileSync(path.join(root,'castle/bibliothek.tmj')));
    const user=await join(browser,number,{roomId:'bibliothek',roomUrl:origin+'/~/castle-preview/bibliothek.wam#start',outputDir:output,
      label:'Gastgeberprobe',seats:13,groups:3,revision:map.properties.find(property=>property.name==='castleRevision').value,
      schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),mobile:number===2,
      parking:[[96,432],[800,432]],characterTextureId:'wvh-event-mira-v1',configureContext:context=>configure(context,number)});
    user.mobile=number===2;user.number=number;users.push(user);await user.script.waitForFunction(()=>castleRoom.community?.bridge,undefined,{timeout:20000});return user;
  }
  async function click(user,locator){await locator[user.mobile?'tap':'click']();}
  async function frame(user,name){
    for(let n=0;n<100;n++){
      const target=user.page.frames().find(frame=>{try{const url=new URL(frame.url());return url.origin===origin&&url.pathname==='/castle-school/'+name;}catch{return false;}});
      if(target){await target.locator(name==='rounds'?'#target option':'#games-list button').first().waitFor({state:'attached'});return target;}
      await user.page.waitForTimeout(200);
    }throw Error('Native '+name+' frame did not open');
  }
  async function panel(user){
    navigation.set(user.number,navigation.get(user.number)+1);
    const button=user.page.getByRole('button',{name:'Runden',exact:true}).first();
    if(!await button.isVisible()){
      const apps=user.page.getByTestId('apps-button');if(await apps.isVisible())await click(user,apps);
      else{await click(user,user.page.getByTestId('action-user'));if(!await button.isVisible()&&await apps.isVisible())await click(user,apps);}
    }await click(user,button);return frame(user,'rounds');
  }
  async function settled(user){
    await user.page.waitForFunction(()=>sessionStorage.getItem('castleRoundMembershipV1')&&!sessionStorage.getItem('castleRoundJourneyV1'),undefined,{timeout:25000});
    await user.page.waitForFunction(()=>![...document.querySelectorAll('iframe')].some(frame=>{try{return new URL(frame.src).pathname==='/castle-school/rounds';}catch{return false;}}),undefined,{timeout:10000});
    await user.script.waitForFunction(()=>!castleRoom.community.website,undefined,{timeout:10000});
  }
  async function lease(user){return user.page.evaluate(()=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')||'null'));}
  async function api(user,route,body){return user.page.evaluate(async({route,body})=>{
    const response=await fetch('/castle-school/'+route,{method:body===undefined?'GET':'POST',cache:'no-store',credentials:'omit',
      headers:{Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,value:await response.json()};
  },{route,body});}
  async function games(user){
    const rounds=await panel(user);navigation.set(user.number,navigation.get(user.number)+1);
    await click(user,rounds.getByRole('link',{name:'Spielangebote',exact:true}));
    const games=await frame(user,'games');if(await games.locator('#offer-select').isVisible())await games.locator('#offer-select').selectOption('gamesarea01');
    else await click(user,games.locator('[data-game-id="gamesarea01"]'));
    await games.locator('#lobby').waitFor({state:'visible'});await games.locator('#round-place').filter({hasText:'Bibliothek'}).waitFor();return games;
  }
  async function state(frame,state){await frame.locator('#round-game-state[data-state="'+state+'"]').waitFor({state:'visible',timeout:20000});}
  async function audio(label){
    const before=[await stats(users[0]),await stats(users[1])],start=Date.now();let after;
    do{
      await users[0].page.waitForTimeout(2000);after=[await stats(users[0]),await stats(users[1])];
      if(after.every((value,index)=>value.energy>before[index].energy)&&after[0].rooms.some(room=>room.endsWith('area-lesekamin')&&after[1].rooms.includes(room))){
        const value={label,before,after,milliseconds:Date.now()-start};samples.push(value);return value;
      }
    }while(Date.now()-start<25000);
    fs.writeFileSync(path.join(output,'audio-failure.private.json'),JSON.stringify({label,before,after},null,2));throw Error('Native table audio did not arrive in both directions');
  }
  async function viewer(user,games,code){
    await click(user,games.locator('#join-game'));await games.locator('#viewer iframe').waitFor();
    assert.equal(await games.locator('#viewer iframe').getAttribute('src'),'https://games.example.test/room/?code='+code);
    const provider=await (await games.locator('#viewer iframe').elementHandle()).contentFrame();assert.ok(provider);
    await provider.waitForURL('https://games.example.test/room/?code='+code);await provider.getByText('Getrennter Testraum',{exact:true}).waitFor();
    assert.equal(await provider.evaluate(()=>typeof window.WA),'undefined');
  }
  try{
    const a=await enter(1),b=await enter(2);stage='stage-fixture-reset';
    for(const user of users){
      const previous=await api(user,'round-context');assert.equal(previous.status,200);
      if(previous.value.me){const owned=await api(user,'round-join',{roundId:previous.value.me.roundId});assert.equal(owned.status,200);
        assert.equal((await api(user,'round-leave',{leaseId:owned.value.leaseId})).status,200);}
    }
    assert.equal((await api(a,'room-link',{resourceId:'gamesarea01',targetUrl:'https://games.example.test/room/?code=one',pin:'998877'})).status,200);
    stage='round-arrival';
    const af=await panel(a);await af.locator('#create-panel').evaluate(details=>{details.open=true;});
    await af.locator('#target').selectOption('bibliothek-lesekamin');await af.locator('#kind').selectOption('talk');await af.locator('#capacity').fill('2');
    await click(a,af.locator('#announce'));await settled(a);const own=await lease(a);assert.ok(own?.roundId);
    const bf=await panel(b);await bf.locator('[data-round-id="'+own.roundId+'"]').waitFor();
    await click(b,bf.locator('[data-round-id="'+own.roundId+'"]').getByRole('button',{name:'Mitmachen',exact:true}));await settled(b);
    const peer=await lease(b);assert.equal(peer.roundId,own.roundId);await audio('before-game-window');
    stage='native-games';const ag=await games(a),bg=await games(b);
    await click(a,ag.locator('#confirm-game'));await state(ag,'confirmed');await state(bg,'confirmed');
    assert.equal(await bg.locator('#confirm-game').isDisabled(),true);await viewer(b,bg,'one');await audio('while-playing');
    await click(b,bg.locator('#close-viewer'));
    results.push({case:'native-group-start',normalMicrosoftPupils:2,mobileTouch:true,commonRound:true,gameOpensInSideFrame:true,
      noProviderAuthorizationHeader:true,noMapApiInProvider:true,realDecodedTableAudioBoth:true});
    stage='changed-link';await ag.locator('#host').evaluate(details=>{details.open=true;});
    await ag.locator('#room-url').fill('https://games.example.test/room/?code=two');await ag.locator('#pin').fill('998877');await click(a,ag.locator('#save'));
    await state(ag,'waiting');await state(bg,'waiting');assert.equal(await bg.locator('#join-game').isVisible(),false);
    assert.deepEqual(await api(b,'round-game-launch',{roundId:own.roundId}),{status:409,value:{error:'game_not_ready'}});
    await ag.locator('#current-url').filter({hasText:'code=two'}).waitFor();await click(a,ag.locator('#confirm-game'));await state(bg,'confirmed');
    await viewer(b,bg,'two');await audio('after-link-change');await click(b,bg.locator('#close-viewer'));
    stage='native-round-return';const previous=identity(await lease(b));navigation.set(b.number,navigation.get(b.number)+1);await click(b,bg.locator('#back-rounds'));
    const back=await frame(b,'rounds');await back.locator('.game-status').filter({hasText:'Gastgeber best\u00e4tigt'}).waitFor();
    navigation.set(b.number,navigation.get(b.number)+1);await click(b,back.getByRole('link',{name:'Spielangebot',exact:true}));const reopened=await frame(b,'games');await state(reopened,'confirmed');
    assert.deepEqual(identity(await lease(b)),previous);assert.equal(b.page.context().pages().length,1);await audio('after-panel-return');
    results.push({case:'link-and-panel-lifecycle',stagePinUpdaterOnly:true,changedLinkRequiresConfirmation:true,peerAutoUpdates:true,
      freshStartDeniesOldBinding:true,newTargetActuallyLoaded:true,nativeRoundApiAfterReturn:true,sameLeaseAfterBothDirections:true,noExtraTab:true});
    stage='host-departure';await move(a,800,432);await a.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundMembershipV1'));
    await state(reopened,'waiting');const left=await api(b,'round-context');assert.equal(left.value.rounds[0].registered,1);
    assert.equal(left.value.rounds[0].game.mineHost,false);await click(b,reopened.locator('#confirm-game'));await state(reopened,'confirmed');
    assert.equal((await api(b,'round-context')).value.rounds[0].game.mineHost,true);
    for(const [index,user]of users.entries()){
      await user.page.screenshot({path:path.join(output,'native-'+(index?'mobile':'desktop')+'.png')});
      const target=path.join(output,'canvas-'+index+'.png');await user.page.locator('canvas:visible').first().screenshot({path:target});
      assert.ok((await sharp(target).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
    }
    await move(b,800,432);await b.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundMembershipV1'));
    assert.equal((await api(b,'round-context')).value.rounds.length,0);await b.script.evaluate(()=>castleRoom.community.closePanel());
    await a.script.evaluate(()=>castleRoom.community.closePanel());const before=await a.script.evaluate(()=>WA.player.getPosition());
    await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(230);await a.page.keyboard.up('ArrowRight');
    const after=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(after.x>before.x+2);
    results.push({case:'physical-departure',creatorDepartureEndsOnlyHost:true,peerConversationRegistrationPreserved:true,noAutomaticHostTransfer:true,
      explicitSuccessorWorks:true,lastDepartureRemovesRound:true,normalMovementAfterClosure:true,desktopAndMobileCanvasNonblank:true});
    const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);assert.deepEqual(routeFailures,[]);
    for(const number of [1,2])for(const file of Object.keys(sources))assert.ok(served.some(item=>item.number===number&&item.file===file),file+' loaded in both native contexts');
    evidence={passed:true,results,errors,audio:samples,served,providerRequests,routeFailures,routeCancellations,normalMicrosoftPupils:2,realNativeWorkAdventure:true,
      realSchoolAuthenticationAndProfiles:true,schoolProfileInterception:false,mapsReplaced:false,
      allSchoolResourcesForwardedToRestrictedStage:true,syntheticProviderCatalogOnlyInStage:true,providerResponsesReplaced:true,
      stageFixtureReset:true,liveSchoolOrPortalChanged:false,published:false,loadApprovalFor400:false};
  }catch(error){
    const states=[];
    for(const user of users)states.push({controller:await user.script.evaluate(async()=>({position:await WA.player.getPosition(),map:castleRoom.layout.id,
      community:{pending:Boolean(castleRoom.community.pending),website:castleRoom.community.website?.id,generation:castleRoom.community.generation,panelGeneration:castleRoom.community.panelGeneration},
      request:WA.player.state.loadVariable('castleRoundTravelV1'),ready:WA.player.state.loadVariable('castleRoundTravelReadyV1')})).catch(error=>({errorType:error.name})),
      browser:await user.page.evaluate(()=>({membership:Boolean(sessionStorage.getItem('castleRoundMembershipV1')),journey:Boolean(sessionStorage.getItem('castleRoundJourneyV1'))})).catch(()=>null)});
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({passed:false,stage,errorType:error.name,message:error.message,stack:error.stack,
      errors:users.flatMap(user=>user.errors),diagnostics:users.map(user=>user.diagnostics),states,served,providerRequests,routeFailures,routeCancellations,audio:samples},null,2)+'\n');
    for(const [index,user]of users.entries())await user.page.screenshot({path:path.join(output,'failure-'+index+'.private.png')}).catch(()=>{});
    console.error(JSON.stringify({passed:false,stage,errorType:error.name,output}));process.exitCode=1;
  }finally{stopping=true;await browser.close();}
  if(evidence){
    evidence.passed=routeFailures.length===0;if(!evidence.passed)process.exitCode=1;
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log(JSON.stringify({passed:evidence.passed,cases:results.length,realNativeWorkAdventure:true,normalMicrosoftPupils:2,audioChecks:samples.length,
      syntheticProviderCatalogOnlyInStage:true,published:false,output}));
  }
}
main().catch(error=>{console.error('Native game-host preflight stopped: '+error.name);process.exitCode=1;});
