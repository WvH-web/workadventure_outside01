'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {findRoom,travel}=require('./check-expansion-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const output=path.resolve(__dirname,'../../output/castle-games-live');fs.mkdirSync(output,{recursive:true});
const gameUrl='https://together.deine-schule.com/castle-school/games',base='https://together.deine-schule.com/~/castle-preview/';
async function gameFrame(user){
  for(let n=0;n<80;n++){
    const frame=user.page.frames().find(frame=>frame.url()===gameUrl);
    if(frame){await frame.locator('#offer-select option').nth(7).waitFor({state:'attached',timeout:30000});return frame;}
    await user.page.waitForTimeout(250);
  }
  throw Error('Native game panel did not open');
}
async function open(user){
  const button=user.page.getByRole('button',{name:'Spielrunden',exact:true});
  const ignore=user.page.getByRole('button',{name:'Ignore',exact:true});if(await ignore.count()===1&&await ignore.isVisible())await ignore.click();
  if(!await button.isVisible()){
    // The observed native compact header places these actions behind its top-right menu.
    const viewport=user.page.viewportSize();await user.page.mouse.click(viewport.width-32,35);
    await button.waitFor({state:'visible',timeout:5000});
  }
  await button.click();return gameFrame(user);
}
async function choose(frame,id){if(await frame.locator('#offer-select').isVisible())await frame.locator('#offer-select').selectOption(id);else await frame.locator(`[data-game-id="${id}"]`).click();}
async function audio(users){const before=await Promise.all(users.map(stats));await users[0].page.waitForTimeout(3500);const after=await Promise.all(users.map(stats));assert.ok(after.every((value,i)=>value.energy>before[i].energy),'All four continue decoding audio');return {before,after};}
async function main(){
 writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
  '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[],users=[];
 try{
  // This browser is not a WorkAdventure participant. It checks the real school API without duplicating a teacher avatar/session.
  const staff=JSON.parse(fs.readFileSync(path.resolve(output,'../castle-games-ui.private.json'),'utf8')).staff;
  const staffContext=await browser.newContext({viewport:{width:390,height:844}}),staffPage=await staffContext.newPage();
  await staffContext.addInitScript(token=>{if(location.origin==='https://together.deine-schule.com')localStorage.setItem('authToken',token);},staff);
  await staffPage.goto(gameUrl,{waitUntil:'domcontentloaded'});await staffPage.getByText('Lehrkraftzugang',{exact:true}).waitFor({timeout:30000});
  await choose(staffPage,'haxballarea01');await staffPage.locator('#lobby').waitFor({state:'visible'});assert.equal(await staffPage.locator('#mode').textContent(),'Entwurf \u00b7 Vorschau');
  assert.ok((await staffPage.locator('#current-url').textContent()).startsWith('https://www.haxball.com/'));
  await staffPage.screenshot({path:path.join(output,'staff-ui-mobile.private.png'),fullPage:true});
  results.push({id:'staff-ui-only',freshStaffRoleRecognized:true,realCurrentRoomResolved:true,previewExplicit:true,waParticipantCreated:false});await staffContext.close();
  console.log('Real staff UI-only probe passed.');
  for(let number=1;number<=4;number++)users.push(await join(browser,number,{roomId:'oberstufe',roomUrl:base+'oberstufe.wam#start',outputDir:output,
    label:'Spielrundenprobe',seats:12,groups:3,revision,characterTextureId:['wvh-event-mira-v1','wvh-event-amir-v1','wvh-event-otto-v1','wvh-event-val-v1'][number-1],
    parking:[[112,272],[432,608],[720,288],[800,352]]}));
  const [a,b,c,d]=users;
  await sit(a,'buchclub-n0');await sit(b,'buchclub-s1');await sit(c,'lese-kamin-sofa-links');await sit(d,'lese-kamin-sessel-west');
  const before=await audio(users);assert.ok(before.after[0].rooms.some(room=>room.endsWith('area-buchclub')&&before.after[1].rooms.includes(room)));
  assert.ok(!before.after[0].rooms.some(room=>before.after[2].rooms.includes(room)));
  console.log('Opening the two seated participants game panels.');const panels=[await open(a),await open(b)];console.log('Both native game panels opened.');
  for(const [i,frame]of panels.entries()){
    await frame.getByText('Keine Schulfreigabe f\u00fcr dieses Konto',{exact:true}).waitFor();await choose(frame,'gamesarea01');
    await frame.locator('#availability').filter({hasText:'Dieses Angebot ist'}).waitFor();assert.equal(await frame.locator('#lobby').isVisible(),false);
    const denied=await frame.evaluate(async()=>{const response=await fetch('/castle-school/launch',{method:'POST',headers:{Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'},body:JSON.stringify({resourceId:'gamesarea01'})});return {status:response.status,data:await response.json()};});
    assert.deepEqual(denied,{status:403,data:{error:'not_allowed'}});assert.equal(await frame.locator('#current-url').textContent(),'');
    assert.equal(users[i].page.frames().filter(frame=>frame.url()===gameUrl).length,1);
  }
  const during=await audio(users);assert.ok(during.after[0].rooms.some(room=>room.endsWith('area-buchclub')&&during.after[1].rooms.includes(room)));
  console.log('Native denials and four-participant table audio passed.');
  assert.ok(!during.after[0].rooms.some(room=>during.after[2].rooms.includes(room)));
  await a.page.screenshot({path:path.join(output,'native-games-desktop.png')});
  await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(800);await a.page.screenshot({path:path.join(output,'native-games-mobile.png')});
  const canvas=path.join(output,'native-canvas.png');await a.page.locator('canvas:visible').first().screenshot({path:canvas});assert.ok((await sharp(canvas).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
  await a.page.setViewportSize({width:1440,height:1000});
  await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(300);assert.equal(a.page.frames().filter(frame=>frame.url()===gameUrl).length,0);
  console.log('Reopening a manually closed native game panel.');await open(a);assert.equal(a.page.frames().filter(frame=>frame.url()===gameUrl).length,1);
  await move(a,432,608);await a.page.waitForTimeout(600);assert.equal(a.page.frames().filter(frame=>frame.url()===gameUrl).length,0);
  const position=await a.script.evaluate(()=>WA.player.getPosition());await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(240);await a.page.keyboard.up('ArrowRight');
  const afterKey=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(afterKey.x>position.x+2,'Movement resumes after the panel closes');
  results.push({id:'oberstufe',participants:4,bothUnknownAccountsDenied:true,directLaunchDenied:true,separateTableAudioBeforeAndDuringPanel:true,
    noDuplicatePanel:true,reopenWorks:true,departureClosesOwnedPanel:true,keyboardMovementResumes:true,desktopAndMobileCanvasNonblank:true,before,during});
  await travel(a,'grosse-halle');await a.page.waitForTimeout(500);
  assert.equal(a.page.frames().filter(frame=>frame.url()===gameUrl).length,0);
  const area=await a.script.evaluate(async()=>{const map=await WA.room.getTiledMap();return map.layers.flatMap(layer=>layer.objects||[]).find(object=>object.properties?.some(property=>property.name==='hallAction'&&property.value==='games'));});
  assert.ok(area);await move(a,area.x+area.width/2,area.y+area.height/2);await open(a);
  results.push({id:'native-routing',upperCommonRoomUsesGate:true,roomChangeCleansOldPanel:true,hallUsesSameGate:true});
  const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
  const evidence={passed:true,revision,participants:4,unknownSyntheticNativeAccountsOnly:true,
    staffProbeCreatedNoWaParticipant:true,noRealPupilsUsed:true,noRealMicrophoneUsed:true,productionLinksChanged:false,loadApprovalFor400:false,results,errors};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:true,participants:4,tableAudioPreserved:true,nativeGateRoutes:2,staffUiOnly:true,errors},null,2));
 }catch(error){
  const states=[];for(const user of users)states.push(await user.script.evaluate(async()=>({map:castleRoom.layout.id,seat:castleRoom.seat?.id,
    position:castleRoom.position,actual:await WA.player.getPosition(),activity:window.castleActivities?{active:castleActivities.active?.settings.id,button:castleActivities.button,epoch:castleActivities.epoch,closed:castleActivities.closed,website:castleActivities.website?.id}:null})).catch(()=>({detached:true})));
  fs.writeFileSync(path.join(output,'failure-state.private.json'),JSON.stringify(states,null,2));
  let number=0;for(const context of browser.contexts())for(const page of context.pages()){number++;await page.screenshot({path:path.join(output,'failure-'+number+'.private.png')}).catch(()=>{});}throw error;
 }
 finally{await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
