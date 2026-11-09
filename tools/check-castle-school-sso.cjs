'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(privateRoot,'handoff.json'),'utf8'));
assert.equal(handoff.contains_real_pupil_data,false);
assert.ok(path.resolve(handoff.credentialsFile).startsWith(path.resolve(privateRoot)+path.sep));
const credentials=JSON.parse(fs.readFileSync(handoff.credentialsFile,'utf8')),output=path.join(privateRoot,'qa');
const origin='https://together.deine-schule.com';
async function main(){
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  try{for(const account of handoff.accounts){
    assert.equal(account.microsoftAccountEnabled,true);const key=account.key,credential=credentials.accounts[key];assert.equal(credential.upn,account.loginUpn);
    const context=await browser.newContext({viewport:{width:1200,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);
    await context.addInitScript(key=>{if(location.origin==='https://together.deine-schule.com'){
      localStorage.setItem('playerName','Schul-SSO-Test '+key);localStorage.setItem('requestedCameraStateKey','false');localStorage.setItem('requestedMicrophoneStateKey','false');
    }},key);
    let stage='starting',signedIn=false;
    try{
      await page.goto(handoff.workAdventurePreview,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('input[name=loginfmt]').waitFor({state:'visible',timeout:40000});
      assert.equal(new URL(page.url()).hostname,'login.microsoftonline.com');
      await page.locator('input[name=loginfmt]').fill(credential.upn);await page.locator('input[type=submit]').click();stage='username-submitted';
      await page.locator('input[name=passwd]').waitFor({state:'visible'});assert.equal(new URL(page.url()).hostname,'login.microsoftonline.com');
      await page.locator('input[name=passwd]').fill(credential.password);await page.locator('input[type=submit]').click();stage='password-submitted';
      for(let attempt=0;attempt<100;attempt++){
        const host=new URL(page.url()).hostname;
        if(host==='together.deine-schule.com'){
          signedIn=await page.evaluate(()=>!!localStorage.getItem('authToken'));if(signedIn){stage='school-sso-complete';break;}
        }
        const text=await page.locator('body').innerText().catch(()=>'');
        if(/More information required|Keep your account secure|Approve sign in|Authenticator|Weitere Informationen erforderlich|Konto sch[uü]tzen|Anmeldung genehmigen/i.test(text)){stage='interactive-security-setup-required';break;}
        if(/Update your password|Change your password|Kennwort aktualisieren|Kennwort [aä]ndern/i.test(text)){stage='initial-password-change-required';break;}
        if(/Permissions requested|Berechtigungen angefordert|Need admin approval|Administratorgenehmigung erforderlich/i.test(text)){stage='consent-or-admin-review-required';break;}
        if(/incorrect password|password is incorrect|Kennwort ist falsch|account has been locked|Konto wurde gesperrt/i.test(text)){stage='login-rejected';break;}
        const no=page.getByRole('button',{name:/^(No|Nein)$/});if(await no.isVisible().catch(()=>false))await no.click();
        await page.waitForTimeout(750);
      }
      if(signedIn){
        await context.storageState({path:path.join(output,'sso-'+key+'.private.json')});
        const access=await page.evaluate(async()=>{
          const headers={Authorization:'Bearer '+localStorage.getItem('authToken'),'Content-Type':'application/json'};
          const response=await fetch('/castle-chess/session',{method:'POST',headers,body:'{}'}),value=await response.json();
          if(response.ok)await fetch('/castle-chess/leave',{method:'POST',headers:{...headers,'X-Chess-Session':value.sessionId},body:'{}'});
          return {status:response.status,staff:value.self?.staff,tableCount:value.tables?.length};
        });
        assert.equal(access.status,200);assert.equal(access.staff,false);assert.equal(access.tableCount,3);
        results.push({account:key,normalMicrosoftLogin:true,freshPupilAccess:true,staffPrivileges:false});
      }else{
        const state={account:key,stage,origin:new URL(page.url()).origin,path:new URL(page.url()).pathname,
          visibleText:(await page.locator('body').innerText()).slice(0,5000)};
        fs.writeFileSync(path.join(output,'sso-'+key+'-attention.private.json'),JSON.stringify(state,null,2)+'\n');
        await page.screenshot({path:path.join(output,'sso-'+key+'-attention.private.png'),mask:[page.locator('input[type=password]')]});
        results.push({account:key,normalMicrosoftLogin:false,stage});
      }
    }catch(error){results.push({account:key,normalMicrosoftLogin:signedIn,stage,errorType:error.name});}
    finally{await context.close();}
  }}finally{await browser.close();}
  const evidence={passed:results.length===2&&results.every(result=>result.freshPupilAccess),results,credentialsPrinted:false,securityPoliciesChanged:false};
  fs.writeFileSync(path.join(output,'sso-result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}
main().catch(error=>{console.error('School SSO probe stopped: '+error.name);process.exitCode=1;});
