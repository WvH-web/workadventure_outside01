'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp'),fixture=require('../tests/fixtures/castle-piano.cjs');
const output=path.resolve(__dirname,'../../output/castle-piano-browser');
async function main(){
  const f=await fixture(null,{realClock:true}),errors=[],results=[];let browser;fs.mkdirSync(output,{recursive:true});
  async function participant(id,kind='student',width=1100){
    const actor=await f.actor(id,kind),context=await browser.newContext({viewport:{width,height:800},...(width<700?{isMobile:true,hasTouch:true}:{})});
    await context.addInitScript(({token})=>{
      localStorage.setItem('authToken',token);window.__audioMeters=[];
      const connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(destination,...args){
        const result=connect.call(this,destination,...args);
        if(destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);window.__audioMeters.push(meter);}
        return result;
      };
    },{token:actor.token});
    await context.route('**/castle-content/vendor/lucide.min.js',route=>route.fulfill({path:path.resolve(__dirname,'../ops/hall-audio/public/vendor/lucide.min.js'),contentType:'text/javascript'}));
    await context.route('**/castle-school/round-rooms/musikzimmer.webp',route=>route.fulfill({path:path.resolve(__dirname,'../ops/castle-school/public/round-rooms/musikzimmer.webp'),contentType:'image/webp'}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='warning'&&message.text().startsWith('Piano audio unavailable:'))console.error(message.text());if(message.type()==='error'&&/Content Security|Refused to|Uncaught/.test(message.text()))errors.push(message.text());});
    await page.goto(f.config.origin+'/castle-piano/');
    if(['parent','unknown'].includes(kind)){await page.locator('#message').filter({hasText:'kein Schulzugang'}).waitFor();return {actor,context,page};}
    await page.getByText('Bereit',{exact:true}).waitFor();await page.locator('#start').click();
    await page.getByText('Gemeinsam verbunden',{exact:true}).waitFor({timeout:30000});return {actor,context,page};
  }
  const energy=page=>page.evaluate(()=>Math.max(0,...window.__audioMeters.map(meter=>{const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((sum,n)=>sum+n*n,0)/values.length);})));
  async function heard(page){let peak=0;for(let i=0;i<35;i++){peak=Math.max(peak,await energy(page));if(peak>.0002)return peak;await page.waitForTimeout(40);}throw Error('No actual sampled piano audio reached the other browser');}
  async function quiet(page){await page.waitForFunction(()=>window.__audioMeters.every(meter=>{const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);return Math.max(...values.map(Math.abs))<.00003;}),undefined,{timeout:5000});}
  async function press(user,note){const box=await user.page.locator('[data-note="'+note+'"]').boundingBox();await user.page.mouse.move(box.x+box.width/2,box.y+box.height-24);await user.page.mouse.down();}
  const members=(user,count)=>user.page.waitForFunction(count=>document.querySelectorAll('#players .player').length===count,count);
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']});
    const a=await participant('piano-browser-a@invalid.local'),b=await participant('piano-browser-b@invalid.local');await members(a,2);await members(b,2);
    await press(a,60);await b.page.locator('[data-note="60"].peer').waitFor();const peerEnergy=await heard(b.page);await a.page.mouse.up();await b.page.locator('[data-note="60"].peer').waitFor({state:'hidden'});await quiet(b.page);
    results.push({label:'actual-sampled-audio',isolatedBrowsers:2,peerEnergy,localMouseNoteReceived:true,releasedNoteStopsPeerSound:true});
    // Sustain makes the same-pitch overlap observable after real pointer-up input.
    await a.page.locator('#pedal').check();await b.page.locator('#pedal').check();
    await press(a,64);await a.page.mouse.up();
    await press(b,64);await b.page.mouse.up();
    await a.page.locator('[data-note="64"].active.peer').waitFor();await a.page.locator('#clear').click();
    await b.page.locator('[data-note="64"].active').waitFor();assert.equal(await b.page.locator('[data-note="64"].peer').count(),0);await b.page.locator('#clear').click();await quiet(b.page);
    results.push({label:'owner-release',samePitchSustainIndependent:true,clearingOneDoesNotClearTheOther:true});
    await a.page.locator('.segments label').filter({has:a.page.locator('input[value="practice"]')}).click();await a.page.locator('#connection').filter({hasText:'Allein \u00fcben'}).waitFor();await members(b,1);
    await press(a,67);await a.page.locator('[data-note="67"].active').waitFor();await heard(a.page);assert.equal(await b.page.locator('[data-note="67"].peer').count(),0);await quiet(b.page);await a.page.mouse.up();
    results.push({label:'practice-isolation',localSoundWorks:true,peerReceivesNoPracticeNotes:true});
    await a.page.locator('.segments label').filter({has:a.page.locator('input[value="together"]')}).click();await a.page.getByText('Gemeinsam verbunden',{exact:true}).waitFor();await members(b,2);
    await a.page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});const stats=await sharp(await a.page.locator('.instrument').screenshot()).stats();assert.ok(stats.channels.slice(0,3).every(channel=>channel.stdev>25));
    const c=await participant('piano-browser-late@invalid.local');await members(c,3);await a.context.close();await members(b,2);await press(c,72);await heard(b.page);await c.page.mouse.up();
    results.push({label:'late-join-creator-leaves',actualConnectedCount:true,remainingPlayersContinue:true});
    const other=await b.context.newPage();await other.goto(f.config.origin+'/castle-piano/');await other.getByText(/bereits in einem anderen Fenster/).waitFor();assert.equal(await other.locator('#players .player').count(),0);
    await other.locator('#takeover').click();await other.getByText('Bereit',{exact:true}).waitFor();await other.locator('#start').click();await other.getByText('Gemeinsam verbunden',{exact:true}).waitFor();await members(c,2);
    await b.page.getByText(/bereits in einem anderen Fenster/).waitFor();await other.close();await members(c,1);
    results.push({label:'same-account-tabs',explicitTakeoverRequired:true,noInflatedMembers:true,oldWindowCannotReclaimSilently:true});
    const opened=c.page.waitForEvent('popup');await c.page.evaluate(()=>window.open(location.href,'_blank'));const cloned=await opened;
    await cloned.getByText(/bereits in einem anderen Fenster/).waitFor();assert.equal(await cloned.locator('#players .player').count(),0);await cloned.close();await members(c,1);
    results.push({label:'same-account-opener',clonedSessionStorageCannotReusePageIdentity:true,openingAnotherWindowDoesNotStealThePiano:true});
    const denied=await participant('piano-parent@invalid.local','parent');assert.equal(await denied.page.locator('#start').isEnabled(),false);await denied.context.close();
    for(const width of [390,320]){
      const mobile=await participant('piano-touch-'+width+'@invalid.local','student',width);const box=await mobile.page.locator('[data-note="60"]').boundingBox(),touch=await mobile.context.newCDPSession(mobile.page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height-25,id:1}]});
      await c.page.locator('[data-note="60"].peer').waitFor();await heard(c.page);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
      await c.page.locator('[data-note="60"].peer').waitFor({state:'hidden'});await quiet(c.page);
      assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.deepEqual(await mobile.page.locator('button:visible,.segments label,.volume').evaluateAll(elements=>elements.filter(element=>{const box=element.getBoundingClientRect();return box.left<0||box.right>innerWidth+1||element.scrollWidth>element.clientWidth+1;}).map(element=>element.id||element.className)),[]);
      await mobile.page.screenshot({path:path.join(output,'touch-'+width+'.png'),fullPage:true});results.push({label:'touch-'+width,realTouchNoteHeardByPeer:true,noOverflow:true});await mobile.context.close();
    }
    const lease=[...f.rooms.leases.values()].find(lease=>lease.actor===f.rooms.actor({identifier:c.actor.id,expiresAt:Date.now()+60000}).id);lease.expiresAt=Date.now()-1;f.rooms.sweep();await members(c,0);
    await c.page.getByText('Gemeinsam verbunden',{exact:true}).waitFor({timeout:10000});await members(c,1);
    f.profiles.set(c.actor.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});await c.page.locator('#reconnect').click();await c.page.getByText(/kein Schulzugang/).waitFor();assert.equal(await c.page.locator('#players .player').count(),0);
    results.push({label:'expiry-and-revocation',expiredTransportCloses:true,freshSchoolReconnectWorks:true,revokedAccessStopsPlaying:true});
    assert.deepEqual(errors,[]);const evidence={passed:true,syntheticProfilesOnly:true,productionServerTested:false,actualToneSampler:true,strictWorkerFreeCsp:true,results,errors};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){console.error(JSON.stringify({browserErrors:[...new Set(errors)]}));let i=0;for(const context of browser?.contexts()||[])for(const page of context.pages()){
    await page.screenshot({path:path.join(output,'failure-'+(++i)+'.png'),fullPage:true}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));}throw error;
  }finally{await browser?.close();await f.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
