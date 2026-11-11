'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validate}=require('./castle-home-lifecycle-proof.cjs');
const source=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts/qa/homes-call-lifecycle/result.private.json');
const raw=fs.readFileSync(source);validate(JSON.parse(raw));
const descriptor={sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length};
const target=path.resolve(__dirname,'../../output/castle-homes/control-proof-descriptor.json');fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(descriptor)+'\n',{mode:0o600});console.log(JSON.stringify({passed:true,...descriptor}));
