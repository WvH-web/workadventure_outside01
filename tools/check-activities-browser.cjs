const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const out=path.resolve(__dirname,'../../output/primary-activities-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  const server=http.createServer((req,res)=>{
    const kind=new URL(req.url,'http://localhost').searchParams.get('kind');
    const url=kind==='blocks'?'https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de':'https://musiclab.chromeexperiments.com/Song-Maker/';
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe allow="autoplay; fullscreen" src="'+url+'"></iframe>');
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const viewport of [{width:320,height:740},{width:390,height:844},{width:680,height:900},{width:1440,height:960}]){
      const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto('http://127.0.0.1:4192/story.html?preview=1',{waitUntil:'networkidle'});
        await page.getByRole('button',{name:'Neue Karten',exact:true}).click();
        await page.waitForFunction(()=>document.body.dataset.round);
        await page.waitForFunction(()=>[...document.querySelectorAll('.story-card img')].every(i=>i.complete&&i.naturalWidth>0));
        const dimensions=await page.locator('.story-card img').evaluateAll(imgs=>imgs.map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.width,height:i.height})));
        assert.equal(dimensions.length,3);assert.ok(dimensions.every(d=>d.loaded&&d.width>70&&Math.abs(d.width-d.height)<2));
        const issues=await page.evaluate(()=>{
          const issues=[];if(document.documentElement.scrollWidth>innerWidth)issues.push('horizontal overflow');
          for(const e of document.querySelectorAll('button,h1,figcaption')){
            if(e.hidden)continue;const r=e.getBoundingClientRect();
            if(r.right>innerWidth+1||e.scrollWidth>e.clientWidth+1)issues.push('clipped '+e.tagName);
          }
          return issues;
        });assert.deepEqual(issues,[]);
        const before=await page.locator('body').getAttribute('data-round');await page.getByRole('button',{name:'Neue Karten',exact:true}).click();
        assert.notEqual(await page.locator('body').getAttribute('data-round'),before);
        await page.waitForFunction(()=>[...document.querySelectorAll('.story-card img')].every(i=>i.complete&&i.naturalWidth>0));
        await page.screenshot({path:path.join(out,'story-'+viewport.width+'.png')});results.push({kind:'story',viewport,passed:true});
      }finally{await page.close()}
    }
    for(const [id,url]of [['blocks','https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de'],['music','https://musiclab.chromeexperiments.com/Song-Maker/']]){
      const page=await browser.newPage({viewport:{width:780,height:900}});
      try{
        await page.goto('http://127.0.0.1:'+server.address().port+'/?kind='+id,{waitUntil:'domcontentloaded'});
        let frame;
        for(let n=0;n<80&&!frame;n++){
          frame=page.frames().find(f=>f.url().startsWith(url.split('?')[0]));if(!frame)await page.waitForTimeout(500);
        }
        assert.ok(frame,id+' iframe navigation');
        await frame.locator('canvas,svg').first().waitFor({state:'attached',timeout:60000});await page.waitForTimeout(6000);
        const file=path.join(out,'provider-'+id+'.png');await page.screenshot({path:file});
        const pixels=await sharp(file).stats();assert.ok(pixels.channels.slice(0,3).some(c=>c.stdev>18));
        assert.ok(!await page.locator('body').innerText().then(t=>/refused to connect|connection refused/i.test(t)));
        fs.writeFileSync(path.join(out,'provider-'+id+'.txt'),await frame.locator('body').innerText());
        results.push({kind:id,url,embedded:true,passed:true});
      }catch(e){await page.screenshot({path:path.join(out,'provider-'+id+'-failure.png')}).catch(()=>{});throw e;
      }finally{await page.close()}
    }
    fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({results,errors,noRealSchoolDataUsed:true},null,2)+'\n');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({cases:results.length,errors,passed:true}));
  }finally{await browser.close();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
