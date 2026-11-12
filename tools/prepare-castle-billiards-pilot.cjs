'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');storage.configure();
const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const handoff=JSON.parse(fs.readFileSync(path.join(root,'handoff.json')));assert.equal(handoff.contains_real_pupil_data,false);
assert.deepEqual(handoff.accounts.map(account=>account.key),['A','B']);
const accounts=handoff.accounts.map(account=>{
 assert.equal(account.microsoftAccountEnabled,true);const identifier=account.loginUpn.toLowerCase();assert.match(identifier,/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
 return {key:account.key,identifier};
});
assert.equal(new Set(accounts.map(account=>account.identifier)).size,2);
const output=storage.outputPath('billiards-pilot-input/'+new Date().toISOString().replace(/[:.]/g,'-')),file=path.join(output,'billiards-accounts.private.json');
fs.writeFileSync(file,JSON.stringify({version:1,accounts})+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,file,approvedSyntheticAccounts:2,credentialsIncluded:false,identitiesPrinted:false}));
