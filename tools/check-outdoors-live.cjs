const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join,sit,move,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {findRoom,travel,audio,openActivity}=require('./check-expansion-live.cjs');
const {scenes,revision}=require('./build-castle-outdoors.cjs');
const out=path.resolve(__dirname,'../../output/castle-outdoors-live-qa');fs.mkdirSync(out,{recursive:true});
const base='https://together.deine-schule.com/~/castle-preview/';
const parking=[[560,336],[656,432],[560,544],[656,688]];
async function story(users){
  const frames=[];for(const user of users.slice(0,2))frames.push(await openActivity(user,'story.html'));
  for(const frame of frames)await frame.waitForFunction(()=>window.castleStory&&!document.getElementById('roll').disabled,undefined,{timeout:30000});
  const previous=await frames[0].locator('body').getAttribute('data-round');await frames[0].getByRole('button',{name:'Neue Karten',exact:true}).click();
  await frames[0].waitForFunction(old=>document.body.dataset.round&&document.body.dataset.round!==old,previous);
  const round=await frames[0].locator('body').getAttribute('data-round');for(const frame of frames.slice(1))await frame.waitForFunction(round=>document.body.dataset.round===round,round);
  const late=await openActivity(users[2],'story.html');await late.waitForFunction(round=>window.castleStory&&document.body.dataset.round===round,round,{timeout:30000});
  for(const user of users)await user.script.evaluate(()=>castleActivities.website.close());return {sameRound:true,lateJoiner:true,participants:users.length};
}
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const users=[],results=[];
  try{
    for(let n=1;n<=4;n++)users.push(await join(browser,n,{roomId:'umgebung',roomUrl:base+'umgebung.wam#start',outputDir:out,label:'Gartenprobe',seats:12,groups:3,revision,parking,
      characterTextureId:['wvh-event-noah-v1','wvh-event-val-v1','wvh-event-rosa-v1','wvh-event-jan-v1'][n-1]}));
    const [a,b,c,d]=users;
    for(const scene of scenes){
      if(scene.id!=='umgebung')for(const [i,user]of users.entries()){await travel(user,scene.id);await move(user,...parking[i]);}
      const first=scene.tables[0],second=scene.tables[1];
      await sit(a,first.id+'-n0');await sit(b,first.id+'-s1');await move(c,scene.groups[0].x+32,scene.groups[0].y+32);await sit(d,first.id+'-s0');
      const together=await audio(users);assert.ok(together.after.every(s=>s.rooms.some(r=>r.endsWith('area-'+first.id)&&together.after[0].rooms.includes(r))));
      const shared=await story([a,b,c]);
      await sit(c,second.id+'-n0');await sit(d,second.id+'-s1');const separated=await audio(users);
      assert.ok(!separated.after[0].rooms.some(r=>separated.after[2].rooms.includes(r)));
      let third=null;if(scene.tables[2]){
        await sit(a,scene.tables[2].id+'-n0');await sit(b,scene.tables[2].id+'-s1');third=await audio(users);
        assert.ok(third.after.slice(0,2).every(s=>s.rooms.some(r=>r.endsWith('area-'+scene.tables[2].id))));
      }
      await a.page.screenshot({path:path.join(out,scene.id+'-table.png')});
      for(const [i,user]of users.entries())await move(user,...parking[i]);
      const seatIds=await a.script.evaluate(()=>castleRoom.layout.seats.map(s=>s.id));for(const id of seatIds)await sit(a,id);
      await a.page.screenshot({path:path.join(out,scene.id+'-all-seats.png')});
      await a.page.setViewportSize({width:390,height:844});await a.page.waitForTimeout(700);
      const canvas=await a.page.locator('canvas:visible').first().screenshot();assert.ok((await sharp(canvas).stats()).channels.slice(0,3).every(c=>c.stdev>12));
      await a.page.screenshot({path:path.join(out,scene.id+'-mobile.png')});await a.page.setViewportSize({width:1440,height:1000});
      const actor=await a.script.evaluate(async()=>{const map=await WA.room.getTiledMap();return map.layers.flatMap(l=>l.objects||[]).find(o=>o.properties?.some(p=>p.name==='castleNpcId'))?.properties.find(p=>p.name==='castleNpcId').value});
      assert.ok(a.page.frames().some(f=>f.url().includes('/npc-sprite.html?npc='+actor)));
      const talk=await a.script.evaluate(actor=>{const a=castleActivities.areas.find(a=>a.settings.id==='npc-'+actor);return {x:a.x+a.width/2,y:a.y+a.height/2,label:a.settings.label}},actor);
      await move(a,talk.x,talk.y);await a.page.getByRole('button',{name:talk.label,exact:true}).click();
      let profile;for(let n=0;n<60&&!profile;n++){profile=a.page.frames().find(f=>f.url().includes('/characters.html?npc='+actor));if(!profile)await a.page.waitForTimeout(500)}
      assert.ok(profile);await profile.locator('#questions button').first().waitFor();const before=await profile.locator('#speech').textContent();
      await profile.locator('#questions button').first().click();assert.notEqual(await profile.locator('#speech').textContent(),before);assert.equal(await profile.evaluate(()=>typeof WA),'undefined');
      await a.page.screenshot({path:path.join(out,scene.id+'-character.png')});await a.script.evaluate(()=>castleActivities.website.close());
      results.push({id:scene.id,participants:4,seats:seatIds.length,groups:scene.groups.length,standingIncluded:true,shared,together,separated,third,actor,actorDialogue:true,mobileCanvas:true});
      fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({revision,results},null,2)+'\n');console.log(JSON.stringify({id:scene.id,participants:4,seats:seatIds.length,groups:scene.groups.length,passed:true}));
    }
    await move(a,1012,160);
    const route=await a.script.evaluate(()=>castleRoom.layout.rides[0]);
    const ride=a.script.evaluate(()=>castleRoom.startRide(castleRoom.layout.rides[0]));
    await a.script.waitForFunction(()=>castleRoom.riding,undefined,{timeout:5000});await a.page.screenshot({path:path.join(out,'park-sliding.png')});await ride;
    const landing=await a.script.evaluate(async()=>{await castleRoom.syncPosition();return castleRoom.position});assert.ok(Math.hypot(landing.x-route.waypoints.at(-1).x,landing.y-route.waypoints.at(-1).y)<2);
    await move(a,1012,160);const cancel=a.script.evaluate(()=>castleRoom.startRide(castleRoom.layout.rides[0]));
    await a.script.waitForFunction(()=>castleRoom.riding,undefined,{timeout:5000});await a.page.getByRole('button',{name:'Rutsche verlassen',exact:true}).click();await cancel;
    await move(a,520,288);await a.page.getByRole('button',{name:'Go-Kart fahren',exact:true}).click();
    await a.script.waitForFunction(()=>castlePark.active,undefined,{timeout:10000});await a.page.screenshot({path:path.join(out,'park-native-kart.png')});
    await a.page.keyboard.down('ArrowLeft');await a.page.waitForTimeout(450);await a.page.keyboard.up('ArrowLeft');
    const driving=await a.script.evaluate(()=>WA.player.getPosition());assert.ok(driving.x<512,'Kart keeps native movement');
    const distances=[];for(const boosted of [false,true]){
      await move(a,200,320);if(boosted)await a.page.keyboard.down('Shift');await a.page.keyboard.down('ArrowRight');await a.page.waitForTimeout(400);await a.page.keyboard.up('ArrowRight');if(boosted)await a.page.keyboard.up('Shift');
      distances.push((await a.script.evaluate(()=>WA.player.getPosition())).x-200);
    }
    assert.ok(distances[0]>10&&distances[1]>distances[0]*1.3,'Native Shift acceleration remains available');
    await a.page.getByRole('button',{name:'Aussteigen',exact:true}).click();await a.script.waitForFunction(()=>!castlePark.active&&!castlePark.needsRestore);
    await move(a,520,288);await a.page.getByRole('button',{name:'Go-Kart fahren',exact:true}).click();await a.script.waitForFunction(()=>castlePark.active);
    await move(a,560,448);await a.script.waitForFunction(()=>!castlePark.active&&!castlePark.needsRestore);
    await move(a,520,288);await a.page.getByRole('button',{name:'Go-Kart fahren',exact:true}).click();await a.script.waitForFunction(()=>castlePark.active);
    await a.script.evaluate(()=>{const go=WA.nav.goToRoom.bind(WA.nav);WA.nav.goToRoom=url=>{if(castlePark.active||castlePark.needsRestore)throw Error('Kart was not restored before navigation');return go(url)}});
    await a.script.evaluate(()=>castleRoom.returnToHall()).catch(e=>{if(!/detached|destroyed/.test(e.message))throw e});await findRoom(a,'umgebung');
    for(const [id,entry]of [['umgebung','garten'],['dorf','schloss'],['park','dorf']]){
      await a.script.evaluate(url=>WA.nav.goToRoom(url),base+id+'.wam#'+entry).catch(e=>{if(!/detached|destroyed/.test(e.message))throw e});await findRoom(a,id);
    }
    assert.equal(a.page.frames().filter(f=>f.url().includes('/npc-sprite.html?')).length,1);
    const errors=users.flatMap(u=>u.errors);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({revision,results,completedRide:true,cancelledRide:true,nativeKartEntryExit:true,nativeKartMovement:true,nativeShiftDistances:distances,kartAutoExit:true,kartRestoredBeforeReturn:true,noOrphanNpcImages:true,errors},null,2)+'\n');
    console.log(JSON.stringify({maps:3,participants:4,seats:32,groups:8,ride:true,kart:true,errors,passed:true}));
  }catch(error){
    let n=0;for(const context of browser.contexts())for(const page of context.pages()){
      n++;await page.screenshot({path:path.join(out,'failure-'+n+'.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure-'+n+'.txt'),await page.locator('body').innerText().catch(()=>''));
    }throw error;
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
