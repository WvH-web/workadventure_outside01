const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const out=path.resolve(__dirname,'../../output/primary-live-qa');fs.mkdirSync(out,{recursive:true});
const base='https://together.deine-schule.com/~/castle-preview/';
const options={roomId:'grundschule',roomUrl:base+'grundschule.wam#start',outputDir:out,label:'Grundschulprobe',seats:12,groups:3,revision:'20261108-gs2',parking:[[112,272],[592,352],[720,288],[432,560]]};
const storyUrl='https://wvh-web.github.io/workadventure_outside01/castle/story.html';
async function findRoom(user,id){
  let frame;
  for(let n=0;n<100&&!frame;n++){
    for(const f of user.page.frames())if(await f.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))frame=f;
    if(!frame)await user.page.waitForTimeout(500);
  }
  assert.ok(frame,'Native room '+id);user.script=frame;return frame;
}
async function openStory(user){
  await user.script.waitForFunction(()=>Boolean(window.castleActivities),undefined,{polling:200,timeout:30000});
  await user.script.evaluate(()=>castleActivities.open());
  let frame;
  for(let n=0;n<80&&!frame;n++){
    frame=user.page.frames().find(f=>f.url()===storyUrl);if(!frame)await user.page.waitForTimeout(500);
  }
  assert.ok(frame,'Story side panel');
  await frame.waitForFunction(()=>window.castleStory&&!document.getElementById('roll').disabled,undefined,{polling:200,timeout:45000});
  return frame;
}
async function round(frame){return frame.locator('body').getAttribute('data-round')}
async function rollStory(frame){
  const previous=await round(frame);await frame.getByRole('button',{name:'Neue Karten',exact:true}).click();
  await frame.waitForFunction(old=>document.body.dataset.round&&document.body.dataset.round!==old,previous,{polling:100,timeout:15000});
  return round(frame);
}
async function expectRound(frame,id){await frame.waitForFunction(id=>document.body.dataset.round===id,id,{polling:200,timeout:15000})}
async function audio(users){
  await users[0].page.waitForTimeout(3000);const before=await Promise.all(users.map(stats));
  await users[0].page.waitForTimeout(4500);const after=await Promise.all(users.map(stats));
  assert.ok(after.every((s,i)=>s.energy>before[i].energy),'Every group participant decodes audio');return {before,after};
}
async function travel(user,action,id){
  await user.script.evaluate(action).catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e});
  return findRoom(user,id);
}
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const users=[];for(let i=1;i<=4;i++)users.push(await join(browser,i,options));const [a,b,c,d]=users;
    await sit(a,'lese-kamin-sofa-links');await sit(b,'lese-kamin-sessel-west');await move(c,80,496);await sit(d,'lese-kamin-sessel-ost');
    const circle=await audio(users);assert.ok(circle.after.every(s=>s.rooms.some(r=>r.endsWith('area-lesekamin')&&circle.after[0].rooms.includes(r))));
    console.log('Four readers including standing participant hear one another.');
    await a.page.screenshot({path:path.join(out,'reading-group.png')});
    await sit(c,'buchclub-n0');await sit(d,'buchclub-s1');const groups=await audio(users);
    assert.ok(!groups.after[0].rooms.some(r=>groups.after[2].rooms.includes(r)));
    await sit(a,'fenster-0');await move(b,704,304);const music=await audio(users);
    assert.ok(music.after.slice(0,2).every(s=>s.rooms.some(r=>r.endsWith('area-fensterleser'))));
    assert.ok(!music.after[0].rooms.some(r=>music.after[2].rooms.includes(r)));
    console.log('Separate building/music conversations passed.');
    await sit(a,'lese-kamin-sofa-links');await sit(b,'lese-kamin-sessel-west');
    await a.context.route('https://example.org/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Owned-window test</title><h1>Separate window</h1>'}));
    const sentinel=await a.script.evaluate(async()=>{const w=await WA.nav.openCoWebSite('https://example.org/',false);window.__qaOther=w;return w.id});
    const fa=await openStory(a),fb=await openStory(b);const first=await rollStory(fa);assert.ok(first);await expectRound(fb,first);
    const second=await rollStory(fb);assert.notEqual(second,first);await expectRound(fa,second);
    await move(c,80,496);const fc=await openStory(c);await expectRound(fc,second);
    assert.deepEqual(await fa.locator('.story-card').evaluateAll(es=>es.map(e=>e.dataset.card)),await fb.locator('.story-card').evaluateAll(es=>es.map(e=>e.dataset.card)));
    await a.page.screenshot({path:path.join(out,'shared-story.png')});console.log('Shared story updates in both directions and includes a late joiner.');
    await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(1200);
    assert.ok(!a.page.frames().some(f=>f.url()===storyUrl));const reopened=await openStory(a);await expectRound(reopened,second);
    await move(a,448,560);assert.ok(!a.page.frames().some(f=>f.url()===storyUrl));
    assert.ok(await a.script.evaluate(async id=>(await WA.nav.getCoWebSites()).some(w=>w.id===id),sentinel),'Leaving activity must not close another website');
    await a.script.evaluate(()=>window.__qaOther.close());await expectRound(fb,second);
    await travel(a,()=>WA.nav.goToRoom('https://together.deine-schule.com/~/castle-preview/mittelstufe.wam#vom-flur'),'mittelstufe');
    const msSeat=await a.script.evaluate(()=>castleRoom.layout.seats.find(s=>s.audioGroup==='kaminrunde').id);await sit(a,msSeat);
    const fm=await openStory(a);assert.notEqual(await round(fm),second);
    const msRound=await rollStory(fm);assert.ok(msRound);assert.notEqual(msRound,second);await expectRound(fb,second);
    await travel(a,()=>WA.nav.goToRoom('https://together.deine-schule.com/~/castle-preview/grundschule.wam#halle'),'grundschule');
    await sit(a,'lese-kamin-sofa-links');const returned=await openStory(a);await expectRound(returned,second);
    assert.equal(a.page.frames().filter(f=>f.url()===storyUrl).length,1,'Room changes must not leak an old story iframe');
    console.log('Middle-school activity works and its story remains separate from primary school.');
    await move(b,384,560);await move(c,512,304);await move(d,800,352);
    const ids=await a.script.evaluate(()=>castleRoom.layout.seats.map(s=>s.id));
    for(const id of ids){await sit(a,id);assert.equal(await a.script.evaluate(()=>castleRoom.seat?.id),id);await a.page.screenshot({path:path.join(out,'seat-'+id+'.png')})}
    await move(a,448,272);const desktop=path.join(out,'canvas-desktop.png');await a.page.locator('canvas:visible').first().screenshot({path:desktop});
    assert.ok((await sharp(desktop).stats()).channels.slice(0,3).every(c=>c.stdev>12));
    await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(1500);const mobile=path.join(out,'canvas-mobile.png');
    await a.page.locator('canvas:visible').first().screenshot({path:mobile});assert.ok((await sharp(mobile).stats()).channels.slice(0,3).every(c=>c.stdev>12));
    await a.page.screenshot({path:path.join(out,'mobile.png')});await a.page.setViewportSize({width:1440,height:1000});
    await travel(a,()=>castleRoom.returnToHall(),'grosse-halle');
    const arrival=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(Math.abs(arrival.x-144)<20&&Math.abs(arrival.y-784)<20);
    await travel(a,()=>WA.player.teleport(144,928),'grundschule');
    const proof={revision:options.revision,participants:4,realSchoolAccountsOrMicrophonesUsed:false,threeNativeGroupsVerified:true,standingReadersIncluded:true,
      sharedStoryBothDirections:true,lateJoinerReceivesCurrentCards:true,manualCloseAndReopen:true,onlyOwnedWebsiteClosed:true,middleSchoolStoryIsolated:true,
      noOrphanStoryFrames:true,allSeatsVerified:ids.length,canvasNonblank:{desktop:true,mobile:true},bidirectionalHallLink:true,circle,groups,music,errors:users.flatMap(u=>u.errors)};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2)+'\n');assert.deepEqual(proof.errors,[]);
    console.log(JSON.stringify({participants:4,groups:3,sharedStoryLive:true,middleSchoolStoryIsolated:true,allSeats:ids.length,bidirectionalHallLink:true,errors:proof.errors},null,2));
  }catch(e){
    let i=0;for(const context of browser.contexts())for(const page of context.pages()){
      i++;await page.screenshot({path:path.join(out,'failure-'+i+'.png')}).catch(()=>{});
      fs.writeFileSync(path.join(out,'failure-'+i+'.txt'),await page.locator('body').innerText().catch(()=>''));
      for(const frame of page.frames().filter(f=>f.url().startsWith(storyUrl)))fs.writeFileSync(path.join(out,'failure-story-'+i+'.txt'),await frame.locator('body').innerText().catch(()=>''));
    }throw e;
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
