'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,move}=require('./check-cinema-live.cjs'),{revision}=require('./build-castle-outdoors.cjs');
const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(root,'qa/park-live');
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let user,stage='enter';
  try{
    user=await join(browser,1,{roomId:'park',roomUrl:'https://together.deine-schule.com/~/castle-preview/park.wam#start',outputDir:output,label:'Parkprobe',schoolStorageState:path.join(root,'qa/sso-A.private.json'),seats:8,groups:2,revision,parking:[[560,448]],characterTextureId:'wvh-event-mira-v1'});
    await user.script.waitForFunction(()=>!!window.castlePark,undefined,{polling:200});
    assert.equal(await user.script.evaluate(()=>typeof WA.player.setTemporaryWoka==='function'&&typeof WA.player.restoreWoka==='function'),true);
    const parking=await user.script.evaluate(()=>castlePark.parking);await move(user,parking.x+parking.width/2,parking.y+parking.height/2);stage='entry-popup';
    await user.page.getByRole('button',{name:'Einsteigen',exact:true}).click();await user.script.waitForFunction(()=>castlePark.active===true,undefined,{polling:200});await user.page.screenshot({path:path.join(output,'kart-native.private.png')});
    stage='drive';const before=await user.script.evaluate(()=>WA.player.getPosition());await user.page.keyboard.down('ArrowDown');await user.page.waitForTimeout(160);await user.page.keyboard.up('ArrowDown');const after=await user.script.evaluate(()=>WA.player.getPosition());assert.ok(after.y>before.y+2);
    const exit=user.page.getByRole('button',{name:'Aussteigen',exact:true});if(!await exit.isVisible()){await user.page.getByTestId('apps-button').click();await exit.waitFor({state:'visible'});}await exit.click();await user.script.waitForFunction(()=>!castlePark.active&&!castlePark.needsRestore,undefined,{polling:200});stage='slide';
    const slide=await user.script.evaluate(()=>castleRoom.layout.rides[0]);await move(user,slide.x+slide.width/2,slide.y+slide.height/2);
    await user.script.evaluate(()=>{
      window.__slideProbe={samples:[]};const base=WA.player.teleport.bind(WA.player),start=castleRoom.startRide.bind(castleRoom);
      WA.player.teleport=async(x,y)=>{window.__slideProbe.samples.push({x,y,at:performance.now()});return base(x,y);};
      castleRoom.startRide=async(...args)=>{window.__slideProbe.started=performance.now();try{return await start(...args);}finally{window.__slideProbe.finished=performance.now();}};
    });
    await user.page.getByText('Rutschen',{exact:true}).click();await user.script.waitForFunction(()=>window.__slideProbe?.finished&&window.__slideProbe.samples.length>2,undefined,{polling:100});
    const trace=await user.script.evaluate(()=>window.__slideProbe),landing=await user.script.evaluate(()=>WA.player.getPosition());
    assert.ok(trace.finished-trace.started<2500);assert.ok(Math.hypot(landing.x-slide.waypoints.at(-1).x,landing.y-slide.waypoints.at(-1).y)<2);assert.equal(await user.script.evaluate(()=>castleRoom.riding),false);
    stage='controls-after-slide';await user.page.keyboard.down('ArrowDown');await user.page.waitForTimeout(160);await user.page.keyboard.up('ArrowDown');const free=await user.script.evaluate(()=>WA.player.getPosition());assert.ok(free.y>landing.y+2);await user.page.screenshot({path:path.join(output,'slide-finish-native.private.png')});
    assert.deepEqual(user.errors,[]);const evidence={passed:true,revision,normalMicrosoftPupil:true,visibleKartPopupClicked:true,nativeKartAppearanceApiResolved:true,nativeDrivingWorks:true,exitRestoresAvatar:true,visibleSlideTriggerClicked:true,slideMilliseconds:Math.round(trace.finished-trace.started),slidePositionUpdates:trace.samples.length,dryLanding:true,controlsRestored:true,errors:user.errors,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({...evidence,trace},null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,diagnostics:user?.diagnostics},null,2));console.error(JSON.stringify({passed:false,stage,errorType:error.name}));for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure.private.png')}).catch(()=>{});process.exitCode=1;}
  finally{if(user)await user.script.evaluate(()=>castlePark.stopKart()).catch(()=>{});await browser.close();}
}
main().catch(error=>{console.error('Park probe stopped: '+error.name);process.exitCode=1;});
