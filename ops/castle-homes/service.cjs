'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createHomeGateway}=require('./gateway.cjs'),{gameFactory}=require('./game-adapter.cjs');
const {createSchoolVerifier}=require('../castle-school/identity.cjs');
const {createIdentityLookup}=require('./identity-lookup.cjs');
const ORIGIN='https://together.deine-schule.com',PORT=3251;
const SOURCE='/opt/wvh-sterne-kollegium/releases/20261109T191624Z';
const MANIFEST_SHA='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function configuration(value){
 const keys=['version','mode','origin','port','source','platformSecret','contextKey','bridgeKey','allowedSubjects'];
 if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.version!==1||value.mode!=='pilot'||value.origin!==ORIGIN||value.port!==PORT||value.source!==SOURCE||
  typeof value.platformSecret!=='string'||!value.platformSecret||!['contextKey','bridgeKey'].every(key=>/^[a-f0-9]{64}$/.test(value[key]||''))||new Set([value.platformSecret,value.contextKey,value.bridgeKey]).size!==3||
  !Array.isArray(value.allowedSubjects)||value.allowedSubjects.length!==2||new Set(value.allowedSubjects).size!==2||value.allowedSubjects.some(id=>typeof id!=='string'||!/^wvh:student:[1-9][0-9]{0,15}$/.test(id)))throw Error('Invalid isolated pilot configuration');
 return Object.freeze({...value,allowedSubjects:Object.freeze([...value.allowedSubjects])});
}
function pilotLookup(lookup,subjects){
 const allowed=new Set(subjects);
 return async identifier=>{const identity=await lookup(identifier);return identity?.role==='student'&&identity.read_only===false&&allowed.has(identity.sub)?identity:null;};
}
async function validateRuntimeFiles(root,files,{owner=0}={}){
 if(!files||Array.isArray(files)||Object.keys(files).length===0)throw Error('Reviewed runtime files required');
 root=path.resolve(root);if(await fs.realpath(root)!==root)throw Error('Runtime root cannot be redirected');
 for(const [name,expected]of Object.entries(files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.split('/').some(part=>['','..','.'].includes(part))||path.isAbsolute(name)||!/^[a-f0-9]{64}$/.test(expected))throw Error('Invalid runtime manifest entry');
  const file=path.join(root,name);if(!file.startsWith(root+path.sep)||await fs.realpath(file)!==file)throw Error('Runtime file cannot be redirected');
  const stat=await fs.lstat(file);if(!stat.isFile()||process.platform==='linux'&&(stat.uid!==owner||(stat.mode&0o022)!==0)||sha(await fs.readFile(file))!==expected)throw Error('Reviewed runtime file changed');
 }
}
async function main(){
 if(process.platform!=='linux'||process.getuid()===0||!process.env.CREDENTIALS_DIRECTORY||process.env.STATE_DIRECTORY!=='/var/lib/wvh-castle-homes')throw Error('Protected service identity required');
 const config=configuration(JSON.parse(await fs.readFile(path.join(process.env.CREDENTIALS_DIRECTORY,'service.json'),'utf8')));
 const manifestRaw=await fs.readFile(path.join(__dirname,'../../castle-homes-runtime.manifest.json'));
 if(sha(manifestRaw)!==MANIFEST_SHA)throw Error('Reviewed runtime manifest changed');
 const manifest=JSON.parse(manifestRaw);if(manifest.version!==1||manifest.sourceRelease!==config.source||Object.keys(manifest.files).length!==107)throw Error('Reviewed game release required');
 await validateRuntimeFiles(config.source,manifest.files);
 const state=await fs.stat(process.env.STATE_DIRECTORY);if(!state.isDirectory()||state.uid!==process.getuid()||(state.mode&0o077)!==0)throw Error('Private persistent room directory required');
 const dbPath=path.join(process.env.STATE_DIRECTORY,'pilot.sqlite');
 const existing=await fs.lstat(dbPath).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});if(existing&&!existing.isFile())throw Error('Room database cannot be redirected');
 const lookup=pilotLookup(createIdentityLookup({key:config.contextKey}),config.allowedSubjects);
 const gateway=await createHomeGateway({key:config.bridgeKey,origin:config.origin,port:config.port,verify:createSchoolVerifier(config.platformSecret,{identityTtl:0}),lookup,
  createGame:await gameFactory(config.source,{dbPath,maxPlayers:8}),trustedProxyIps:['127.0.0.1','::1']});
 let stopping=false;
 const close=async()=>{if(stopping)return;stopping=true;await gateway.close();};
 process.once('SIGTERM',()=>void close());process.once('SIGINT',()=>void close());
 console.log('Isolated school-room pilot ready; microphone and camera disabled');
}
if(require.main===module)main().catch(()=>{console.error('Isolated school-room service could not start');process.exitCode=1;});
module.exports={configuration,pilotLookup,validateRuntimeFiles,ORIGIN,PORT,SOURCE,MANIFEST_SHA};
