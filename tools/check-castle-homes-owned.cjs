'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const OWNED='/opt/wvh-castle-homes/game-releases/8a7b5a2e1bf03405',ORIGINAL='/opt/wvh-sterne-kollegium';
let stage='sandbox';
async function main(){
 assert.equal(process.platform,'linux');assert.notEqual(process.getuid(),0);assert.ok(process.env.RUNTIME_DIRECTORY?.startsWith('/run/wvh-homes-owned-'));
 stage='original-runtime-denial';await assert.rejects(fs.readdir(ORIGINAL),error=>['EACCES','ENOENT'].includes(error.code));
 const release=process.argv[2];assert.match(release,/^\/opt\/wvh-castle-homes\/releases\/[a-f0-9]{16}$/);
 stage='gateway-import';const {createHomeGateway}=require(path.join(release,'ops/castle-homes/gateway.cjs')),{gameFactory}=require(path.join(release,'ops/castle-homes/game-adapter.cjs'));
 const {createSchoolVerifier}=require(path.join(release,'ops/castle-school/identity.cjs')),{client,socket}=require(path.join(release,'tools/castle-home-test-client.cjs'));
 stage='dependency-resolution';const resolved={};for(const name of ['jose','ws','moment-timezone','sharp','livekit-server-sdk','livekit-client']){
  const file=await fs.realpath(require.resolve(name));assert.ok(file.startsWith(OWNED+'/dorfplatz/node_modules/'));resolved[name]=true;
 }
 stage='native-codec';const sharp=require('sharp'),png=await sharp({create:{width:2,height:2,channels:4,background:{r:120,g:50,b:180,alpha:1}}}).png().toBuffer();
 assert.equal((await sharp(png).metadata()).width,2);assert.ok(require('moment-timezone').tz.zone('Europe/Berlin'));
 const {SignJWT}=require('jose'),WS=require('ws'),key=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(32).toString('hex');
 const profiles=new Map([['a@invalid.local',{sub:'wvh:student:7',role:'student',grade:3,age:9,moderator:false,read_only:false}],
  ['b@invalid.local',{sub:'wvh:student:8',role:'student',grade:7,age:13,moderator:false,read_only:false}]]);
 stage='room-engine-start';const gateway=await createHomeGateway({key,verify:createSchoolVerifier(secret),lookup:async identifier=>profiles.get(identifier)??null,
  createGame:await gameFactory(OWNED,{dbPath:path.join(process.env.RUNTIME_DIRECTORY,'fixture.sqlite'),maxPlayers:8}),allowInsecureLocal:true});
 let as,bs;const clients=[];
 try{
  stage='synthetic-school-entry';for(const who of ['a','b']){const token=await new SignJWT({identifier:who+'@invalid.local'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('5m').sign(new TextEncoder().encode(secret));const value=client(gateway.url,token);clients.push(value);await value.open();await value.api('guest',{});}
  const [a,b]=clients,room=(await a.api('bedroom')).value;assert.equal(room.room.placed.length,2);
  stage='shared-visit';assert.equal((await a.api('visits',{action:'enter'})).status,200);as=await socket(a,gateway.url,WS);await as.wait(row=>row.type==='room-state');
  assert.equal((await a.api('visits',{action:'open'})).status,200);assert.equal((await b.api('visits',{action:'enter',code:room.code})).status,200);
  bs=await socket(b,gateway.url,WS);await bs.wait(row=>row.type==='room-state'&&row.players.length===2&&row.phrasesOnly);
  const sent=await a.api('visits',{action:'chat',phrase:'welcome',nonce:crypto.randomUUID()});assert.equal(sent.status,200);await bs.wait(row=>row.type==='room-chat'&&row.message.id===sent.value.message.id);
  assert.equal((await b.api('moderation/chat')).status,403);
  const module=await a.request('view/'+a.view+'/zimmer/castle-room-media.js');assert.equal(module.status,200);assert.match(module.value,/prepareRoomMedia/);
  await a.leave();await bs.wait(row=>row.type==='room-left');
  console.log(JSON.stringify({passed:true,originalRuntimeInaccessible:true,resolved,sharpNativeCodecWorks:true,timeZoneDataWorks:true,
   actualRoomEngineAndPrivateGateway:true,twoSyntheticParticipants:true,sharedVisitAndReceivedPhrase:true,pupilModerationDenied:true,
   progressiveModuleServed:true,originalOrLiveSchoolDataUsed:false,normalMicrosoftLoginTested:false,publicDeploymentTested:false,
   onlyDisposableRuntimeDatabase:true,microphoneAndCameraDisabled:true}));
 }finally{as?.ws.terminate();bs?.ws.terminate();await Promise.allSettled(clients.map(value=>value.leave()));await gateway.close();}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name,code:error.code,
 message:String(error.message).replace(/[a-f0-9]{32,}/gi,'[redacted]').slice(0,350)}));process.exitCode=1;});
