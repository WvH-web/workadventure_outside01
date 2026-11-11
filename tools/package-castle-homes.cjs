'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'../output');
const {MANIFEST_SHA}=require('../ops/castle-homes/service.cjs');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const files=['authority.cjs','gateway.cjs','game-adapter.cjs','identity-lookup.cjs','service.cjs','SchoolIdentity.php','ContextProtocol.php','context.php'].map(name=>'ops/castle-homes/'+name)
 .concat(['index.html','entry.js','entry.css','room.html','room.css','exit.html','exit.js','moderation.html','moderation.js','moderation.css'].map(name=>'ops/castle-homes/public/'+name),
 ['ops/castle-school/identity.cjs','ops/castle-school/admission.cjs','ops/hall-audio/auth.cjs','ops/hall-audio/errors.cjs',
  'ops/hall-audio/public/vendor/lucide.min.js','ops/hall-audio/public/vendor/lucide.LICENSE',
  'tests/castle-home-service.test.cjs','tests/castle-home-gateway.test.cjs','tests/castle-homes-identity.php','tests/castle-homes-protocol.php',
  'tools/check-castle-homes-public.cjs','tools/castle-home-test-client.cjs']);
for(const file of files)if(!fs.lstatSync(path.join(root,file)).isFile())throw Error('Expected regular source file');
const manifest='castle-homes-runtime.manifest.json';if(sha(fs.readFileSync(path.join(output,manifest)))!==MANIFEST_SHA)throw Error('Reviewed runtime manifest changed');
const archive=path.join(output,'wvh-castle-homes-moderation.zip');execFileSync('tar',['-a','-cf',archive,...files,'-C',output,manifest],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({serviceVersion:2,files:files.length+1,archiveSha256:sha(fs.readFileSync(archive)),privateConfigurationIncluded:false,syntheticLoginSelectorIncluded:false}));
