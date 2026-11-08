const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../output/castle-content-qa');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:4192/',api='https://deutsche-online-schule.com/schooltools/verwaltung/api/';
const hosted='https://together.deine-schule.com/castle-content/';
const viewports=[{width:320,height:740},{width:390,height:844},{width:780,height:900}];
async function layout(page){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow');
  assert.equal(await page.locator('header').evaluate(e=>e.getBoundingClientRect().right>innerWidth),false);
  for(const button of await page.locator('button:visible').all())assert.equal(await button.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Clipped button');
}
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const viewport of viewports){
      const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
      await page.route(hosted+'**',route=>{
        const name=new URL(route.request().url()).pathname.slice('/castle-content/'.length);
        const types={'collection.html':'text/html','collection.css':'text/css','collection.js':'text/javascript','catalog.js':'text/javascript','vendor/lucide.min.js':'text/javascript'};
        if(!Object.hasOwn(types,name))return route.fulfill({status:404,body:''});
        return route.fulfill({contentType:types[name],headers:{'x-frame-options':'SAMEORIGIN'},body:fs.readFileSync(path.join(root,'castle',name))});
      });
      let change=0,fail=false;
      await page.route(api+'workadventure_museum.php*',route=>route.fulfill({status:fail?503:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({items:[
        {board:'show1',title:change?'Neue Ausstellung':'Unsere gemeinsame Ausstellung mit einem besonders langen Titel zum Pruefen des Zeilenumbruchs',image_url:api+'museum_asset.php?f=museum'},
        {board:'musik05',title:'Band und Chor',image_url:api+'museum_asset.php?f=music'},
        {board:'show2',title:'Nicht laden',image_url:'https://unreviewed.invalid/image.png'},
      ]})}));
      await page.route(api+'museum_asset.php*',route=>route.fulfill({contentType:'image/webp',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(root,'castle/art/story-cards-20261108/card-4.webp'))}));
      await page.route(api+'workadventure_museum_open.php*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><h1>Unser freigegebener Beitrag</h1>'}));
      for(const kind of ['museum','music']){
        await page.goto(hosted+'collection.html?kind='+kind,{waitUntil:'networkidle'});await page.locator('.exhibit').waitFor();
        assert.equal(await page.locator('.exhibit').count(),1);assert.ok(await page.locator('.exhibit img').evaluate(i=>i.complete&&i.naturalWidth>0));
        await layout(page);await page.screenshot({path:path.join(out,kind+'-'+viewport.width+'.png')});
        await page.locator('.exhibit').click();await page.frameLocator('#viewer').getByText('Unser freigegebener Beitrag',{exact:true}).waitFor();
        assert.equal(await page.locator('#viewer').getAttribute('allow'),'autoplay; fullscreen; encrypted-media; picture-in-picture');
        assert.equal(new URL(await page.locator('#viewer').getAttribute('src')).searchParams.get('board'),kind==='music'?'musik05':'show1');
        await layout(page);await page.getByRole('button',{name:'Zur Ausstellung',exact:true}).click();
        assert.equal(await page.locator('#viewer').getAttribute('src'),null);assert.equal(await page.locator('#gallery').isVisible(),true);
        results.push({kind,viewport,selectedOnlyReviewedBoard:true,backClearsFrame:true,imagesVisible:true});
      }
      await page.goto(hosted+'collection.html?kind=museum',{waitUntil:'networkidle'});await page.locator('.exhibit').waitFor();
      change++;await page.getByRole('button',{name:'Aktualisieren',exact:true}).click();await page.getByText('Neue Ausstellung',{exact:true}).waitFor();
      fail=true;await page.getByRole('button',{name:'Aktualisieren',exact:true}).click();await page.getByText('Beitraege sind gerade nicht erreichbar.',{exact:true}).waitFor();
      assert.equal(await page.locator('.exhibit').count(),1,'Keep last working content on a temporary outage');
      await page.goto(base+'expeditions.html',{waitUntil:'networkidle'});assert.equal(await page.locator('.expedition').count(),7);await layout(page);
      for(const link of await page.locator('.expedition').all()){assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');}
      assert.ok(await page.locator('.expedition img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
      await page.screenshot({path:path.join(out,'expeditions-'+viewport.width+'.png')});results.push({kind:'expeditions',viewport,externalLinks:7});await page.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,errors,mode:'Local deterministic public-CMS fixture; no school data changed'},null,2)+'\n');
    console.log(JSON.stringify({cases:results.length,errors,passed:true}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
