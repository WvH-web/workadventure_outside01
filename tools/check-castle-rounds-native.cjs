'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const live=process.argv.includes('--live');
const root=path.resolve(__dirname,'..'),privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=path.join(privateRoot,'qa/rounds-native-'+(live?'live':'stage')),origin='https://together.deine-schule.com';
const prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
async function main(){
  fs.mkdirSync(output,{recursive:true});writeAudio();let stage='entry';const users=[],results=[];
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
  async function enter(number){
    const map=JSON.parse(fs.readFileSync(path.join(root,'castle/bibliothek.tmj')));
    const user=await join(browser,number,{roomId:'bibliothek',roomUrl:origin+'/~/castle-preview/bibliothek.wam#start',outputDir:output,
      label:'Rundenprobe',seats:13,groups:3,revision:map.properties.find(property=>property.name==='castleRevision').value,
      schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),mobile:number===2,
      parking:[[96,432],[800,432]],characterTextureId:'wvh-event-mira-v1',...(live?{}:{configureContext:routes})});
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
    const before=[await stats(a),await stats(b)];await a.page.waitForTimeout(4000);const after=[await stats(a),await stats(b)];
    assert.ok(after.every((value,index)=>value.energy>before[index].energy),'Both real native participants decode non-silent table audio');
    assert.ok(after[0].rooms.some(room=>room.endsWith('area-lesekamin')&&after[1].rooms.includes(room)));return {before,after};
  }
  try{
    const a=await enter(1),b=await enter(2);stage='same-room-create';const roundId=await create(a,'bibliothek-lesekamin','read');
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
    assert.notEqual(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),oldLease);
    const heartbeat=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===200,{timeout:30000});
    await (await heartbeat).finished();
    results.push({case:'native-library',normalMicrosoftPupils:2,oneMobileTouch:true,tableAudioDecodedBoth:true,
      directoryDoesNotMuteConversation:true,onePixelPrivateBridge:true,realGradeAndClassFiltering:true,
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
      errors:users.flatMap(user=>user.errors),diagnostics:users.map(user=>user.diagnostics),state},null,2)+'\n');
    let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png')}).catch(()=>{});
    console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Native round probe stopped: '+error.name);process.exitCode=1;});
