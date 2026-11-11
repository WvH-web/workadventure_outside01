'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out=path.join(require('./castle-local-storage.cjs').outputPath('seat-ui-package'),'client.zip');
const files=['CastleSeatAction.ts','PopUpTriggerActionMessage.svelte','WvhSeatAction.test.ts'];
execFileSync('tar',['-a','-cf',out,...files],{cwd:path.resolve(__dirname,'../ops/workadventure-seat-ui'),stdio:'inherit'});
console.log(JSON.stringify({path:out,files:files.length,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'),privateConfigurationIncluded:false}));
