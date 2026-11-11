'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {createSchoolServer}=require('../ops/castle-school/server.cjs');
const {checkedCatalog}=require('../tests/fixtures/castle-offers.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com';
const out=path.resolve(root,'../output/castle-rounds-browser-qa');
const secret='isolated-synthetic-rounds-browser-test-only';
async function main(){
  fs.mkdirSync(out,{recursive:true});let lookupCalls=0;
  const profiles=new Map(['a','b','c'].map(id=>[id+'@invalid.local',{version:1,kind:'student',eligible:true,
    age:id==='a'?9:13,gradeLevel:id==='a'?3:7,classId:id==='a'?99:17}]));
  const server=createSchoolServer({config:{origin,secret,trustedProxyIps:[]},lookup:async id=>{
    lookupCalls++;return {...profiles.get(id),checkedAt:Date.now()};},getOffers:async()=>checkedCatalog(Date.now()),
    updateRoomLink:async()=>{throw Error('No portal writes in browser fixture');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const local='http://127.0.0.1:'+server.address().port;
  let browser;const errors=[],results=[];
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    async function tokenFor(id){return new SignJWT({identifier:id+'@invalid.local'}).setProtectedHeader({alg:'HS256'})
      .setExpirationTime('1h').sign(new TextEncoder().encode(secret));}
    async function pupil(id,width=780){
      const token=await tokenFor(id);
      const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=390,isMobile:width<=390});
      await context.addInitScript(({token,id})=>{
        if(location.origin==='https://together.deine-schule.com'&&window.parent===window){
          localStorage.setItem('authToken',token);localStorage.setItem('localUser',JSON.stringify({uuid:'fixture-'+id}));
        }
      },{token,id});
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());assert.equal(url.origin,origin,'No external network in isolated fixture');
        if(url.pathname.startsWith('/castle-school/'))return route.fulfill({response:await route.fetch({url:local+url.pathname+url.search,maxRedirects:0})});
        const files={'/fixture':'tests/fixtures/castle-rounds-browser.html','/fixture/community.js':'castle/community.js',
          '/fixture/ui-ids.js':'castle/ui-ids.js','/castle-content/vendor/lucide.min.js':'castle/vendor/lucide.min.js'};
        if(url.pathname==='/iframe_api.js')return route.fulfill({contentType:'text/javascript',body:'window.WA=window.parent.fixture.wa;'});
        const file=files[url.pathname];if(!file)throw Error('Unknown fixture path '+url.pathname);
        return route.fulfill({contentType:url.pathname==='/fixture'?'text/html':'text/javascript',body:fs.readFileSync(path.join(root,file))});
      });
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/fixture');await page.getByRole('button',{name:'Runden',exact:true}).waitFor();
      return {context,page,id,width};
    }
    async function panel(p){
      await p.page.getByRole('button',{name:'Runden',exact:true}).click();
      await p.page.locator('#panel').waitFor();const frame=await p.page.locator('#panel').contentFrame();
      await frame.locator('#target option').first().waitFor({state:'attached'});return frame;
    }
    async function refresh(frame){
      const native=await (await frame.locator('body').elementHandle()).ownerFrame();
      const response=native.page().waitForResponse(response=>response.url()===origin+'/castle-school/round-context'&&response.frame()===native);
      await frame.getByRole('button',{name:'Aktualisieren',exact:true}).click();await (await response).finished();
      await frame.locator('html').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    async function count(frame,n){await frame.locator('.round small').first().filter({hasText:n+' von '}).waitFor();}
    async function settled(p,n=1){
      await p.page.waitForFunction(n=>window.fixture.events.filter(event=>event.type==='teleport').length>=n,n);
      await p.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundJourneyV1'));
      assert.equal(await p.page.locator('#panel').count(),0,'Native controller closes only its own round panel');
    }
    async function announce(p,target,kind,capacity=4){
      const frame=await panel(p);await frame.locator('#create-panel').evaluate(element=>{element.open=true;});
      await frame.locator('#target').selectOption(target);await frame.locator('#kind').selectOption(kind);
      await frame.locator('#capacity').fill(String(capacity));await frame.getByRole('button',{name:'Runde anbieten',exact:true}).click();
      await settled(p);return JSON.parse(await p.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'))).roundId;
    }
    async function layout(p,frame,name){
      if(p.width>650){
        assert.equal(await frame.locator('#target').isVisible(),true,'Desktop form is expanded and usable');
        await frame.locator('summary').click();assert.equal(await frame.locator('#target').isVisible(),false);
        await frame.locator('summary').click();assert.equal(await frame.locator('#target').isVisible(),true);
      }
      assert.equal(await frame.locator('html').evaluate(element=>element.scrollWidth>innerWidth),false,'No horizontal overflow');
      for(const button of await frame.locator('button:visible').all())assert.equal(await button.evaluate(element=>element.scrollWidth>element.clientWidth+1),false,'No clipped buttons');
      assert.ok(await frame.locator('.round img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),'Actual room thumbnails render');
      await p.page.screenshot({path:path.join(out,name+'.png')});
      if(p.width<=390){
        await frame.locator('#create-panel').evaluate(element=>{element.open=true;});
        assert.equal(await frame.locator('#target').isVisible(),true,'Mobile form can expand');
        assert.equal(await frame.locator('html').evaluate(element=>element.scrollWidth>innerWidth),false);
        await p.page.screenshot({path:path.join(out,name+'-expanded.png')});
        await p.page.setViewportSize({width:p.width,height:513});
        assert.equal(await frame.locator('html').evaluate(element=>element.scrollWidth>innerWidth),false,'Compact native-height frame has no horizontal overflow');
        await p.page.screenshot({path:path.join(out,name+'-compact.png')});
        await p.page.setViewportSize({width:p.width,height:900});
        await frame.locator('#create-panel').evaluate(element=>{element.open=false;});
      }
    }
    const a=await pupil('a'),b=await pupil('b',390),c=await pupil('c',320);
    await a.page.waitForTimeout(1500);assert.equal(lookupCalls,0,'Idle bridge does not fetch school data');
    const roundId=await announce(a,'bibliothek-lesekamin','read');
    const bf=await panel(b);await count(bf,1);
    assert.equal(await bf.locator('#target option[value^="grundschule-"]').count(),0);
    assert.ok(await bf.locator('#target option[value^="mittelstufe-"]').count()>0);
    await bf.locator('.round').getByRole('button',{name:'Mitmachen',exact:true}).click();await settled(b);
    let af=await panel(a);await count(af,2);
    assert.equal(await af.locator('#target option[value^="mittelstufe-"]').count(),0);
    const cf=await panel(c);await count(cf,2);await layout(c,cf,'rounds-320');
    await cf.locator('.round').getByRole('button',{name:'Treffpunkt besuchen',exact:true}).click();await settled(c);
    assert.equal(await c.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),null,'Visitor is not counted');
    await a.page.waitForTimeout(250);await refresh(af);await count(af,2);await layout(a,af,'rounds-780');
    await af.getByRole('button',{name:'Abmelden',exact:true}).click();await af.locator('#mine').waitFor({state:'hidden'});
    let next=await panel(b);await count(next,1);await layout(b,next,'rounds-390');
    const oldLease=await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'));
    await b.context.route(origin+'/castle-school/round-heartbeat',route=>route.fulfill({status:503,contentType:'application/json',
      headers:{'Retry-After':'1'},body:JSON.stringify({error:'unavailable'})}),{times:1});
    const overloaded=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===503);
    await b.page.evaluate(()=>window.fixture.enter('bibliothek'));await (await overloaded).finished();
    assert.equal(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),oldLease,'A simulated pre-admission overload keeps only the previously confirmed opaque lease');
    const recovered=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===200,{timeout:10000});
    await (await recovered).finished();
    await b.page.waitForFunction(before=>JSON.parse(sessionStorage.getItem('castleRoundMembershipV1')).confirmedUntil>before,JSON.parse(oldLease).confirmedUntil);
    const leaseIdentity=raw=>{const {roundId,leaseId,scope}=JSON.parse(raw);return {roundId,leaseId,scope};};
    assert.deepEqual(leaseIdentity(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'))),leaseIdentity(oldLease),'Recreated bridge renews the same registration without rotating nonce');
    next=await panel(b);await count(next,1);
    await next.locator('.round').getByRole('button',{name:'Zur Runde',exact:true}).click();await settled(b,2);
    assert.notEqual(leaseIdentity(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1'))).leaseId,leaseIdentity(oldLease).leaseId,'Explicit return safely rotates the old nonce');
    const heartbeat=b.page.waitForResponse(response=>response.url()===origin+'/castle-school/round-heartbeat'&&response.status()===200,{timeout:30000});
    assert.equal(await b.page.locator('#panel').count(),0);await (await heartbeat).finished();
    assert.ok(await b.page.evaluate(()=>Boolean(sessionStorage.getItem('castleRoundMembershipV1'))),'Closed directory keeps voluntary membership through the private bridge');
    results.push({case:'same-room',twoIndependentRegisteredPupils:true,visitorNotCounted:true,creatorCanLeave:true,
      bridgeRecreatedWithoutReplayingTravel:true,simulatedPreAdmission503RecoversSameLease:true,expiryRenewedFromFreshResponse:true,
      explicitReentryRotatesLease:true,heartbeatWithoutOpenDirectory:true,normalClassRules:true,widths:[320,390,780]});
    const otherId=await announce(a,'atelier-buchclub','draw');
    await a.page.waitForFunction(()=>window.fixture.room()==='atelier');
    assert.ok((await a.page.evaluate(()=>window.fixture.events)).some(event=>event.type==='travel'&&event.url.endsWith('/atelier.wam#start')));
    const af2=await panel(a);await count(af2,1);
    next=await panel(b);await refresh(next);await next.locator('[data-round-id="'+otherId+'"]').waitFor();
    await next.locator('[data-round-id="'+otherId+'"]').getByRole('button',{name:'Treffpunkt besuchen',exact:true}).click();await settled(b,3);
    assert.equal(await b.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),null,'Visiting another group removes only the previous registration');
    await refresh(af2);await af2.locator('[data-round-id="'+roundId+'"]').waitFor({state:'detached'});await count(af2,1);
    await a.page.evaluate(()=>window.fixture.move(8000,8000));
    await a.page.waitForFunction(()=>!sessionStorage.getItem('castleRoundMembershipV1'));
    await refresh(af2);await af2.locator('.round').waitFor({state:'detached'});
    results.push({case:'cross-room',normalDepartureCleanup:true,visitDropsPreviousRegistration:true,lastDepartureRemovesAnnouncement:true,
      noGameOrSeatTaken:true,serverFreshProfileOnEveryRequest:true});
    const oldCount=await a.page.evaluate(()=>window.fixture.events.filter(event=>event.type==='teleport').length);
    const gsFrame=await panel(a);await gsFrame.locator('#create-panel').evaluate(element=>{element.open=true;});
    await gsFrame.locator('#target').selectOption('grundschule-lesekamin');await gsFrame.locator('#kind').selectOption('talk');
    await gsFrame.getByRole('button',{name:'Runde anbieten',exact:true}).click();await settled(a,oldCount+1);
    const switched=await panel(a);await count(switched,1);
    let release,entered;const delayed=new Promise(resolve=>release=resolve),caught=new Promise(resolve=>entered=resolve);
    await a.context.route(origin+'/castle-school/round-context',async route=>{
      const response=await route.fetch({url:local+'/castle-school/round-context',maxRedirects:0});entered();await delayed;
      await route.fulfill({response}).catch(()=>{});
    },{times:1});
    await switched.getByRole('button',{name:'Aktualisieren',exact:true}).click();await caught;
    profiles.set('d@invalid.local',{...profiles.get('b@invalid.local')});
    await a.page.evaluate(({token})=>{localStorage.setItem('localUser',JSON.stringify({uuid:'fixture-d'}));localStorage.setItem('authToken',token);},{token:await tokenFor('d')});
    release();
    await switched.locator('#target option[value^="mittelstufe-"]').first().waitFor({state:'attached'});
    assert.equal(await switched.locator('#target option[value^="grundschule-"]').count(),0,'Late context cannot restore previous cohort');
    assert.equal(await switched.locator('.round').count(),0);assert.equal(await switched.locator('#mine').isVisible(),false);
    assert.equal(await a.page.evaluate(()=>sessionStorage.getItem('castleRoundMembershipV1')),null,'Account switch clears only browser-owned membership');
    profiles.set('d@invalid.local',{...profiles.get('d@invalid.local'),kind:'parent',age:null,gradeLevel:null,classId:null});
    await refresh(switched);await switched.locator('#account').filter({hasText:'Keine best'}).waitFor();
    assert.equal(await switched.locator('#target option').count(),0);assert.equal(await switched.locator('.round').count(),0);
    assert.equal(await switched.locator('#announce').isDisabled(),true);
    results.push({case:'account-boundary',inFlightOldContextCannotRestorePriorCohort:true,browserMembershipClearedOnAccountChange:true,
      freshRevocationRemovesAllOwnedTargets:true,noRoleOrClassFromBrowser:true});
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,results,errors,lookupCalls,
      scope:'Actual server, native community module and browser frames with synthetic school profiles and mocked native movement; no live school or portal writes',
      liveOrAudioCapacityProof:false},null,2)+'\n');
    console.log(JSON.stringify({passed:true,cases:results.length,widths:[320,390,780],lookupCalls,errors,isolated:true}));
  }finally{
    if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
