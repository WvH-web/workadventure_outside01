const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const out=path.resolve(__dirname,'../../output/npc-transparency-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const user=await join(browser,1,{roomId:'grosse-halle',roomUrl:'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam',outputDir:out,seats:42,groups:6,revision:'20261108-expansion1',parking:[[720,800]]});
    await user.script.evaluate(()=>WA.room.website.create({name:'qa-transparent-character',url:'https://wvh-web.github.io/workadventure_outside01/castle/npc-sprite.html?npc=elin',
      position:{x:672,y:704,width:96,height:48},origin:'map',visible:true,allowApi:false,allow:'',scale:1}));
    const iframe=user.page.locator('iframe[src*="/npc-sprite.html"]');await iframe.waitFor();
    const frame=await iframe.contentFrame();await frame.locator('#label').waitFor();await user.page.waitForTimeout(1500);
    const parent=await iframe.evaluate(e=>({background:getComputedStyle(e).backgroundColor,scheme:getComputedStyle(e).colorScheme,root:getComputedStyle(document.documentElement).colorScheme}));
    const child=await frame.locator('html').evaluate(e=>({background:getComputedStyle(e).backgroundColor,scheme:getComputedStyle(e).colorScheme}));
    await user.page.screenshot({path:path.join(out,'before.png')});
    await frame.locator('html').evaluate(e=>{e.style.colorScheme='dark';});await user.page.screenshot({path:path.join(out,'child-dark.png')});
    await iframe.evaluate(e=>{e.style.setProperty('background-color','transparent','important');});await user.page.screenshot({path:path.join(out,'parent-transparent.png')});
    console.log(JSON.stringify({parent,child}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
