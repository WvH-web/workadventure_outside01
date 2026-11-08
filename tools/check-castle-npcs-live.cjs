const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit,move,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const out=path.resolve(__dirname,'../../output/castle-npcs-live-qa');fs.mkdirSync(out,{recursive:true});
const web='https://wvh-web.github.io/workadventure_outside01/castle/',base='https://together.deine-schule.com/~/castle-preview/';
async function findRoom(user,id){
  let frame;for(let n=0;n<160&&!frame;n++){
    for(const f of user.page.frames())if(await f.evaluate(id=>window.castleRoom?.layout.id===id,id).catch(()=>false))frame=f;
    if(!frame)await user.page.waitForTimeout(500);
  }
  assert.ok(frame,'Room controller '+id);user.script=frame;
  await frame.waitForFunction(()=>window.castleNpcs?.figures.length===1&&window.castleActivities,undefined,{polling:200,timeout:30000});
}
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let user;const results=[];
  try{
    user=await join(browser,1,{roomId:'museum',roomUrl:base+'museum.wam',outputDir:out,seats:12,groups:3,revision,characterTextureId:'wvh-event-kai-v1'});
    for(const id of ['museum','musikzimmer','oberstufe','spielesaal','atelier','sternwarte','erdgeschoss','obergeschoss']){
      if(id!=='museum'){
        await user.script.evaluate(()=>castleRoom.stand());
        await user.script.evaluate(url=>WA.nav.goToRoom(url),base+id+'.wam').catch(e=>{if(!/detached|destroyed/.test(e.message))throw e;});
      }
      await findRoom(user,id);
      const actor=await user.script.evaluate(()=>{const p=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
        const slot=castleNpcs.slots[0],id=p(slot).castleNpcId,area=castleActivities.areas.find(a=>a.settings.id==='npc-'+id);
        return {id,label:area.settings.label,area:{x:area.x,y:area.y,width:area.width,height:area.height}};});
      assert.ok(!user.page.frames().some(f=>f.url().startsWith(web+'npc-sprite.html')),'NPCs have no floating website frames');
      assert.ok(await user.script.evaluate(()=>castleNpcs.figures.every(f=>f.tiles.length===4&&f.tiles[0].layer==='castle-npc-sprites'&&f.tiles[0].tile>0)));
      await move(user,actor.area.x+actor.area.width/2,actor.area.y+actor.area.height/2);
      await user.page.getByRole('button',{name:actor.label,exact:true}).click();
      let profile;for(let n=0;n<60&&!profile;n++){profile=user.page.frames().find(f=>f.url().startsWith(web+'characters.html?npc='+actor.id));if(!profile)await user.page.waitForTimeout(500);}
      assert.ok(profile,'Character conversation opens');await profile.locator('#questions button').first().waitFor();
      const before=await profile.locator('#speech').textContent();await profile.locator('#questions button').first().click();assert.notEqual(await profile.locator('#speech').textContent(),before);
      assert.equal(await profile.evaluate(()=>typeof WA),'undefined','Dialogue has no map API access');
      await user.page.screenshot({path:path.join(out,id+'-dialogue.png')});await user.script.evaluate(()=>castleActivities.website.close());
      const seatIds=await user.script.evaluate(()=>castleRoom.layout.seats.map(s=>s.id));
      for(const seatId of seatIds)await sit(user,seatId);
      await user.page.screenshot({path:path.join(out,id+'-seated.png')});
      results.push({id,character:actor.id,nativeSprite32:true,noFloatingFrame:true,dialogue:true,noMapApi:true,seats:seatIds.length});
      fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({revision,results},null,2)+'\n');console.log(JSON.stringify(results.at(-1)));
    }
    assert.deepEqual(user.errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({revision,results,errors:user.errors},null,2)+'\n');
  }catch(e){if(user){await user.page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await user.page.locator('body').innerText().catch(()=>''));}throw e;}
  finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
