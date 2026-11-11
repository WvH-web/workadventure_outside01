'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setTimeout:sleep}=require('node:timers/promises');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {offerCatalog}=require('../tests/fixtures/castle-offers.cjs');
const {validateOffers}=require('../ops/castle-school/offers.cjs');
const {GatewayError}=require('../ops/hall-audio/errors.cjs');
const output=require('./castle-local-storage.cjs').outputPath('castle-games/'+new Date().toISOString().replace(/[:.]/g,'-'));
async function main(){
 const secret='synthetic-browser-fixture-secret-not-a-school-key',profiles=new Map(),errors=[],results=[];
 let input=offerCatalog(Date.now()),updates=0,holdNext=false,held,release;
 const config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]};
 const lookup=async id=>({version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:Date.now()});
 const getOffers=async({fresh})=>{
  input.checkedAt=Date.now();const snapshot=validateOffers(input);
  if(fresh&&holdNext){holdNext=false;held=true;await new Promise(resolve=>{release=resolve;});held=false;}
  return snapshot;
 };
 const server=createSchoolServer({config,lookup,getOffers,updateRoomLink:async data=>{
  if(data.pin!=='998877')throw new GatewayError(403,'wrong_pin');updates++;input.offers.find(offer=>offer.id===data.resourceId).targetUrl=data.targetUrl;return {updated:true};
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin='http://127.0.0.1:'+server.address().port;
 const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
 const makeToken=async(id,profile)=>{
  if(profile)profiles.set(id,profile);
  return new SignJWT({identifier:id,username:'Synthetic browser participant',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(secret));
 };
 const student={kind:'student',eligible:true,age:16,gradeLevel:10,classId:17};
 const unknown=await makeToken('games-qa-unknown@invalid.local');
 let browser;
 const contexts=[];
 async function participant(id,profile,width=1100){
  const token=await makeToken(id,profile),context=await browser.newContext({viewport:{width,height:900}});contexts.push(context);
  await context.addInitScript(value=>localStorage.setItem('authToken',value),token);
  await context.route('**/castle-content/vendor/lucide.min.js',route=>route.fulfill({path:path.resolve(__dirname,'../castle/vendor/lucide.min.js'),contentType:'text/javascript'}));
  await context.route('https://games.example.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><title>QA Spiel</title><body style="background:#d8e4cb;color:#203b29;font:20px system-ui;padding:30px">Synthetische Spielrunde</body></html>'}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(config.origin+'/castle-school/games');await page.locator('nav button').first().waitFor({state:'attached'});
  return {page,context,token,id};
 }
 async function choose(page,id){if(await page.locator('#offer-select').isVisible())await page.locator('#offer-select').selectOption(id);else await page.locator(`[data-game-id="${id}"]`).click();}
 async function select(page,id='gamesarea01'){await choose(page,id);await page.locator('#lobby').waitFor({state:'visible'});}
 async function current(page,code){await page.waitForFunction(code=>document.getElementById('current-url').textContent.endsWith('code='+code),code);}
 async function save(page,url,pin){await page.locator('#host').evaluate(details=>{details.open=true;});await page.locator('#room-url').fill(url);await page.locator('#pin').fill(pin);await page.locator('#save').click();}
 async function layout(page,label){
  const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,icons:[...document.querySelectorAll('svg')].filter(el=>el.getClientRects().length).length,
   clipped:[...document.querySelectorAll('h1,h2,label,nav .game-name,button span')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())}));
  assert.equal(data.overflow,false,label);assert.deepEqual(data.clipped,[],label);assert.ok(data.icons>4,label+' icons');results.push({label,...data});
 }
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [1440,390,320]){
   input.offers[2].title='Gemeinsame Spielrunde mit abenteuerlichen Geschichten und einem sehr langen Angebotsnamen';
   const {page,context}=await participant(`games-layout-${width}@invalid.local`,student,width);
   await select(page);await current(page,'one');await layout(page,'lobby-'+width);
   await page.screenshot({path:path.join(output,'lobby-'+width+'.png'),fullPage:true});
   await page.locator('#host').evaluate(details=>{details.open=true;});await layout(page,'form-'+width);
   await page.screenshot({path:path.join(output,'form-'+width+'.png'),fullPage:true});await context.close();
  }
  input.offers[2].title='Gemeinsame Spielrunde';
  const a=await participant('games-qa-a@invalid.local',student),b=await participant('games-qa-b@invalid.local',student);
  await select(a.page);await select(b.page);await current(a.page,'one');await current(b.page,'one');
  await save(a.page,'https://games.example.test/room/?code=two','123456');await a.page.getByText('Die Moderator-PIN stimmt nicht.',{exact:true}).waitFor();
  assert.equal(updates,0);assert.equal(await a.page.locator('#pin').inputValue(),'');await current(a.page,'one');
  await b.page.locator('#host').evaluate(details=>{details.open=true;});await b.page.locator('#room-url').fill('https://games.example.test/room/?code=unsaved');
  await save(a.page,'https://games.example.test/room/?code=two','998877');await current(a.page,'two');await current(b.page,'two');
  assert.equal(await b.page.locator('#room-url').inputValue(),'https://games.example.test/room/?code=unsaved');assert.equal(updates,1);
  assert.equal(await a.page.locator('#pin').inputValue(),'');assert.equal(await a.page.locator('#message').textContent(),'Raumlink gespeichert.');
  results.push({label:'two-participants',wrongPinRejected:true,immediateSubmitUpdate:true,otherParticipantAutoUpdated:true,dirtyDraftPreserved:true});
  input.offers[2].targetUrl='https://games.example.test/room/?code=three';
  const popupPromise=b.context.waitForEvent('page');await b.page.locator('#join').click();const popup=await popupPromise;
  await popup.waitForURL('https://games.example.test/room/?code=three');assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
  await current(b.page,'three');await b.context.close();
  const before=updates;await save(a.page,'https://unreviewed.example.test/room/','998877');await a.page.getByText('Der neue Link liegt au\u00dferhalb des freigegebenen Anbieterbereichs.',{exact:true}).waitFor();assert.equal(updates,before);
  // Hold an older resolution across a successful edit: it must neither be reused nor overwrite the new link.
  holdNext=true;await a.page.locator('#refresh').click();for(let n=0;n<50&&!held;n++)await sleep(40);assert.equal(held,true);
  await save(a.page,'https://games.example.test/room/?code=four','998877');await current(a.page,'four');release();await sleep(200);await current(a.page,'four');
  // A genuine cross-document storage event changes accounts while an older launch is still pending.
  holdNext=true;await a.page.locator('#refresh').click();for(let n=0;n<50&&!held;n++)await sleep(40);assert.equal(held,true);
  const changer=await a.context.newPage();await changer.goto(config.origin+'/castle-school/health');await changer.evaluate(token=>localStorage.setItem('authToken',token),unknown);
  await a.page.getByText('Keine Schulfreigabe f\u00fcr dieses Konto',{exact:true}).waitFor();release();await sleep(200);
  assert.equal(await a.page.locator('#current-url').textContent(),'');assert.equal(await a.page.locator('#viewer iframe').count(),0);
  assert.equal(await a.page.locator('nav button[data-state=ready]').count(),0);await changer.close();await a.context.close();
  results.push({label:'freshness-and-account-change',joinUsesLatestUrl:true,popupHasNoOpener:true,changedProviderRejected:true,lateOldResolutionIgnored:true,accountSwitchClearsLinks:true});
  input.offers[2].presentation='side';input.offers[2].revision++;
  const c=await participant('games-qa-c@invalid.local',student,390);await select(c.page);await c.page.locator('#join').click();
  await c.page.locator('#viewer iframe').waitFor();await c.page.frameLocator('#viewer iframe').getByText('Synthetische Spielrunde').waitFor();
  assert.equal(await c.page.locator('#viewer iframe').getAttribute('allow'),'autoplay; fullscreen');await layout(c.page,'side-game-390');
  await c.page.screenshot({path:path.join(output,'side-390.png'),fullPage:true});
  profiles.set(c.id,{...student,age:14});await c.page.locator('#refresh').click();await c.page.locator('#lobby').waitFor({state:'hidden'});assert.equal(await c.page.locator('#viewer iframe').count(),0);
  const direct=await c.page.evaluate(async token=>{const response=await fetch('/castle-school/launch',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({resourceId:'gamesarea01'})});return {status:response.status,body:await response.json()};},c.token);
  assert.deepEqual(direct,{status:403,body:{error:'not_allowed'}});await c.context.close();
  const teacher=await participant('games-qa-staff@invalid.local',{kind:'staff',eligible:true,age:null,gradeLevel:null,classId:null},320);
  await select(teacher.page,'stumbleguysgame');assert.equal(await teacher.page.locator('#mode').textContent(),'Entwurf \u00b7 Vorschau');
  await choose(teacher.page,'gamesarea02');await teacher.page.locator('#availability').filter({hasText:'Noch nicht eingerichtet'}).waitFor();assert.equal(await teacher.page.locator('#lobby').isVisible(),false);
  await teacher.context.close();
  results.push({label:'server-enforced-access',ownedSideFrameWorks:true,permissionLossClosesFrame:true,directLaunchDenied:true,staffPreviewLabelled:true,missingTargetsStayEmpty:true});
  assert.deepEqual(errors,[]);
  const evidence={passed:true,syntheticProfilesOnly:true,realPupilAccountsUsed:false,externalProviderGameTested:false,schoolPinUsed:false,errors,results};
  fs.writeFileSync(path.join(output,'browser-check.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
 }finally{if(release)release();if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
