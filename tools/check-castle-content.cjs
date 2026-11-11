const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.resolve(__dirname,'..'),live=process.argv.includes('--live');
const out=path.resolve(root,'../output/castle-content-'+(live?'live-':'')+'qa');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:4192/',api='https://deutsche-online-schule.com/schooltools/verwaltung/api/';
const hosted='https://together.deine-schule.com/castle-content/';
const viewports=[{width:320,height:740},{width:390,height:844},{width:780,height:900}];
async function layout(page){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow');
  assert.equal(await page.locator('header').evaluate(e=>e.getBoundingClientRect().right>innerWidth),false);
  for(const button of await page.locator('button:visible').all())assert.equal(await button.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Clipped button');
}
async function refresh(page){
  const response=page.waitForResponse(response=>response.url().startsWith(api+'workadventure_museum.php'));
  await page.getByRole('button',{name:'Aktualisieren',exact:true}).click();await (await response).finished();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const viewport of viewports){
      const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
      if(!live)await page.route(hosted+'**',route=>{
        const name=new URL(route.request().url()).pathname.slice('/castle-content/'.length);
        const types={'collection.html':'text/html','collection.css':'text/css','collection.js':'text/javascript','catalog.js':'text/javascript','tour-state.js':'text/javascript','vendor/lucide.min.js':'text/javascript'};
        if(!Object.hasOwn(types,name))return route.fulfill({status:404,body:''});
        return route.fulfill({contentType:types[name],headers:{'x-frame-options':'SAMEORIGIN'},body:fs.readFileSync(path.join(root,'castle',name))});
      });
      let change=0,fail=false,withdrawn=false,contentVersion=0,stamp='',openRequests=0;
      await page.route(api+'workadventure_museum.php*',route=>route.fulfill({status:fail?503:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({items:[
        {board:withdrawn?'show3':'show1',title:change?'Neue Ausstellung':'Unsere gemeinsame Ausstellung mit einem besonders langen Titel zum Pruefen des Zeilenumbruchs',image_url:api+'museum_asset.php?f=museum',target_url:'https://not-a-direct-destination.invalid/'+contentVersion,updated_at:stamp,open_url:'https://never-open.invalid/'},
        {board:withdrawn?'musik04':'musik05',title:change?'Neuer Musikbeitrag':'Band und Chor',image_url:api+'museum_asset.php?f=music',target_url:'https://not-a-direct-destination.invalid/'+contentVersion,updated_at:stamp||undefined},
        {board:'show2',title:'Nicht laden',image_url:'https://unreviewed.invalid/image.png'},
      ]})}));
      await page.route(api+'museum_asset.php*',route=>route.fulfill({contentType:'image/webp',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(root,'castle/art/story-cards-20261108/card-4.webp'))}));
      await page.route(api+'workadventure_museum_open.php*',route=>{
        const url=new URL(route.request().url());assert.ok(['show1','show3','musik04','musik05'].includes(url.searchParams.get('board')));
        assert.ok([...url.searchParams.keys()].every(key=>['board','v'].includes(key)));
        return route.fulfill({contentType:'text/html',body:'<!doctype html><body data-instance="'+(++openRequests)+'"><h1>Unser freigegebener Beitrag</h1><p id="content-version">'+contentVersion+'</p></body>'});
      });
      for(const kind of ['museum','music']){
        change=0;fail=false;withdrawn=false;contentVersion=0;stamp='';
        await page.goto(hosted+'collection.html?kind='+kind,{waitUntil:'networkidle'});await page.locator('.exhibit').waitFor();
        assert.equal(await page.locator('.exhibit').count(),1);assert.ok(await page.locator('.exhibit img').evaluate(i=>i.complete&&i.naturalWidth>0));
        await layout(page);await page.screenshot({path:path.join(out,kind+'-'+viewport.width+'.png')});
        await page.locator('.exhibit').click();await page.frameLocator('#viewer').getByText('Unser freigegebener Beitrag',{exact:true}).waitFor();
        assert.equal(await page.locator('#viewer').getAttribute('allow'),'autoplay; fullscreen; encrypted-media; picture-in-picture');
        assert.equal(new URL(await page.locator('#viewer').getAttribute('src')).searchParams.get('board'),kind==='music'?'musik05':'show1');
        const instance=()=>page.frameLocator('#viewer').locator('body').getAttribute('data-instance');
        const original=await instance(),initialSrc=await page.locator('#viewer').getAttribute('src');
        await refresh(page);assert.equal(await instance(),original,'Unchanged refresh preserves playing media');
        assert.equal(await page.locator('#viewer').getAttribute('src'),initialSrc);
        fail=true;await refresh(page);assert.equal(await instance(),original,'Temporary outage preserves selected media');fail=false;
        contentVersion++;await refresh(page);
        await page.frameLocator('#viewer').locator('#content-version').filter({hasText:'1'}).waitFor();
        assert.notEqual(await instance(),original,'Target-only update reloads the canonical portal viewer');
        assert.notEqual(await page.locator('#viewer').getAttribute('src'),initialSrc,'Use a real navigation, not only a fragment');
        const targetUpdate=await instance();stamp='2026-11-09 14:00:00';await refresh(page);
        await page.frameLocator('#viewer').locator('body:not([data-instance="'+targetUpdate+'"])').waitFor();
        assert.notEqual(await instance(),targetUpdate,'Updated content revision reloads once');
        const revisionUpdate=await instance();change++;await refresh(page);
        await page.locator('#title').filter({hasText:kind==='music'?'Neuer Musikbeitrag':'Neue Ausstellung'}).waitFor();
        await page.frameLocator('#viewer').locator('body:not([data-instance="'+revisionUpdate+'"])').waitFor();
        const changed=await instance();await refresh(page);assert.equal(await instance(),changed,'A refreshed item stays stable on the next poll');
        withdrawn=true;await refresh(page);await page.getByText('Dieser Beitrag ist nicht mehr verfuegbar.',{exact:true}).waitFor();
        assert.equal(await page.locator('#viewer').getAttribute('src'),null,'Withdrawal stops and detaches selected media');
        assert.equal(await page.locator('#gallery').isVisible(),true);assert.equal(await page.locator('.exhibit').count(),1,'Other published boards remain available');
        assert.equal(await page.locator('#external').isVisible(),false);
        await page.locator('.exhibit').click();await page.frameLocator('#viewer').getByText('Unser freigegebener Beitrag',{exact:true}).waitFor();
        await layout(page);await page.getByRole('button',{name:'Zur Ausstellung',exact:true}).click();
        assert.equal(await page.locator('#viewer').getAttribute('src'),null);assert.equal(await page.locator('#gallery').isVisible(),true);
        results.push({kind,viewport,selectedOnlyReviewedBoard:true,backClearsFrame:true,imagesVisible:true,
          unchangedMediaPreserved:true,temporaryOutagePreservesMedia:true,targetOnlyUpdateLoaded:true,
          revisionOnlyUpdateLoaded:true,selectedTitleUpdated:true,withdrawnMediaStopped:true,otherBoardsRemainAvailable:true});
      }
      withdrawn=false;change=0;
      await page.goto(hosted+'collection.html?kind=museum',{waitUntil:'networkidle'});await page.locator('.exhibit').waitFor();
      change++;await refresh(page);await page.getByText('Neue Ausstellung',{exact:true}).waitFor();
      fail=true;await refresh(page);await page.getByText('Beitraege sind gerade nicht erreichbar.',{exact:true}).waitFor();
      assert.equal(await page.locator('.exhibit').count(),1,'Keep last working content on a temporary outage');
      if(!live){
        await page.goto(base+'expeditions.html',{waitUntil:'networkidle'});assert.equal(await page.locator('.expedition').count(),7);await layout(page);
        for(const link of await page.locator('.expedition').all()){assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');}
        assert.ok(await page.locator('.expedition img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
        await page.screenshot({path:path.join(out,'expeditions-'+viewport.width+'.png')});results.push({kind:'expeditions',viewport,externalLinks:7});
      }await page.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,errors,
      mode:live?'Live released gallery with deterministic CMS/viewer fixture; no school data changed':'Local deterministic public-CMS fixture; no school data changed'},null,2)+'\n');
    console.log(JSON.stringify({cases:results.length,liveReleasedFiles:live,errors,passed:true}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
