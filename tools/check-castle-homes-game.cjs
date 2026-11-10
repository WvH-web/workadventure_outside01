'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),path=require('node:path');
const fs=require('node:fs/promises'),os=require('node:os'),{pathToFileURL}=require('node:url'),{DatabaseSync}=require('node:sqlite');
const {createHomeAuthority}=require('../ops/castle-homes/authority.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const source=path.resolve(process.env.STERNENHUETER_SOURCE||path.join(__dirname,'../../sternenhueter'));
const inputs=['dorfplatz/server/accounts.mjs','dorfplatz/server/bedrooms.mjs','dorfplatz/server/points.mjs',
 'planung/zimmer-editor/model.js','planung/zimmer-editor/definitions.js','planung/zimmer-editor/finishes.js',
 'planung/zimmer-editor/materials.js','planung/zimmer-editor/companions.js','dorfplatz/public/avatar-atlas.js'];
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function hashes(){return Object.fromEntries(await Promise.all(inputs.map(async file=>[file,sha(await fs.readFile(path.join(source,file)))])));}
async function main(){
 const before=await hashes(),{createSchoolAccounts}=await import(pathToFileURL(path.join(source,inputs[0]))),
  {createBedrooms}=await import(pathToFileURL(path.join(source,inputs[1])));
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'castle-homes-contract-')),key=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(32).toString('hex');
 const db=new DatabaseSync(path.join(directory,'synthetic.sqlite'));let authority,accounts;
 const identities=new Map([['a@invalid.local',{sub:'wvh:student:7',role:'student',grade:3,age:9,moderator:false,read_only:false}],
  ['b@invalid.local',{sub:'wvh:student:8',role:'student',grade:7,age:13,moderator:false,read_only:false}]]);
 const server=http.createServer(async(req,res)=>{
  try{
   assert.equal(req.method,'POST');let raw='';for await(const chunk of req){raw+=chunk;assert.ok(raw.length<=8192);}
   const result=await authority.check(raw,Object.fromEntries(['timestamp','nonce','signature'].map(name=>[name,req.headers['x-sterne-'+name]])));
   res.writeHead(200,{'Content-Type':'application/json','X-Sterne-Signature':result.signature});res.end(result.body);
  }catch{res.writeHead(403,{'Content-Type':'application/json'});res.end('{"error":"not_allowed"}');}
 });
 try{
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE guests(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,name TEXT NOT NULL,grade INTEGER NOT NULL DEFAULT 4,avatar INTEGER NOT NULL DEFAULT 0,stars INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  const verify=createSchoolVerifier(secret);authority=createHomeAuthority({key,verify,lookup:async identifier=>identities.get(identifier)??null});
  accounts=createSchoolAccounts(db,{secret:key,portalOrigin:origin,loginURL:origin+'/entry',introspectionURL:origin+'/check',allowInsecureLocal:true});
  const bedrooms=createBedrooms(db);
  async function open(who){
   const authorization='Bearer '+await new SignJWT({identifier:who+'@invalid.local',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime('5m').sign(new TextEncoder().encode(secret));
   const grant=await authority.open(authorization),signed=await accounts.login(grant.ticket,false);
   const req={headers:{cookie:signed.cookie.split(';')[0]}};assert.equal(await accounts.authenticate(req,{fresh:true}),signed.guest);
   return {grant,signed,req};
  }
  const first=await open('a'),guest=()=>db.prepare('SELECT * FROM guests WHERE id=?').get(first.signed.guest),initial=bedrooms.snapshot(guest());
  const edited=bedrooms.command(guest(),{action:'layout',revision:initial.revision,placed:[]});assert.equal(edited.revision,1);
  const secondDevice=await open('a'),restored=bedrooms.snapshot(db.prepare('SELECT * FROM guests WHERE id=?').get(secondDevice.signed.guest));
  assert.equal(secondDevice.signed.guest,first.signed.guest);assert.equal(restored.code,initial.code);assert.equal(restored.revision,1);assert.deepEqual(restored.room.placed,[]);
  assert.deepEqual(restored.room.owned,initial.room.owned);assert.equal(restored.wallet.balance,initial.wallet.balance);
  const other=await open('b'),otherRoom=bedrooms.snapshot(db.prepare('SELECT * FROM guests WHERE id=?').get(other.signed.guest));
  assert.notEqual(other.signed.guest,first.signed.guest);assert.notEqual(otherRoom.code,initial.code);assert.equal(otherRoom.revision,0);
  assert.equal(accounts.publicProfile(first.signed.guest).role,'student');assert.equal(accounts.publicProfile(first.signed.guest).canModerate,false);
  accounts.logout(first.req,false);assert.equal(await accounts.authenticate(first.req).then(()=>false,()=>true),true);
  assert.equal(await accounts.authenticate(secondDevice.req,{fresh:true}),secondDevice.signed.guest);
  identities.set('a@invalid.local',null);assert.equal(await accounts.authenticate(secondDevice.req,{fresh:true}).then(()=>false,()=>true),true);
  assert.equal(await accounts.authenticate(other.req,{fresh:true}),other.signed.guest);
  assert.deepEqual(await hashes(),before,'The separately owned game source changed during this check');
  const proof={passed:true,scope:'local synthetic HTTP authority plus original game account/bedroom modules',sourceFiles:before,
   canonicalSchoolSubjects:true,twoDistinctPupils:true,sameOwnerAcrossDevices:true,persistentLayoutAndInventory:true,
   otherRoomUntouched:true,logoutDeviceSeparation:true,freshWithdrawal:true,tokenTeacherTagsIgnored:true,
   normalMicrosoftLoginTested:false,liveSchoolRecordsUsed:false,nativeWorkAdventureTested:false,roomVisitsTested:false,fullCastleApprovalFor400:false};
  const output=path.resolve(__dirname,'../../output/castle-homes');await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'game-contract.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({...proof,sourceFiles:Object.keys(before).length}));
 }finally{
  authority?.close();await accounts?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();
  assert.ok(directory.startsWith(path.join(os.tmpdir(),'castle-homes-contract-')));await fs.rm(directory,{recursive:true,force:true});
 }
}
main().catch(error=>{console.error('Original room contract check failed: '+error.name);process.exitCode=1;});
