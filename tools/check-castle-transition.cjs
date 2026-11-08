const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const out=path.resolve(__dirname,'../../output/castle-transition-qa');fs.mkdirSync(out,{recursive:true});
async function inspect(user){
  const frames=[];
  for(const frame of user.page.frames()){
    const state=await frame.evaluate(async()=>{
      const result={path:location.pathname,controller:window.castleRoom?.layout.id,seated:window.castleRoom?.seat?.id};
      if(typeof WA!=='undefined'){
        result.nativeRoom=WA.room?.id;
        result.map=await Promise.race([WA.room.getTiledMap().then(m=>m.properties?.find(p=>p.name==='castleMapId')?.value).catch(e=>e.message),new Promise(r=>setTimeout(()=>r('timeout'),2000))]);
      }
      return result;
    }).catch(e=>({error:e.message}));
    if(state.nativeRoom){const url=new URL(state.nativeRoom);state.nativeRoom=url.origin+url.pathname;}
    frames.push(state);
  }
  return frames;
}
async function main(){
  writeAudio();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const user=await join(browser,1,{roomId:'museum',roomUrl:'https://together.deine-schule.com/~/castle-preview/museum.wam',outputDir:out,seats:12,groups:3,revision:'20261108-expansion1'});
    await sit(user,'fenster-0');const before=await inspect(user);
    await user.script.evaluate(()=>WA.nav.goToRoom('https://together.deine-schule.com/~/castle-preview/musikzimmer.wam#start')).catch(e=>{if(!/detached|destroyed/.test(e.message))throw e;});
    await user.page.waitForTimeout(10000);const after=await inspect(user);
    await user.page.screenshot({path:path.join(out,'after.png')});
    const proof={before,after,errors:user.errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
