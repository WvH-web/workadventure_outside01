'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'../output');
const {MANIFEST_SHA}=require('../ops/castle-homes/service.cjs');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const files=['authority.cjs','gateway.cjs','calls.cjs','control-proxy.cjs','control.service','game-adapter.cjs','progressive-adapter.cjs','identity-lookup.cjs','service.cjs','runtime.cjs','game.manifest.json','media.cjs','SchoolIdentity.php','ContextProtocol.php','context.php'].map(name=>'ops/castle-homes/'+name)
 .concat(['index.html','entry.js','entry.css','room.html','room.css','room-media.js','room-call.js','room-control.js','exit.html','exit.js','moderation.html','moderation.js','moderation.css'].map(name=>'ops/castle-homes/public/'+name),
 ['ops/castle-school/identity.cjs','ops/castle-school/admission.cjs','ops/hall-audio/auth.cjs','ops/hall-audio/errors.cjs',
  'ops/hall-audio/public/vendor/lucide.min.js','ops/hall-audio/public/vendor/lucide.LICENSE',
  'tests/castle-home-service.test.cjs','tests/castle-home-gateway.test.cjs','tests/castle-home-media.test.cjs','tests/castle-home-progressive.test.cjs','tests/castle-homes-identity.php','tests/castle-homes-protocol.php',
  'tools/check-castle-homes-public.cjs','tools/check-castle-homes-owned.cjs','tools/castle-home-test-client.cjs','tools/castle-home-rehearsal.cjs','tools/serve-castle-homes-calls.cjs','tests/castle-home-runtime.test.cjs','tests/castle-home-calls.test.cjs','tests/castle-home-control.test.mjs']);
for(const file of files)if(!fs.lstatSync(path.join(root,file)).isFile())throw Error('Expected regular source file');
const manifest='castle-homes-runtime.manifest.json';if(sha(fs.readFileSync(path.join(output,manifest)))!==MANIFEST_SHA)throw Error('Reviewed runtime manifest changed');
const media=path.join(output,'castle-homes/media'),mediaManifest=fs.readFileSync(path.join(root,'ops/castle-homes/media.manifest.json'));
if(sha(mediaManifest)!==require('../ops/castle-homes/media.cjs').MANIFEST_SHA)throw Error('Reviewed lossless media manifest changed');
if(sha(fs.readFileSync(path.join(media,'manifest.json')))!==sha(mediaManifest))throw Error('Generated media differs from the source-reviewed manifest');
const stage=path.join(output,'castle-homes/media-package'),staged=path.join(stage,'ops/castle-homes/media');fs.mkdirSync(staged,{recursive:true});
const proof=JSON.parse(fs.readFileSync(path.join(media,'browser-fidelity.json')));if(!proof.passed||proof.manifestSha256!==sha(mediaManifest))throw Error('Browser fidelity proof required');
const mediaNames=['manifest.json','browser-fidelity.json',...new Set(JSON.parse(mediaManifest).images.map(row=>row.sha256+'.'+row.format))];
for(const name of mediaNames)fs.copyFileSync(path.join(media,name),path.join(staged,name));
const progressiveProof=fs.readFileSync(path.join(output,'castle-homes/progressive-browser/result.json')),progressive=JSON.parse(progressiveProof);
if(!progressive.passed||!progressive.realOpaqueAndTransparentHitTesting||!progressive.interruptedImageRetryAndSavedRoomRecovery)throw Error('Progressive browser acceptance required');
const progressiveName='ops/castle-homes/progressive-browser-proof.json';fs.writeFileSync(path.join(stage,progressiveName),progressiveProof);
if(sha(fs.readFileSync(path.join(root,'ops/castle-homes/game.manifest.json')))!==require('../ops/castle-homes/runtime.cjs').OWNED_SHA)throw Error('Owned runtime manifest changed');
const archive=path.join(output,'wvh-castle-homes-calls.zip');execFileSync('tar',['-a','-cf',archive,...files,'-C',output,manifest,'-C',stage,...mediaNames.map(name=>'ops/castle-homes/media/'+name),progressiveName],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({serviceVersion:4,files:files.length+1+21+1,archiveSha256:sha(fs.readFileSync(archive)),privateConfigurationIncluded:false,syntheticLoginSelectorIncluded:false}));
