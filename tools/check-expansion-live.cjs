const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {rooms,revision}=require('./build-castle-expansion.cjs');
const out=path.resolve(__dirname,'../../output/castle-expansion-live-qa');fs.mkdirSync(out,{recursive:true});
const base='https://together.deine-schule.com/~/castle-preview/',web='https://wvh-web.github.io/workadventure_outside01/castle/';
async function findRoom(user,id){
  let frame;for(let n=0;n<240&&!frame;n++){
    for(const f of user.page.frames())if(await f.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))frame=f;
    if(!frame)await user.page.waitForTimeout(500);
  }
  assert.ok(frame,'Room script '+id);user.script=frame;
  const expected=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../castle',id+'.tmj'))).properties.find(p=>p.name==='castleRevision')?.value;
  await frame.waitForFunction(revision=>window.castleRoom?.layout&&WA.room.getTiledMap().then(m=>m.properties.find(p=>p.name==='castleRevision')?.value===revision),expected,{polling:200,timeout:30000});
}
async function travel(user,id){
  await user.script.evaluate(()=>castleRoom.stand());const started=Date.now();
  await user.script.evaluate(url=>WA.nav.goToRoom(url),base+id+'.wam#start').catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e;});
  await findRoom(user,id);
  console.log(JSON.stringify({id,phase:'transition',milliseconds:Date.now()-started}));
}
async function audio(users){
  await users[0].page.waitForTimeout(2500);const before=await Promise.all(users.map(stats));
  await users[0].page.waitForTimeout(4000);const after=await Promise.all(users.map(stats));
  assert.ok(after.every((s,i)=>s.energy>before[i].energy),'Every participant decodes speech');return {before,after};
}
async function openActivity(user,pathname){
  await user.script.waitForFunction(()=>Boolean(window.castleActivities),undefined,{polling:200,timeout:30000});
  await user.script.evaluate(()=>castleActivities.open());let frame;
  for(let n=0;n<100&&!frame;n++){
    frame=user.page.frames().find(f=>f.url().startsWith(pathname==='collection.html'?'https://together.deine-schule.com/castle-content/collection.html':web+pathname));if(!frame)await user.page.waitForTimeout(500);
  }
  assert.ok(frame,'Activity '+pathname);return frame;
}
async function verifyStory(users){
  const [a,b,c]=users,fa=await openActivity(a,'story.html'),fb=await openActivity(b,'story.html');
  for(const f of [fa,fb])await f.waitForFunction(()=>window.castleStory&&!document.getElementById('roll').disabled,undefined,{polling:200,timeout:40000});
  const previous=await fa.locator('body').getAttribute('data-round');await fa.getByRole('button',{name:'Neue Karten',exact:true}).click();
  await fa.waitForFunction(old=>document.body.dataset.round&&document.body.dataset.round!==old,previous,{polling:200});
  const round=await fa.locator('body').getAttribute('data-round');await fb.waitForFunction(round=>document.body.dataset.round===round,round,{polling:200});
  await move(c,80,496);const fc=await openActivity(c,'story.html');
  await fc.waitForFunction(round=>document.body.dataset.round===round,round,{polling:200,timeout:30000});
  await a.script.evaluate(()=>castleActivities.website.close());await a.page.waitForTimeout(600);await openActivity(a,'story.html');
  assert.equal(a.page.frames().filter(f=>f.url().startsWith(web+'story.html')).length,1);
  return {bothClientsShareRound:true,lateJoiner:true,reopenNoDuplicate:true};
}
async function checkGallery(user,id){
  await sit(user,'buchclub-n1');const frame=await openActivity(user,'collection.html');
  await frame.locator('.exhibit').first().waitFor({timeout:30000});
  await frame.waitForFunction(()=>{const image=document.querySelector('.exhibit img');return image?.complete&&image.naturalWidth>0;},undefined,{polling:200,timeout:30000});
  assert.equal(await frame.locator('h1').textContent(),id==='museum'?'Schlossmuseum':'Band und Chor');
  await user.page.screenshot({path:path.join(out,id+'-collection.png')});
  const response=user.page.waitForResponse(r=>r.url().startsWith('https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum_open.php?board='),{timeout:30000});
  await frame.locator('.exhibit').first().click();assert.equal((await response).status(),200);
  let viewer;
  for(let n=0;n<60&&!viewer;n++){
    viewer=frame.childFrames().find(f=>f.url().startsWith('https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum_open.php?board='));
    if(!viewer)await user.page.waitForTimeout(500);
  }
  assert.ok(viewer,'The real portal document is not rejected by frame-ancestors');
  assert.equal(await viewer.evaluate(()=>location.origin),'https://deutsche-online-schule.com');
  await frame.getByRole('button',{name:'Zur Ausstellung',exact:true}).click();
  assert.equal(await frame.locator('#viewer').getAttribute('src'),null);
  await user.script.evaluate(()=>castleActivities.website.close());
}
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results=[];let users=[];
  try{
    for(let i=1;i<=4;i++)users.push(await join(browser,i,{roomId:'museum',roomUrl:base+'museum.wam#start',outputDir:out,label:'Schlossprobe',seats:12,groups:3,revision,
      characterTextureId:['wvh-event-mira-v1','wvh-event-amir-v1','wvh-event-otto-v1','wvh-event-val-v1'][i-1],
      parking:[[112,272],[592,352],[720,288],[432,608]]}));
    const [a,b,c,d]=users;
    for(const id of ['museum','musikzimmer','oberstufe','spielesaal','atelier','sternwarte','erdgeschoss','obergeschoss']){
      const hub=id==='erdgeschoss'||id==='obergeschoss';
      if(id!=='museum')for(const [i,u]of users.entries()){
        await travel(u,id);await move(u,...(hub?[[112,272],[592,352],[720,288],[624,608]][i]:[[112,272],[592,352],[720,288],[432,608]][i]));
      }
      const label=hub?'Grosse Halle':['oberstufe','sternwarte'].includes(id)?'Obere Galerie':'Wandelgang';
      assert.equal(await a.script.evaluate(()=>castleRoom.layout.returnLabel),label);
      await a.page.getByRole('button',{name:label,exact:true}).waitFor();
      await sit(a,'lese-kamin-sofa-links');await sit(b,'lese-kamin-sessel-west');await move(c,80,hub?528:496);await sit(d,'lese-kamin-sessel-ost');
      const together=await audio(users);assert.ok(together.after.every(s=>s.rooms.some(r=>r.endsWith('area-lesekamin')&&together.after[0].rooms.includes(r))));
      const story=hub?null:await verifyStory(users);
      await sit(c,'buchclub-n0');await sit(d,'buchclub-s1');const separated=await audio(users);
      assert.ok(!separated.after[0].rooms.some(r=>separated.after[2].rooms.includes(r)),'Different conversations stay separate');
      let window=null;
      if(!hub){
        await sit(a,'fenster-0');await sit(b,'fenster-1');window=await audio(users);
        assert.ok(window.after.slice(0,2).every(s=>s.rooms.some(r=>r.endsWith('area-fensterleser'))));
        assert.ok(!window.after[0].rooms.some(r=>window.after[2].rooms.includes(r)));
      }
      console.log(JSON.stringify({id,phase:'audio and shared story',passed:true}));
      if(id==='museum'){
        await a.script.waitForFunction(()=>window.castleDisplays?.websites.size===5,undefined,{polling:200,timeout:30000});
        let pictures=[];for(let n=0;n<50;n++){
          pictures=a.page.frames().filter(f=>f.url().startsWith(web+'display.html'));
          if(pictures.length===5&&(await Promise.all(pictures.map(f=>f.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0).catch(()=>false)))).every(Boolean))break;
          await a.page.waitForTimeout(500);
        }
        assert.equal(pictures.length,5);assert.ok((await Promise.all(pictures.map(f=>f.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0)))).every(Boolean));
      }
      if(id==='museum'||id==='musikzimmer')await checkGallery(a,id);
      const seatIds=await a.script.evaluate(()=>castleRoom.layout.seats.map(s=>s.id));
      await move(b,hub?592:384,608);await move(c,hub?720:512,304);await move(d,hub?800:800,352);
      for(const seatId of seatIds){await sit(a,seatId);assert.equal(await a.script.evaluate(()=>castleRoom.seat?.id),seatId);}
      await a.page.screenshot({path:path.join(out,id+'-seated.png')});
      const image=path.join(out,id+'-canvas.png');await a.page.locator('canvas:visible').first().screenshot({path:image});assert.ok((await sharp(image).stats()).channels.slice(0,3).every(c=>c.stdev>12));
      await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(700);await a.page.screenshot({path:path.join(out,id+'-mobile.png')});
      await a.page.setViewportSize({width:1440,height:1000});
      results.push({id,groups:hub?2:3,participants:4,standingIncluded:true,parallelGroupsIsolated:true,allSeats:seatIds.length,story,images:id==='museum'?5:undefined,together,separated,window});
      fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({revision,results,complete:false},null,2)+'\n');
      console.log(JSON.stringify({id,participants:4,groups:hub?2:3,allSeats:seatIds.length,story:!!story,passed:true}));
    }
    await a.script.evaluate(()=>castleRoom.returnToHall()).catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e;});
    await findRoom(a,'grosse-halle');
    await a.script.evaluate(()=>WA.player.teleport(1136,928)).catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e;});
    await findRoom(a,'erdgeschoss');
    assert.ok(!a.page.frames().some(f=>f.url().startsWith(web+'display.html')),'Exhibit iframes do not leak across maps');
    const errors=users.flatMap(u=>u.errors);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({revision,results,errors,noRealSchoolAccountsOrMicrophonesUsed:true,newHallDoorWorks:true,noOrphanDisplayFrames:true},null,2)+'\n');
    console.log(JSON.stringify({maps:results.length,participants:4,seats:results.reduce((n,r)=>n+r.allSeats,0),passed:true,errors}));
  }catch(error){
    let n=0;for(const context of browser.contexts())for(const page of context.pages()){
      n++;await page.screenshot({path:path.join(out,'failure-'+n+'.png')}).catch(()=>{});
      fs.writeFileSync(path.join(out,'failure-'+n+'.txt'),await page.locator('body').innerText().catch(()=>''));
      const states=[];
      for(const frame of page.frames())states.push(await frame.evaluate(()=>({controller:window.castleRoom?.layout.id,seated:window.castleRoom?.seat?.id,
        path:location.pathname})).catch(e=>({error:e.message})));
      const diagnostics=users[n-1]?.diagnostics?.map(d=>({...d,message:d.message?.replace(/([?&](?:access_token|token|authToken)=)[^\s'"&]+/g,'$1[redacted]').replace(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,'[redacted]')}));
      fs.writeFileSync(path.join(out,'failure-'+n+'-state.json'),JSON.stringify({states,errors:users[n-1]?.errors,diagnostics},null,2)+'\n');
    }
    throw error;
  }finally{await browser.close();}
}
module.exports={findRoom,travel,audio,openActivity};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
