'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const root=path.resolve(__dirname,'../castle'),output=require('./castle-local-storage.cjs').outputPath('star-machine-browser/'+new Date().toISOString().replace(/[:.]/g,'-'));
const allowed=new Set(['puzzle.html','puzzle.css','puzzle.js','puzzle-state.js','vendor/lucide.min.js','art/sternmaschine-20261111/machine.webp']);
async function main(){
 const results=[],errors=[],server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://127.0.0.1').pathname.slice(1);if(!allowed.has(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.webp')?'image/webp':'text/javascript');res.end(fs.readFileSync(path.join(root,name)));
 });let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const viewport of [{width:320,height:740},{width:390,height:844},{width:680,height:900},{width:1280,height:960}]){
   const context=await browser.newContext({viewport,...viewport.width===390?{isMobile:true,hasTouch:true}:{}}),page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/puzzle.html?preview=1');
    await page.waitForFunction(()=>window.castleStarMachine?.value?.active&&!castleStarMachine.writing&&[...document.images].every(image=>image.complete&&image.naturalWidth>0));
    assert.equal(await page.locator('#connection').innerText(),'Einzelvorschau');
    const before=await page.locator('#machine').screenshot();
    await page.getByRole('radiogroup',{name:'Innen',exact:true}).getByRole('radio',{name:'Mond',exact:true}).click();
    await page.waitForFunction(()=>castleStarMachine.value.values[0]===1&&!castleStarMachine.writing);await page.waitForTimeout(450);
    const after=await page.locator('#machine').screenshot();assert.notDeepEqual(before,after,'The ring bitmap really moves');
    const pixelStats=await sharp(after).stats();assert.ok(pixelStats.channels.slice(0,3).every(channel=>channel.stdev>20));
    await page.getByRole('radiogroup',{name:'Mitte',exact:true}).getByRole('radio',{name:'Stern',exact:true}).click();
    await page.waitForFunction(()=>castleStarMachine.value.values[1]===2&&!castleStarMachine.writing);
    await page.getByRole('radiogroup',{name:'Au\u00dfen',exact:true}).getByRole('radio',{name:'Welle',exact:true}).click();
    await page.waitForFunction(()=>castleStarMachine.value.solved&&!castleStarMachine.writing);assert.equal(await page.locator('#solved').innerText(),'Gel\u00f6st');
    await page.getByRole('button',{name:'Weiter',exact:true}).click();await page.waitForFunction(()=>castleStarMachine.value.index===1&&!castleStarMachine.writing);
    await page.getByRole('button',{name:'Alle Hinweise',exact:true}).click();assert.equal(await page.locator('#clues li').count(),3);
    const first=page.getByRole('radiogroup',{name:'Innen',exact:true}).getByRole('radio',{name:'Sonne',exact:true});await first.focus();await first.press('ArrowRight');
    await page.waitForFunction(()=>castleStarMachine.value.values[0]===1&&!castleStarMachine.writing);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Mond');
    await page.getByRole('button',{name:'Runde zuruecksetzen',exact:true}).click();assert.equal(await page.locator('#confirmation').isVisible(),true);
    await page.getByRole('button',{name:'Abbrechen',exact:true}).click();assert.equal(await page.locator('#confirmation').isVisible(),false);assert.equal(await page.locator('body').getAttribute('data-stage'),'1');
    await page.getByRole('button',{name:'Runde zuruecksetzen',exact:true}).click();await page.getByRole('button',{name:'Zur\u00fccksetzen',exact:true}).click();
    await page.waitForFunction(()=>castleStarMachine.value.index===0&&!castleStarMachine.writing);
    const issues=await page.evaluate(()=>{
     const issues=[];if(document.documentElement.scrollWidth>innerWidth)issues.push('horizontal-overflow');
     for(const el of document.querySelectorAll('h1,h2,button,legend,li')){
      if(!el.getClientRects().length)continue;const box=el.getBoundingClientRect();
      if(box.left<0||box.right>innerWidth+1||el.scrollWidth>el.clientWidth+1)issues.push('clipped-'+el.tagName);
     }return issues;
    });assert.deepEqual(issues,[]);await page.screenshot({path:path.join(output,'puzzle-'+viewport.width+'.png'),fullPage:true});
    results.push({viewport,touch:viewport.width===390,bitmapMoved:true,decodedImage:true,solved:true,keyboard:true,confirmedReset:true,layoutIssues:issues});
   }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({passed:true,results,errors,nativeMultiuserProof:false},null,2)+'\n');
  console.log(JSON.stringify({passed:true,viewports:results.length,output,nativeMultiuserProof:false}));
 }catch(error){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({passed:false,error:error.message,results,errors},null,2)+'\n');throw error;}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
