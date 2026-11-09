'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs'),probe=require('./castle-art-probe.cjs');
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(privateRoot,'qa/art-native');
const url='https://together.deine-schule.com/castle-art/';
async function open(user,allowed=true){
  const ignore=user.page.getByRole('button',{name:'Ignore',exact:true});if(await ignore.isVisible().catch(()=>false))await ignore.click();
  await user.script.waitForFunction(()=>window.castleActivities?.active?.settings.id==='atelier-draw');
  const button=user.page.getByRole('button',{name:'Gemeinsam zeichnen',exact:true});
  if(!await button.isVisible()){
    const apps=user.page.getByTestId('apps-button');if(!await apps.isVisible()){const size=user.page.viewportSize();await user.page.mouse.click(size.width-32,35);await apps.waitFor({state:'visible',timeout:5000});}
    await apps.click();await button.waitFor({state:'visible',timeout:5000});
  }
  await button.click();for(let n=0;n<100;n++){
    const owner=user.page.frames().find(frame=>frame.url()===url);if(owner){
      if(!allowed){await owner.locator('#message').filter({hasText:'kein Schulzugang'}).waitFor();return {owner};}
      await owner.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});return {owner,child:await probe.choose(user.page,owner)};
    }await user.page.waitForTimeout(250);
  }throw Error('Native atelier panel did not open');
}
async function sample(users){const before=await Promise.all(users.map(stats));await users[0].page.waitForTimeout(3500);const after=await Promise.all(users.map(stats));assert.ok(after.every((value,index)=>value.energy>before[index].energy));return {before,after};}
async function main(){
  fs.mkdirSync(output,{recursive:true});writeAudio();const users=[],ownIds=[],results=[];let stage='enter';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(let number=1;number<=4;number++)users.push(await join(browser,number,{roomId:'atelier',roomUrl:'https://together.deine-schule.com/~/castle-preview/atelier.wam#start',outputDir:output,label:'Atelierprobe',seats:12,groups:3,revision,
      ...(number<=2?{schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json')}:{}),
      characterTextureId:['wvh-event-mira-v1','wvh-event-amir-v1','wvh-event-otto-v1','wvh-event-val-v1'][number-1],parking:[[112,272],[432,608],[720,288],[800,352]]}));
    const [a,b,c,d]=users;await sit(a,'buchclub-n0');await sit(b,'buchclub-s1');await sit(c,'lese-kamin-sofa-links');await sit(d,'lese-kamin-sessel-west');
    stage='audio-before';const before=await sample(users);stage='open';const left=await open(a),right=await open(b);
    assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,1);assert.equal(b.page.frames().filter(frame=>frame.url()===url).length,1);
    await probe.observe(left.child);ownIds.push(...await probe.paint(a.page,left.child,{x:180,y:240}));await probe.received(right.child,ownIds);
    stage='audio-with-shared-drawing';const during=await sample(users);
    for(const samples of [before,during]){
      assert.ok(samples.after[0].rooms.some(room=>room.endsWith('area-buchclub')&&samples.after[1].rooms.includes(room)));
      assert.ok(!samples.after[0].rooms.some(room=>samples.after[2].rooms.includes(room)));
    }
    await a.page.screenshot({path:path.join(output,'native-desktop.private.png')});
    await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(600);await a.page.screenshot({path:path.join(output,'native-mobile.private.png')});await a.page.setViewportSize({width:1440,height:1000});
    stage='cleanup-only-own-ink';await probe.eraseOwn(right.child,ownIds);await left.child.waitForFunction(ids=>ids.every(id=>!document.getElementById(id)),ownIds);
    stage='close-and-reopen';await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(400);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,0);
    await open(a);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,1);await move(a,432,608);await a.page.waitForTimeout(600);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,0);
    const position=await a.script.evaluate(()=>WA.player.getPosition());await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(240);await a.page.keyboard.up('ArrowRight');const afterKey=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(afterKey.x>position.x+2);
    const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);results.push({before,during});
    const evidence={passed:true,revision,nativeParticipants:4,normalMicrosoftPupils:2,syntheticUnknownQa:2,nativeSameTableDrawingShared:true,
      bothVoiceGroupsContinueDecoding:true,voiceGroupsStaySeparate:true,noDuplicatePanels:true,appsEntryWorks:true,reopenAndDepartureWork:true,
      movementResumesAfterClose:true,onlyOwnedProbeInkRemoved:true,errors,loadApprovalFor400:false,results};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({...evidence,results:undefined},null,2));
  }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,ownIds},null,2));console.error(JSON.stringify({passed:false,stage,errorType:error.name}));let n=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++n)+'.private.png')}).catch(()=>{});process.exitCode=1;}
  finally{await browser.close();}
}
main().catch(error=>{console.error('Native atelier probe stopped: '+error.name);process.exitCode=1;});
