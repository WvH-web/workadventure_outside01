'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const output=path.resolve(__dirname,'../../output/castle-chess-live'),url='https://together.deine-schule.com/castle-chess/';
async function open(user){
  const ignore=user.page.getByRole('button',{name:'Ignore',exact:true});if(await ignore.count()===1&&await ignore.isVisible())await ignore.click();
  const button=user.page.getByRole('button',{name:'Schach spielen',exact:true});
  if(!await button.isVisible()){const viewport=user.page.viewportSize();await user.page.mouse.click(viewport.width-32,35);await button.waitFor({state:'visible',timeout:5000});}
  await button.click();for(let n=0;n<80;n++){
    const frame=user.page.frames().find(frame=>frame.url()===url);if(frame){await frame.locator('#message').filter({hasText:'Für dieses Konto besteht kein Schulzugang.'}).waitFor({timeout:30000});return frame;}await user.page.waitForTimeout(250);
  }throw Error('Native chess panel did not open');
}
async function audio(users){const before=await Promise.all(users.map(stats));await users[0].page.waitForTimeout(3500);const after=await Promise.all(users.map(stats));assert.ok(after.every((value,i)=>value.energy>before[i].energy));return {before,after};}
async function main(){
  fs.mkdirSync(output,{recursive:true});writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const users=[],results=[],uiErrors=[];
  try{
    const staff=JSON.parse(fs.readFileSync(path.resolve(output,'../castle-games-ui.private.json'),'utf8')).staff;
    const staffContext=await browser.newContext({viewport:{width:390,height:844}});await staffContext.addInitScript(value=>{if(location.origin==='https://together.deine-schule.com')localStorage.setItem('authToken',value);},staff);
    const page=await staffContext.newPage();page.on('pageerror',error=>uiErrors.push(error.message));await page.goto(url);await page.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});
    assert.equal(await page.locator('#reset').isVisible(),true);await page.locator('[data-mode=practice]').click();
    await page.locator('#move-from').selectOption('e2');await page.locator('#move-to').selectOption('e4');await page.locator('#submit-move').click();await page.locator('#moves').getByText('e4',{exact:true}).waitFor();
    assert.equal(await page.locator('#board rect.square').count(),64);await page.waitForFunction(()=>document.querySelectorAll('#board .pieces g[data-square]').length===32);
    const board=await page.locator('#board').screenshot();assert.ok((await sharp(board).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'staff-ui-mobile.private.png'),fullPage:true});
    results.push({id:'staff-ui-only',freshStaffRecognized:true,realSseConnection:true,localPracticeMoveRendered:true,schoolTableMovesWritten:false,waParticipantCreated:false,boardPixelsNonblank:true});await staffContext.close();
    for(let number=1;number<=4;number++)users.push(await join(browser,number,{roomId:'spielesaal',roomUrl:'https://together.deine-schule.com/~/castle-preview/spielesaal.wam#start',outputDir:output,label:'Schachprobe',seats:12,groups:3,revision,
      characterTextureId:['wvh-event-mira-v1','wvh-event-amir-v1','wvh-event-otto-v1','wvh-event-val-v1'][number-1],parking:[[112,272],[432,608],[720,288],[800,352]]}));
    const [a,b,c,d]=users;await sit(a,'buchclub-n0');await sit(b,'buchclub-s1');await sit(c,'lese-kamin-sofa-links');await sit(d,'lese-kamin-sessel-west');
    const before=await audio(users),panels=[await open(a),await open(b)];
    for(const [index,frame]of panels.entries()){
      assert.equal(await frame.locator('[data-mode=practice]').isDisabled(),true);assert.equal(await frame.locator('#submit-move').isDisabled(),true);
      const denied=await frame.evaluate(async()=>{const response=await fetch('/castle-chess/session',{method:'POST',headers:{Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'},body:'{}'});return {status:response.status,body:await response.json()};});
      assert.deepEqual(denied,{status:403,body:{error:'school_required'}});assert.equal(users[index].page.frames().filter(frame=>frame.url()===url).length,1);
    }
    const during=await audio(users);for(const sample of [before,during]){
      assert.ok(sample.after[0].rooms.some(room=>room.endsWith('area-buchclub')&&sample.after[1].rooms.includes(room)));
      assert.ok(!sample.after[0].rooms.some(room=>sample.after[2].rooms.includes(room)));
    }
    await a.page.screenshot({path:path.join(output,'native-chess-desktop.png')});await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(500);await a.page.screenshot({path:path.join(output,'native-chess-mobile.png')});
    await a.page.setViewportSize({width:1440,height:1000});await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(400);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,0);
    await open(a);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,1);await move(a,432,608);await a.page.waitForTimeout(600);assert.equal(a.page.frames().filter(frame=>frame.url()===url).length,0);
    const position=await a.script.evaluate(()=>WA.player.getPosition());await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(240);await a.page.keyboard.up('ArrowRight');const afterKey=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(afterKey.x>position.x+2);
    results.push({id:'native-game-room',participants:4,unknownAccountsDenied:true,directApiDenied:true,twoSeparateTableConversationsPreserved:true,noDuplicatePanels:true,reopenAndDepartureWork:true,movementResumes:true,before,during});
    const errors=[...uiErrors,...users.flatMap(user=>user.errors)];assert.deepEqual(errors,[]);
    const evidence={passed:true,revision,results,errors,nativeParticipantsAreUnknownSyntheticQa:true,realStaffProbeWasUiOnly:true,realPupilMultiplayerTested:false,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:true,nativeParticipants:4,tableAudioPreserved:true,realStaffUiOnly:true,realPupilMultiplayerTested:false,errors}));
  }catch(error){let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png')}).catch(()=>{});throw error;}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
