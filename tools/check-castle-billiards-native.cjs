'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs'),{revision}=require('./prepare-castle-puzzle.cjs');
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const candidateStyle=process.argv.includes('--candidate-style');
const output=storage.outputPath('billiards-native/'+(candidateStyle?'candidate-':'')+new Date().toISOString().replace(/[:.]/g,'-'));
const origin='https://together.deine-schule.com',url=origin+'/castle-billiards/#table=tisch-1';
const archiveSha256='4a81fa9246b809bff1cf1ca119e0a081c58fc29bcb12cde7cc6eb25e52792e44';
const cssSha256='9b4d3527a66599f6686f5d9d86b6188699b7737d89c0c2d09447f55c9619858d';
async function main(){
 assert.equal(JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json'))).contains_real_pupil_data,false);
 const users=[],errors=[],cases=[];let browser,phase='entry';
 const progress=value=>{phase=value;console.log('Native billiards pilot: '+value);};
 const wait=(frame,fn,arg)=>frame.waitForFunction(fn,arg,{polling:100,timeout:30000});
 async function panel(user){
  await user.script.evaluate(async url=>{window.__billiardsPilotPanel=await WA.nav.openCoWebSite(url,false,'',65,undefined,true,false);},url);
  for(let n=0;n<100;n++){
   const frame=user.page.frames().find(frame=>frame.url()===url);
   if(frame){
    await wait(frame,()=>window.castleBilliards?.connected);
    const stylesheet=await frame.evaluate(async()=>{const response=await fetch('/castle-billiards/billiards.css',{cache:'no-store'});if(!response.ok)throw Error('Stylesheet unavailable');return response.text();});
    assert.equal(crypto.createHash('sha256').update(stylesheet).digest('hex'),cssSha256);return frame;
   }
   await user.page.waitForTimeout(200);
  }throw Error('Native pilot panel missing');
 }
 async function voice(){
  const before=[];for(const user of users)before.push(await stats(user));let after;
  for(let n=0;n<30;n++){
   await users[0].page.waitForTimeout(1000);after=[];for(const user of users)after.push(await stats(user));
   if(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy))break;
  }
  assert.ok(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy));
  assert.ok(after[0].rooms.some(name=>name.endsWith('area-buchclub')&&after[1].rooms.includes(name)));return {before,after};
 }
 async function same(){const a=await users[0].panel.evaluate(()=>castleBilliards.state.board.state),b=await users[1].panel.evaluate(()=>castleBilliards.state.board.state);assert.deepEqual(a,b);return a;}
 async function shot(user){
  const version=await user.panel.evaluate(()=>castleBilliards.state.board.state.version);await wait(user.panel,()=>castleBilliards.canAct());
  if(await user.panel.locator('#shoot').isDisabled())throw Error('Pilot shot requires a legal cue-ball placement');
  if(user.mobile)await user.panel.locator('#shoot').tap();else await user.panel.locator('#shoot').click();
  for(const player of users)await wait(player.panel,version=>castleBilliards.state.board.state.version===version+1,version);
  const state=await same(),frames=[];for(const player of users)frames.push(await player.panel.evaluate(()=>castleBilliards.renderer.animation.frames));
  assert.deepEqual(frames[0],frames[1]);assert.ok(frames[0].length>4);
  await wait(user.panel,()=>!castleBilliards.state.board.animation||castleBilliards.state.board.animation.endsAt<Date.now()+castleBilliards.renderer.clockOffset);
  return {version:state.version,frames:frames[0].length,positionsSha256:crypto.createHash('sha256').update(JSON.stringify(state.balls)).digest('hex')};
 }
 try{
  writeAudio();browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
   '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(let n=1;n<=2;n++){
   progress('school-entry-'+n);const user=await join(browser,n,{roomId:'sternwarte',roomUrl:origin+'/~/castle-preview/sternwarte.wam#start',
    outputDir:output,label:'Billardprobe',seats:12,groups:3,revision,mobile:n===2,stubCinema:false,
    schoolStorageState:path.join(privateRoot,'qa/sso-'+(n===1?'A':'B')+'.private.json'),characterTextureId:'wvh-event-mira-v1',parking:[[112,272],[432,608]],
    onPhase:step=>progress('entry-'+n+'-'+step),configureContext:candidateStyle?async context=>{
     await context.route(origin+'/castle-billiards/billiards.css',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(__dirname,'../ops/castle-billiards/public/billiards.css'))}));
    }:undefined});user.mobile=n===2;users.push(user);
   const microphone=user.page.getByTestId('microphone-button');await microphone.click();await user.page.waitForTimeout(200);await microphone.click();
  }
  for(const [i,user]of users.entries()){
   await sit(user,i?'buchclub-s1':'buchclub-n0');user.panel=await panel(user);
   assert.equal(await user.panel.evaluate(()=>castleBilliards.state.self.staff),false);assert.equal(await user.panel.locator('#reset').isVisible(),false);
   assert.equal(await user.panel.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  progress('two-real-school-players');await users[0].panel.locator('#seat-0').click();await users[1].panel.locator('#seat-1').tap();
  for(const user of users)await wait(user.panel,()=>castleBilliards.state.board.seats.every(seat=>seat.connected));
  cases.push('two approved normal Microsoft pupil accounts open the actual protected HTTPS service in native side panels; no staff permissions');
  progress('agree-fresh-pilot-round');for(let round=0;round<3;round++){
   const before=await users[0].panel.evaluate(()=>({seat:castleBilliards.state.self.seat,...castleBilliards.state.board.state}));
   if(before.seat===0&&before.shots===0&&before.winner===null)break;
   if(before.winner===null){await users[0].panel.locator('#resign').click();await users[0].panel.getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();}
   for(const user of users)await wait(user.panel,()=>castleBilliards.state.board.state.winner!==null);
   await users[0].panel.locator('#rematch').click();await users[1].panel.locator('#rematch').tap();
   for(const user of users)await wait(user.panel,version=>castleBilliards.state.board.state.version>version&&castleBilliards.state.board.state.winner===null&&castleBilliards.state.board.state.shots===0,before.version);
  }
  assert.equal(await users[0].panel.evaluate(()=>castleBilliards.state.self.seat),0);
  progress('actual-first-stroke');const first=await shot(users[0]);cases.push('desktop pupil executes a real VPS-calculated stroke; both native panels receive identical actual positions and trajectory');
  progress('concession-and-mutual-rematch');await users[0].panel.locator('#resign').click();await users[0].panel.getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();
  await wait(users[1].panel,()=>castleBilliards.state.board.state.winner===1);
  await users[0].panel.locator('#rematch').click();await users[1].panel.locator('#rematch').tap();
  await wait(users[1].panel,()=>castleBilliards.state.self.seat===0&&castleBilliards.state.board.state.shots===0);
  const second=await shot(users[1]);cases.push('real concession and mutual rematch swap places; the touch pupil executes the next actual stroke');
  progress('native-conversation-with-both-panels');const audio=await voice();cases.push('both real native table conversations continue to receive and decode audio while billiards panels are open');
  for(const [i,user]of users.entries()){
   const pixels=await user.panel.locator('#table').screenshot();assert.ok((await sharp(pixels).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
   await user.page.screenshot({path:path.join(output,(i?'touch':'desktop')+'.private.png')});
  }
  progress('explicit-panel-rejoin');const a=users[0],saved=await same();await a.script.evaluate(()=>window.__billiardsPilotPanel.close());a.panel=await panel(a);
  await a.panel.locator('#resume').click();await wait(a.panel,()=>castleBilliards.state.self.seat===1);assert.deepEqual(await same(),saved);
  cases.push('native panel closes and reopens; explicit same-account place takeover retains the exact shared game');
  progress('owned-cleanup-and-movement');for(const user of users){
   await user.panel.locator('#leave-seat').click();await user.panel.locator('#confirm').getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();
   await wait(user.panel,()=>castleBilliards.state.self.seat===null);
   await user.script.evaluate(async()=>{await window.__billiardsPilotPanel.close();await castleRoom.stand();await WA.player.teleport(432,608);await castleRoom.syncPosition();});
   const before=await user.script.evaluate(()=>WA.player.getPosition());await user.page.evaluate(()=>document.activeElement?.blur());
   await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(180);await user.page.keyboard.up('ArrowRight');assert.ok((await user.script.evaluate(()=>WA.player.getPosition())).x>before.x+2);
  }
  cases.push('only the QA-opened panels are closed; occupied places are released and native movement resumes');errors.push(...users.flatMap(user=>user.errors));assert.deepEqual(errors,[]);
  const proof={passed:true,archiveSha256,cssSha256,normalMicrosoftPupils:2,syntheticApprovedAccountsOnly:true,realPublishedHttpsService:true,realNativeSidePanels:true,
   normalMapActivityActivated:false,panelsOpenedByQaThroughNativeApi:true,normalCastleTableNotYetPublished:true,networkResponsesSubstituted:candidateStyle,schoolLookupOverridden:false,
   candidateCssOnly:candidateStyle,normalPublishedCssUsed:!candidateStyle,
   candidateCssSha256:candidateStyle?crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../ops/castle-billiards/public/billiards.css'))).digest('hex'):null,
   bothPlayersExecutedActualStrokes:true,mutualRematchAndSeatSwap:true,explicitNativePanelRejoin:true,desktopAndTouch:true,nativeAudioDecodedBothWays:true,placesReleasedAfterConfirmation:true,
   audio,first,second,cases,errors,oldCastleReplaced:false,fullCastleApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,output,normalMicrosoftPupils:2,nativeAudioDecodedBothWays:true,candidateCssOnly:candidateStyle,normalMapActivityActivated:false}));
 }catch(error){
  fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({phase,type:error.name,message:error.message,errors:users.flatMap(user=>user.errors)},null,2));
  for(const [i,user]of users.entries())await user.page.screenshot({path:path.join(output,'failure-'+i+'.private.png')}).catch(()=>{});throw error;
 }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error('Native billiards pilot stopped: '+error.name+': '+error.message);process.exitCode=1;});
