'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.resolve(__dirname,'../../_castle_offer_permissions_20261109');
const output=path.resolve(__dirname,'../../output/castle-offers'),renders=path.join(output,'renders');
async function main(){
 const errors=[],results=[];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const views=new Set(['/normal.html','/csrf.html','/empty.html']);
  if(views.has(pathname)){
   const text=fs.readFileSync(path.join(renders,pathname.slice(1)),'utf8').replaceAll('http://127.0.0.1:4193','http://127.0.0.1:'+server.address().port);
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(text);return;
  }
  const file={'/assets/css/workadventure_castle.css':'text/css','/assets/js/workadventure_castle.js':'text/javascript'};
  if(file[pathname]){res.writeHead(200,{'Content-Type':file[pathname]});res.end(fs.readFileSync(path.join(root,pathname.slice(1))));return;}
  res.writeHead(404);res.end();
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [1440,390,320]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   for(const view of ['normal','csrf','empty']){
    await page.goto('http://127.0.0.1:'+server.address().port+'/'+view+'.html',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.form-control')).borderRadius==='6px');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.form-control')).display),'block','Bootstrap must load, not just the custom stylesheet');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,
     formWidth:document.querySelector('form').getBoundingClientRect().width,
     clipped:[...document.querySelectorAll('#castle-offers label,#castle-offers h3,#castle-offers .castle-offer span')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())}));
    assert.equal(layout.overflow,false,`${width}/${view} horizontal page overflow`);assert.deepEqual(layout.clipped,[],`${width}/${view} clipped labels`);
    assert.ok(layout.formWidth>=260);
    if(view==='normal'){
     assert.equal(await page.locator('[name=reviewed_origin]').inputValue(),'https://garticphone.com');
     assert.equal(await page.locator('[name=reviewed_path]').inputValue(),'/en/');
     assert.equal(await page.locator('#castle-review').isChecked(),false,'A fresh review is never silently confirmed');
     await page.locator('#castle-all-grades').check();
     assert.equal(await page.locator('[name="grade_levels[]"]:checked').count(),0);
     await page.locator('#castle-grade-6').check();assert.equal(await page.locator('#castle-all-grades').isChecked(),false);
     await page.locator('#castle-all-classes').check();assert.equal(await page.locator('[name="class_ids[]"]:checked').count(),0);
     await page.locator('#castle-class-17').check();assert.equal(await page.locator('#castle-all-classes').isChecked(),false);
    }
    if(view==='csrf')assert.equal(await page.getByRole('alert').count(),1);
    if(view==='empty')assert.equal(await page.getByRole('link',{name:'Ziel pruefen'}).count(),0);
    await page.screenshot({path:path.join(output,`portal-${view}-${width}.png`),fullPage:true});
    results.push({width,view,...layout});
    page.once('dialog',dialog=>dialog.accept());
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);
  const evidence={views:9,sizes:[1440,390,320],formRenderingAndControlsPassed:true,syntheticFixturesOnly:true,
   realPortalSessionUsed:false,errors,results};
  fs.writeFileSync(path.join(output,'portal-browser-check.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({views:evidence.views,sizes:evidence.sizes,formControls:'passed',overflow:'none',errors:evidence.errors,realPortalSessionUsed:false},null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
