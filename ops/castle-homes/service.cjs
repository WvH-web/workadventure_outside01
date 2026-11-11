'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {createHomeGateway}=require('./gateway.cjs'),{gameFactory}=require('./game-adapter.cjs');
const {createSchoolVerifier}=require('../castle-school/identity.cjs');
const {createIdentityLookup}=require('./identity-lookup.cjs');
const {loadHomeMedia}=require('./media.cjs');
const ORIGIN='https://together.deine-schule.com',PORT=3251;
const {SOURCE,MANIFEST_SHA,reviewedRuntime,validateRuntimeFiles}=require('./runtime.cjs');
function configuration(value){
 const keys=['version','mode','origin','port','source','platformSecret','contextKey','bridgeKey','allowedSubjects','moderatorSubjects'];
 if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.version!==3||value.mode!=='pilot'||value.origin!==ORIGIN||value.port!==PORT||value.source!==SOURCE||
  typeof value.platformSecret!=='string'||!value.platformSecret||!['contextKey','bridgeKey'].every(key=>/^[a-f0-9]{64}$/.test(value[key]||''))||new Set([value.platformSecret,value.contextKey,value.bridgeKey]).size!==3||
  !Array.isArray(value.allowedSubjects)||value.allowedSubjects.length!==2||new Set(value.allowedSubjects).size!==2||value.allowedSubjects.some(id=>typeof id!=='string'||!/^wvh:student:[1-9][0-9]{0,15}$/.test(id))||
  !Array.isArray(value.moderatorSubjects)||value.moderatorSubjects.length>1||value.moderatorSubjects.some(id=>typeof id!=='string'||!/^wvh:staff:[1-9][0-9]{0,15}$/.test(id)))throw Error('Invalid isolated pilot configuration');
 return Object.freeze({...value,allowedSubjects:Object.freeze([...value.allowedSubjects]),moderatorSubjects:Object.freeze([...value.moderatorSubjects])});
}
function pilotLookup(lookup,subjects,moderators=[]){
 const allowed=new Set(subjects),approved=new Set(moderators);
 return async identifier=>{const identity=await lookup(identifier);return identity?.read_only===false&&(identity.role==='student'&&allowed.has(identity.sub)||identity.role==='teacher'&&identity.moderator===true&&approved.has(identity.sub))?identity:null;};
}
async function main(){
 if(process.platform!=='linux'||process.getuid()===0||!process.env.CREDENTIALS_DIRECTORY||process.env.STATE_DIRECTORY!=='/var/lib/wvh-castle-homes')throw Error('Protected service identity required');
 const config=configuration(JSON.parse(await fs.readFile(path.join(process.env.CREDENTIALS_DIRECTORY,'service.json'),'utf8')));
 const manifestRaw=await fs.readFile(path.join(__dirname,'../../castle-homes-runtime.manifest.json'));
 const runtime=reviewedRuntime(await fs.readFile(path.join(__dirname,'game.manifest.json')),manifestRaw);
 await validateRuntimeFiles(config.source,runtime.files);
 const media=await loadHomeMedia(path.join(__dirname,'media'),{sourceFiles:runtime.sourceFiles});
 const state=await fs.stat(process.env.STATE_DIRECTORY);if(!state.isDirectory()||state.uid!==process.getuid()||(state.mode&0o077)!==0)throw Error('Private persistent room directory required');
 const dbPath=path.join(process.env.STATE_DIRECTORY,'pilot.sqlite');
 const existing=await fs.lstat(dbPath).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});if(existing&&!existing.isFile())throw Error('Room database cannot be redirected');
 const lookup=pilotLookup(createIdentityLookup({key:config.contextKey}),config.allowedSubjects,config.moderatorSubjects);
 const gateway=await createHomeGateway({key:config.bridgeKey,origin:config.origin,port:config.port,verify:createSchoolVerifier(config.platformSecret,{identityTtl:0}),lookup,
  createGame:await gameFactory(config.source,{dbPath,maxPlayers:8}),trustedProxyIps:['127.0.0.1','::1'],media});
 let stopping=false;
 const close=async()=>{if(stopping)return;stopping=true;await gateway.close();};
 process.once('SIGTERM',()=>void close());process.once('SIGINT',()=>void close());
 console.log('Isolated school-room pilot ready; microphone and camera disabled');
}
if(require.main===module)main().catch(()=>{console.error('Isolated school-room service could not start');process.exitCode=1;});
module.exports={configuration,pilotLookup,validateRuntimeFiles,ORIGIN,PORT,SOURCE,MANIFEST_SHA};
