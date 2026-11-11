'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./prepare-castle-puzzle.cjs');
const root=path.resolve(__dirname,'..'),web='https://wvh-web.github.io/workadventure_outside01/castle/',origin='https://together.deine-schule.com';
const output=storage.outputPath('star-machine-native/'+new Date().toISOString().replace(/[:.]/g,'-'));
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const bounded=async(promise,ms,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' deadline')),ms);})]);}finally{clearTimeout(timer);}};
async function main(){
 let browser,phase='source-check';const users=[],requests=[],audio=[],cases=[];
 const progress=()=>{fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify({phase,at:new Date().toISOString()},null,2)+'\n');console.log('Puzzle probe: '+phase);};
 progress();
 assert.ok(process.argv.includes('--stage'),'Use --stage after installing the isolated protected sternprobe.wam; no browser-response substitution is accepted');
 const sourceResponse=await fetch(web+'sternwarte.tmj',{signal:AbortSignal.timeout(15000)});assert.equal(sourceResponse.status,200);
 const publishedRaw=Buffer.from(await sourceResponse.arrayBuffer()),source=JSON.parse(publishedRaw);
 assert.deepEqual(source,JSON.parse(fs.readFileSync(path.join(root,'castle/sternwarte.tmj'))),'Start from the actual published observatory');
 const map=JSON.parse(fs.readFileSync(path.join(root,'castle/sternwarte-puzzle-preview.tmj')));
 assert.equal(map.properties.find(p=>p.name==='castleRevision').value,revision);
 assert.equal(map.properties.find(p=>p.name==='script').value,'puzzle-preview.bundle.js?v='+revision+'-20261109-rounds1&room=sternwarte');
 const bundle=fs.readFileSync(path.join(root,'castle/puzzle-preview.bundle.js'));
 const files=['sternwarte-puzzle-preview.tmj','puzzle-preview.bundle.js','puzzle-preview.bundle.manifest.json','puzzle.html','puzzle.css','puzzle.js','puzzle-state.js','art/sternmaschine-20261111/machine.webp'],fileHashes={};
 for(const name of files){const expected=fs.readFileSync(path.join(root,'castle',name)),response=await fetch(web+name,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,'Publish the additional candidate asset before probing: '+name);fileHashes[name]=sha(expected);assert.equal(sha(Buffer.from(await response.arrayBuffer())),fileHashes[name]);}
 const roomUrl=origin+'/~/castle-preview/sternprobe.wam#start',wamUrl=origin+'/map-storage/castle-preview/sternprobe.wam';
 const wamResponse=await fetch(wamUrl,{signal:AbortSignal.timeout(15000)});assert.equal(wamResponse.status,200,'The isolated stage must exist');const wam=await wamResponse.json();
 const stageMap=new URL(wam.mapUrl);assert.equal(stageMap.origin+stageMap.pathname,web+'sternwarte-puzzle-preview.tmj');
 const meetingNames=wam.areas.flatMap(area=>area.properties.filter(prop=>prop.type==='livekitRoomProperty').map(prop=>prop.roomName));
 assert.equal(meetingNames.length,3);assert.ok(meetingNames.every(name=>name.startsWith('school-castle-stars-qa-')),'Stage conversations must be separate from the existing observatory');
 const admission=await fetch(origin+'/map?playUri='+encodeURIComponent(roomUrl.split('#')[0]),{signal:AbortSignal.timeout(15000)});assert.equal(admission.status,200);
 const info=await admission.json();assert.equal(info.wamUrl,wamUrl);assert.equal(info.authenticationMandatory,true);
 const handoff=JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json')));assert.equal(handoff.contains_real_pupil_data,false);
 const sso=JSON.parse(fs.readFileSync(path.join(privateRoot,'qa/sso-result.json')));assert.equal(sso.passed,true);
 try{
  writeAudio();phase='browser-launch';progress();
  browser=await chromium.launch({channel:'chrome',headless:true,timeout:45000,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
   '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function configureContext(context){
   context.on('request',request=>{const url=new URL(request.url());if(url.origin===new URL(web).origin&&url.pathname.startsWith(new URL(web).pathname))requests.push({path:url.pathname,type:request.resourceType(),authorizationPresent:request.headers().authorization!==undefined});});
  }
  for(let number=1;number<=2;number++){
   phase='entry-'+number;progress();users.push(await bounded(join(browser,number,{roomId:'sternwarte',roomUrl,
    outputDir:output,label:'Sternenprobe',seats:12,groups:3,revision,mobile:number===2,schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),
    characterTextureId:'wvh-event-mira-v1',parking:[[112,272],[432,608]],configureContext,
    onPhase:step=>{phase='entry-'+number+'-'+step;progress();}}),115000,'Native entry '+number));
  }
  const [a,b]=users;
  const wait=(frame,fn,arg)=>frame.waitForFunction(fn,arg,{polling:200,timeout:20000});
  async function panel(user){
   for(let n=0;n<100;n++){
    const frame=user.page.frames().find(f=>f.url()===web+'puzzle.html');
    if(frame){await wait(frame,()=>window.castleStarMachine?.value?.active&&!castleStarMachine.writing);return frame;}
    await user.page.waitForTimeout(200);
   }throw Error('Shared puzzle panel missing');
  }
  async function values(frame,expected){await wait(frame,expected=>JSON.stringify(window.castleStarMachine?.value?.values)===JSON.stringify(expected)&&!castleStarMachine.value.waiting,expected);}
  async function speech(label){
   const before=[];for(const u of users)before.push(await stats(u));const until=Date.now()+25000;let after;
   do{
    await a.page.waitForTimeout(1000);after=[];for(const u of users)after.push(await stats(u));
    if(after.every((row,i)=>row.energy>before[i].energy)&&after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room))){audio.push({label,before,after});return;}
   }while(Date.now()<until);throw Error('Both actual native table voices must decode');
  }
  async function stand(user){
   await user.script.evaluate(()=>castleRoom.stand());await wait(user.script,()=>!castleActivities.rounds.value&&!castleActivities.website);
   for(let n=0;n<60&&user.page.frames().some(frame=>frame.url()===web+'puzzle.html');n++)await user.page.waitForTimeout(100);
   assert.equal(user.page.frames().some(frame=>frame.url()===web+'puzzle.html'),false);
  }
  for(const user of users){const mic=user.page.getByTestId('microphone-button');await mic.click();await user.page.waitForTimeout(150);await mic.click();}
  phase='visible-shared-choice';progress();await sit(a,'buchclub-n0');await a.page.getByRole('button',{name:'Sternenmaschine',exact:true}).click();let pa=await panel(a);
  await values(pa,[0,0,0]);const round=await pa.evaluate(()=>castleStarMachine.value.round);
  await sit(b,'buchclub-s1');let pb=await panel(b);await values(pb,[0,0,0]);
  await wait(pa,()=>castleStarMachine.value.participants===2);assert.equal(await pb.evaluate(()=>castleStarMachine.value.round),round);
  const hintsA=await pa.evaluate(()=>castleStarMachine.value.hints),hintsB=await pb.evaluate(()=>castleStarMachine.value.hints);
  assert.deepEqual([...hintsA,...hintsB].sort(),[0,1,2]);await speech('automatic-puzzle');cases.push('visible group choice; automatic late-join panel; complementary clues; native voice');
  phase='cooperative-rings';progress();
  await pa.getByRole('radiogroup',{name:'Innen',exact:true}).getByRole('radio',{name:'Mond',exact:true}).click();await values(pa,[1,0,0]);await values(pb,[1,0,0]);
  await pb.getByRole('radiogroup',{name:'Au\u00dfen',exact:true}).getByRole('radio',{name:'Welle',exact:true}).tap();await values(pa,[1,0,4]);await values(pb,[1,0,4]);
  await pa.getByRole('radiogroup',{name:'Mitte',exact:true}).getByRole('radio',{name:'Stern',exact:true}).click();await wait(pa,()=>castleStarMachine.value.solved);await wait(pb,()=>castleStarMachine.value.solved);
  cases.push('actual two-way edits and solved state');
  phase='next-puzzle-and-return';progress();await pb.getByRole('button',{name:'Weiter',exact:true}).tap();await wait(pa,()=>castleStarMachine.value.index===1);await wait(pb,()=>castleStarMachine.value.index===1);
  await pa.getByRole('radiogroup',{name:'Innen',exact:true}).getByRole('radio',{name:'Stern',exact:true}).click();await values(pb,[2,0,0]);
  await stand(a);await values(pb,[2,0,0]);await sit(a,'buchclub-n0');pa=await panel(a);await values(pa,[2,0,0]);assert.equal(await pa.evaluate(()=>castleStarMachine.value.round),round);await speech('late-return');
  cases.push('next puzzle shared; chooser may stand; late return keeps puzzle');
  phase='manual-close-and-reopen';progress();
  await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(1200);assert.equal(a.page.frames().some(f=>f.url()===web+'puzzle.html'),false);
  await a.script.evaluate(()=>castleActivities.open());pa=await panel(a);await values(pa,[2,0,0]);
  cases.push('manual side-panel close respected; reopening keeps seated state');
  phase='all-three-puzzles-and-concurrent-rings';progress();
  await pb.getByRole('radiogroup',{name:'Mitte',exact:true}).getByRole('radio',{name:'Blatt',exact:true}).tap();await values(pa,[2,3,0]);
  await pa.getByRole('radiogroup',{name:'Au\u00dfen',exact:true}).getByRole('radio',{name:'Flamme',exact:true}).click();await wait(pa,()=>castleStarMachine.value.solved);await wait(pb,()=>castleStarMachine.value.solved);
  await pa.getByRole('button',{name:'Weiter',exact:true}).click();await wait(pa,()=>castleStarMachine.value.index===2);await wait(pb,()=>castleStarMachine.value.index===2);
  await Promise.all([
   pa.getByRole('radiogroup',{name:'Innen',exact:true}).getByRole('radio',{name:'Welle',exact:true}).click(),
   pb.getByRole('radiogroup',{name:'Au\u00dfen',exact:true}).getByRole('radio',{name:'Blatt',exact:true}).tap()
  ]);await values(pa,[4,0,3]);await values(pb,[4,0,3]);
  await pb.getByRole('radiogroup',{name:'Mitte',exact:true}).getByRole('radio',{name:'Mond',exact:true}).tap();await wait(pa,()=>castleStarMachine.value.solved);await wait(pb,()=>castleStarMachine.value.solved);
  for(const frame of [pa,pb]){assert.equal(await frame.locator('#next').isVisible(),false);assert.equal(await frame.locator('#status').innerText(),'Alle drei Himmelsbilder sind gel\u00f6st.');}
  await speech('completed-puzzles');cases.push('all three puzzles solved in both actual clients; concurrent distinct ring edits preserved');
  phase='confirmed-shared-reset';progress();await pb.getByRole('button',{name:'Runde zuruecksetzen',exact:true}).tap();await pb.getByRole('button',{name:'Zur\u00fccksetzen',exact:true}).tap();
  await values(pa,[0,0,0]);await values(pb,[0,0,0]);await wait(pa,()=>castleStarMachine.value.index===0);cases.push('confirmed reset reaches both participants');
  phase='screens-and-movement';progress();
  for(const [index,user] of users.entries()){
   const frame=index?pb:pa;assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.ok(await frame.locator('#machine img').first().evaluate(image=>image.complete&&image.naturalWidth>0));
   assert.ok((await sharp(await user.page.locator('canvas:visible').first().screenshot()).stats()).channels.slice(0,3).every(c=>c.stdev>12));
   await user.page.screenshot({path:path.join(output,(index?'mobile':'desktop')+'.private.png')});
  }
  await stand(a);await stand(b);await sit(a,'buchclub-n0');await a.page.getByRole('button',{name:'Sternenmaschine',exact:true}).click();pa=await panel(a);
  assert.notEqual(await pa.evaluate(()=>castleStarMachine.value.round),round);await values(pa,[0,0,0]);
  for(const user of users){await stand(user);const before=await user.script.evaluate(()=>WA.player.getPosition());await user.page.bringToFront();await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(180);await user.page.keyboard.up('ArrowRight');
   assert.ok((await user.script.evaluate(()=>WA.player.getPosition())).x>before.x+2);}
  cases.push('empty table creates a new round; both native canvases nonblank; no mobile overflow; movement after standing');
  const current=await fetch(web+'sternwarte.tmj',{signal:AbortSignal.timeout(15000)});assert.equal(sha(Buffer.from(await current.arrayBuffer())),sha(publishedRaw));
  assert.ok(requests.every(request=>!request.authorizationPresent));const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
  const proof={passed:true,cases,normalMicrosoftPupils:2,syntheticApprovedAccountsOnly:true,desktopAndTouchMobile:true,nativeAudioMeasurements:audio,
   allThreePuzzlesSolvedInBothClients:true,concurrentDistinctRingsPreserved:true,
   isolatedProtectedStage:true,networkResponsesSubstituted:false,authorizationResponsesSubstituted:false,publishedOriginalMapsChanged:false,publishedOriginalMapSha256:sha(publishedRaw),candidateBundleSha256:sha(bundle),
   fileHashes,requests,errors,loadApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,nativeAudioMeasurements:audio.length,output}));
 }catch(error){
  const controllers=[];for(const user of users)controllers.push(await user.script.evaluate(()=>({scripts:[...document.scripts].map(script=>script.src),
   activities:window.castleActivities?.areas?.map(area=>area.settings),table:window.castleActivities?.rounds?.value,
   resources:performance.getEntriesByType('resource').map(resource=>{const url=new URL(resource.name);return url.origin+url.pathname;})})).catch(()=>null));
  fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({passed:false,phase,message:error.message,type:error.name,
   controllers,requests,workers:browser?.contexts().flatMap(context=>context.serviceWorkers().map(worker=>worker.url())),diagnostics:users.map(u=>u.diagnostics),errors:users.flatMap(u=>u.errors)},null,2)+'\n');
  if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+i+'.private.png')}).catch(()=>{});
  throw error;
 }finally{
  if(browser){for(const user of users)await user.script.evaluate(()=>castleRoom.stand()).catch(()=>{});await bounded(browser.close(),20000,'Browser shutdown');}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
