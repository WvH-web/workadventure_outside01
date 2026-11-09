'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../ops/workadventure-onboarding'),out=path.resolve(__dirname,'../../output/wvh-castle-onboarding.zip');
const files=['onboarding.patch','OnboardingVisit.ts','WvhOnboarding.test.ts'];
execFileSync('tar',['-a','-cf',out,...files],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({files:files.length,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'),privateConfigurationIncluded:false}));
