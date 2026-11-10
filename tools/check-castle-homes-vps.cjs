'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),net=require('node:net');
const fs=require('node:fs/promises'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises'),{DatabaseSync}=require('node:sqlite');
const {createHomeGateway}=require('../ops/castle-homes/gateway.cjs');
const {gameFactory}=require('../ops/castle-homes/game-adapter.cjs');
const {createIdentityLookup}=require('../ops/castle-homes/identity-lookup.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {client,socket}=require('./castle-home-test-client.cjs');
let stage='configuration';
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function stop(child){if(!child||child.exitCode!==null||child.signalCode)return;const ended=once(child,'exit');child.kill('SIGTERM');await Promise.race([ended,delay(3000)]);if(child.exitCode===null&&!child.signalCode){child.kill('SIGKILL');await ended;}}
function intact(file){const db=new DatabaseSync(file,{readOnly:true});try{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{db.close();}}
async function main(){
 assert.equal(process.platform,'linux');assert.ok(process.getuid()>0,'Never run the room probe as root');
 const credentials=process.env.CREDENTIALS_DIRECTORY,runtime=process.env.RUNTIME_DIRECTORY;
 assert.ok(credentials&&runtime);const config=JSON.parse(await fs.readFile(path.join(credentials,'qa.json'),'utf8'));
 assert.equal(config.version,1);assert.equal(config.accounts.length,2);assert.ok(/^[a-f0-9]{64}$/.test(config.contextKey));
 assert.equal(config.source,'/opt/wvh-sterne-kollegium/releases/20261109T191624Z');
 const directory=await fs.mkdtemp(path.join(runtime,'room-probe-')),dbPath=path.join(directory,'rooms.sqlite');
 const phpConfig=path.join(directory,'context.private.json');
 await fs.writeFile(phpConfig,JSON.stringify({version:1,key:config.contextKey,moderators:[],nonces:path.join(directory,'nonces.sqlite'),db:config.db}),{mode:0o600});
 const phpPort=await freePort(),contextUrl='http://127.0.0.1:'+phpPort+'/workadventure-castle-homes.php';
 const php=spawn(config.php,['-d','display_errors=0','-d','log_errors=0','-S','127.0.0.1:'+phpPort,path.join(__dirname,'castle-homes-context-router.php')],{
  env:{PATH:process.env.PATH,CASTLE_HOMES_QA_CONTEXT_CONFIG:phpConfig},stdio:['ignore','ignore','ignore'],
 });
 let gateway,as,bs,providerChecks=0,schoolChecks=0;const checks=[];
 const passed=name=>checks.push(name),allowed=new Map(config.accounts.map(row=>[row.identifier.toLowerCase(),row.key]));
 const verify=createSchoolVerifier(config.secret,{identityTtl:0,fetcher:(url,options)=>{providerChecks++;return fetch(url,options);}});
 const context=createIdentityLookup({key:config.contextKey,fetcher:(url,options)=>{
  assert.equal(url,'https://www.deine-schule.com/workadventure-castle-homes.php');return fetch(contextUrl,options);
 }});
 const lookup=async identifier=>{
  const key=allowed.get(identifier.toLowerCase());assert.ok(key,'Only the authorized synthetic accounts may reach the school lookup');
  const identity=await context(identifier);schoolChecks++;
  assert.ok(identity&&/^wvh:student:[1-9][0-9]*$/.test(identity.sub));assert.equal(identity.role,'student');
  assert.equal(identity.grade,key==='A'?3:7);assert.equal(identity.age,key==='A'?9:13);assert.equal(identity.moderator,false);
  return identity;
 };
 const WS=require(path.join(config.source,'dorfplatz/node_modules/ws'));
 const token=key=>config.accounts.find(row=>row.key===key).token;
 async function launch(database,port=0){const factory=await gameFactory(config.source,{dbPath:database,maxPlayers:8});return createHomeGateway({key:config.contextKey,verify,lookup,createGame:factory,port,allowInsecureLocal:true});}
 try{
  stage='private-php-readiness';let ready=false;
  for(let n=0;n<40;n++){try{if((await fetch(contextUrl)).status===405){ready=true;break;}}catch{}await delay(100);}
  assert.ok(ready);assert.equal((await fetch(contextUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  passed('unsignedContextDeniedBeforeSchoolAccess');
  stage='ordinary-school-entry';gateway=await launch(dbPath);const base=gateway.url;
  const a=client(base,token('A')),b=client(base,token('B'));await a.open();await b.open();
  const ga=(await a.api('guest',{})).value,gb=(await b.api('guest',{})).value;
  for(const guest of [ga,gb]){assert.equal(guest.account.role,'student');assert.equal(guest.account.canModerate,false);}
  for(const output of [ga,gb])for(const forbidden of ['wvh:student:','"age":','"grade":','accessToken',...config.accounts.map(row=>row.identifier)])assert.equal(JSON.stringify(output).includes(forbidden),false);
  const first=(await a.api('bedroom')).value,other=(await b.api('bedroom')).value;
  assert.notEqual(first.me.id,other.me.id);assert.notEqual(first.code,other.code);passed('ordinaryMicrosoftSessionsAndFreshCanonicalSchoolContext');
  stage='persistent-ownership';const edited=await a.api('bedroom',{action:'layout',revision:first.revision,placed:[]});assert.equal(edited.status,200);
  const a2=client(base,token('A'));await a2.open();const same=(await a2.api('bedroom')).value;
  assert.equal(same.me.id,first.me.id);assert.equal(same.code,first.code);assert.deepEqual(same.room.placed,[]);
  assert.deepEqual(same.room.owned,first.room.owned);assert.deepEqual(same.wallet,first.wallet);await a2.leave();
  passed('canonicalRoomAndInventoryAcrossSeparateDevices');
  stage='actual-visits';assert.equal((await a.api('visits',{action:'enter'})).status,200);as=await socket(a,base,WS);await as.wait(row=>row.type==='room-state');
  assert.equal((await a.api('visits',{action:'open'})).status,200);assert.equal((await b.api('visits',{action:'enter',code:first.code})).status,200);
  bs=await socket(b,base,WS);await bs.wait(row=>row.type==='room-state'&&row.players.length===2&&row.phrasesOnly);
  const message=await a.api('visits',{action:'chat',phrase:'welcome',nonce:crypto.randomUUID()});assert.equal(message.status,200);
  await bs.wait(row=>row.type==='room-chat'&&row.message.id===message.value.message.id);
  assert.equal((await b.api('visits',{action:'chat',text:'Hallo!',nonce:crypto.randomUUID(),age:99,role:'teacher'})).status,403);
  assert.equal((await b.api('moderation/chat')).status,403);passed('receivedPrivateVisitAndYoungChildChatProtection');
  await a.renew();assert.equal(as.ws.readyState,WS.OPEN);passed('freshRenewalPreservesActiveVisitSocket');
  stage='closed-backup';const oldPort=gateway.server.address().port;await gateway.close();gateway=null;
  await delay(100);assert.equal(as.ws.readyState,WS.CLOSED);assert.equal(bs.ws.readyState,WS.CLOSED);
  intact(dbPath);const backup=path.join(directory,'rooms-backup.sqlite'),restored=path.join(directory,'rooms-restored.sqlite');
  const wal=await fs.stat(dbPath+'-wal').catch(error=>{if(error.code!=='ENOENT')throw error;return null;});assert.ok(!wal||wal.size===0,'Only a fully closed SQLite database may be copied');
  await fs.copyFile(dbPath,backup);intact(backup);await fs.copyFile(backup,restored);intact(restored);
  passed('closedDatabaseBackupAndIntegrityChecks');
  stage='restart-and-restore';gateway=await launch(restored,oldPort);
  assert.equal((await a.api('bedroom')).status,401);assert.equal((await b.api('bedroom')).status,401);
  const ra=client(base,token('A')),rb=client(base,token('B'));await ra.open();await rb.open();
  const restoredA=(await ra.api('bedroom')).value,restoredB=(await rb.api('bedroom')).value;
  assert.equal(restoredA.me.id,first.me.id);assert.equal(restoredA.code,first.code);assert.equal(restoredA.revision,edited.value.revision);
  assert.deepEqual(restoredA.room.placed,[]);assert.deepEqual(restoredA.room.owned,first.room.owned);assert.deepEqual(restoredA.wallet,first.wallet);
  assert.equal(restoredB.me.id,other.me.id);assert.equal(restoredB.code,other.code);assert.deepEqual(restoredB.room,other.room);
  assert.equal((await rb.api('visits',{action:'enter',code:first.code})).status,409);passed('restoreKeepsOwnersAndFurnitureButNotOldGrantsOrOpenVisits');
  stage='context-dependency-failure';assert.equal((await ra.api('visits',{action:'enter'})).status,200);as=await socket(ra,base,WS);await as.wait(row=>row.type==='room-state');
  await stop(php);const response=await ra.request('session',{clientId:ra.clientId,requestId:crypto.randomUUID()});assert.equal(response.status,503);
  assert.equal((await ra.api('bedroom')).status,401);await delay(200);assert.equal(as.ws.readyState,WS.CLOSED);
  passed('lostSchoolAuthorityRevokesHttpAndAlreadyOpenSocket');
  assert.ok(providerChecks>=2&&schoolChecks>=8);stage='complete';
  console.log(JSON.stringify({passed:true,checks,ordinaryMicrosoftSessionsVerified:true,providerChecks,schoolChecks,
   scope:'isolated Linux loopback; actual game HTTP/WS and real read-only school context',
   publicIdentityEndpointTested:false,microsoftLoginUiInThisProbe:false,nativeWorkAdventureTested:false,voiceTested:false,
   durableProductionDatabase:false,schoolWrites:false,existingServicesRestarted:false,publicRoomServiceActivated:false}));
 }finally{
  as?.ws.terminate();bs?.ws.terminate();await gateway?.close();await stop(php);
  assert.equal(path.dirname(await fs.realpath(directory)),await fs.realpath(runtime));assert.ok(path.basename(directory).startsWith('room-probe-'));
  await fs.rm(directory,{recursive:true,force:true});
 }
}
main().catch(error=>{
 const diagnostic={stage,name:error.name,code:/^[A-Z_]+$/.test(error.code||'')?error.code:null,
  actual:typeof error.actual==='number'?error.actual:typeof error.actual,expected:typeof error.expected==='number'?error.expected:typeof error.expected,
  frame:error.stack?.split('\n').find(line=>/^\s+at .*\.cjs:\d+:\d+/.test(line))?.trim()};
 console.error('HomeProbeDiagnostic '+JSON.stringify(diagnostic));process.exitCode=1;
});
