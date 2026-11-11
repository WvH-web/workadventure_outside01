'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com',web='https://wvh-web.github.io/workadventure_outside01/castle/';
const hosted=origin+'/castle-content/',candidate=process.argv.includes('--candidate'),staged=process.argv.includes('--stage');
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=path.join(privateRoot,'qa/museum-tour-'+(candidate?'candidate':staged?'staged':'published'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function main(){
 fs.mkdirSync(output,{recursive:true});writeAudio();const routed=[],users=[],media=[],portalResponses=[];let stage='entry';
 const map=JSON.parse(fs.readFileSync(path.join(root,'castle/museum.tmj'))),publishedMapSha256=sha(Buffer.from(JSON.stringify(map)+'\n'));
 const revision=map.properties.find(p=>p.name==='castleRevision').value;
 if(candidate){
  const response=await fetch(web+'museum.tmj');assert.ok(response.ok);const current=await response.json();
  const registered=current.properties.find(p=>p.name==='script').value;assert.match(registered,/^expansion\.bundle\.js\?v=[a-z0-9-]+&room=museum$/);
  // The existing WAM registers its existing entry; only this browser substitutes its bytes.
  // Actual publication must register the dedicated museum bundle and be probed without routing.
  map.properties.find(p=>p.name==='script').value=registered;
 }
 const bundle=fs.readFileSync(path.join(root,'castle/museum-tour.bundle.js'));
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
  '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function configureContext(context){
  context.on('response',response=>{const url=new URL(response.url());if(url.origin==='https://deutsche-online-schule.com'&&url.pathname==='/schooltools/verwaltung/api/workadventure_museum_open.php')portalResponses.push(response.status());});
  if(!candidate)return;
  await context.route(web+'**',route=>{
   const name=new URL(route.request().url()).pathname.slice(new URL(web).pathname.length);
   if(!['museum.tmj','expansion.bundle.js'].includes(name))return route.continue();
   routed.push(name);return route.fulfill({status:200,contentType:name.endsWith('.tmj')?'application/json':'text/javascript',
    headers:{'access-control-allow-origin':'*'},body:name.endsWith('.tmj')?JSON.stringify(map):bundle});
  });
  await context.route(hosted+'**',async route=>{
   const name=new URL(route.request().url()).pathname.slice('/castle-content/'.length);
   if(!['collection.html','collection.js','tour-state.js'].includes(name))return route.continue();
   const response=await route.fetch();assert.equal(response.headers()['x-frame-options'],'SAMEORIGIN');
   routed.push(name);return route.fulfill({response,status:200,contentType:name.endsWith('.html')?'text/html':'text/javascript',
    body:fs.readFileSync(path.join(root,'castle',name))});
  });
 }
 async function panel(user){
  for(let n=0;n<100;n++){
   const frame=user.page.frames().find(frame=>frame.url()===hosted+'collection.html?kind=museum&shared=table');
   if(frame){await frame.waitForFunction(()=>window.castleMuseumTour?.value?.active,{},{timeout:20000});await frame.locator('.exhibit').first().waitFor();return frame;}
   await user.page.waitForTimeout(250);
  }throw Error('Automatic shared museum panel missing');
 }
 async function selected(frame,board){
  await frame.waitForFunction(board=>{
   const viewer=document.getElementById('viewer'),src=viewer.getAttribute('src');
   return board?src&&new URL(src).searchParams.get('board')===board&&!viewer.hidden:!src&&viewer.hidden;
  },board,{timeout:20000});
  assert.equal(await frame.locator('#gallery').isVisible(),!board);
  if(board){
   let inner;for(let n=0;n<80&&!inner;n++){
    inner=frame.childFrames().find(child=>{try{const url=new URL(child.url());return url.origin==='https://deutsche-online-schule.com'&&url.pathname==='/schooltools/verwaltung/api/workadventure_museum_open.php'&&url.searchParams.get('board')===board;}catch{return false;}});
    if(!inner)await frame.page().waitForTimeout(200);
   }
   assert.ok(inner,'The actual canonical portal viewer must load inside the frame');await inner.locator('body').waitFor({state:'attached'});
   assert.ok(await inner.evaluate(()=>document.body.childElementCount>0));
  }
 }
 async function speech(label){
  const before=await Promise.all(users.map(stats)),until=Date.now()+25000;let after;
  do{await users[0].page.waitForTimeout(1000);after=await Promise.all(users.map(stats));
   if(after.every((row,i)=>row.energy>before[i].energy)&&after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room))){media.push({label,before,after});return;}
  }while(Date.now()<until);throw Error('Both real native table voices must decode');
 }
 async function stand(user){
  await user.script.evaluate(()=>castleRoom.stand());
  for(let n=0;n<60&&user.page.frames().some(frame=>frame.url().startsWith(hosted+'collection.html'));n++)await user.page.waitForTimeout(200);
  assert.equal(user.page.frames().some(frame=>frame.url().startsWith(hosted+'collection.html')),false);
 }
 try{
  const handoff=JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json')));assert.equal(handoff.contains_real_pupil_data,false);
  const sso=JSON.parse(fs.readFileSync(path.join(privateRoot,'qa/sso-result.json')));assert.ok(sso.passed);
  for(let number=1;number<=2;number++)users.push(await join(browser,number,{roomId:'museum',roomUrl:origin+'/~/castle-preview/'+(staged?'museumprobe':'museum')+'.wam#start',
   outputDir:output,label:'Ausstellungsprobe',seats:12,groups:3,revision,mobile:number===2,
   schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),characterTextureId:'wvh-event-mira-v1',
   parking:[[112,272],[432,608]],configureContext}));
  const [a,b]=users;for(const user of users){const microphone=user.page.getByTestId('microphone-button');await microphone.click();await user.page.waitForTimeout(150);await microphone.click();}
  stage='automatic-panel';await sit(a,'buchclub-n0');await sit(b,'buchclub-s1');
  let pa=await panel(a),pb=await panel(b);await speech('gallery');
  const boards=await pa.locator('.exhibit').evaluateAll(items=>items.map(item=>item.dataset.board));assert.ok(boards.length>=2);
  stage='shared-choice';await pa.locator('.exhibit[data-board="'+boards[0]+'"]').click();await selected(pa,boards[0]);await selected(pb,boards[0]);
  const original=await pb.locator('#viewer').getAttribute('src');
  await pb.getByRole('button',{name:'Aktualisieren',exact:true}).click();await b.page.waitForTimeout(2000);
  assert.equal(await pb.locator('#viewer').getAttribute('src'),original,'An unchanged catalog must not restart the contribution');
  await speech('selected-contribution');
  stage='chooser-leaves';await stand(a);await selected(pb,boards[0]);assert.equal(await pb.locator('#viewer').getAttribute('src'),original);
  stage='late-return';await sit(a,'buchclub-n0');pa=await panel(a);await selected(pa,boards[0]);await speech('late-return');
  stage='shared-back';await pb.getByRole('button',{name:'Zur Ausstellung',exact:true}).click();await selected(pa,null);await selected(pb,null);
  await pb.locator('.exhibit[data-board="'+boards[1]+'"]').click();await selected(pa,boards[1]);await selected(pb,boards[1]);
  for(const [index,user]of users.entries()){
   const frame=index?pb:pa;assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.equal(await frame.locator('#shared').isVisible(),true);
   const image=await user.page.locator('canvas:visible').first().screenshot();
   assert.ok((await sharp(image).stats()).channels.slice(0,3).every(channel=>channel.stdev>12));
   await user.page.screenshot({path:path.join(output,(index?'mobile':'desktop')+'.private.png')});
  }
  stage='empty-table-resets';const previousRound=await pa.evaluate(()=>castleMuseumTour.value.round);
  await stand(a);await stand(b);await sit(b,'buchclub-s1');pb=await panel(b);await selected(pb,null);
  assert.notEqual(await pb.evaluate(()=>castleMuseumTour.value.round),previousRound);
  await sit(a,'buchclub-n0');pa=await panel(a);await selected(pa,null);await speech('new-round');
  stage='departure-and-movement';for(const user of users){await stand(user);const before=await user.script.evaluate(()=>WA.player.getPosition());
   await user.page.bringToFront();await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(180);await user.page.keyboard.up('ArrowRight');
   assert.ok((await user.script.evaluate(()=>WA.player.getPosition())).x>before.x+2);}
  const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
  assert.ok(portalResponses.length>=2&&portalResponses.every(status=>status===200),'Real portal viewers must return HTTP 200');
  const proof={passed:true,browserVersion:browser.version(),normalMicrosoftPupils:2,realNativeWorkAdventure:true,
   onlySyntheticApprovedPupils:true,realPublicCatalogUnmodified:true,portalViewerReached:true,tableSpeechDecodedAtFourStages:true,
   automaticPanelOnSeating:true,bothDirectionsShareBoardAndGallery:true,chooserMayLeave:true,lateReturnSeesSelection:true,
   unchangedRefreshKeepsContent:true,emptyTableStartsNewRound:true,movementAfterStanding:true,desktopAndMobileCanvasNonblank:true,
   noHorizontalOverflow:true,onlyBoardIdentifiersShared:true,filmPositionAndScrollSynchronized:false,mediaPlaybackNotAsserted:true,
   candidateStaticSourcesOnlyInsideTestBrowsers:candidate,isolatedStageMap:staged,networkResponsesSubstituted:candidate,publishedMapsChanged:false,
   mapSha256:sha(Buffer.from(JSON.stringify(map)+'\n')),publishedMapSha256,scriptSha256:sha(bundle),routed:[...new Set(routed)].sort(),media,errors,loadApprovalFor400:false};
  if(candidate)assert.deepEqual(proof.routed,['collection.html','collection.js','expansion.bundle.js','museum.tmj','tour-state.js']);else assert.deepEqual(proof.routed,[]);
  fs.writeFileSync(path.join(output,'result.private.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,media:undefined}));
 }catch(error){
  const loaders=[];for(const user of users)loaders.push(await user.script.evaluate(async()=>({
   scripts:[...document.scripts].map(script=>script.src),resources:performance.getEntriesByType('resource').map(entry=>{try{const url=new URL(entry.name);return url.origin+url.pathname;}catch{return 'unknown';}}),
   activities:(await WA.room.getTiledMap()).layers.flatMap(layer=>layer.objects||[]).filter(object=>object.properties?.some(p=>p.name==='castleActivityUrl')).map(object=>object.properties.filter(p=>['castleActivityId','castleActivityUrl'].includes(p.name))),
  })).catch(()=>null));
  fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,message:error.message,
   routed,loaders,serviceWorkers:browser.contexts().flatMap(context=>context.serviceWorkers().map(worker=>worker.url())),
   errors:users.flatMap(user=>user.errors),diagnostics:users.flatMap(user=>user.diagnostics)},null,2)+'\n');
  let index=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(index++)+'.private.png')}).catch(()=>{});
  console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
 }finally{for(const user of users)await user.script.evaluate(()=>castleRoom.stand()).catch(()=>{});await browser.close();}
}
main().catch(error=>{console.error('Museum tour probe stopped: '+error.name);process.exitCode=1;});
