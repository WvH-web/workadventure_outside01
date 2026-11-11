'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const storage=require('./castle-local-storage.cjs');
const original=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts/qa/rounds-native-recovery-published/failure.private.json');
const value=JSON.parse(fs.readFileSync(original,'utf8'));
assert.equal(value.stage,'bounded-recovery');assert.equal(value.errorType,'TimeoutError');
assert.match(value.error,/page\.waitForResponse: Timeout 15000ms/);
const fact={version:1,passed:false,stage:value.stage,errorType:value.errorType,waitLimitMilliseconds:15000,
  scope:'Previous published probe failed before the injected response; not an accepted recovery test'};
const file=path.join(storage.outputPath('castle-rounds-recovery-20261111'),'previous-published-failure.json');
fs.writeFileSync(file,JSON.stringify(fact,null,2)+'\n');console.log(JSON.stringify({prepared:true,rawBrowserDiagnosticsCopied:false,credentialsCopied:false}));
