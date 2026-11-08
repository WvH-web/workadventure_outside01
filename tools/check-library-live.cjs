const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const out=path.resolve(__dirname,'../../output/library-live-qa');fs.mkdirSync(out,{recursive:true});
const options={roomId:'bibliothek',roomUrl:'https://together.deine-schule.com/~/castle-preview/bibliothek.wam',
  outputDir:out,label:'Bibliotheksprobe',seats:13,groups:3,revision:'20261108-library1',parking:[[112,288],[592,400],[720,288],[432,592]]};
const roomSuffix=(s,id)=>s.rooms.some(r=>r.endsWith('area-'+id));
async function audioWindow(users){
  await users[0].page.waitForTimeout(3000);const before=await Promise.all(users.map(stats));
  await users[0].page.waitForTimeout(4500);const after=await Promise.all(users.map(stats));
  return {before,after,heard:after.map((s,i)=>s.energy>before[i].energy)};
}
async function main(){
  writeAudio();
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const users=[];for(let i=1;i<=4;i++)users.push(await join(browser,i,options));
    const [a,b,c,d]=users;
    await sit(a,'lese-kamin-sofa-links');await sit(b,'lese-kamin-sessel-west');await move(c,80,496);await sit(d,'lese-kamin-sessel-ost');
    const circle=await audioWindow(users);
    assert.ok(circle.heard.every(Boolean),'All four readers, including a distant standing participant, decode audio');
    assert.ok(circle.after.every(s=>roomSuffix(s,'lesekamin')&&s.rooms.some(r=>circle.after[0].rooms.includes(r))));
    console.log('Four-way reading circle, including standing listener, passed.');
    await a.page.screenshot({path:path.join(out,'four-readers.png')});
    await sit(c,'buchclub-n0');await sit(d,'buchclub-s1');
    const separated=await audioWindow(users);
    assert.ok(separated.heard.every(Boolean));
    assert.ok(separated.after.slice(0,2).every(s=>roomSuffix(s,'lesekamin')));
    assert.ok(separated.after.slice(2).every(s=>roomSuffix(s,'buchclub')));
    assert.ok(!separated.after[0].rooms.some(r=>separated.after[2].rooms.includes(r)),'Parallel reading groups stay isolated');
    console.log('Two independent reading groups passed.');
    await sit(a,'fenster-0');await move(b,672,320);
    const window=await audioWindow(users);
    assert.ok(window.heard.every(Boolean));
    assert.ok(window.after.slice(0,2).every(s=>roomSuffix(s,'fensterleser')));
    assert.ok(!window.after[0].rooms.some(r=>window.after[2].rooms.includes(r)));
    await a.page.screenshot({path:path.join(out,'window-reading-group.png')});
    console.log('Window reading group with distant standing partner passed.');
    await move(a,416,592);await move(b,448,592);await move(c,80,608);await move(d,800,352);
    const proximity=await audioWindow(users);
    assert.ok(proximity.heard[0]&&proximity.heard[1]);
    assert.ok(proximity.after[0].rooms.some(r=>!r.includes('-area-')&&proximity.after[1].rooms.includes(r)),'Ordinary proximity returns outside reading groups');
    assert.ok(!proximity.heard[2]&&!proximity.heard[3],'Remote readers do not receive the nearby hallway conversation');
    const seatIds=await a.script.evaluate(()=>castleRoom.layout.seats.map(s=>s.id));
    for(const id of seatIds){
      await sit(a,id);
      assert.equal(await a.script.evaluate(()=>castleRoom.seat?.id),id);
      await a.page.screenshot({path:path.join(out,'seat-'+id+'.png')});
    }
    await move(a,448,288);
    const canvasFile=path.join(out,'library-canvas-desktop.png');await a.page.locator('canvas:visible').first().screenshot({path:canvasFile});
    const pixelStats=await sharp(canvasFile).stats();assert.ok(pixelStats.channels.slice(0,3).every(c=>c.stdev>12));
    await a.page.screenshot({path:path.join(out,'library-desktop.png')});
    await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(1500);
    const mobileFile=path.join(out,'library-canvas-mobile.png');await a.page.locator('canvas:visible').first().screenshot({path:mobileFile});
    const mobileStats=await sharp(mobileFile).stats();assert.ok(mobileStats.channels.slice(0,3).every(c=>c.stdev>12));
    await a.page.screenshot({path:path.join(out,'library-mobile.png')});await a.page.setViewportSize({width:1440,height:1000});
    await a.script.evaluate(()=>castleRoom.returnToHall()).catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e});
    let hall;
    for(let n=0;n<80&&!hall;n++){
      for(const frame of a.page.frames())if(await frame.evaluate(()=>window.castleRoom?.layout.id==='grosse-halle').catch(()=>false))hall=frame;
      if(!hall)await a.page.waitForTimeout(500);
    }
    assert.ok(hall,'Library returns to the separate Great Hall');
    const arrival=await hall.evaluate(()=>WA.player.getPosition());assert.ok(Math.abs(arrival.x-1296)<20&&Math.abs(arrival.y-304)<20,'Correct library arrival in Hall');
    await hall.evaluate(()=>WA.player.teleport(1296,224)).catch(e=>{if(!/Execution context was destroyed|Frame was detached/.test(e.message))throw e});
    let library;
    for(let n=0;n<80&&!library;n++){
      for(const frame of a.page.frames())if(await frame.evaluate(()=>window.castleRoom?.layout.id==='bibliothek').catch(()=>false))library=frame;
      if(!library)await a.page.waitForTimeout(500);
    }
    assert.ok(library,'Hall library doorway enters the new library');
    const proof={revision:options.revision,participants:4,realAccountsOrMicrophonesUsed:false,allFourReadersHear:true,standingReadersIncluded:true,
      threeGroupsVerified:true,parallelGroupsIsolated:true,ordinaryProximityRestored:true,allSeatsVerified:seatIds.length,returnToSeparateHall:true,hallDoorReturnsToLibrary:true,
      canvasNonblank:{desktop:true,mobile:true},circle,separated,window,proximity,errors:users.flatMap(u=>u.errors)};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2)+'\n');assert.deepEqual(proof.errors,[]);
    console.log(JSON.stringify({participants:4,readingGroups:3,standingReadersIncluded:true,allSeats:seatIds.length,bidirectionalHallLink:true,errors:proof.errors},null,2));
  }catch(e){
    let i=0;for(const context of browser.contexts())for(const page of context.pages()){
      i++;await page.screenshot({path:path.join(out,'failure-'+i+'.png')}).catch(()=>{});
      fs.writeFileSync(path.join(out,'failure-'+i+'.txt'),await page.locator('body').innerText().catch(()=>''));
    }
    throw e;
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
