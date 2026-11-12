'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com',web='https://wvh-web.github.io/workadventure_outside01/castle/';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=storage.outputPath('billiards-table/'+new Date().toISOString().replace(/[:.]/g,'-'));
const url=origin+'/castle-billiards/#table=tisch-1',sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function main(){
 const published=process.argv.includes('--published');assert.equal(Number(published)+Number(process.argv.includes('--stage')),1,'Choose only --stage or --published');
 const mapName=published?'spielesaal.tmj':'spielesaal-billard2-preview.tmj',wamName=published?'spielesaal.wam':'billardprobe2.wam';
 const map=JSON.parse(fs.readFileSync(path.join(root,'castle',mapName))),revision=map.properties.find(p=>p.name==='castleRevision').value;
 const wamResponse=await fetch(origin+'/map-storage/castle-preview/'+wamName,{signal:AbortSignal.timeout(15000)});assert.equal(wamResponse.status,200);
 const wamBytes=Buffer.from(await wamResponse.arrayBuffer()),wam=JSON.parse(wamBytes);assert.equal(new URL(wam.mapUrl).origin+new URL(wam.mapUrl).pathname,web+mapName);
 assert.ok(wam.areas.every(area=>area.properties.every(p=>p.type==='livekitRoomProperty'&&p.roomName.startsWith(published?'school-castle-v2-spielesaal-':'school-castle-billiards-qa2-'))));
 const files=[mapName,'billiards-preview.bundle.js','billiards-preview.bundle.manifest.json',
  ...['floor','fronts-r2','marker','fire'].map(name=>'art/spielesaal-billard-20261112/'+name+'.png')],fileHashes={};
 for(const name of files){const response=await fetch(web+name+'?v=20261112-table-check',{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);const raw=Buffer.from(await response.arrayBuffer());assert.equal(sha(raw),sha(fs.readFileSync(path.join(root,'castle',name))));fileHashes[name]=sha(raw);}
 assert.equal(JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json'))).contains_real_pupil_data,false);
 const users=[],cases=[],errors=[],voices=[];let browser,phase='entry';
 const mark=value=>{phase=value;console.log('Billiards table probe: '+value);};
 const wait=(frame,fn,arg)=>frame.waitForFunction(fn,arg,{polling:100,timeout:30000});
 async function seatButton(user,label){
  const compact=user.page.getByTestId('castle-seat-action').filter({hasText:label});
  if(published){await compact.waitFor();assert.equal((await compact.innerText()).trim(),label);return compact;}
  if(await compact.isVisible())return compact;
  const legacy=user.page.locator('.responsive-message').filter({hasText:new RegExp('^'+label+'$')});await legacy.waitFor();return legacy;
 }
 async function seat(user,id){
  await user.page.bringToFront();await user.script.evaluate(async id=>{await castleRoom.stand();const seat=castleRoom.layout.seats.find(seat=>seat.id===id);await WA.player.teleport(seat.standX,seat.standY);await castleRoom.syncPosition();},id);
  const button=await seatButton(user,'Hinsetzen');if(user.mobile)await button.tap();else await button.click();
  await wait(user.script,id=>castleRoom.seat?.id===id&&!castleRoom.busy,id);assert.equal(await user.script.evaluate(id=>castleRoom.seat.facing===castleRoom.layout.seats.find(s=>s.id===id).facing,id),true);
 }
 async function panel(user,destination=url){
  for(let n=0;n<100;n++){
   const frame=user.page.frames().find(frame=>frame.url()===destination);
   if(frame){if(destination===url){await wait(frame,()=>window.castleBilliards?.connected);assert.equal(await frame.evaluate(()=>castleBilliards.state.self.staff),false);}return frame;}
   await user.page.waitForTimeout(200);
  }throw Error('Automatically opened table panel missing');
 }
 async function closeSeat(user){
  const button=await seatButton(user,'Aufstehen');if(user.mobile)await button.tap();else await button.click();
  await wait(user.script,()=>!castleRoom.seat&&!castleActivities.website&&!castleActivities.rounds.value);
  await user.page.waitForFunction(destination=>!document.querySelector('iframe[src="'+destination+'"]'),url);
 }
 async function releaseGame(user){
  if(await user.panel.evaluate(()=>castleBilliards.state.self.seat!==null)){
   await user.panel.locator('#leave-seat').click();await user.panel.locator('#confirm').getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();await wait(user.panel,()=>castleBilliards.state.self.seat===null);
  }
 }
 async function voice(label,suffix='area-fensterleser'){
  const before=[];for(const user of users)before.push(await stats(user));let after;
  for(let n=0;n<30;n++){await users[0].page.waitForTimeout(1000);after=[];for(const user of users)after.push(await stats(user));if(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy))break;}
  assert.ok(after.every((row,i)=>row.inbound>before[i].inbound&&row.energy>before[i].energy));
  assert.ok(after[0].rooms.some(name=>name.endsWith(suffix)&&after[1].rooms.includes(name)));voices.push({label,before,after});
 }
 async function agreeFresh(){
  for(let n=0;n<3;n++){
   const before=await users[0].panel.evaluate(()=>({seat:castleBilliards.state.self.seat,...castleBilliards.state.board.state}));
   if(before.seat===0&&before.shots===0&&before.winner===null)return;
   if(before.winner===null){await users[0].panel.locator('#resign').click();await users[0].panel.locator('#confirm').getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();}
   for(const user of users)await wait(user.panel,()=>castleBilliards.state.board.state.winner!==null);
   await users[0].panel.locator('#rematch').click();await users[1].panel.locator('#rematch').tap();
   for(const user of users)await wait(user.panel,version=>castleBilliards.state.board.state.version>version&&castleBilliards.state.board.state.winner===null&&castleBilliards.state.board.state.shots===0,before.version);
  }throw Error('Both players must agree the fresh initial table');
 }
 try{
  writeAudio();browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
   '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(let n=1;n<=2;n++){
   mark('school-entry-'+n);const user=await join(browser,n,{roomId:'spielesaal',roomUrl:origin+'/~/castle-preview/'+wamName+'#start',outputDir:output,
    label:'Billardtischprobe',seats:14,groups:3,revision,mobile:n===2,stubCinema:false,
    schoolStorageState:path.join(privateRoot,'qa/sso-'+(n===1?'A':'B')+'.private.json'),characterTextureId:'wvh-event-mira-v1',parking:[[112,272],[432,608]],
    onPhase:step=>mark('entry-'+n+'-'+step)});user.mobile=n===2;users.push(user);
   const mic=user.page.getByTestId('microphone-button');await mic.click();await user.page.waitForTimeout(200);await mic.click();
  }
  const [a,b]=users;mark('real-stool-and-shared-choice');await seat(a,'billard-west');await a.page.getByRole('button',{name:'Billard',exact:true}).click();a.panel=await panel(a);
  const round=await a.script.evaluate(()=>castleActivities.rounds.value.round);assert.equal(round.choice,'billiards');await seat(b,'billard-east');b.panel=await panel(b);
  assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);assert.equal(b.page.frames().filter(frame=>frame.url()===url).length,1);
  cases.push('real native sit buttons open a visible shared choice; later touch sitter automatically receives the same billiards panel');
  mark('actual-shared-stroke-and-stool-voice');await a.panel.locator('#seat-0').click();await b.panel.locator('#seat-1').tap();await agreeFresh();await wait(a.panel,()=>castleBilliards.canAct());
  const version=await a.panel.evaluate(()=>castleBilliards.state.board.state.version);await a.panel.locator('#shoot').click();for(const user of users)await wait(user.panel,v=>castleBilliards.state.board.state.version===v+1,version);
  const state=await a.panel.evaluate(()=>castleBilliards.state.board.state);assert.deepEqual(await b.panel.evaluate(()=>castleBilliards.state.board.state),state);
  assert.deepEqual(await a.panel.evaluate(()=>castleBilliards.renderer.animation.frames),await b.panel.evaluate(()=>castleBilliards.renderer.animation.frames));
  await wait(a.panel,()=>!castleBilliards.state.board.animation||castleBilliards.state.board.animation.endsAt<Date.now()+castleBilliards.renderer.clockOffset);await voice('opposite stools');
  for(const [i,user]of users.entries()){
   const pixels=await user.page.locator('canvas:visible').first().screenshot();assert.ok((await sharp(pixels).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
   assert.equal(await user.panel.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,(i?'mobile':'desktop')+'-stools.private.png')});
   if(published){const button=await seatButton(user,'Aufstehen'),box=await button.boundingBox();assert.ok(Math.abs(box.width-144)<1&&Math.abs(box.height-44)<1);}
  }
  cases.push('actual authoritative stroke is identical in both panels; both opposite stools decode genuine native voice; desktop and mobile canvases are nonblank');
  mark('creator-leaves-and-rejoins');await releaseGame(a);await closeSeat(a);assert.equal(b.page.frames().filter(frame=>frame.url()===url).length,1);assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);
  await seat(a,'billard-west');a.panel=await panel(a);assert.deepEqual(await a.script.evaluate(()=>castleActivities.rounds.value.round),round);
  assert.deepEqual(await a.panel.evaluate(()=>castleBilliards.state.board.state),state);cases.push('creator standing closes only the own panel; remaining player keeps round and positions; re-sitting follows that same shared choice');
  mark('window-spectator-and-shared-voice');await releaseGame(b);await closeSeat(b);await seat(b,'fenster-0');b.panel=await panel(b);
  assert.equal(await b.panel.evaluate(()=>castleBilliards.state.self.seat),null);assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);await voice('window spectator and stool');
  await b.page.screenshot({path:path.join(output,'window-spectator.private.png')});cases.push('the original window bench joins the same native conversation and automatically watches the continuing shared game');
  mark('separate-chess-conversation');await closeSeat(b);await seat(b,'buchclub-n0');await panel(b,origin+'/castle-chess/#table=tisch-2');
  async function isolated(label){
   await b.page.waitForTimeout(4000);const before=[await stats(a),await stats(b)];await b.page.waitForTimeout(4000);const after=[await stats(a),await stats(b)];
   const positions=[];for(const user of users)positions.push(await user.script.evaluate(()=>({seat:castleRoom.seat.id,position:WA.player.getPosition()})));
   const snapshot={label,before,after,positions};fs.writeFileSync(path.join(output,label+'.private.json'),JSON.stringify(snapshot,null,2)+'\n');
   assert.equal(after[0].rooms.some(name=>after[1].rooms.includes(name)),false);assert.ok(after.every((row,i)=>row.energy<=before[i].energy+0.000001));return snapshot;
  }
  const firstIsolation=await isolated('before-shared-chess');
  mark('both-at-original-chess-table');await closeSeat(a);await seat(a,'buchclub-n1');await panel(a,origin+'/castle-chess/#table=tisch-2');
  await voice('original chess conversation','area-buchclub');
  await closeSeat(a);await seat(a,'billard-west');await a.page.getByRole('button',{name:'Billard',exact:true}).click();a.panel=await panel(a);
  const secondIsolation=await isolated('after-shared-chess');const isolationBefore=secondIsolation.before,isolationAfter=secondIsolation.after;
  cases.push('original chess opens unchanged and both chess seats decode native voice; before and after joining together the separated groups have no common live connection and no received peer energy');
  mark('last-standing-clears-choice');await closeSeat(b);await releaseGame(a);await closeSeat(a);await seat(a,'billard-west');
  await a.page.getByRole('button',{name:'Billard',exact:true}).waitFor();assert.equal(a.page.frames().some(frame=>frame.url()===url),false);
  await a.page.getByRole('button',{name:'Bausteinraetsel',exact:true}).waitFor();assert.equal(await a.script.evaluate(()=>castleActivities.rounds.value.round),null);await closeSeat(a);
  cases.push('last standing ends the native activity choice; a new visit offers both original options and opens no old game silently');
  for(const user of users){
   await user.script.evaluate(async()=>{await WA.player.teleport(432,608);await castleRoom.syncPosition();});const before=await user.script.evaluate(()=>WA.player.getPosition());await user.page.bringToFront();
   await user.page.evaluate(()=>document.activeElement?.blur());await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(180);await user.page.keyboard.up('ArrowRight');assert.ok((await user.script.evaluate(()=>WA.player.getPosition())).x>before.x+2);
  }
  cases.push('both native avatars resume keyboard movement after all table panels close');
  errors.push(...users.flatMap(user=>user.errors));assert.deepEqual(errors,[]);
  const proof={passed:true,stageOnly:!published,normalMicrosoftPupils:2,syntheticApprovedAccountsOnly:true,networkResponsesSubstituted:false,schoolLookupOverridden:false,
   publishedCandidateFiles:fileHashes,wamSha256:sha(wamBytes),normalGameHallActivated:published,compactNativeSeatControlVerified:published,sharedNativeSitChoice:true,lateSitterAutomaticallyFollows:true,
   actualAuthoritativeStroke:true,nativeVoiceBetweenStools:true,nativeVoiceWithWindowSpectator:true,originalChessPreservedAndIsolated:true,
   creatorMayLeaveAndRejoin:true,lastStandingResetsChoice:true,mobileAndDesktop:true,nativeMovementResumes:true,cases,voices,firstIsolation,isolationBefore,isolationAfter,errors,oldCastleReplaced:false,fullCastleApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,output,stageOnly:!published,normalMicrosoftPupils:2,cases:cases.length,nativeVoiceWithWindowSpectator:true,normalGameHallActivated:published}));
 }catch(error){
  fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({phase,error:error.message,errors:users.flatMap(user=>user.errors)},null,2)+'\n');
  for(const [i,user]of users.entries())await user.page.screenshot({path:path.join(output,'failure-'+i+'.private.png')}).catch(()=>{});throw error;
 }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error('Billiards table probe stopped: '+error.name+': '+error.message);process.exitCode=1;});
