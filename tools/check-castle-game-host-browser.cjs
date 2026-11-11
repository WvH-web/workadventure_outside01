'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {checkedCatalog}=require('../tests/fixtures/castle-offers.cjs');
const {GatewayError}=require('../ops/hall-audio/errors.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const output=storage.outputPath('castle-game-host-qa/'+new Date().toISOString().replace(/[:.]/g,'-'));
const origin='https://together.deine-schule.com',secret='isolated-host-browser-fixture-only';
async function main(){
  let offset=0,url='https://games.example.test/room/?code=one',holdContext,releaseContext;
  const now=()=>Date.now()+offset,errors=[],results=[],launches=[];
  const pupil={kind:'student',eligible:true,age:16,gradeLevel:10,classId:17};
  const profiles=new Map(['a','b'].map(id=>[id+'@invalid.local',pupil]));
  const server=createSchoolServer({config:{origin,secret,trustedProxyIps:[]},clock:now,
    lookup:async id=>({version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:now()}),
    getOffers:async()=>checkedCatalog(now(),{gamesarea01:{targetUrl:url}}),
    updateRoomLink:async body=>{if(body.pin!=='998877')throw new GatewayError(403,'wrong_pin');url=body.targetUrl;return {updated:true};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const local='http://127.0.0.1:'+server.address().port;
  const token=id=>new SignJWT({identifier:id+'@invalid.local',tags:['teacher']}).setProtectedHeader({alg:'HS256'})
    .setExpirationTime('15m').sign(new TextEncoder().encode(secret));
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    async function participant(id,width){
      const auth=await token(id),context=await browser.newContext({viewport:{width,height:950},isMobile:width<500,hasTouch:width<500});
      await context.addInitScript(({auth,id})=>{if(location.origin==='https://together.deine-schule.com'){
        localStorage.setItem('authToken',auth);localStorage.setItem('localUser',JSON.stringify({uuid:'fixture-'+id}));
      }},{auth,id});
      await context.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url());
        if(target.origin==='https://games.example.test'){
          launches.push(target.searchParams.get('code'));return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic game</title><p>Synthetic game room</p>'});
        }
        assert.equal(target.origin,origin,'No outside provider or school network in this fixture');
        if(target.pathname.startsWith('/castle-school/')){
          const response=await route.fetch({url:local+target.pathname,maxRedirects:0});
          if(target.pathname==='/castle-school/round-context'&&holdContext?.id===id){const entered=holdContext.entered;holdContext=null;entered();await new Promise(resolve=>{releaseContext=resolve;});}
          return route.fulfill({response});
        }
        if(target.pathname==='/castle-content/vendor/lucide.min.js')return route.fulfill({contentType:'text/javascript',path:path.join(__dirname,'../castle/vendor/lucide.min.js')});
        if(target.pathname==='/iframe_api.js')return route.fulfill({contentType:'text/javascript',body:''});
        throw Error('Unknown isolated route '+target.pathname);
      });
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/castle-school/games#gamesarea01');await page.locator('#lobby').waitFor({state:'visible'});
      return {page,context,id};
    }
    async function api(p,route,body){return p.page.evaluate(async({route,body})=>{
      const response=await fetch('/castle-school/'+route,{method:body===undefined?'GET':'POST',cache:'no-store',
        headers:{Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
      return {status:response.status,value:await response.json()};
    },{route,body});}
    async function remember(p,value){await p.page.evaluate(async value=>{const {RoundClient}=await import('/castle-school/round-client.js');
      const client=new RoundClient();client.remember(value);client.dispose();},value);}
    async function ready(p){await p.page.locator('#refresh').click();await p.page.locator('#round-place').filter({hasText:'Spielesaal'}).waitFor();}
    async function confirmed(p){await p.page.locator('#round-game-state[data-state="confirmed"]').waitFor();}
    async function waiting(p){await p.page.locator('#round-game-state[data-state="waiting"]').waitFor();}
    async function layout(p,name){
      assert.equal(await p.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' has no horizontal overflow');
      assert.deepEqual(await p.page.locator('button:visible').evaluateAll(buttons=>buttons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.textContent.trim())),[],name+' buttons fit');
      assert.ok(await p.page.locator('.round-host svg').count()>=2,'Real bundled icons rendered');
      await p.page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
    }
    async function play(p,code){const popup=p.context.waitForEvent('page');await p.page.locator('#join-game').click();const page=await popup;
      await page.waitForURL('https://games.example.test/room/?code='+code);assert.equal(await page.evaluate(()=>opener),null);await page.close();}
    const a=await participant('a',980),b=await participant('b',390);
    assert.equal(await a.page.locator('#back-rounds').isVisible(),false,'Direct game panels do not pretend to have the map API for a return trip');
    const made=await api(a,'round-create',{targetId:'spielesaal-lesekamin',kind:'talk',capacity:4});assert.equal(made.status,200);
    const roundId=made.value.round.id,joined=await api(b,'round-join',{roundId});assert.equal(joined.status,200);
    await remember(a,made.value);await remember(b,joined.value);await ready(a);await ready(b);
    await a.page.locator('#confirm-game').click();await confirmed(a);await confirmed(b);
    assert.equal(await b.page.locator('#confirm-game').isDisabled(),true,'No implicit takeover');
    assert.equal(await b.page.locator('#join').isVisible(),false,'The stored-link shortcut is not offered for an attached group game');
    await play(b,'one');await layout(a,'host-desktop');await layout(b,'peer-390');
    await a.page.locator('#end-game').click();await waiting(b);assert.equal(await b.page.locator('#join-game').isVisible(),false);
    assert.equal(await b.page.locator('#copy').isDisabled(),true,'An ended group game cannot copy the stale link through the shortcut');
    assert.equal((await api(b,'round-context')).value.rounds[0].registered,2,'Ending host confirmation leaves both conversation members');
    results.push({case:'two-browsers',explicitHost:true,peerFreshLaunch:true,popupNoOpener:true,automaticEndUpdate:true,conversationPreserved:true});
    await a.page.locator('#confirm-game').click();await confirmed(b);
    await b.page.locator('#host').evaluate(details=>{details.open=true;});
    await b.page.locator('#room-url').fill('https://games.example.test/room/?code=two');await b.page.locator('#pin').fill('998877');await b.page.locator('#save').click();
    await waiting(a);await b.page.locator('#current-url').filter({hasText:'code=two'}).waitFor();
    assert.equal((await api(b,'round-game-launch',{roundId})).status,409,'A link change needs an explicit new host confirmation');
    const stale=await api(a,'round-game-confirm',{leaseId:made.value.leaseId,resourceId:'gamesarea01',revision:1,targetUrl:'https://games.example.test/room/?code=one'});
    assert.equal(stale.status,409);await a.page.locator('#current-url').filter({hasText:'code=two'}).waitFor();
    await a.page.locator('#confirm-game').click();await confirmed(b);await play(b,'two');
    await api(a,'round-leave',{leaseId:made.value.leaseId});await waiting(b);
    await b.page.goto(origin+'/castle-school/rounds');await b.page.locator('.game-status').filter({hasText:'Gastgeber gesucht'}).waitFor();
    assert.equal(await b.page.locator('.round').count(),1);await b.page.getByRole('link',{name:'Spielangebot',exact:true}).click();
    await b.page.locator('#back-rounds').waitFor({state:'visible'});
    await b.page.locator('#confirm-game:not([disabled])').waitFor();await b.page.locator('#confirm-game').click();await confirmed(b);
    await b.page.setViewportSize({width:320,height:820});await layout(b,'replacement-host-320');await play(b,'two');
    const beforeNavigation=await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'));
    await b.page.locator('#back-rounds').click();await b.page.locator('.game-status').filter({hasText:'Gastgeber best\u00e4tigt'}).waitFor();
    await b.page.getByRole('link',{name:'Spielangebote',exact:true}).click();await b.page.locator('#offer-select').selectOption('gamesarea01');await confirmed(b);
    assert.equal(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),beforeNavigation,'Both directions preserve the same nonce, not an implicit reentry');
    results.push({case:'link-and-host-lifecycle',existingPinUpdaterReused:true,changedUrlInvalidatesConfirmation:true,staleDisplayCannotConfirmNewUrl:true,
      automaticDepartureUpdate:true,noAutomaticSuccessor:true,explicitReplacement:true,samePanelRoundNavigation:true,widths:[980,390,320]});
    let entered;const caught=new Promise(resolve=>{entered=resolve;});holdContext={id:'b',entered};
    await b.page.locator('#refresh').click();await caught;
    const changer=await b.context.newPage();await changer.goto(origin+'/castle-school/health');
    await changer.evaluate(auth=>{localStorage.setItem('localUser',JSON.stringify({uuid:'fixture-unverified'}));localStorage.setItem('authToken',auth);},await token('unverified'));
    releaseContext();releaseContext=null;
    await b.page.locator('#lobby').waitFor({state:'hidden'});
    assert.equal(await b.page.locator('#current-url').textContent(),'');assert.equal(await b.page.locator('#round-place').textContent(),'Noch keine Treffpunkt-Anmeldung');
    assert.equal(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),null);
    offset+=90001;const after=await api(a,'round-context');assert.equal(after.value.rounds.length,0,'Abandoned host lease expires without invented activity');
    results.push({case:'account-and-expiry',latePriorContextIgnored:true,accountChangeClearsHostUIAndBrowserLease:true,abandonedHostExpires:true});
    assert.deepEqual(errors,[]);assert.deepEqual(launches,['one','two','two']);
    const evidence={passed:true,results,errors,syntheticSchoolProfilesOnly:true,providerResponsesReplaced:true,nativeAudioNotTested:true,
      liveSchoolOrPortalChanged:false,published:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({...evidence,output}));
  }catch(error){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({passed:false,errorType:error.name,message:error.message},null,2)+'\n');throw error;}
  finally{if(releaseContext)releaseContext();if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
