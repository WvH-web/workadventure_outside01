'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(base,'handoff.json'),'utf8'));
assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);
const tokens={};
for(const account of handoff.accounts){
  assert.ok(['A','B'].includes(account.key));assert.equal(account.microsoftAccountEnabled,true);
  const state=JSON.parse(fs.readFileSync(path.join(base,'qa/sso-'+account.key+'.private.json'),'utf8'));
  const storage=state.origins.find(origin=>origin.origin==='https://together.deine-schule.com')?.localStorage;
  const token=storage?.find(item=>item.name==='authToken')?.value;assert.ok(typeof token==='string'&&token.length<32768);
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  assert.ok(claims.exp*1000>Date.now()+600000);assert.ok(typeof claims.accessToken==='string');
  tokens[account.key]=token;
}
fs.writeFileSync(path.join(base,'qa/live-token-handoff.private.json'),JSON.stringify(tokens),{mode:0o600});
console.log(JSON.stringify({prepared:true,authorizedSyntheticPupils:2,credentialsPrinted:false}));
