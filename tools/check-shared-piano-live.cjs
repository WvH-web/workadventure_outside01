'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const output=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts/qa/shared-piano');
const home='https://musiclab.chromeexperiments.com/Shared-Piano/';
async function peak(page){
  return page.evaluate(async()=>{
    let peak=0;const data=new Float32Array(2048);
    for(let i=0;i<20;i++){
      for(const analyser of window.__pianoQaOutputs||[]){analyser.getFloatTimeDomainData(data);for(const value of data)peak=Math.max(peak,Math.abs(value));}
      await new Promise(resolve=>setTimeout(resolve,40));
    }return peak;
  });
}
async function play(source,receiver,touch=false){
  const keys=source.getByRole('button',{name:'C',exact:true});let key;
  for(const item of await keys.all()){
    const box=await item.boundingBox(),size=source.viewportSize();
    if(box&&box.x>=0&&box.x+box.width<=size.width&&box.y>=0&&box.y+box.height<=size.height){key=item;break;}
  }assert.ok(key,'A real visible C key is available');
  const box=await key.boundingBox(),position={x:box.width/2,y:box.height*.85};
  if(touch){await key.tap({position});return peak(receiver);}
  await key.hover({position});await source.mouse.down();
  try{return await peak(receiver);}finally{await source.mouse.up();}
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const contexts=[],results=[];let stage='entry';
  const browser=await chromium.launch({channel:'chrome',headless:true});
  async function enter(url,mobile=false){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:780,height:900},...(mobile?{isMobile:true,hasTouch:true}:{})});contexts.push(context);
    await context.addInitScript(()=>{
      window.__pianoQaOutputs=[];const connect=AudioNode.prototype.connect,seen=new WeakSet();
      AudioNode.prototype.connect=function(destination,...options){
        const result=Reflect.apply(connect,this,[destination,...options]);
        if(destination===this.context.destination&&!seen.has(this)){
          seen.add(this);const analyser=this.context.createAnalyser();analyser.fftSize=2048;
          Reflect.apply(connect,this,[analyser]);window.__pianoQaOutputs.push(analyser);
        }return result;
      };
    });
    const page=await context.newPage();page.setDefaultTimeout(30000);
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    const sound=page.getByText('Click to turn sound on',{exact:true});await sound.waitFor();
    await sound.click();await sound.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).origin,new URL(home).origin);
    return {context,page};
  }
  try{
    const a=await enter(home);const url=a.page.url();assert.ok(new URL(url).hash);
    fs.writeFileSync(path.join(output,'room.private.json'),JSON.stringify({url},null,2)+'\n');
    const b=await enter(url,true);stage='two-participants';
    for(const user of [a,b])await user.page.getByText('2 people',{exact:true}).waitFor();
    await b.page.waitForTimeout(1500);const silent=await peak(b.page);assert.ok(silent<0.0001);
    stage='remote-note';const remote=await play(a.page,b.page);assert.ok(remote>0.001,'The other browser must produce real Web Audio samples');
    await b.page.screenshot({path:path.join(output,'two-players-mobile.private.png')});
    stage='first-participant-leaves';await a.context.close();await b.page.getByText('1 person',{exact:true}).waitFor();
    const c=await enter(url);stage='late-join-after-creator-left';
    for(const user of [b,c])await user.page.getByText('2 people',{exact:true}).waitFor();
    await c.page.waitForTimeout(1500);const lateSilent=await peak(c.page);assert.ok(lateSilent<0.0001);
    stage='mobile-remote-note';const lateRemote=await play(b.page,c.page,true);assert.ok(lateRemote>0.001);
    await c.page.screenshot({path:path.join(output,'late-player.private.png')});
    results.push({twoIndependentBrowsers:true,remoteAudibleSamples:true,mobileTouch390:true,firstParticipantMayLeave:true,
      lateJoinSameRoom:true,touchNoteAudibleToPeer:true,silentPeak:silent,remotePeak:remote,lateSilentPeak:lateSilent,lateRemotePeak:lateRemote});
    const proof={passed:true,checkedAt:new Date().toISOString(),provider:home,results,
      scope:'Direct anonymous provider pilot, not yet a WorkAdventure or school-policy integration',
      schoolAccountsUsed:false,studentPolicyChanged:false,schoolCatalogChanged:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
  }catch(error){
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,results},null,2)+'\n');
    let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++i)+'.private.png')}).catch(()=>{});
    console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Shared Piano probe stopped: '+error.name);process.exitCode=1;});
