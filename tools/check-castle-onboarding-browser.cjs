'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const handoff=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../output/wvh-onboarding-browser.private.json')));
assert.equal(handoff.stageOnly,true);
const output=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts/qa/onboarding');
const origin='https://localhost:13300',room=id=>origin+'/~/castle-preview/'+id+'.wam#start';
const clean=text=>Object.values(handoff.tokens).reduce((text,token)=>text.replaceAll(token,'[stage token]'),String(text)).replace(/(access_token=)[^&'"\s]+/g,'$1[redacted]');
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const errors=[],contexts=[],evidence={stageOnly:true,realStudentAccountsUsed:false};let stage='entry',cancelled=false;
  const mark=value=>{stage=value;console.log('Tutorial probe: '+value);};
  const stop=()=>{cancelled=true;void browser.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
  async function context(account,mobile=false){
    const ctx=await browser.newContext({ignoreHTTPSErrors:true,permissions:['microphone','camera'],viewport:mobile?{width:390,height:844}:{width:1440,height:1000},...(mobile?{isMobile:true,hasTouch:true}:{})});contexts.push(ctx);
    await ctx.addInitScript(({tokens,account})=>{
      if(location.origin!=='https://localhost:13300'||window.top!==window)return;
      const key=localStorage.getItem('onboardingQaAccount')||account;
      // The native saved-login contract requires both fields, not a token with a null localUser.
      if(!localStorage.getItem('localUser')){
        const fixture=JSON.parse(atob(tokens[key].split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        localStorage.setItem('localUser',JSON.stringify({uuid:fixture.identifier,email:null,matrixUserId:null,isMatrixRegistered:false}));
      }
      localStorage.setItem('authToken',tokens[key]);localStorage.setItem('playerName','Tutorialprobe');
      localStorage.setItem('requestedCameraStateKey','false');localStorage.setItem('requestedMicrophoneStateKey','false');
      localStorage.setItem('workadventure_pwa_install_prompt_shown','1');
      if(!localStorage.getItem('characterTextures'))localStorage.setItem('characterTextures',JSON.stringify(['wvh-event-mira-v1']));
    },{tokens:handoff.tokens,account});
    const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(clean(error.message)));
    return {ctx,page};
  }
  async function enter(page,id){
    await page.goto(room(id),{waitUntil:'domcontentloaded',timeout:60000});
    for(let i=0;i<45;i++){
      if(await page.getByTestId('microphone-button').isVisible().catch(()=>false))return;
      const choose=page.locator('button.selectCharacterSceneFormSubmit');if(await choose.isVisible().catch(()=>false))await choose.click();
      const input=page.getByTestId('loginSceneNameInput');if(await input.isVisible().catch(()=>false)){await input.fill('Tutorialprobe');await input.press('Enter');}
      const save=page.getByRole('button',{name:/^(Save|Speichern|Los geht.s|Let.s go)$/i});if(await save.count()===1&&await save.isVisible().catch(()=>false))await save.click();
      await page.waitForTimeout(1500);
    }
    throw Error('Stage room did not become ready');
  }
  async function controller(page,id){
    for(let i=0;i<100;i++){
      for(const frame of page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))return frame;
      await page.waitForTimeout(300);
    }throw Error('Stage map controller missing');
  }
  const welcome=page=>page.getByTestId('onboarding-button-welcome-skip');
  async function noOffer(page){
    await page.waitForTimeout(1800);assert.equal(await welcome(page).isVisible(),false);
    assert.equal((await page.getByTestId('onboarding-step').innerText()).trim(),'','Empty persistent Svelte wrapper is not an active tutorial');
  }
  try{
    const a=await context('A');await enter(a.page,'erdgeschoss');await welcome(a.page).waitFor();await a.page.screenshot({path:path.join(output,'first-entry.private.png')});
    assert.equal(await a.page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('wvhTutorialOfferedV1:')).length),1);
    await welcome(a.page).click();mark('room-after-skip');await enter(a.page,'obergeschoss');await noOffer(a.page);mark('reload-after-skip');await a.page.reload();await a.page.getByTestId('microphone-button').waitFor();await noOffer(a.page);
    evidence.firstEntry={firstOfferVisible:true,skipWorks:true,differentRoomDoesNotRepeat:true,reloadDoesNotRepeat:true};
    mark('manual-replay');
    await a.page.getByTestId('action-user').click();
    await a.page.getByRole('button',{name:/Help.*tips|Hilfe.*Tipps/i}).click();await welcome(a.page).waitFor();await welcome(a.page).click();await noOffer(a.page);
    evidence.manualReplay={nativeProfileMenuClicked:true,replayVisible:true,skipWorks:true};
    // Anonymous persisted world variables are browser-scoped upstream, not a Microsoft account switch.
    await a.ctx.close();mark('second-browser-first-entry');const b=await context('B');await enter(b.page,'erdgeschoss');await welcome(b.page).waitFor();
    assert.equal(await b.page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('wvhTutorialOfferedV1:')).length),1);await welcome(b.page).click();
    evidence.independentFirstEntryBrowsers=2;evidence.realMicrosoftAccountSwitchTested=false;await b.ctx.close();
    mark('mobile-mid-tutorial-travel');const mobile=await context('C',true);await enter(mobile.page,'erdgeschoss');await welcome(mobile.page).waitFor();
    const first=await controller(mobile.page,'erdgeschoss');await first.evaluate(url=>WA.nav.goToRoom(url),room('obergeschoss'));
    const next=await controller(mobile.page,'obergeschoss');await noOffer(mobile.page);
    const before=await next.evaluate(()=>WA.player.getPosition());await mobile.page.keyboard.down('ArrowRight');await mobile.page.waitForTimeout(160);await mobile.page.keyboard.up('ArrowRight');const after=await next.evaluate(()=>WA.player.getPosition());assert.ok(after.x>before.x+2);
    assert.equal(await next.evaluate(()=>typeof WA.player.setTemporaryWoka==='function'&&typeof WA.player.restoreWoka==='function'),true);
    const asset=await mobile.ctx.request.get(origin+'/resources/wvh/go-cart-avatar.png?v=3');assert.equal(asset.status(),200);
    await next.evaluate(async url=>{await WA.player.setTemporaryWoka({textureId:'onboarding-stage-cart',url,frameWidth:96,frameHeight:80,scale:.62});await WA.player.restoreWoka();},origin+'/resources/wvh/go-cart-avatar.png?v=3');
    await mobile.page.screenshot({path:path.join(output,'mobile-after-room-change.private.png')});
    evidence.mobile={width:390,touchContext:true,leavingBeforeSkipDoesNotRepeat:true,nativeRoomTravelUsed:true,controlsWorkAfterTravel:true};evidence.customAvatarSwapAndRestorePreserved=true;
    assert.deepEqual(errors,[]);evidence.passed=true;evidence.errors=errors;fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){
    const pages=contexts.flatMap(ctx=>ctx.pages()),last=pages.at(-1);
    const storage=await last?.evaluate(()=>({localUser:JSON.parse(localStorage.getItem('localUser')||'null'),keys:Object.keys(localStorage).filter(key=>/tutorial|variable/i.test(key))})).catch(()=>null);
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,cancelled,errorType:error.name,error:clean(error.message),errors,storage,buttons:await last?.getByRole('button').allTextContents().catch(()=>[])},null,2));
    console.error(JSON.stringify({passed:false,stage,cancelled,errorType:error.name}));let i=0;for(const page of pages)await page.screenshot({path:path.join(output,'failure-'+(++i)+'.private.png')}).catch(()=>{});process.exitCode=cancelled?130:1;
  }finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);await browser.close();}
}
main().catch(error=>{console.error('Onboarding browser probe stopped: '+error.name);process.exitCode=1;});
