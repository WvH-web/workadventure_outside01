'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises');
const {setTimeout:delay}=require('node:timers/promises');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {createRehearsal}=require('./castle-home-rehearsal.cjs'),{client,socket}=require('./castle-home-test-client.cjs');
async function main(){
 const fixture=await createRehearsal({moderationFixture:true}),base=fixture.gateway.url;
 const output=path.resolve(__dirname,'../../output/castle-homes/moderation-browser');await fs.mkdir(output,{recursive:true});
 const a=client(base,fixture.tokens.a),b=client(base,fixture.tokens.b),WS=require(path.join(fixture.source,'dorfplatz/node_modules/ws'));let as,bs;
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];let stage='fixture';
 try{
  await a.open();await b.open();await a.api('guest',{});await b.api('guest',{});const room=(await a.api('bedroom')).value;
  await a.api('visits',{action:'enter'});as=await socket(a,base,WS);await as.wait(row=>row.type==='room-state');await a.api('visits',{action:'open'});
  await b.api('visits',{action:'enter',code:room.code});bs=await socket(b,base,WS);await bs.wait(row=>row.type==='room-state'&&row.players.length===2);
  const reports=[];for(const reason of ['other','personal','unkind']){
   const sent=await a.api('visits',{action:'chat',phrase:'welcome',nonce:crypto.randomUUID()});assert.equal(sent.status,200);await bs.wait(row=>row.type==='room-chat'&&row.message.id===sent.value.message.id);
   const reported=await b.api('visits',{action:'report',message:sent.value.message.id,reason,note:'<img src=x onerror=alert(1)> synthetic fixture'});assert.equal(reported.status,200);reports.push(reported.value.id);if(reports.length<3)await delay(2100);
  }
  assert.equal((await b.api('moderation/chat')).status,403);
  stage='moderator-interface';const context=await browser.newContext({viewport:{width:1000,height:800}});await context.addInitScript(token=>{if(!sessionStorage.getItem('fixture-auth')){localStorage.setItem('authToken',token);sessionStorage.setItem('fixture-auth','1');}},fixture.tokens.m);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.name));page.on('dialog',dialog=>{errors.push('Unexpected browser dialog');void dialog.dismiss();});
  await page.goto(base+'#moderation',{waitUntil:'domcontentloaded'});const frame=page.frameLocator('iframe[title="Gemeldete Zimmergespraeche"]');
  await frame.locator('.report').first().waitFor();assert.equal(await frame.locator('.report').count(),3);
  await frame.locator('[data-report-id="'+reports[0]+'"]').click();await frame.locator('.note').getByText('<img src=x onerror=alert(1)> synthetic fixture',{exact:true}).waitFor();
  assert.equal(await frame.locator('img').count(),0);await page.screenshot({path:path.join(output,'desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'mobile.png')});
  stage='resolve';await frame.getByRole('button',{name:'Als erledigt markieren',exact:true}).click();await frame.locator('[data-report-id="'+reports[0]+'"]').waitFor({state:'hidden'});
  stage='timeout';await frame.locator('[data-report-id="'+reports[1]+'"]').click();await frame.getByRole('button',{name:'Schreibpause: 15 Minuten',exact:true}).click();await frame.getByRole('dialog').getByRole('button',{name:'Bestaetigen',exact:true}).click();
  await frame.locator('[data-report-id="'+reports[1]+'"]').waitFor({state:'hidden'});assert.equal((await a.api('visits',{action:'chat',phrase:'hello',nonce:crypto.randomUUID()})).status,403);
  stage='close';await frame.locator('[data-report-id="'+reports[2]+'"]').click();await frame.getByRole('button',{name:'Zimmerbesuche schliessen: 15 Minuten',exact:true}).click();await frame.getByRole('dialog').getByRole('button',{name:'Bestaetigen',exact:true}).click();await bs.wait(row=>row.type==='room-left');
  await frame.locator('#empty').waitFor({state:'visible'});await frame.locator('#handled').click();assert.equal(await frame.locator('.report').count(),3);
  stage='withdrawal';fixture.profiles.set('m@invalid.local',{sub:'wvh:staff:70',role:'teacher',grade:null,age:null,moderator:false,read_only:false});
  await frame.locator('#refresh').click();await frame.locator('#status').filter({hasText:/nicht freigegeben/}).waitFor();assert.equal(await frame.locator('.report').count(),0);assert.equal(await frame.locator('.context .message').count(),0);
  stage='pupil-denial';const student=await browser.newContext();await student.addInitScript(token=>localStorage.setItem('authToken',token),fixture.tokens.b);const blocked=await student.newPage();await blocked.goto(base+'#moderation');await blocked.locator('#message').filter({hasText:/nicht freigegeben/}).waitFor();assert.equal(await blocked.locator('iframe').count(),0);
  assert.deepEqual(errors,[]);const proof={passed:true,browserVersion:browser.version(),originalRoomReportEngine:true,syntheticPupilAndStaffFixturesOnly:true,
   reportsCreatedFromActuallyReceivedMessages:true,moderatorViewAndCommands:true,resolvePersisted:true,senderTimeoutEnforced:true,guestVisitClosed:true,
   untrustedNoteRenderedAsText:true,mobileFits:true,withdrawalClearsReports:true,pupilCannotOpenModeration:true,
   liveSchoolDataUsed:false,realStaffImpersonated:false,normalMicrosoftLoginTested:false,networkInterception:false,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({stage,name:error.name,message:error.message},null,2)+'\n');console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;}
 finally{as?.ws.terminate();bs?.ws.terminate();for(const context of browser.contexts())for(const page of context.pages())await page.locator('#leave').click({timeout:1000}).catch(()=>{});await browser.close();await fixture.close();}
}
main().catch(error=>{console.error('Moderation fixture stopped: '+error.name);process.exitCode=1;});
