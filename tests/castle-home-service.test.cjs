'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {configuration,pilotLookup,validateRuntimeFiles,ORIGIN,PORT,SOURCE}=require('../ops/castle-homes/service.cjs');
const fixture=()=>({version:4,mode:'pilot',origin:ORIGIN,port:PORT,source:SOURCE,platformSecret:'separate synthetic platform secret',contextKey:'1'.repeat(64),bridgeKey:'2'.repeat(64),allowedSubjects:['wvh:student:7','wvh:student:8'],moderatorSubjects:[],calls:null});
test('the service accepts only the isolated two-pupil pilot and copies its private configuration',()=>{
 const value=fixture(),checked=configuration(value);value.allowedSubjects.push('wvh:student:9');assert.equal(checked.allowedSubjects.length,2);assert.ok(Object.isFrozen(checked.allowedSubjects));
 for(const change of [{mode:'school'},{port:1234},{origin:'https://foreign.invalid'},{source:'/tmp/game'},{allowedSubjects:[]},{allowedSubjects:['wvh:student:7']},{allowedSubjects:['wvh:staff:7','wvh:student:8']},{allowedSubjects:['wvh:student:7','wvh:student:7']},{extra:true}])assert.throws(()=>configuration({...fixture(),...change}));
 for(const moderatorSubjects of [['wvh:student:7'],['wvh:staff:70','wvh:staff:71']])assert.throws(()=>configuration({...fixture(),moderatorSubjects}));
});
test('only the explicitly selected staff account with a fresh moderator capability gets the exception',async()=>{
 let current={sub:'wvh:staff:70',role:'teacher',moderator:true,read_only:false};const lookup=pilotLookup(async()=>current,fixture().allowedSubjects,['wvh:staff:70']);
 assert.equal((await lookup('moderator@invalid.local')).sub,'wvh:staff:70');
 for(const change of [{sub:'wvh:staff:71'},{moderator:false},{role:'parent'},{read_only:true}]){current={sub:'wvh:staff:70',role:'teacher',moderator:true,read_only:false,...change};assert.equal(await lookup('moderator@invalid.local'),null);}
});
test('context and game bridge keys are separate from one another and the existing platform signer',()=>{
 for(const change of [{contextKey:'bad'},{bridgeKey:'bad'},{platformSecret:''},{bridgeKey:'1'.repeat(64)},{platformSecret:'2'.repeat(64)}])assert.throws(()=>configuration({...fixture(),...change}));
});
test('pilot admission uses fresh canonical student decisions and never an email, token tag or cached approval',async()=>{
 const profiles=new Map([['a@invalid.local',{sub:'wvh:student:7',role:'student',read_only:false}],['b@invalid.local',{sub:'wvh:student:9',role:'student',read_only:false}]]),calls=[];
 const lookup=pilotLookup(async id=>{calls.push(id);return profiles.get(id)??null;},fixture().allowedSubjects);
 assert.equal((await lookup('a@invalid.local')).sub,'wvh:student:7');assert.equal(await lookup('b@invalid.local'),null);
 profiles.set('a@invalid.local',{sub:'wvh:student:7',role:'teacher',read_only:false});assert.equal(await lookup('a@invalid.local'),null);
 profiles.set('a@invalid.local',{sub:'wvh:student:7',role:'student',read_only:true});assert.equal(await lookup('a@invalid.local'),null);
 profiles.delete('a@invalid.local');assert.equal(await lookup('a@invalid.local'),null);assert.equal(calls.length,5);
});
test('a failed fresh school lookup is not converted into a previous successful pilot permission',async()=>{
 let available=true;const lookup=pilotLookup(async()=>{if(!available)throw Error('Unavailable');return {sub:'wvh:student:8',role:'student',read_only:false};},fixture().allowedSubjects);
 assert.ok(await lookup('a@invalid.local'));available=false;await assert.rejects(lookup('a@invalid.local'));
});
test('runtime inputs must match the reviewed bytes and cannot escape their pinned tree',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'castle-home-runtime-')),file=path.join(directory,'source.js'),value=Buffer.from('export const reviewed = true;');
 const options={owner:process.getuid?.()??0},digest=crypto.createHash('sha256').update(value).digest('hex');
 try{
  await fs.writeFile(file,value,{mode:0o644});await validateRuntimeFiles(directory,{'source.js':digest},options);
  for(const name of ['../source.js','/source.js','./source.js','a//b','a\\b'])await assert.rejects(validateRuntimeFiles(directory,{[name]:digest},options));
  await fs.writeFile(file,'export const reviewed = false;');await assert.rejects(validateRuntimeFiles(directory,{'source.js':digest},options));
 }finally{assert.equal(path.dirname(await fs.realpath(directory)),await fs.realpath(os.tmpdir()));assert.ok(path.basename(directory).startsWith('castle-home-runtime-'));await fs.rm(directory,{recursive:true,force:true});}
});
