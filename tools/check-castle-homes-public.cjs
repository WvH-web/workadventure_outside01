'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const {client,socket}=require('./castle-home-test-client.cjs');
const BASE='https://together.deine-schule.com/castle-homes/',calls=process.argv.includes('--calls');let stage='configuration';
async function main(){
 assert.ok(process.env.CREDENTIALS_DIRECTORY);const config=JSON.parse(await fs.readFile(path.join(process.env.CREDENTIALS_DIRECTORY,'accounts.json'),'utf8'));
 assert.equal(config.version,1);assert.deepEqual(config.accounts.map(row=>row.key),['A','B']);
 const WS=require('ws');
 const a=client(BASE,config.accounts[0].token),b=client(BASE,config.accounts[1].token);let a2,as,bs;
 const checks=[],passed=name=>checks.push(name);
 try{
  stage='anonymous-boundary';const shell=await a.request('');assert.equal(shell.status,200);
  assert.ok(shell.headers.getSetCookie().every(raw=>raw.includes('; Secure')));assert.ok(shell.headers.get('content-security-policy').includes("frame-ancestors 'self'"));
  assert.equal(shell.headers.get('permissions-policy'),calls?'camera=(self), microphone=(self), display-capture=()':'camera=(), microphone=(), display-capture=()');
  assert.equal((await a.request('view/'+crypto.randomUUID()+'/api/bedroom')).status,401);
  assert.equal((await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()},{Authorization:'Bearer forged'})).status,401);
  assert.equal((await a.request('authority/check',{})).status,403);passed('publicTlsAndAnonymousBoundaries');
  stage='normal-school-sessions';const open=await a.open();await b.open();assert.ok(open.headers.getSetCookie().every(raw=>raw.includes('; Secure')));
  const ga=(await a.api('guest',{})).value,gb=(await b.api('guest',{})).value;
  for(const result of [ga,gb]){assert.equal(result.account.role,'student');assert.equal(result.account.canModerate,false);
   for(const forbidden of ['wvh:student:','"age":','"grade":','accessToken',...config.accounts.map(row=>row.identifier)])assert.equal(JSON.stringify(result).includes(forbidden),false);}
  const ra=(await a.api('bedroom')).value,rb=(await b.api('bedroom')).value;
  if(calls){for(const c of [a,b]){const modes=await c.api('proximity');assert.equal(modes.value.available,true);assert.deepEqual(modes.value.modes,['group']);assert.equal((await c.api('moderation/proximity')).status,403);
   assert.equal((await c.api('proximity',{action:'join',surface:'village',mode:'group',requestId:crypto.randomUUID()})).status,400);}}
  assert.notEqual(ra.me.id,rb.me.id);assert.notEqual(ra.code,rb.code);passed('ordinaryMicrosoftSessionsAndSignedPublicSchoolContext');
  stage='device-ownership';a2=client(BASE,config.accounts[0].token);await a2.open();const same=(await a2.api('bedroom')).value;
  assert.equal(same.me.id,ra.me.id);assert.equal(same.code,ra.code);assert.deepEqual(same.room,ra.room);assert.deepEqual(same.wallet,ra.wallet);await a2.leave();
  assert.equal((await b.request('view/'+a.view+'/api/bedroom')).status,401);
  assert.equal((await a.api('bedroom',undefined,{Origin:'https://foreign.invalid'})).status,403);passed('sameOwnerAcrossDevicesAndForeignViewDenial');
  stage='shared-private-visit';assert.equal((await a.api('visits',{action:'enter'})).status,200);as=await socket(a,BASE,WS);await as.wait(row=>row.type==='room-state');
  assert.equal((await a.api('visits',{action:'open'})).status,200);assert.equal((await b.api('visits',{action:'enter',code:ra.code})).status,200);bs=await socket(b,BASE,WS);
  await bs.wait(row=>row.type==='room-state'&&row.players.length===2&&row.phrasesOnly);
  const sent=await a.api('visits',{action:'chat',phrase:'welcome',nonce:crypto.randomUUID()});assert.equal(sent.status,200);
  await bs.wait(row=>row.type==='room-chat'&&row.message.id===sent.value.message.id);
  assert.equal((await b.api('visits',{action:'chat',text:'Hallo!',age:99,role:'teacher',nonce:crypto.randomUUID()})).status,403);
  assert.equal((await b.api('moderation/chat')).status,403);passed('realPublicWebSocketsAndYoungChildPhraseProtection');
  await a.renew();assert.equal(as.ws.readyState,WS.OPEN);passed('freshRenewalKeepsTheSameVisit');
  await a.leave();await bs.wait(row=>row.type==='room-left');assert.equal((await a.api('bedroom')).status,401);passed('hostDepartureClosesTheGuestVisit');
  stage='real-lease-deadline';await b.renew();assert.equal((await b.api('visits',{action:'enter'})).status,200);bs=await socket(b,BASE,WS);await bs.wait(row=>row.type==='room-state');
  assert.equal(bs.ws.readyState,WS.OPEN);await delay(46500);assert.equal((await b.api('bedroom')).status,401);assert.equal(bs.ws.readyState,WS.CLOSED);passed('realFortyFiveSecondDeadlineEndsHttpAndOpenSocket');
  console.log(JSON.stringify({passed:true,checks,ordinaryMicrosoftSessionsVerified:true,realPublicTls:true,realPublicContextEndpoint:true,realPublicWebSockets:true,
   pilotSyntheticAccounts:2,realLeaseClock:true,networkInterception:false,nativeWorkAdventureTested:false,voiceEnabled:calls,actualVoiceMediaTested:false,
   moderationGranted:false,broadSchoolRoomAccess:false,loadApprovalFor400:false}));
 }finally{as?.ws.terminate();bs?.ws.terminate();await Promise.allSettled([a.leave(),b.leave(),a2?.leave()]);}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name,
 actual:typeof error.actual==='number'?error.actual:typeof error.actual,expected:typeof error.expected==='number'?error.expected:typeof error.expected}));process.exitCode=1;});
