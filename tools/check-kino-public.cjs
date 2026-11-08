const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const url='https://deutsche-online-schule.com/kino/public/kino.php';
const out=path.resolve(__dirname,'../../output/kino-ui-20261108');
const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe src="'+url+'"></iframe>');
});
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    for(const [width,embedded]of [[1280,false],[680,true],[390,true]]){
      const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
      // This read-only anonymous check never starts a film or submits a form.
      await context.route('**/*',route=>{
        const r=route.request();
        if(!['GET','HEAD'].includes(r.method())||r.resourceType()==='media')return route.abort();
        return route.continue();
      });
      page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(embedded?'http://127.0.0.1:'+server.address().port:url,{waitUntil:'domcontentloaded',timeout:45000});
        const frame=embedded?await page.locator('iframe').contentFrame():page;
        await frame.locator('html[data-kino-theme="castle"]').waitFor();
        await page.waitForTimeout(1600);
        const state=await frame.locator('html').evaluate(root=>({
          embedded:root.dataset.kinoEmbedded==='true',theme:root.dataset.kinoTheme,
          background:getComputedStyle(document.body).backgroundColor,
          overflow:root.scrollWidth>innerWidth+1,
          cssLoaded:[...document.styleSheets].some(s=>s.href?.includes('castle-embed-20261108.css'))
        }));
        assert.equal(state.embedded,embedded);assert.equal(state.background,'rgb(23, 23, 25)');
        assert.equal(state.overflow,false);assert.equal(state.cssLoaded,true);assert.deepEqual(errors,[]);
        await page.screenshot({path:path.join(out,'public-'+width+(embedded?'-embedded':'')+'.png'),fullPage:true});
        results.push({width,...state,errors});
      }finally{await context.close()}
    }
    fs.writeFileSync(path.join(out,'public-report.json'),JSON.stringify({anonymousReadOnly:true,filmStarted:false,results},null,2)+'\n');
    console.log(JSON.stringify({publishedUiCases:results.length,passed:true}));
  }finally{await browser.close();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
