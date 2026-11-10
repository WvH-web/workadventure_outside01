'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(base,'handoff.json'),'utf8'));
assert.equal(handoff.contains_real_pupil_data,false);assert.equal(handoff.accounts.length,2);
const identifiers=handoff.accounts.map(account=>{
 assert.ok(['A','B'].includes(account.key));assert.equal(account.microsoftAccountEnabled,true);
 assert.ok(typeof account.loginUpn==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.loginUpn));
 return account.loginUpn;
});
assert.equal(new Set(identifiers).size,2);
fs.writeFileSync(path.join(base,'qa/admission-identifiers.private.json'),JSON.stringify({identifiers}),{mode:0o600});
console.log(JSON.stringify({prepared:true,authorizedSyntheticPupils:2,noCredentialsExported:true}));
