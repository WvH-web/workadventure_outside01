'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises');
const {createRehearsal}=require('./castle-home-rehearsal.cjs');
const {setTimeout:delay}=require('node:timers/promises');
function client(base,token){
 const cookies=new Map(),clientId=crypto.randomUUID();let requestId,view;
 const header=url=>[...cookies.values()].filter(row=>new URL(url).pathname.startsWith(row.path)).map(row=>row.name+'='+row.value).join('; ');
 async function request(route,body,extra={}){
  const url=new URL(route,base),response=await fetch(url,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{cookie:header(url),'Content-Type':'application/json',Origin:new URL(base).origin,'Sec-Fetch-Site':'same-origin',
   ...(route==='session'?{Authorization:'Bearer '+token}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  for(const raw of response.headers.getSetCookie()){
   const [first,...attrs]=raw.split(';'),[name,value]=first.split('='),scope=attrs.find(part=>part.trim().toLowerCase().startsWith('path='))?.trim().slice(5)||'/';
   cookies.set(name+';'+scope,{name,value,path:scope});assert.ok(raw.includes('HttpOnly')&&raw.includes('SameSite=Strict'));assert.equal(name==='sternenhueter_school',false);
  }
  const raw=await response.text();return {status:response.status,value:response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):raw,headers:response.headers};
 }
 return {clientId,cookies,header,request,get view(){return view;},get requestId(){return requestId;},
  async open(){assert.equal((await request('')).status,200);requestId=crypto.randomUUID();const result=await request('session',{clientId,requestId});assert.equal(result.status,200);view=result.value.view;return result;},
  async renew(){requestId=crypto.randomUUID();const result=await request('session',{clientId,requestId});assert.equal(result.status,200);assert.equal(result.value.view,view);return result;},
  api(route,body,headers){return request('view/'+view+'/api/'+route,body,headers);},
  leave(){return request('leave',{clientId,requestId,view});}
 };
}
async function socket(client,base,WS){
 const url=new URL('view/'+client.view+'/room-live',base);url.protocol='ws:';
 const ws=new WS(url,{headers:{Origin:new URL(base).origin,Cookie:client.header(url)}}),messages=[];
 ws.on('message',raw=>{messages.push(JSON.parse(raw));if(messages.length>150)messages.shift();});
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 return {ws,messages,async wait(predicate,timeout=4000){const until=Date.now()+timeout;while(Date.now()<until){const value=messages.find(predicate);if(value)return value;await delay(20);}throw Error('Expected room message absent');}};
}
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
