const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,move,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-outdoors.cjs');
const {findRoom}=require('./check-expansion-live.cjs');
const out=path.resolve(__dirname,'../../output/castle-image-focus-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let user;try{
    user=await join(browser,1,{roomId:'umgebung',roomUrl:'https://together.deine-schule.com/~/castle-preview/umgebung.wam',outputDir:out,seats:12,groups:3,revision,parking:[[696,576]]});
    const sprite=user.page.locator('iframe[src*="/npc-sprite.html?npc=noah"]').first();await sprite.waitFor();
    const spriteFrame=await (await sprite.elementHandle()).contentFrame();assert.ok(spriteFrame);
    await spriteFrame.waitForFunction(()=>window.castleImagePassive===true,undefined,{polling:200,timeout:10000});
    const box=await sprite.boundingBox();assert.ok(box);
    const focus=()=>user.page.evaluate(()=>({tag:document.activeElement?.tagName,frame:document.activeElement?.tagName==='IFRAME'?new URL(document.activeElement.src).pathname:null}));
    const press=async()=>{const before=await user.script.evaluate(()=>WA.player.getPosition());await user.page.keyboard.down('ArrowDown');await user.page.waitForTimeout(400);await user.page.keyboard.up('ArrowDown');const after=await user.script.evaluate(()=>WA.player.getPosition());return after.y-before.y};
    await user.page.locator('canvas:visible').first().click({position:{x:120,y:500}});await move(user,696,576);const baseline=await press();
    await move(user,696,576);await user.page.mouse.click(box.x+box.width/2,box.y+box.height*.75);const clickedFocus=await focus(),beforeStyle=await sprite.evaluate(e=>({pointerEvents:getComputedStyle(e).pointerEvents,sandbox:e.getAttribute('sandbox'),tabIndex:e.tabIndex,inert:e.inert})),afterClick=await press();
    await sprite.evaluate(e=>{e.style.pointerEvents='none';e.tabIndex=-1;e.inert=true});
    await user.page.locator('canvas:visible').first().click({position:{x:120,y:500}});await move(user,696,576);await user.page.mouse.click(box.x+box.width/2,box.y+box.height*.75);const passiveFocus=await focus(),afterPassive=await press();
    await user.script.evaluate(()=>WA.room.website.create({name:'qa-same-origin',url:'https://together.deine-schule.com/castle-content/collection.html?kind=museum',position:{x:400,y:400,width:96,height:64},visible:true,allowApi:false,allow:'',origin:'map',scale:1}));
    let frame;for(let n=0;n<60&&!frame;n++){frame=user.page.frames().find(f=>f.url().startsWith('https://together.deine-schule.com/castle-content/collection.html'));if(!frame)await user.page.waitForTimeout(250)}assert.ok(frame);
    const sameOrigin=await frame.evaluate(()=>{const element=window.frameElement;if(!element)return {accessible:false};element.style.pointerEvents='none';element.tabIndex=-1;element.inert=true;return {accessible:true,pointerEvents:element.style.pointerEvents,inert:element.inert}});
    await user.script.evaluate(()=>WA.room.website.delete('qa-same-origin'));
    await user.script.evaluate(()=>WA.nav.goToRoom('https://together.deine-schule.com/~/castle-preview/museum.wam')).catch(e=>{if(!/detached|destroyed/.test(e.message))throw e});await findRoom(user,'museum');
    await user.script.waitForFunction(()=>castleDisplays.websites.size>0,undefined,{polling:200,timeout:30000});
    const images=user.page.locator('iframe[src^="https://together.deine-schule.com/castle-content/display.html"]'),imageCount=await images.count();assert.ok(imageCount>0);
    const imageStyles=[];for(let n=0;n<imageCount;n++){
      const imageFrame=await (await images.nth(n).elementHandle()).contentFrame();assert.ok(imageFrame);
      await imageFrame.waitForFunction(()=>window.castleImagePassive===true,undefined,{polling:200,timeout:10000});
      await imageFrame.waitForFunction(()=>{const img=document.querySelector('img');return img?.complete&&img.naturalWidth>0},undefined,{polling:200,timeout:30000});
      imageStyles.push(await images.nth(n).evaluate(e=>({pointerEvents:getComputedStyle(e).pointerEvents,inert:e.inert})));
      assert.equal(imageStyles.at(-1).inert,true);
    }
    await user.page.locator('canvas:visible').first().click({position:{x:100,y:700}});await move(user,80,272);
    let target;for(let n=0;n<imageCount;n++){const b=await images.nth(n).boundingBox();if(b&&b.y>160&&b.y+b.height<900&&b.x>0&&b.x+b.width<1400){target=b;break}}
    assert.ok(target,'An unoccluded museum picture is visible');await user.page.mouse.click(target.x+target.width/2,target.y+target.height/2);
    const museumFocus=await focus(),museumDelta=await press();assert.ok(museumDelta>10);await user.page.screenshot({path:path.join(out,'museum-click-focus.png')});
    const result={revision,baseline,clickedFocus,beforeStyle,afterClick,passiveFocus,afterPassive,sameOrigin,museum:{images:imageCount,imageStyles,focus:museumFocus,delta:museumDelta},errors:user.errors};
    const previous=path.join(out,'result.json');if(fs.existsSync(previous)){const old=JSON.parse(fs.readFileSync(previous));if(old.revision!==revision)fs.copyFileSync(previous,path.join(out,'result-'+old.revision+'.json'))}
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
    assert.ok(baseline>10&&afterClick>10&&afterPassive>10);assert.equal(clickedFocus.frame,null);assert.equal(museumFocus.frame,null);assert.equal(beforeStyle.inert,true);assert.equal(beforeStyle.tabIndex,-1);assert.equal(sameOrigin.accessible,true);assert.deepEqual(user.errors,[]);
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
