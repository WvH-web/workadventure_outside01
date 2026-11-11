'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('./castle-deps.cjs')('playwright');
async function main(){
 const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
 const handoff=JSON.parse(await fs.readFile(path.join(root,'handoff.json'),'utf8'));
 assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);
 const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
 try{
  for(const account of ['A','B']){
   const context=await browser.newContext({storageState:path.join(root,'qa/sso-'+account+'.private.json')});
   try{
    const page=await context.newPage();await page.goto('https://together.deine-schule.com/castle-homes/#moderation',{waitUntil:'domcontentloaded'});
    await page.locator('#message').filter({hasText:/Fuer dieses Konto.*nicht freigegeben/}).waitFor({timeout:20000});
    assert.equal(await page.locator('iframe').count(),0);await page.waitForTimeout(1800);assert.equal(await page.locator('iframe').count(),0);
    checks.push({account,moderationDenied:true,noProtectedFrame:true});
   }finally{await context.close();}
  }
  const proof={passed:true,browserVersion:browser.version(),checks,ordinaryMicrosoftPupilStates:true,
   normalStaffMicrosoftLoginTested:false,staffImpersonated:false,networkInterception:false};
  await fs.writeFile(path.join(root,'qa/homes-moderation-live.private.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }finally{await browser.close();}
}
main().catch(error=>{console.error('Live moderation boundary check stopped: '+error.name);process.exitCode=1;});
