const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const out=path.resolve(__dirname,'../../output/castle-characters-qa');fs.mkdirSync(out,{recursive:true});
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const width of [320,390,1200]){
      const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4192/characters.html',{waitUntil:'networkidle'});
      assert.equal(await page.locator('.guest').count(),12);
      const sprites=await page.locator('.guest .woka').evaluateAll(async elements=>Promise.all(elements.map(e=>new Promise(resolve=>{
        const image=new Image();image.onload=()=>resolve(image.naturalWidth===96&&image.naturalHeight===128);
        image.onerror=()=>resolve(false);image.src=getComputedStyle(e).backgroundImage.slice(5,-2);
      }))));assert.ok(sprites.every(Boolean));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(out,'guests-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Farah Sternenforscherin'}).click();
      assert.equal(await page.locator('#name').textContent(),'Farah');
      await page.getByRole('button',{name:'Wohin reisen wir?'}).click();assert.match(await page.locator('#speech').textContent(),/nicht automatisch synchron/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(out,'farah-'+width+'.png')});
      await page.getByRole('button',{name:'Schlossgaeste',exact:true}).click();assert.equal(await page.locator('#cast').isVisible(),true);
      await page.goto('http://127.0.0.1:4192/characters.html?npc=lea',{waitUntil:'networkidle'});
      assert.equal(await page.locator('#name').textContent(),'Lea');assert.equal(await page.locator('#back').isVisible(),false);
      await page.goto('http://127.0.0.1:4192/characters.html?npc=unknown',{waitUntil:'networkidle'});
      assert.equal(await page.locator('#title').textContent(),'Gast nicht gefunden');assert.equal(await page.locator('#cast').isVisible(),false);
      results.push({width,guests:12,spritesCorrect:true,dialogue:true,directEntry:true,unknownRejected:true});await page.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({results,errors},null,2)+'\n');
    console.log(JSON.stringify({cases:results.length,guests:12,passed:true,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
