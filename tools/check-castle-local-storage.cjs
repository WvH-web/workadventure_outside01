'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');
async function main(){
  const run=storage.configure(),output=storage.outputPath('local-storage-check/'+path.basename(run.directory));
  const {chromium}=require('./castle-deps.cjs')('playwright');let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const desktop=await browser.newContext({viewport:{width:1000,height:700}}),mobile=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});
    for(const [name,context]of [['desktop',desktop],['mobile',mobile]]){
      const page=await context.newPage();await page.setContent('<!doctype html><meta name="viewport" content="width=device-width"><title>Local storage test</title><body style="margin:0;background:#e9f1eb;color:#173d31;font:18px Arial;padding:24px;box-sizing:border-box"><h1>WorkAdventure QA</h1><p>Temporary browser test.</p>');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(output,name+'.png')});
    }
    const profiles=fs.readdirSync(run.directory).filter(name=>name.startsWith('playwright_chromiumdev_profile-'));
    assert.ok(profiles.length>0);assert.ok(run.directory.startsWith('D:'+path.sep));
    assert.equal(storage.cleanRun(run.directory,{own:true}),false,'A running browser must block cleanup');
    await browser.close();browser=null;
    assert.equal(storage.cleanRun(run.directory,{own:true}),true,'The stopped owned browser run is removable');
    assert.ok(fs.statSync(path.join(output,'desktop.png')).size>1000&&fs.statSync(path.join(output,'mobile.png')).size>1000);
    const result={passed:true,drive:'D:',independentBrowserContexts:2,actualProfileOnD:true,activeBrowserNotRemoved:true,
      ownTemporaryRunRemovedAfterClose:true,desktopAndMobileEvidenceRetained:true,schoolCredentialsRead:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error('Local storage browser check failed: '+error.message);process.exitCode=1;});
