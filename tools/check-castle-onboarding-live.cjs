'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(root,'handoff.json'),'utf8'));
assert.equal(handoff.contains_real_pupil_data,false);
const output=path.join(root,'qa/onboarding-live'),origin='https://together.deine-schule.com';
const room=id=>origin+'/~/castle-preview/'+id+'.wam#start';
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results=[],errors=[];let stage='entry';
  const welcome=page=>page.getByTestId('onboarding-button-welcome-skip');
  const activeSkip=page=>page.getByTestId('onboarding-step').getByRole('button',{name:/^(Skip(?: tutorial)?|(?:Tutorial )?(?:Ueberspringen|\u00dcberspringen))$/i});
  async function ready(page){
    for(let i=0;i<50;i++){
      if(await page.getByTestId('microphone-button').isVisible().catch(()=>false))return;
      const choose=page.locator('button.selectCharacterSceneFormSubmit');if(await choose.isVisible().catch(()=>false))await choose.click();
      const input=page.getByTestId('loginSceneNameInput');if(await input.isVisible().catch(()=>false)){await input.fill('Tutorialprobe');await input.press('Enter');}
      const save=page.getByRole('button',{name:/^(Save|Speichern|Los geht.s|Let.s go)$/i});if(await save.count()===1&&await save.isVisible().catch(()=>false))await save.click();
      await page.waitForTimeout(1200);
    }throw Error('Live room did not become ready');
  }
  async function controller(page,id){
    for(let i=0;i<100;i++){
      for(const frame of page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))return frame;
      await page.waitForTimeout(300);
    }throw Error('Live room controller missing');
  }
  async function noOffer(page){
    await page.waitForTimeout(1800);assert.equal(await welcome(page).isVisible(),false);
    assert.equal((await page.getByTestId('onboarding-step').innerText()).trim(),'');
  }
  async function replay(page,mobile){
    await page.getByTestId('action-user').click();
    await page.getByRole('button',{name:/Help.*tips|Hilfe.*Tipps/i}).click();
    await (mobile?page.getByTestId('onboarding-step').getByRole('button',{name:'Next',exact:true}):activeSkip(page)).waitFor();
  }
  async function finishMobile(page){
    const labels=[];
    for(let step=0;step<3;step++){
      const button=page.getByTestId('onboarding-step').getByRole('button');
      await button.waitFor();assert.equal(await button.count(),1);
      const label=(await button.innerText()).trim();assert.ok(label);
      if(step===0)assert.equal(label,'Next');
      else if(step===1)assert.equal(label,'Got it!');
      else assert.ok(!['Next','Got it!'].includes(label));
      labels.push(label);await button.click();await page.waitForTimeout(250);
    }return labels;
  }
  try{
    for(const [index,account] of handoff.accounts.entries()){
      const mobile=index===1,key=account.key;stage=key+'-entry';console.log('Live tutorial probe: '+stage);
      const context=await browser.newContext({storageState:path.join(root,'qa/sso-'+key+'.private.json'),permissions:['microphone','camera'],viewport:mobile?{width:390,height:844}:{width:1440,height:1000},...(mobile?{isMobile:true,hasTouch:true}:{})});
      try{
        await context.addInitScript(()=>{
          if(location.origin!=='https://together.deine-schule.com'||window.top!==window)return;
          localStorage.setItem('requestedCameraStateKey','false');localStorage.setItem('requestedMicrophoneStateKey','false');
          localStorage.setItem('playerName','Tutorialprobe');localStorage.setItem('workadventure_pwa_install_prompt_shown','1');
          if(!localStorage.getItem('characterTextures'))localStorage.setItem('characterTextures',JSON.stringify(['wvh-event-mira-v1']));
        });
        const page=await context.newPage();page.setDefaultTimeout(15000);
        page.on('pageerror',error=>errors.push({account:key,errorType:error.name}));
        await page.goto(room('erdgeschoss'),{waitUntil:'domcontentloaded',timeout:60000});await ready(page);
        let script=await controller(page,'erdgeschoss');await page.waitForTimeout(2000);
        const offeredAtEntry=await welcome(page).isVisible();
        if(offeredAtEntry)await welcome(page).click();
        await noOffer(page);
        assert.equal(await page.evaluate(()=>{
          const user=JSON.parse(localStorage.getItem('localUser'));
          return localStorage.getItem('wvhTutorialOfferedV1:'+encodeURIComponent(user.uuid))==='1';
        }),true,'Live account preference must be remembered or migrated');
        stage=key+'-leave-during-manual-tutorial';console.log('Live tutorial probe: '+stage);
        await replay(page,mobile);
        await script.evaluate(url=>WA.nav.goToRoom(url),room('obergeschoss'));
        script=await controller(page,'obergeschoss');await noOffer(page);
        stage=key+'-reload';await page.reload({waitUntil:'domcontentloaded'});await ready(page);script=await controller(page,'obergeschoss');await noOffer(page);
        stage=key+'-manual-replay';await replay(page,mobile);
        const mobileCompletionLabels=mobile?await finishMobile(page):null;
        if(!mobile)await activeSkip(page).click();await noOffer(page);
        const before=await script.evaluate(()=>WA.player.getPosition());
        await page.keyboard.down('ArrowRight');await page.waitForTimeout(160);await page.keyboard.up('ArrowRight');
        const after=await script.evaluate(()=>WA.player.getPosition());assert.ok(after.x>before.x+2);
        await script.evaluate(async url=>{await WA.player.setTemporaryWoka({textureId:'onboarding-live-cart',url,frameWidth:96,frameHeight:80,scale:.62});await WA.player.restoreWoka();},origin+'/resources/wvh/go-cart-avatar.png?v=3');
        const access=await page.evaluate(async()=>{
          const headers={Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'};
          const response=await fetch('/castle-chess/session',{method:'POST',headers,body:'{}'}),value=await response.json();
          if(response.ok)await fetch('/castle-chess/leave',{method:'POST',headers:{...headers,'X-Chess-Session':value.sessionId},body:'{}'});
          return {status:response.status,staff:value.self?.staff,tables:value.tables?.length};
        });assert.deepEqual(access,{status:200,staff:false,tables:3});
        await page.screenshot({path:path.join(output,key+'-after-travel.private.png')});
        results.push({account:key,normalMicrosoftLogin:true,mobileTouchContext:mobile,offeredAtEntry,rememberedOrMigrated:true,
          manualReplayVisible:true,leavingDuringTutorialDoesNotRepeat:true,reloadDoesNotRepeat:true,explicitDesktopSkipWorks:mobile?null:true,
          explicitMobileCompletionWorks:mobile?true:null,mobileCompletionLabels,
          movementWorks:true,temporaryAvatarSwapAndRestoreWorks:true,freshProtectedPupilAccess:true});
      }catch(error){
        for(const [i,page] of context.pages().entries()){
          await page.screenshot({path:path.join(output,key+'-failure-'+i+'.private.png')}).catch(()=>{});
          fs.writeFileSync(path.join(output,key+'-failure-'+i+'.private.json'),JSON.stringify({
            stage,buttons:await page.getByTestId('onboarding-step').getByRole('button').allTextContents().catch(()=>[]),
            tutorial:await page.getByTestId('onboarding-step').innerText().catch(()=>null)},null,2)+'\n');
        }throw error;
      }finally{await context.close();}
    }
    assert.deepEqual(errors,[]);
    const proof={passed:results.length===2,productionClient:true,syntheticSchoolTestAccountsOnly:true,results,errors,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
  }catch(error){
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,results,errors},null,2)+'\n');
    console.error(JSON.stringify({passed:false,stage,errorType:error.name}));
    let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++i)+'.private.png')}).catch(()=>{});
    process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Live onboarding probe stopped: '+error.name);process.exitCode=1;});
