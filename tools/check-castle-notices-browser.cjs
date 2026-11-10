'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.resolve(__dirname,'..'),portal=path.resolve(root,'../_castle_notices_20261110');
const output=path.resolve(root,'../output/castle-offers/private/notices');
const php=JSON.parse(fs.readFileSync(path.join(output,'php-result.json'),'utf8'));
const endpoint='https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_castle_notices.php';
const legacy='https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum.php?board=hallnotice01';
async function main(){
 const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
 for(const [name,digest] of Object.entries(php.sourceFiles))assert.equal(sha(fs.readFileSync(path.join(portal,name))),digest,'PHP fixtures do not match current source: '+name);
 const errors=[],results=[];
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(/^\/portal\/(normal|csrf|empty)\.html$/.test(name)){
   const html=php.renders[name.split('/').pop().replace('.html','')].replaceAll('https://deutsche-online-schule.com/schooltools/verwaltung','http://127.0.0.1:'+server.address().port).replaceAll('http://127.0.0.1:4193','http://127.0.0.1:'+server.address().port);
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;
  }
  const source=name.startsWith('/castle/')||name==='/ops/castle-school/public/round-rooms/grosse-halle.webp'?path.join(root,name):name==='/assets/css/workadventure_castle_notices.css'?path.join(portal,name):null;
  if(source&&fs.existsSync(source)&&fs.statSync(source).isFile()){
   res.writeHead(200,{'Content-Type':source.endsWith('.webp')?'image/webp':source.endsWith('.css')?'text/css':source.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});res.end(fs.readFileSync(source));return;
  }
  res.writeHead(404);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [1440,390,320]){
   const context=await browser.newContext({locale:'de-DE',viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   for(const view of ['normal','csrf','empty']){
    await page.goto(base+'/portal/'+view+'.html',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.form-control')).borderRadius==='6px');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.form-control')).display),'block','Bootstrap not loaded');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,
     clipped:[...document.querySelectorAll('#castle-notices label,#castle-notices h3,#castle-notices .notice-list span')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())}));
    assert.equal(layout.overflow,false,`${width}/${view}: overflow`);assert.deepEqual(layout.clipped,[],`${width}/${view}: clipped labels`);
    assert.equal(await page.locator('#notice-review').isChecked(),false,'Public review must never be prechecked');
    if(view==='csrf')assert.equal(await page.getByRole('alert').count(),1);
    if(view==='normal'){await page.locator('#notice-review').check();assert.equal(await page.getByRole('button',{name:'Zurueckziehen'}).count(),1);}
    await page.screenshot({path:path.join(output,`admin-${view}-${width}.png`),fullPage:true});results.push({width,view,...layout});
   }
   await context.close();
  }
  for(const width of [1280,390,320]){
   const context=await browser.newContext({locale:'de-DE',viewport:{width,height:900},...(width<500?{isMobile:true,hasTouch:true}:{})}),page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));await page.clock.install();
   let items=[{id:1,title:'Gemeinsam Geschichten entdecken',body:'Eine gemuetliche Leserunde am Kamin.\nAlle koennen mitlesen.',expiresAt:new Date(Date.now()+3600000).toISOString().replace(/\.\d{3}Z$/,'Z'),eventStart:'2026-11-12T15:00:00Z',eventEnd:'2026-11-12T16:00:00Z'},
    {id:2,title:'<img src=x onerror=alert(1)>',body:'<script>notExecutable()</script>',expiresAt:new Date(Date.now()+3600000).toISOString().replace(/\.\d{3}Z$/,'Z'),eventStart:null,eventEnd:null}],offline=false;
   await page.route(endpoint,route=>route.fulfill({status:offline?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},body:JSON.stringify({version:1,checkedAt:Date.now(),items})}));
   await page.goto(base+'/castle/hall-notices.html');await page.waitForFunction(()=>document.querySelectorAll('article').length===2);
   assert.equal(await page.locator('article img,article script').count(),0);assert.match(await page.locator('time').innerText(),/16:00/);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,visualLoaded:document.querySelector('header img').naturalWidth>0,clipped:[...document.querySelectorAll('h1,h2,article p')].filter(el=>el.scrollWidth>el.clientWidth+1).length}));
   assert.equal(layout.overflow,false);assert.equal(layout.visualLoaded,true);assert.equal(layout.clipped,0);
   await page.screenshot({path:path.join(output,`programme-${width}.png`),fullPage:true});
   items=[];await page.clock.fastForward(31000);await page.waitForFunction(()=>document.querySelectorAll('article').length===0);
   items=[{id:3,title:'Kurz aktiv',body:'Wird automatisch beendet',expiresAt:new Date(Date.now()+3000).toISOString().replace(/\.\d{3}Z$/,'Z'),eventStart:null,eventEnd:null}];
   await page.clock.fastForward(31000);await page.waitForFunction(()=>document.querySelectorAll('article').length===1);
   await page.clock.fastForward(5000);await page.waitForFunction(()=>document.querySelectorAll('article').length===0);
   items=[{...items[0],expiresAt:new Date(Date.now()+3600000).toISOString().replace(/\.\d{3}Z$/,'Z')}];
   await page.clock.fastForward(31000);await page.waitForFunction(()=>document.querySelectorAll('article').length===1);
   offline=true;await page.clock.fastForward(31000);await page.waitForFunction(()=>document.querySelectorAll('article').length===0);
   assert.match(await page.locator('#state').innerText(),/nicht erreichbar/);results.push({width,view:'programme',...layout,withdrawal:true,expiry:true,offlineClears:true});
   await context.close();
  }
  {
   const context=await browser.newContext({viewport:{width:120,height:96}}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install();let active=true;
   await page.route(endpoint,route=>route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},body:JSON.stringify({version:1,checkedAt:Date.now(),items:active?[{id:1,title:'W'.repeat(110),body:'Full text is in the side window',expiresAt:new Date(Date.now()+3600000).toISOString().replace(/\.\d{3}Z$/,'Z'),eventStart:'2026-11-12T15:00:00Z',eventEnd:null}]:[]})}));
   await page.route(legacy,route=>route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({item:{title:'Bisheriger Aushang',image_url:null}})}));
   await page.goto(base+'/castle/hall-board.html');await page.waitForFunction(()=>document.getElementById('title').textContent.length===110);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
   assert.equal(await page.evaluate(()=>{const t=document.getElementById('title').getBoundingClientRect(),s=document.getElementById('status').getBoundingClientRect();return t.bottom<=s.top&&s.bottom<=innerHeight;}),true);
   await page.screenshot({path:path.join(output,'wall-120x96.png')});
   active=false;await page.clock.fastForward(31000);await page.waitForFunction(()=>document.getElementById('title').textContent==='Bisheriger Aushang');
   assert.equal(await page.locator('#status').isVisible(),true);await context.close();results.push({view:'wall',size:'120x96',legacyFallback:true,noOverlap:true});
  }
  assert.deepEqual(errors,[]);
  const sourceFiles=Object.fromEntries(['castle/hall.js','castle/hall-board.html','castle/hall-board.js','castle/hall-notices.html','castle/hall-notices.js','castle/notice-feed.js'].map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
  const evidence={passed:true,adminViews:9,programmeViews:3,wallViews:1,syntheticFixturesOnly:true,realPortalAdminSession:false,sourceFiles,phpFixtureSourceFiles:php.sourceFiles,results,errors};
  fs.writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:true,adminViews:9,programmeViews:3,wallViews:1,errors}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
