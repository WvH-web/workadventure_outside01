'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const {createHomeGateway,project,cookie}=require('../ops/castle-homes/gateway.cjs');
const {GatewayError}=require('../ops/hall-audio/errors.cjs');
const {client}=require('../tools/castle-home-test-client.cjs');
const key='c'.repeat(64),pupil=id=>({sub:'wvh:student:'+id,role:'student',grade:3,age:9,moderator:false,read_only:false});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
async function fixture(run){
 const seen=[],profiles=new Map([['a@invalid.local',pupil(7)],['b@invalid.local',pupil(8)]]);let lookup=async id=>profiles.get(id)??null;
 const preflight=async header=>{if(!['Bearer a','Bearer b'].includes(header))throw new GatewayError(401,'unauthorized');return {identifier:header.slice(7)+'@invalid.local'};};
 const verify=Object.assign(async header=>({...await preflight(header),expiresAt:Date.now()+3600000}),{preflight});
 const app=await createHomeGateway({key,verify,lookup:id=>lookup(id),allowInsecureLocal:true,createGame:options=>{
  assert.equal(options.testMode,false);assert.equal(options.requireSchool,true);assert.equal(options.media,null);
  const server=http.createServer(async(req,res)=>{
   let raw='';for await(const chunk of req)raw+=chunk;seen.push({path:req.url,cookie:req.headers.cookie,authorization:req.headers.authorization,raw});
   if(req.url==='/auth/bridge'){
    const ticket=new URLSearchParams(raw).get('ticket'),[body,signature]=ticket.split('.');assert.equal(signature,crypto.createHmac('sha256',key).update(body).digest('hex'));
    const claim=JSON.parse(Buffer.from(body,'base64url'));res.setHeader('Set-Cookie',['sternenhueter_school='+claim.sid+'; Path=/; HttpOnly','dorfplatz_guest=; Path=/; Max-Age=0']);res.writeHead(303,{Location:'/'});res.end();return;
   }
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({me:{id:'opaque-game-person',name:'Schlossfreund',grade:3,age:9},account:{role:'student',canModerate:false},
    players:[{name:'Unrelated hidden village member'}],subject:'wvh:student:7',email:'private@invalid.local',nested:{accessToken:'private',birthdate:'2017-01-01'},room:{placed:[]}}));
  });
  return {game:{server,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}},assetPaths:new Set(['/zimmer/app.js']),roomSocial:'// reviewed fixture'};
 }});
 try{await run({app,seen,profiles,setLookup:next=>lookup=next,a:client(app.url,'a'),b:client(app.url,'b')});}finally{await app.close();}
}

test('strict projection and duplicate cookie rejection do not expose school or unrelated browser credentials',()=>{
 assert.deepEqual(project({grade:3,nested:{age:9,birthdate:'private',name:'Own name'},items:[{subject:'private',item:'chair'}]}),{nested:{name:'Own name'},items:[{item:'chair'}]});
 assert.equal(cookie('view=first; view=second','view'),null);assert.equal(cookie('other=x; view=one','view'),'one');assert.equal(cookie('prefixview=one','view'),null);
});

test('only the owned public shell is anonymous, and session input is exact and origin-bound',async()=>fixture(async({a})=>{
 assert.equal((await a.request('')).status,200);assert.equal((await a.request('entry.js')).status,200);
 assert.equal((await a.request('view/'+crypto.randomUUID()+'/zimmer/')).status,401);
 assert.equal((await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID(),role:'teacher'})).status,400);
 assert.equal((await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()},{Origin:'https://foreign.invalid'})).status,403);
 assert.equal((await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()},{Authorization:'Bearer forged'})).status,401);
}));

