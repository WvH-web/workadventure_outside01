'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./prepare-castle-puzzle.cjs');
const output=storage.outputPath('seat-ui-native/'+new Date().toISOString().replace(/[:.]/g,'-'));
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const origin='https://together.deine-schule.com',web='https://wvh-web.github.io/workadventure_outside01/castle/';
const imageId='sha256:fb84b493271e96d6e37bf2b143e09e16ecdc9957f357ad5db4ac1f576bf4e07a';
async function main(){
 assert.equal(JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json'))).contains_real_pupil_data,false);
 const users=[],rows=[],errors=[];let browser,phase='entry';
 const progress=value=>{phase=value;console.log('Native seat probe: '+value);};
 async function controller(page,id){for(let i=0;i<100;i++){for(const frame of page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))return frame;await page.waitForTimeout(250);}throw Error('Controller missing: '+id);}
 async function seatState(user,value){await user.script.waitForFunction(value=>Boolean(castleRoom.seat)===value,value,{polling:100,timeout:15000});}
 async function press(page,key,hold=0){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down(key);if(hold)await page.waitForTimeout(hold);await page.keyboard.up(key);}
 async function approach(user,id){await user.script.evaluate(async id=>{await castleRoom.stand();const seat=castleRoom.layout.seats.find(s=>s.id===id);await WA.player.teleport(seat.standX,seat.standY);await castleRoom.syncPosition();},id);await user.page.getByTestId('castle-seat-action').filter({hasText:'Hinsetzen'}).waitFor();}
 async function panel(user){for(let i=0;i<90;i++){const frame=user.page.frames().find(f=>f.url()===web+'puzzle.html');if(frame){await frame.waitForFunction(()=>window.castleStarMachine?.value?.active,undefined,{timeout:20000});return frame;}await user.page.waitForTimeout(200);}throw Error('Native game panel missing');}
 try{
  writeAudio();browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
   '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(let number=1;number<=2;number++){
   progress('entry-'+number);const user=await join(browser,number,{roomId:'sternwarte',roomUrl:origin+'/~/castle-preview/sternwarte.wam#start',
    outputDir:output,label:'Sitzprobe',seats:12,groups:3,revision,mobile:number===2,stubCinema:false,
    schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),characterTextureId:'wvh-event-mira-v1',parking:[[112,272],[432,608]],
    onPhase:step=>progress('entry-'+number+'-'+step)});users.push(user);
  }
  for(const [index,user] of users.entries()){
   progress('native-controls-'+index);const native=user.page.getByTestId('castle-seat-action');await approach(user,index?'buchclub-s1':'buchclub-n0');
   await press(user.page,'Space',600);await seatState(user,true);await user.page.waitForTimeout(700);assert.equal(await user.script.evaluate(()=>Boolean(castleRoom.seat)),true);
   await native.filter({hasText:'Aufstehen'}).focus();await user.page.keyboard.press('Enter');await seatState(user,false);
   await native.filter({hasText:'Hinsetzen'}).focus();await user.page.keyboard.press('Space');await seatState(user,true);await user.page.waitForTimeout(700);assert.equal(await user.script.evaluate(()=>Boolean(castleRoom.seat)),true);
   if(index)await native.filter({hasText:'Aufstehen'}).tap();else await native.filter({hasText:'Aufstehen'}).click();await seatState(user,false);
   if(index)await native.filter({hasText:'Hinsetzen'}).tap();else await native.filter({hasText:'Hinsetzen'}).click();await seatState(user,true);
   if(index===0)await user.page.getByRole('button',{name:'Sternenmaschine',exact:true}).click();await panel(user);
   await user.page.waitForTimeout(800);const button=await native.boundingBox();assert.ok(button.width<=148&&button.height===44);
   rows.push({mobile:index===1,button,nativeSpace:true,focusedSpaceOnce:true,focusedEnterOnce:true,pointerOrTouch:true,nativeSidePanel:true});
   await user.page.screenshot({path:path.join(output,(index?'mobile':'desktop')+'.private.png')});
   const canvas=await user.page.locator('canvas:visible').first().screenshot();assert.ok((await sharp(canvas).stats()).channels.slice(0,3).every(c=>c.stdev>12));
  }
  progress('actual-two-way-native-voice');const before=[];for(const user of users)before.push(await stats(user));let after;
  for(let i=0;i<25;i++){await users[0].page.waitForTimeout(1000);after=[];for(const user of users)after.push(await stats(user));if(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy))break;}
  assert.ok(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy));
  assert.ok(after[0].rooms.some(name=>name.endsWith('area-buchclub')&&after[1].rooms.includes(name)));
  for(const [index,user] of users.entries()){
   progress('native-room-travel-'+index);await user.script.evaluate(url=>WA.nav.goToRoom(url),origin+'/~/castle-preview/bibliothek.wam#start');user.script=await controller(user.page,'bibliothek');await user.page.waitForTimeout(1200);
   assert.equal(await user.script.evaluate(()=>Boolean(castleRoom.seat)),false);assert.equal(await user.page.getByTestId('onboarding-button-welcome-skip').isVisible(),false);
   assert.equal(user.page.frames().some(f=>f.url()===web+'puzzle.html'),false);
   const position=await user.script.evaluate(()=>WA.player.getPosition());await press(user.page,'ArrowRight',180);const next=await user.script.evaluate(()=>WA.player.getPosition());assert.ok(next.x>position.x+2);
   Object.assign(rows[index],{nativeRoomTravel:true,noTutorialRepeat:true,movementAfterTravel:true});errors.push(...user.errors);
  }
  assert.deepEqual(errors,[]);
  const proof={passed:true,imageId,normalPublishedPreview:true,normalMicrosoftPupils:2,syntheticApprovedAccountsOnly:true,networkResponsesSubstituted:false,
   rows,nativeAudioDecodedBothWays:true,nativeAudio:{before,after},errors,oldCastleReplaced:false,loadApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,output,normalMicrosoftPupils:2,nativeAudioDecodedBothWays:true}));
 }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({phase,error:error.message,errors:users.flatMap(u=>u.errors)},null,2));for(const [i,user] of users.entries())await user.page.screenshot({path:path.join(output,'failure-'+i+'.private.png')}).catch(()=>{});throw error;
 }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error('Native seat probe stopped: '+error.name+': '+error.message);process.exitCode=1;});
