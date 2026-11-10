'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('./castle-deps.cjs')('playwright'),{createRehearsal}=require('./castle-home-rehearsal.cjs');
async function main(){
 const fixture=await createRehearsal(),output=path.resolve(__dirname,'../../output/castle-homes/browser');await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],clients=[],errors=[],failures=[],results=[];
 try{
  for(const [who,viewport]of [['a',{width:1000,height:900}],['b',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,isMobile:who==='b',hasTouch:who==='b'});contexts.push(context);
   await context.addInitScript(token=>{if(!sessionStorage.getItem('castle-test-auth-initialized')){localStorage.setItem('authToken',token);sessionStorage.setItem('castle-test-auth-initialized','1');}},fixture.tokens[who]);const page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.name+': '+error.message));page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))failures.push({status:response.status(),path:new URL(response.url()).pathname});});
   await page.goto(fixture.gateway.url,{waitUntil:'domcontentloaded'});const frame=page.frameLocator('iframe[title="Dein Schlosszimmer"]');
   await frame.locator('#loading').waitFor({state:'hidden',timeout:20000});await frame.locator('#saved').filter({hasText:/gespeichert|geladen/i}).waitFor({timeout:10000});
   const pixels=await frame.locator('#room').evaluate(async canvas=>{const until=performance.now()+4000;let sample;do{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let opaque=0,lit=0;const colors=new Set();for(let i=0;i<data.length;i+=4*47){if(data[i+3])opaque++;if(data[i]+data[i+1]+data[i+2]>90)lit++;colors.add(data[i]+','+data[i+1]+','+data[i+2]);}sample={opaque,lit,colors:colors.size,width:canvas.width,height:canvas.height};if(opaque>1000&&lit>1000&&colors.size>100)return sample;await new Promise(resolve=>setTimeout(resolve,50));}while(performance.now()<until);return sample;});
   await page.screenshot({path:path.join(output,who+'-loaded.private.png'),fullPage:true});
   assert.ok(pixels.opaque>1000&&pixels.lit>1000&&pixels.colors>100,'The actual room bitmap must be rendered: '+JSON.stringify(pixels));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false,'Room content must fit the frame');
   await frame.locator('#walk-mode').click();await frame.locator('#edit-mode').click();
   await frame.locator('.social-tab').click();await frame.locator('.social-tab').click();
   await frame.locator('.room-social-panel').waitFor({state:'visible'});
   await page.screenshot({path:path.join(output,who==='a'?'desktop.private.png':'mobile.private.png'),fullPage:true});
   if(who==='b'){
    await page.setViewportSize({width:320,height:740});await page.waitForTimeout(200);assert.equal(await frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);
    await frame.locator('.social-tab').click();await frame.locator('.shop').waitFor({state:'visible'});
    const clipped=await frame.locator('body').evaluate(()=>[...document.querySelectorAll('button,h1,h2,h3')].filter(element=>element.getClientRects().length&&element.clientWidth&&element.scrollWidth>element.clientWidth+2).map(element=>({tag:element.tagName,text:element.textContent.slice(0,70)})));
    assert.deepEqual(clipped,[],'Compact controls and catalog text must fit');await page.screenshot({path:path.join(output,'mobile-320.private.png'),fullPage:true});
    await frame.locator('.social-tab').click();await page.setViewportSize(viewport);
   }
   results.push({account:who,viewport,canvas:pixels,frameContentLoaded:true,noHorizontalOverflow:true,walkEditAndSocialControls:true});
   clients.push({page,frame});
  }
  const [a,b]=clients;await a.page.bringToFront();await a.frame.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  await a.frame.getByRole('button',{name:'Zimmer schließen',exact:true}).waitFor();
  await a.frame.locator('body').evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__testInvitation=value;}}});});
  await a.frame.getByRole('button',{name:'Einladung kopieren',exact:true}).click();
  const invitation=await a.frame.locator('body').evaluate(()=>window.__testInvitation),target=new URL(invitation);
  assert.equal(target.origin,new URL(fixture.gateway.url).origin);assert.equal(target.pathname,'/castle-homes/');assert.match(target.searchParams.get('besuch'),/^[A-F0-9]{10}$/);
  assert.equal(invitation.includes('/view/'),false);
  await b.page.bringToFront();await b.page.goto(invitation,{waitUntil:'domcontentloaded'});
  await b.frame.locator('#loading').waitFor({state:'hidden',timeout:20000});await b.frame.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();
  await b.frame.getByRole('button',{name:'Hallo zusammen!',exact:true}).click();
  await a.frame.locator('.social-log').getByText('Hallo zusammen!',{exact:true}).waitFor();
  await b.page.screenshot({path:path.join(output,'mobile-visit.private.png'),fullPage:true});
  const oldUrl=await b.page.locator('iframe').getAttribute('src');
  await b.page.evaluate(token=>localStorage.setItem('authToken',token),fixture.tokens.a);
  await b.page.waitForFunction(old=>{const next=document.querySelector('iframe')?.getAttribute('src');return next&&next!==old;},oldUrl);
  await b.frame.locator('#loading').waitFor({state:'hidden',timeout:20000});
  await b.frame.locator('h1').filter({hasText:'Mein Schlosszimmer'}).waitFor();
  const currentUrl=await b.page.locator('iframe').getAttribute('src');await b.page.waitForTimeout(2200);
  assert.equal(await b.page.locator('iframe').getAttribute('src'),currentUrl);
  assert.equal(await b.page.evaluate(()=>localStorage.getItem('authToken')),fixture.tokens.a);
  const ownerA=await a.frame.locator('body').evaluate(async()=>{const response=await fetch('../api/bedroom');return (await response.json()).me.id;});
  const switched=await b.frame.locator('body').evaluate(async()=>{const response=await fetch('../api/bedroom');return (await response.json()).me.id;});assert.equal(switched,ownerA);
  await a.page.locator('#leave').click();await b.frame.locator('.social-status').filter({hasText:/Dein Zimmer.*1 von 8/}).waitFor();
  await b.page.waitForTimeout(300);assert.equal(await b.page.locator('iframe').getAttribute('src'),currentUrl);
  assert.equal(await b.frame.locator('body').evaluate(async()=>{const response=await fetch('../api/bedroom');return response.status;}),200);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const proof={passed:true,browserVersion:browser.version(),results,errors,failures,networkInterceptions:false,syntheticAccountsOnly:true,
   invitationUsesPublicEntry:true,privateGuestVisitAndReceivedPhrase:true,accountSwitchChangesView:true,changedAccountOwnRoomVerified:true,stableAcrossAuthPolls:true,
   compact320CatalogFits:true,sameAccountDeviceDepartureIsolation:true,clipboardWriteStubbed:true,
   normalMicrosoftLoginTested:false,nativeWorkAdventureTested:false,voiceTested:false};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }finally{for(const context of contexts)await context.close();await browser.close();await fixture.close();}
}
main().catch(error=>{console.error('Home browser check failed: '+error.name+' '+error.message);process.exitCode=1;});
