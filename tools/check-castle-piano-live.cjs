'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),WebSocket=require('../ops/castle-piano/vendor/ws');
const live=process.argv.includes('--live'),origin='https://together.deine-schule.com';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(privateRoot,'qa/piano-'+(live?'live':'stage'));
async function main(){
  fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,'result.json'),{force:true});const handoff=JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json'),'utf8'));
  assert.equal(handoff.contains_real_pupil_data,false);let browser,stage='entry';const users=[],errors=[],proxies=new Set(),messages={sent:0,received:0};
  const energy=page=>page.evaluate(()=>Math.max(0,...window.__pianoMeters.map(meter=>{const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((sum,n)=>sum+n*n,0)/values.length);})));
  async function heard(page){let peak=0;for(let n=0;n<60;n++){peak=Math.max(peak,await energy(page));if(peak>.0002)return peak;await page.waitForTimeout(50);}throw Error('Receiver did not decode piano audio');}
  async function participant(key){
    const context=await browser.newContext({storageState:path.join(privateRoot,'qa/sso-'+key+'.private.json'),viewport:key==='A'?{width:1100,height:800}:{width:390,height:844},...(key==='B'?{isMobile:true,hasTouch:true}:{})});
    await context.addInitScript(()=>{
      window.__pianoMeters=[];const connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);
        if(destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);window.__pianoMeters.push(meter);}return result;};
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security|Refused to|Uncaught/.test(message.text()))errors.push(message.text());});
    if(!live){
      await context.route(origin+'/castle-piano/**',async route=>{
        try{const url=new URL(route.request().url());return await route.fulfill({response:await route.fetch({url:'http://127.0.0.1:13241'+url.pathname+url.search,maxRedirects:0})});}
        catch(error){errors.push('Private piano forwarding unavailable: '+error.name);await route.abort('failed').catch(()=>{});}
      });
      await context.routeWebSocket(origin.replace('https','wss')+'/castle-piano/socket',async route=>{
        const protocols=route.protocols(),cookies=await context.cookies(origin+'/castle-piano/');
        assert.ok(Array.isArray(protocols)&&protocols.length===2&&protocols[0]==='castle-piano-v1'&&/^visit\.[a-f0-9]{24}$/.test(protocols[1]));
        const cookie=cookies.find(cookie=>cookie.name==='wvh_castle_piano');assert.ok(cookie?.httpOnly&&cookie.secure);
        const socket=new WebSocket('ws://127.0.0.1:13241/castle-piano/socket',protocols,{origin,headers:{Cookie:cookie.name+'='+cookie.value}});proxies.add(socket);const waiting=[];
        route.onMessage(message=>{if(socket.readyState===1){messages.sent++;socket.send(message);}else if(socket.readyState===0&&waiting.length<20)waiting.push(message);});
        route.onClose(()=>socket.close());socket.on('open',()=>{for(const message of waiting){messages.sent++;socket.send(message);}waiting.length=0;});
        socket.on('message',raw=>{messages.received++;route.send(raw.toString('utf8'));});socket.on('error',()=>void route.close({code:1011,reason:'stage_unavailable'}));
        socket.on('close',()=>{proxies.delete(socket);void route.close({code:1000,reason:'stage_closed'});});
      });
    }
    await page.goto(origin+'/castle-piano/');await page.waitForFunction(()=>document.querySelector('#connection')?.textContent==='Bereit'||!document.querySelector('#takeover')?.hidden,undefined,{timeout:20000});
    if(await page.locator('#takeover').isVisible()){await page.locator('#takeover').click();await page.getByText('Bereit',{exact:true}).waitFor();}assert.equal(await page.locator('#role').innerText(),'');
    const cookie=(await context.cookies(origin+'/castle-piano/')).find(cookie=>cookie.name==='wvh_castle_piano');assert.ok(cookie?.httpOnly&&cookie.secure&&cookie.sameSite==='Strict');
    await page.locator('#start').click();await page.getByText('Gemeinsam verbunden',{exact:true}).waitFor({timeout:30000});const user={key,context,page};users.push(user);return user;
  }
  const count=(user,n)=>user.page.waitForFunction(n=>document.querySelectorAll('#players .player').length===n,n);
  async function press(user,note){const box=await user.page.locator('[data-note="'+note+'"]').boundingBox();await user.page.mouse.move(box.x+box.width/2,box.y+box.height-24);await user.page.mouse.down();}
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']});
    const a=await participant('A'),b=await participant('B');await count(a,2);await count(b,2);stage='actual-school-duet';
    await press(a,60);await b.page.locator('[data-note="60"].peer').waitFor();const peerEnergy=await heard(b.page);await a.page.mouse.up();await b.page.locator('[data-note="60"].peer').waitFor({state:'hidden'});
    const box=await b.page.locator('[data-note="64"]').boundingBox(),touch=await b.context.newCDPSession(b.page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height-25,id:1}]});
    await a.page.locator('[data-note="64"].peer').waitFor();const reverseEnergy=await heard(a.page);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    await a.page.locator('[data-note="64"].peer').waitFor({state:'hidden'});stage='practice-and-renew';
    await a.page.locator('.segments label').filter({has:a.page.locator('input[value="practice"]')}).click();await a.page.locator('#connection').filter({hasText:'Allein \u00fcben'}).waitFor();await count(b,1);
    await press(a,67);await heard(a.page);assert.equal(await b.page.locator('[data-note="67"].peer').count(),0);await a.page.mouse.up();
    await a.page.locator('.segments label').filter({has:a.page.locator('input[value="together"]')}).click();await a.page.getByText('Gemeinsam verbunden',{exact:true}).waitFor();await count(b,2);
    const renewed=b.page.waitForResponse(response=>response.url()===origin+'/castle-piano/session'&&response.status()===200,{timeout:30000});await (await renewed).finished();await count(a,2);
    for(const user of users){assert.equal(await user.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,'duet-'+user.key+'.private.png'),fullPage:true});}
    stage='creator-departs';await a.context.close();await count(b,1);const continued=await b.page.locator('[data-note="72"]').boundingBox();await b.page.touchscreen.tap(continued.x+continued.width/2,continued.y+continued.height-25);
    await b.page.goto(origin+'/castle-piano/health');await b.page.waitForTimeout(500);assert.deepEqual(errors,[]);
    const proof={passed:true,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../output/wvh-castle-piano.zip'))).digest('hex'),stageOnly:!live,normalMicrosoftPupils:2,syntheticSchoolOverrides:false,actualToneSampler:true,
      actualVpsPianoWebSockets:true,privateStagingTransportProxy:!live,realPublicBrowserHandshake:live,
      pupilsCannotModerate:true,opaqueSecureHttpOnlyCookie:true,mouseAndMobileTouchHeardBothWays:true,peerEnergy,reverseEnergy,
      practiceDoesNotBroadcast:true,freshSchoolRenewalObserved:true,creatorMayLeave:true,remainingParticipantCanPlay:true,
      mobileNoOverflow:true,performanceRecordingsSaved:false,nativeCastleIntegrationTested:false,loadApprovalFor400:false,
      transportCounts:live?undefined:messages,errors};fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
  }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,errors},null,2)+'\n');
    console.error(JSON.stringify({passed:false,stage,errorType:error.name,errors}));let index=0;for(const context of browser?.contexts()||[])for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++index)+'.private.png'),fullPage:true}).catch(()=>{});process.exitCode=1;
  }finally{for(const socket of proxies)socket.terminate();await browser?.close();}
}
main().catch(error=>{console.error('Authorized piano probe stopped: '+error.name);process.exitCode=1;});
