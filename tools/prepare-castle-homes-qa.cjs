'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(base,'handoff.json'),'utf8'));
const sso=JSON.parse(fs.readFileSync(path.join(base,'qa/sso-result.json'),'utf8'));
assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);assert.equal(sso.passed,true);
const accounts=['A','B'].map(key=>{
 const account=handoff.accounts.find(value=>value.key===key);assert.equal(account.microsoftAccountEnabled,true);
 assert.ok(sso.results.some(value=>value.account===key&&value.normalMicrosoftLogin&&value.freshPupilAccess));
 const state=JSON.parse(fs.readFileSync(path.join(base,'qa/sso-'+key+'.private.json'),'utf8'));
 const values=state.origins.find(value=>value.origin==='https://together.deine-schule.com')?.localStorage;
 const token=values?.find(value=>value.name==='authToken')?.value;assert.ok(typeof token==='string'&&token.length>40);
 // Fresh browser state must contain an unexpired, ordinarily issued login. Signature is checked on the VPS.
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 assert.ok(Number.isSafeInteger(claims.exp)&&claims.exp*1000>Date.now()+300000);
 return {key,identifier:account.loginUpn,token};
});
assert.equal(new Set(accounts.map(row=>row.identifier.toLowerCase())).size,2);
fs.writeFileSync(path.join(base,'qa/homes-accounts.private.json'),JSON.stringify({version:1,accounts}),{mode:0o600});
console.log(JSON.stringify({prepared:true,authorizedSyntheticPupils:2,normalMicrosoftStates:true,credentialsPrinted:false}));
