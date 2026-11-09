'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {travel}=require('./check-expansion-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const output=path.resolve(__dirname,'../../output/castle-gallery-native-qa');
const hosted='https://together.deine-schule.com/castle-content/collection.html';
const portal='https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum_open.php';
async function sample(users){
  const before=await Promise.all(users.map(stats));await users[0].page.waitForTimeout(3500);
  const after=await Promise.all(users.map(stats));assert.ok(after.every((value,index)=>value.energy>before[index].energy));
  assert.ok(after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room)));
  return {before,after};
}
async function open(user){
  const ignore=user.page.getByRole('button',{name:'Ignore',exact:true});if(await ignore.isVisible().catch(()=>false))await ignore.click();
  await user.script.waitForFunction(()=>window.castleActivities?.active?.settings.group==='buchclub',undefined,{polling:200,timeout:20000});
  const label=await user.script.evaluate(()=>castleActivities.active.settings.label);
  const button=user.page.getByRole('button',{name:label,exact:true}).first();
  if(!await button.isVisible()){
    const apps=user.page.getByTestId('apps-button');
    if(await apps.isVisible())await apps.click();
    else{
      await user.page.getByTestId('action-user').click();await user.page.waitForTimeout(300);
      if(!await button.isVisible()&&await apps.isVisible())await apps.click();
    }await button.waitFor();
  }await button.click();
  for(let i=0;i<100;i++){
    const frame=user.page.frames().find(frame=>frame.url().startsWith(hosted));
    if(frame){await frame.locator('.exhibit').first().waitFor({timeout:30000});assert.equal(user.page.frames().filter(frame=>frame.url().startsWith(hosted)).length,1);return frame;}
    await user.page.waitForTimeout(250);
  }throw Error('Native gallery panel missing');
}
async function main(){
  fs.mkdirSync(output,{recursive:true});writeAudio();const users=[],results=[];let stage='entry';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(let number=1;number<=2;number++)users.push(await join(browser,number,{roomId:'museum',roomUrl:'https://together.deine-schule.com/~/castle-preview/museum.wam#start',
      outputDir:output,label:'Galerieprobe',seats:12,groups:3,revision,mobile:number===2,
      characterTextureId:'wvh-event-mira-v1',parking:[[112,272],[432,608]]}));
    for(const id of ['museum','musikzimmer']){
      stage=id+'-entry';if(id!=='museum')for(const user of users)await travel(user,id);
      await sit(users[0],'buchclub-n0');await sit(users[1],'buchclub-s1');await users[0].page.waitForTimeout(2000);
      const before=await sample(users),panels=[];
      for(const user of users){
        stage=id+'-open';const panel=await open(user);panels.push(panel);
        const response=user.page.waitForResponse(response=>response.url().startsWith(portal+'?board='),{timeout:30000});
        await panel.locator('.exhibit').first().click();const opened=await response;assert.equal(opened.status(),200);
        const src=await panel.locator('#viewer').getAttribute('src'),url=new URL(src);
        assert.equal(url.origin+url.pathname,portal);assert.ok(url.searchParams.get('v'));
        assert.ok(id==='museum'?/^show\d+$/.test(url.searchParams.get('board')):/^musik0[1-7]$/.test(url.searchParams.get('board')));
        for(let i=0;i<100&&!panel.childFrames().some(frame=>frame.url()===src);i++)await user.page.waitForTimeout(200);
        const inner=panel.childFrames().find(frame=>frame.url()===src);assert.ok(inner);
        assert.equal(await inner.evaluate(()=>location.origin),'https://deutsche-online-schule.com');
        stage=id+'-unchanged-refresh';
        const refreshed=user.page.waitForResponse(response=>response.url().startsWith(portal.replace('workadventure_museum_open.php','workadventure_museum.php')));
        await panel.getByRole('button',{name:'Aktualisieren',exact:true}).click();await (await refreshed).finished();
        await user.page.waitForTimeout(400);assert.equal(await panel.locator('#viewer').getAttribute('src'),src,'Unchanged real CMS keeps media URL stable');
      }
      stage=id+'-audio-with-viewer';const during=await sample(users);
      for(const [index,user] of users.entries()){
        await user.page.screenshot({path:path.join(output,id+'-'+(index?'mobile':'desktop')+'.private.png')});
        await panels[index].getByRole('button',{name:'Zur Ausstellung',exact:true}).click();
        assert.equal(await panels[index].locator('#viewer').getAttribute('src'),null);
        await user.script.evaluate(()=>castleActivities.website.close());await user.script.evaluate(()=>castleRoom.stand());
        const position=await user.script.evaluate(()=>WA.player.getPosition());
        await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(180);await user.page.keyboard.up('ArrowRight');
        assert.ok((await user.script.evaluate(()=>WA.player.getPosition())).x>position.x+2);
      }
      results.push({id,nativeParticipants:2,mobileTouch390:true,realUnmodifiedPublicCatalog:true,realPortalViewer200:true,
        additionalVersionParameterAccepted:true,unchangedRefreshKeepsViewer:true,tableAudioContinues:true,backStopsMedia:true,
        closeAndMovementWork:true,before,during});
    }
    const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
    const proof={passed:true,revision,results,errors,syntheticQaIdentitiesOnly:true,cmsDataChanged:false,
      mediaPlaybackNotAsserted:true,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({...proof,results:results.map(({before,during,...result})=>result)},null,2));
  }catch(error){
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,
      errors:users.flatMap(user=>user.errors),buttons:await Promise.all(users.map(async user=>({
        visible:await user.page.getByRole('button').allTextContents(),
        ids:await user.page.locator('button[data-testid]').evaluateAll(buttons=>buttons.map(button=>({id:button.dataset.testid,title:button.title,aria:button.getAttribute('aria-label')})))
      })))},null,2)+'\n');console.error(JSON.stringify({passed:false,stage,errorType:error.name}));
    let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++i)+'.private.png')}).catch(()=>{});
    process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Native gallery probe stopped: '+error.name);process.exitCode=1;});
