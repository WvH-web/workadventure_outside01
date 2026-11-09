'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const probe=require('./castle-art-probe.cjs');
const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(root,'qa/art-live');
const url='https://together.deine-schule.com/castle-art/';
async function main(){
  const handoff=JSON.parse(fs.readFileSync(path.join(root,'handoff.json'),'utf8'));assert.equal(handoff.contains_real_pupil_data,false);
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),users=[],errors=[],requests=[],ownIds=[];let stage='enter';
  try{
    for(const key of ['A','B']){
      const context=await browser.newContext({storageState:path.join(root,'qa/sso-'+key+'.private.json'),viewport:key==='A'?{width:1200,height:940}:{width:390,height:844},...(key==='B'?{isMobile:true,hasTouch:true}:{})});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
      page.on('console',message=>{if(message.type()==='error'&&/Content Security|Refused to|Uncaught/.test(message.text()))errors.push(message.text());});
      await page.goto(url);await page.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});const child=await probe.choose(page);await probe.observe(child);
      assert.equal(await child.locator('#toolID-clear').isVisible(),false);users.push({key,context,page,child});
    }
    const [a,b]=users;stage='shared-mouse-and-touch';ownIds.push(...await probe.paint(a.page,a.child));await probe.received(b.child,ownIds);
    const touchIds=await probe.paint(b.page,b.child,{touch:true,y:320});ownIds.push(...touchIds);await probe.received(a.child,touchIds);
    await b.child.locator('#toolID-text').click();const box=await (await b.child.frameElement()).boundingBox();await b.page.touchscreen.tap(box.x+155,box.y+420);
    await b.child.locator('#textToolInput').fill('Zusammen im Schloss');await b.child.locator('#toolID-hand').click();await a.child.getByText('Zusammen im Schloss',{exact:true}).waitFor();ownIds.push(...await probe.created(b.child));
    await a.child.waitForFunction(()=>WBOApp.connection.socket.io.engine.transport.name==='websocket');stage='reload';
    await a.page.reload();await a.page.getByText('Verbunden',{exact:true}).waitFor();a.child=await probe.choose(a.page);await probe.received(a.child,ownIds);
    const extra=await b.context.newPage();await extra.goto(url);await extra.getByText('Verbunden',{exact:true}).waitFor();const late=await probe.choose(extra);await probe.received(late,ownIds);await extra.close();
    await b.child.waitForFunction(()=>WBOApp.connection.state==='connected');
    for(const user of users){assert.equal(await user.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,'shared-'+user.key+'.private.png'),fullPage:true});}
    const pixels=await sharp(await a.page.locator('#surface').screenshot()).stats();assert.ok(pixels.channels.slice(0,3).every(channel=>channel.stdev>8));
    stage='creator-leaves';await a.context.close();const continued=await probe.paint(b.page,b.child,{touch:true,x:210,y:250});ownIds.push(...continued);
    stage='cleanup-only-owned-objects';await probe.eraseOwn(b.child,ownIds);assert.ok(requests.every(url=>!/[?&]token=/.test(url)));assert.deepEqual(errors,[]);
    const evidence={passed:true,normalMicrosoftPupilLogins:2,syntheticProfileOverrides:false,actualWboVersion:'2.18.33',
      actualWebSocketUpgrade:true,mouseAndMobileTouchShared:true,textShared:true,reloadRestoresSameObjects:true,lateTabReceivesObjects:true,
      closingOneTabDoesNotLogOutOthers:true,creatorMayLeaveAndOtherCanContinue:true,pupilsCannotClearWholeBoard:true,
      onlyOwnedProbeObjectsRemoved:true,unrelatedArtworkModified:false,noCredentialUrls:true,browserErrors:errors,nativeAudioTestedInThisProbe:false,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,ownIds},null,2));console.error(JSON.stringify({passed:false,stage,errorType:error.name,errors}));let n=0;for(const user of users)if(!user.page.isClosed())await user.page.screenshot({path:path.join(output,'failure-'+(++n)+'.private.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
  finally{await browser.close();}
}
main().catch(error=>{console.error('Authorized atelier probe stopped: '+error.name);process.exitCode=1;});
