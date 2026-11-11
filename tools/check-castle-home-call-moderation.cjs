'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright'),{createRehearsal}=require('./castle-home-rehearsal.cjs'),{client,socket}=require('./castle-home-test-client.cjs');
const {NAMESPACE}=require('../ops/castle-homes/calls.cjs');
async function main(){
 const output=path.resolve(__dirname,'../../output/castle-homes/call-moderation');await fs.mkdir(output,{recursive:true});
 const media=http.createServer(async(req,res)=>{for await(const _ of req){}res.setHeader('Content-Type','application/json');res.end(req.url.endsWith('/ListRooms')?'{"rooms":[]}':'{}');});await new Promise(resolve=>media.listen(0,'127.0.0.1',resolve));
 let fixture,browser,as,bs,stage='fixture';const errors=[],clients=[];
 try{
  const origin='127.0.0.1:'+media.address().port;fixture=await createRehearsal({moderationFixture:true,calls:{url:'ws://'+origin,apiURL:'http://'+origin,apiKey:'isolated-key',apiSecret:'s'.repeat(40),namespace:NAMESPACE,roles:['student','teacher'],fixedGroups:true}});
  const base=fixture.gateway.url,WS=require(path.join(fixture.source,'dorfplatz/node_modules/ws')),a=client(base,fixture.tokens.a),b=client(base,fixture.tokens.b);clients.push(a,b);
  await a.open();await b.open();await a.api('guest',{});await b.api('guest',{});const room=(await a.api('bedroom')).value;
  await a.api('visits',{action:'enter'});as=await socket(a,base,WS);await as.wait(row=>row.type==='room-state');await a.api('visits',{action:'open'});
  await b.api('visits',{action:'enter',code:room.code});bs=await socket(b,base,WS);await bs.wait(row=>row.type==='room-state'&&row.players.length===2);
  const join=()=>({action:'join',surface:'bedroom',mode:'group',requestId:crypto.randomUUID()}),first=(await a.api('proximity',join())).value,second=(await b.api('proximity',join())).value;
  await a.api('proximity',{action:'pulse',client:first.client});const contact=(await a.api('proximity/reports')).value.contacts[0];assert.ok(contact);
  const report=async()=>{const result=await a.api('proximity/reports',{contact:contact.id,reason:'worry',note:'<img src=x onerror=alert(1)> synthetic call report',requestId:crypto.randomUUID()});assert.equal(result.status,200);return result.value.id;};
  const original=await report();assert.equal((await b.api('moderation/proximity')).status,403);
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1000,height:800}});await context.addInitScript(token=>localStorage.setItem('authToken',token),fixture.tokens.m);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.name));page.on('dialog',dialog=>{errors.push('Unexpected dialog');void dialog.dismiss();});
  stage='call-tab';await page.goto(base+'#moderation');const frame=page.frameLocator('iframe[title="Gemeldete Zimmergespraeche"]');await frame.locator('#call-kind').click();await frame.locator('[data-report-id="'+original+'"]').waitFor();
  await frame.locator('.note').getByText('<img src=x onerror=alert(1)> synthetic call report',{exact:true}).waitFor();assert.equal(await frame.locator('img').count(),0);assert.equal(await frame.locator('.context .message').count(),0);
  await page.screenshot({path:path.join(output,'desktop.png')});await page.setViewportSize({width:320,height:740});assert.equal(await frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'compact.png')});
  stage='resolve';await frame.getByRole('button',{name:'Als erledigt markieren',exact:true}).click();await frame.locator('[data-report-id="'+original+'"]').waitFor({state:'hidden'});
  const next=await report();await frame.locator('#refresh').click();await frame.locator('[data-report-id="'+next+'"]').waitFor();
  stage='cancel-on-type-change';await frame.getByRole('button',{name:'Gespraechspause: 15 Minuten',exact:true}).click();await frame.locator('#confirm').waitFor({state:'visible'});
  await frame.locator('#confirm-cancel').click();await frame.locator('#chat-kind').click();await frame.locator('#call-kind').click();await frame.locator('[data-report-id="'+next+'"]').waitFor();
  stage='timeout';await frame.getByRole('button',{name:'Gespraechspause: 15 Minuten',exact:true}).click();await frame.getByRole('dialog').getByRole('button',{name:'Bestaetigen',exact:true}).click();await frame.locator('[data-report-id="'+next+'"]').waitFor({state:'hidden'});
  assert.equal((await b.api('proximity',{action:'pulse',client:second.client})).status,403);assert.equal((await b.api('bedroom')).status,200);
  stage='withdrawal';fixture.profiles.set('m@invalid.local',{sub:'wvh:staff:70',role:'teacher',grade:null,age:null,moderator:false,read_only:false});await frame.locator('#refresh').click();await frame.locator('#status').filter({hasText:/nicht freigegeben/}).waitFor();assert.equal(await frame.locator('.report').count(),0);
  assert.deepEqual(errors,[]);const proof={passed:true,browserVersion:browser.version(),syntheticPupilAndModeratorFixturesOnly:true,fakeMediaControl:true,realRoomAndReportEngine:true,
   callReportTabAndTextOnlyNote:true,compact320Fits:true,resolvePersisted:true,cancelAndTypeSwitchSafe:true,reportedParticipantCallTimeoutEnforced:true,
   roomStillAvailable:true,moderatorWithdrawalClearsReports:true,pupilModerationDenied:true,noAudioOrVideoRecorded:true,actualSfuMediaTested:false,realStaffImpersonated:false,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({stage,errorType:error.name,error:error.message},null,2)+'\n');console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;}
 finally{as?.ws.terminate();bs?.ws.terminate();for(const c of clients)await c.leave();if(browser){for(const context of browser.contexts())for(const page of context.pages())await page.locator('#leave').click({timeout:1000}).catch(()=>{});await browser.close();}await fixture?.close();media.closeAllConnections();await new Promise(resolve=>media.close(resolve));}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name}));process.exitCode=1;});
