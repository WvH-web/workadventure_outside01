'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const folder=storage.outputPath('seat-ui-stage'),output=storage.outputPath('seat-ui-stage/'+new Date().toISOString().replace(/[:.]/g,'-'));
const handoff=JSON.parse(fs.readFileSync(path.join(folder,'handoff.private.json'))),origin='http://localhost:13301';
assert.equal(handoff.stageOnly,true);assert.equal(handoff.origin,origin);assert.match(handoff.identity,/@invalid\.local$/);
const room=id=>origin+'/~/castle-preview/'+id+'.wam#start';
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[],errors=[];let phase='entry';const contexts=[];
 const progress=value=>{phase=value;console.log('Seat rehearsal: '+value);};
 async function controller(page,id){
  for(let i=0;i<120;i++){for(const frame of page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))return frame;await page.waitForTimeout(250);}
  throw Error('Native controller missing: '+id);
 }
 async function ready(page){
  for(let i=0;i<50;i++){
   if(await page.getByTestId('microphone-button').isVisible().catch(()=>false))break;
   const submit=page.locator('button.selectCharacterSceneFormSubmit');if(await submit.isVisible().catch(()=>false))await submit.click();
   const save=page.getByRole('button',{name:/^(Save|Speichern|Los geht.s|Let.s go)$/i});if(await save.count()===1&&await save.isVisible().catch(()=>false))await save.click();
   await page.waitForTimeout(1200);
  }
  await page.getByTestId('microphone-button').waitFor({timeout:20000});
  const skip=page.getByTestId('onboarding-button-welcome-skip');await skip.waitFor({timeout:6000}).catch(()=>{});if(await skip.isVisible())await skip.click();
 }
 try{
  for(const mobile of [false,true]){
   progress(mobile?'mobile-entry':'desktop-entry');
   const ctx=await browser.newContext({permissions:['microphone','camera'],viewport:mobile?{width:390,height:844}:{width:1440,height:1000},...(mobile?{isMobile:true,hasTouch:true}:{})});contexts.push(ctx);
   await ctx.addInitScript(({origin,identity,token})=>{
    if(location.origin!==origin||window.top!==window)return;
    localStorage.setItem('localUser',JSON.stringify({uuid:identity,email:null,matrixUserId:null,isMatrixRegistered:false}));
    localStorage.setItem('authToken',token);localStorage.setItem('playerName','Sitzprobe');localStorage.setItem('language','de-DE');
    localStorage.setItem('characterTextures',JSON.stringify(['wvh-event-mira-v1']));
    localStorage.setItem('requestedCameraStateKey','false');localStorage.setItem('requestedMicrophoneStateKey','false');localStorage.setItem('workadventure_pwa_install_prompt_shown','1');
   },{origin,identity:handoff.identity,token:handoff.token});
   const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message.replaceAll(handoff.token,'[stage token]')));
   await page.goto(room('sternwarte'),{waitUntil:'domcontentloaded',timeout:60000});await ready(page);let script=await controller(page,'sternwarte');
   const waitSeat=value=>script.waitForFunction(value=>Boolean(castleRoom.seat)===value,value,{polling:100,timeout:15000});
   const approach=async()=>{await script.evaluate(async()=>{await castleRoom.stand();const seat=castleRoom.layout.seats.find(s=>s.id==='buchclub-n0');await WA.player.teleport(seat.standX,seat.standY);await castleRoom.syncPosition();});await page.getByTestId('castle-seat-action').filter({hasText:'Hinsetzen'}).waitFor();};
   const native=page.getByTestId('castle-seat-action');
   const press=async(key,hold=0)=>{await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down(key);if(hold)await page.waitForTimeout(hold);await page.keyboard.up(key);};
   await approach();await page.waitForTimeout(800);
   progress(mobile?'mobile-native-controls':'desktop-native-controls');
   await press('Space',600);await waitSeat(true);await page.waitForTimeout(800);assert.equal(await script.evaluate(()=>Boolean(castleRoom.seat)),true,'Space must not immediately stand again');
   await native.filter({hasText:'Aufstehen'}).click();await waitSeat(false);await page.waitForTimeout(500);assert.equal(await script.evaluate(()=>Boolean(castleRoom.seat)),false);
   await native.filter({hasText:'Hinsetzen'}).focus();await page.keyboard.press('Space');await waitSeat(true);await page.waitForTimeout(700);assert.equal(await script.evaluate(()=>Boolean(castleRoom.seat)),true);
   await native.filter({hasText:'Aufstehen'}).focus();await page.keyboard.press('Enter');await waitSeat(false);
   if(mobile)await native.filter({hasText:'Hinsetzen'}).tap();else await native.filter({hasText:'Hinsetzen'}).click();await waitSeat(true);await page.waitForTimeout(800);
   const box=await native.boundingBox(),viewport=page.viewportSize();assert.ok(box&&box.width<=148&&box.height===44&&box.x>=0&&box.x+box.width<=viewport.width&&box.y>=0&&box.y+box.height<=viewport.height);
   assert.equal(await native.evaluate(e=>getComputedStyle(e).fontSize),'14px');
   const canvas=await page.locator('canvas:visible').first().screenshot();assert.ok((await sharp(canvas).stats()).channels.slice(0,3).every(c=>c.stdev>12));
   await script.evaluate(async()=>{window.__seatQaPanel=await WA.nav.openCoWebSite('https://wvh-web.github.io/workadventure_outside01/castle/puzzle.html',true);});await page.waitForTimeout(1800);
   const panel=page.frames().find(f=>f.url().includes('/castle/puzzle.html'));assert.ok(panel,'Actual native side panel must open');
   const frameElement=await panel.frameElement(),panelBox=await frameElement.boundingBox(),seatBox=await native.boundingBox();
   if(!mobile)assert.ok(seatBox.x+seatBox.width<=panelBox.x||seatBox.y+seatBox.height<=panelBox.y||seatBox.y>=panelBox.y+panelBox.height,'Compact action must not cover desktop side game');
   await page.screenshot({path:path.join(output,(mobile?'mobile':'desktop')+'.private.png')});
   await script.evaluate(()=>window.__seatQaPanel.close());await press('Space');await waitSeat(false);
   await script.evaluate(()=>{window.__seatQaLegacy=WA.ui.displayActionMessage({message:'Rutschen',callback:()=>{window.__seatQaLegacyClicked=true;}});});
   await page.locator('.popup-container').filter({hasText:'Rutschen'}).waitFor();const legacy=await page.locator('.popup-container').filter({hasText:'Rutschen'}).boundingBox();assert.ok(legacy.height>=80);
   await script.evaluate(()=>window.__seatQaLegacy.remove());
   await approach();await native.click();await waitSeat(true);
   await script.evaluate(url=>WA.nav.goToRoom(url),room('bibliothek'));script=await controller(page,'bibliothek');await page.waitForTimeout(1200);
   assert.equal(await script.evaluate(()=>Boolean(castleRoom.seat)),false);assert.equal(await page.getByTestId('onboarding-button-welcome-skip').isVisible(),false);
   const before=await script.evaluate(()=>WA.player.getPosition());await press('ArrowRight',180);const after=await script.evaluate(()=>WA.player.getPosition());assert.ok(after.x>before.x+2);
   assert.equal(await script.evaluate(()=>typeof WA.player.setTemporaryWoka==='function'&&typeof WA.player.restoreWoka==='function'),true);
   await script.evaluate(async origin=>{await WA.player.setTemporaryWoka({textureId:'seat-ui-stage-cart',url:origin+'/resources/wvh/go-cart-avatar.png?v=3',frameWidth:96,frameHeight:80,scale:.62});await WA.player.restoreWoka();},origin);
   rows.push({mobile,viewport,button:box,nativeSpace:true,heldSpaceOnce:true,focusedSpaceOnce:true,focusedEnterOnce:true,pointerOrTouch:true,
    nativeSidePanel:true,legacyPopupHeight:legacy.height,nativeRoomTravel:true,noTutorialRepeat:true,movementAfterTravel:true,temporaryAvatarPreserved:true});
   await ctx.close();
  }
  assert.deepEqual(errors,[]);const proof={passed:true,stageOnly:true,imageId:handoff.imageId,certificateChecksBypassed:false,networkResponsesSubstituted:false,realStudentAccountsUsed:false,rows,errors};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,output,rows:rows.length,imageId:handoff.imageId}));
 }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({phase,error:error.message.replaceAll(handoff.token,'[stage token]'),errors},null,2));for(const [i,ctx] of contexts.entries())for(const page of ctx.pages())await page.screenshot({path:path.join(output,'failure-'+i+'.private.png')}).catch(()=>{});throw error;
 }finally{await browser.close();}
}
main().catch(error=>{console.error('Seat rehearsal stopped: '+String(error.message).replaceAll(handoff.token,'[stage token]'));process.exitCode=1;});
