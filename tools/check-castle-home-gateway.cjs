'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises');
const {createRehearsal}=require('./castle-home-rehearsal.cjs');
const {setTimeout:delay}=require('node:timers/promises');
const {client,socket}=require('./castle-home-test-client.cjs');
async function main(){
 let now=Date.now();const fixture=await createRehearsal({clock:()=>now}),base=fixture.gateway.url;
 const WS=require(path.join(fixture.source,'dorfplatz/node_modules/ws'));const a=client(base,fixture.tokens.a),b=client(base,fixture.tokens.b);let as,bs;
 const checks=[];const passed=name=>checks.push(name);
 try{
  assert.equal((await a.request('view/'+crypto.randomUUID()+'/api/bedroom')).status,401);
  assert.equal((await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()},{Authorization:'Bearer forged'})).status,401);
  await a.open();await b.open();passed('verifiedSchoolEntryAndPrivateCookieScope');
  const first=await a.api('guest',{}),second=await b.api('guest',{});assert.equal(first.status,200);assert.equal(second.status,200);
  assert.equal(first.value.account.role,'student');assert.equal(first.value.account.canModerate,false);
  for(const raw of [JSON.stringify(first.value),JSON.stringify(second.value)])for(const forbidden of ['@invalid.local','Private synthetic name','wvh:student:','"grade":','"age":','accessToken'])assert.equal(raw.includes(forbidden),false);
  const roomA=(await a.api('bedroom')).value,roomB=(await b.api('bedroom')).value;assert.notEqual(roomA.code,roomB.code);passed('separateCanonicalOwnersAndPrivateProfileProjection');
  assert.equal((await b.request('view/'+a.view+'/api/bedroom')).status,401);assert.equal((await a.api('bedroom',undefined,{Origin:'https://foreign.invalid'})).status,403);
  for(const route of ['auth/bridge','api/photos','../server/accounts.mjs','api/bedroom?token=forged'])assert.equal((await a.request('view/'+a.view+'/'+route)).status,404);
  passed('foreignViewsOriginsAndUnreviewedRoutesDenied');
  assert.equal((await a.api('visits',{action:'enter'})).status,200);as=await socket(a,base,WS);await as.wait(row=>row.type==='room-state');
  assert.equal((await a.api('visits',{action:'open'})).status,200);assert.equal((await b.api('visits',{action:'enter',code:roomA.code})).status,200);bs=await socket(b,base,WS);
  const joined=await bs.wait(row=>row.type==='room-state'&&row.players.length===2);assert.equal(joined.isOwner,false);assert.equal(joined.code,null);assert.equal(joined.phrasesOnly,true);
  passed('realGameHttpAndWebSocketPrivateVisits');
  const message=await a.api('visits',{action:'chat',phrase:'welcome',nonce:crypto.randomUUID()});assert.equal(message.status,200);
  const received=await bs.wait(row=>row.type==='room-chat'&&row.message.id===message.value.message.id);assert.equal(received.message.sender,first.value.me.id);
  assert.equal((await b.api('visits',{action:'chat',text:'Hallo zusammen',nonce:crypto.randomUUID(),age:99,role:'teacher'})).status,403);
  assert.equal((await b.api('moderation/chat')).status,403);passed('senderBindingAgeRuleAndModeratorDenial');
  const beforeA=await a.api('bedroom');assert.equal((await b.api('bedroom',{action:'layout',revision:roomB.revision,placed:[],owner:first.value.me.id})).status,200);
  assert.deepEqual((await a.api('bedroom')).value.room,beforeA.value.room);passed('guestCannotRewriteHostFurniture');
  const oldRequest=a.requestId,oldView=a.view,logins=fixture.requests.filter(row=>row.path==='/auth/bridge').length;
  await a.renew();assert.equal(fixture.requests.filter(row=>row.path==='/auth/bridge').length,logins);assert.equal(as.ws.readyState,WS.OPEN);
  await a.request('leave',{clientId:a.clientId,requestId:oldRequest,view:oldView});assert.equal((await a.api('bedroom')).status,200);passed('renewalKeepsGameCookieAndLateLeaveCannotEndNewerRenewal');
  assert.ok(fixture.requests.every(row=>!row.authorizationForwarded&&!row.unrelatedCookieForwarded));passed('credentialsNeverForwardedToGame');
  await a.leave();await delay(400);assert.equal((await a.api('bedroom')).status,401);await bs.wait(row=>row.type==='room-left');passed('explicitHostDepartureEndsVisit');
  assert.equal((await b.api('visits',{action:'enter'})).status,200);bs=await socket(b,base,WS);await bs.wait(row=>row.type==='room-state');
  assert.equal(bs.ws.readyState,WS.OPEN);now+=46000;await delay(1200);assert.equal((await b.api('bedroom')).status,401);assert.equal(bs.ws.readyState,WS.CLOSED);passed('expiredLeaseStopsHttpAndSockets');
  const proof={passed:true,scope:'isolated synthetic school accounts; original game HTTP and WebSocket engine',checks,
   normalMicrosoftLoginTested:false,nativeWorkAdventureTested:false,voiceTested:false,existingServicesChanged:false,publicEndpointInstalled:false};
  const output=path.resolve(__dirname,'../../output/castle-homes');await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'gateway-http.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof));
 }finally{as?.ws.terminate();bs?.ws.terminate();await fixture.close();}
}
if(require.main===module)main().catch(error=>{console.error('Home gateway check failed: '+error.name+' '+error.message);process.exitCode=1;});
module.exports={client,socket};
