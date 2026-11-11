'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {configuration,pilotLookup}=require('../ops/castle-homes/service.cjs');
const {reviewedRuntime,validateRuntimeFiles}=require('../ops/castle-homes/runtime.cjs');
const {createHomeGateway}=require('../ops/castle-homes/gateway.cjs'),{gameFactory}=require('../ops/castle-homes/game-adapter.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs'),{createIdentityLookup}=require('../ops/castle-homes/identity-lookup.cjs');
const {loadHomeMedia}=require('../ops/castle-homes/media.cjs');
async function main(){
 if(process.platform!=='linux'||process.getuid()===0||process.env.RUNTIME_DIRECTORY!=='/run/wvh-homes-calls-stage'||!process.env.CREDENTIALS_DIRECTORY)throw Error('Disposable isolated room service required');
 const config=configuration(JSON.parse(await fs.readFile(path.join(process.env.CREDENTIALS_DIRECTORY,'service.json'),'utf8')));
 if(!config.calls)throw Error('Explicit school media configuration required');
 const root=path.resolve(__dirname,'..'),runtime=reviewedRuntime(await fs.readFile(path.join(root,'ops/castle-homes/game.manifest.json')),await fs.readFile(path.join(root,'castle-homes-runtime.manifest.json')));
 await validateRuntimeFiles(config.source,runtime.files);
 const {RoomServiceClient}=require('livekit-server-sdk'),control=new RoomServiceClient(config.calls.apiURL,config.calls.apiKey,config.calls.apiSecret,{requestTimeout:2,failover:false});
 const existing=await control.listRooms();if(existing.some(room=>room.name.startsWith(config.calls.namespace+'-')))throw Error('Room call namespace is already in use');
 const gateway=await createHomeGateway({key:config.bridgeKey,origin:'http://127.0.0.1:4319',port:13251,allowInsecureLocal:true,
  verify:createSchoolVerifier(config.platformSecret,{identityTtl:0}),lookup:pilotLookup(createIdentityLookup({key:config.contextKey}),config.allowedSubjects,config.moderatorSubjects),
  createGame:await gameFactory(config.source,{dbPath:path.join(process.env.RUNTIME_DIRECTORY,'fixture.sqlite'),maxPlayers:8}),calls:config.calls,
  media:await loadHomeMedia(path.join(root,'ops/castle-homes/media'),{sourceFiles:runtime.sourceFiles})});
 let stopping=false;const close=async()=>{if(stopping)return;stopping=true;await gateway.close();};process.once('SIGTERM',()=>void close());process.once('SIGINT',()=>void close());
 console.log(JSON.stringify({ready:true,loopbackOnly:true,ordinarySchoolContext:true,onlyDisposableRoomData:true,voiceNamespaceAvailable:true}));
}
main().catch(error=>{console.error(JSON.stringify({ready:false,errorType:error.name,code:error.code,status:error.status}));process.exitCode=1;});