test('a browser receives only a public view generation and scoped HttpOnly cookies, never backend or school credentials',async()=>fixture(async({a,seen})=>{
 const opened=await a.open();assert.deepEqual(Object.keys(opened.value).sort(),['leaseMs','ready','view']);
 assert.equal(opened.headers.get('permissions-policy'),'camera=(), microphone=(), display-capture=()');
 assert.match(opened.headers.get('set-cookie'),new RegExp('Path=/castle-homes/view/'+a.view+'/'));
 const suppliedCookie=[...a.cookies.values()].map(row=>row.name+'='+row.value).join('; ')+'; unrelated=private';
 const result=await a.api('guest',{}, {Authorization:'Bearer must-not-reach-game',cookie:suppliedCookie});
 assert.equal(result.status,200);assert.equal(result.value.players,undefined);assert.equal(result.value.me.grade,undefined);
 assert.ok(seen.every(row=>row.authorization===undefined&&!row.cookie?.includes('unrelated')));
 assert.equal(JSON.stringify(result.value).includes('wvh:student'),false);assert.equal(JSON.stringify(result.value).includes('private@'),false);
}));

test('renewal keeps the private game session and stale leave requests cannot close the newer renewal',async()=>fixture(async({a,seen})=>{
 await a.open();const oldRequest=a.requestId,view=a.view,oldCount=seen.filter(row=>row.path==='/auth/bridge').length;
 await a.renew();assert.equal(seen.filter(row=>row.path==='/auth/bridge').length,oldCount);
 await a.request('leave',{clientId:a.clientId,requestId:oldRequest,view});assert.equal((await a.api('bedroom')).status,200);
 await a.leave();assert.equal((await a.api('bedroom')).status,401);
}));

test('independent browsers and changed identities cannot use an earlier view, even if its public id is known',async()=>fixture(async({a,b})=>{
 await a.open();await b.open();assert.equal((await b.request('view/'+a.view+'/api/bedroom')).status,401);
 const oldView=a.view,response=await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()},{Authorization:'Bearer b'});assert.equal(response.status,200);
 assert.notEqual(response.value.view,oldView);assert.equal((await a.request('view/'+oldView+'/api/bedroom')).status,401);
 assert.equal((await a.request('view/'+response.value.view+'/api/bedroom')).status,200);
}));

test('a late initial authorization cannot publish a second active view after a newer request succeeded',async()=>fixture(async({a,app,setLookup})=>{
 await a.request('');const entered=deferred(),wait=deferred();let first=true;
 setLookup(async()=>{if(first){first=false;entered.resolve();await wait.promise;}return pupil(7);});
 const old=a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()});await entered.promise;
 const latest=await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()});assert.equal(latest.status,200);
 wait.resolve();assert.equal((await old).status,409);assert.equal((await a.request('view/'+latest.value.view+'/api/bedroom')).status,200);
 assert.equal(app.inspectForTest().views,1);
}));

test('withdrawal closes a prior view and no alternate route or query parameter can restore it',async()=>fixture(async({a,profiles})=>{
 await a.open();profiles.set('a@invalid.local',null);
 const denied=await a.request('session',{clientId:a.clientId,requestId:crypto.randomUUID()});assert.equal(denied.status,403);assert.equal((await a.api('bedroom')).status,401);
 for(const route of ['view/'+a.view+'/auth/bridge','view/'+a.view+'/api/state','view/'+a.view+'/api/bedroom?token=anything','../school/server.cjs'])assert.equal((await a.request(route)).status===200,false);
}));
test('moderation pages and API require the fresh private moderator capability and the correct browser binding',async()=>fixture(async({a,b,profiles})=>{
 await a.open();await b.open();assert.equal((await a.request('view/'+a.view+'/moderation/')).status,403);assert.equal((await a.api('moderation/chat')).status,403);
 profiles.set('a@invalid.local',{sub:'wvh:staff:70',role:'teacher',age:null,grade:null,moderator:true,read_only:false});await a.open();
 const page=await a.request('view/'+a.view+'/moderation/');assert.equal(page.status,200);assert.match(page.value,/id="reports"/);
 assert.equal((await a.request('view/'+a.view+'/moderation/moderation.js')).status,200);assert.equal((await a.api('moderation/chat')).status,200);
 assert.equal((await b.request('view/'+a.view+'/moderation/')).status,401);
 profiles.set('a@invalid.local',{sub:'wvh:staff:70',role:'teacher',age:null,grade:null,moderator:false,read_only:false});await a.renew();
 assert.equal((await a.request('view/'+a.view+'/moderation/')).status,403);assert.equal((await a.api('moderation/chat')).status,403);
}));
