'use strict';
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {createHomeAuthority}=require('./authority.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const BASE='/castle-homes/',BROWSER='wvh_home_browser',VIEW='wvh_home_view';
const APIS=new Map([['/api/guest',['POST']],['/api/bedroom',['GET','POST']],['/api/visits',['GET','POST']],['/api/proximity',['GET','POST']],['/api/moderation/chat',['GET','POST']]]);
const fail=(status,code)=>{throw new GatewayError(status,code);};
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function cookie(raw,name){const values=(raw||'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):null;}
async function collect(stream,max){const chunks=[];let size=0;for await(const chunk of stream){size+=chunk.length;if(size>max){stream.destroy();fail(413,'invalid_request');}chunks.push(chunk);}return Buffer.concat(chunks);}
async function jsonBody(req,keys){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'invalid_request');
 let value;try{value=JSON.parse((await collect(req,1024)).toString('utf8'));}catch(error){if(error instanceof GatewayError)throw error;fail(400,'invalid_request');}
 if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))fail(400,'invalid_request');return value;
}
function project(value){
 if(Array.isArray(value))return value.map(project);if(!value||typeof value!=='object')return value;
 const privateKeys=new Set(['sub','subject','age','grade','birthdate','classId','gradeLevel','email','accessToken','identifier','_credential','portal_sid']);
 return Object.fromEntries(Object.entries(value).filter(([key])=>!privateKeys.has(key)).map(([key,item])=>[key,project(item)]));
}

async function createHomeGateway({key,verify,lookup,createGame,origin,port=0,allowInsecureLocal=false,clock=Date.now,trustedProxyIps=[],pages,admissionOptions}={}){
 if(typeof createGame!=='function'||typeof verify?.preflight!=='function'||!Array.isArray(trustedProxyIps))throw Error('Reviewed game factory and school verifier required');
 if(origin){const url=new URL(origin);if(url.origin!==origin||url.protocol!=='https:'&&!(allowInsecureLocal&&url.protocol==='http:'&&url.hostname==='127.0.0.1'))throw Error('Fixed HTTPS home origin required');}
 else if(!allowInsecureLocal)throw Error('Production home origin required');
 const staticPages=pages||new Map(['index.html','entry.js','entry.css','room.html','room.css','exit.html','exit.js','moderation.html','moderation.js','moderation.css'].map(name=>[name,fs.readFileSync(path.join(__dirname,'public',name))]));
 if(!staticPages.has('icons.js'))staticPages.set('icons.js',fs.readFileSync(path.join(__dirname,'../hall-audio/public/vendor/lucide.min.js')));
 const entries=new Map(),views=new Map(),bySid=new Map(),limits=new Map(),connections=new Set(),controls=new Set(),logouts=new Set();
 let backend,game,assetPaths,roomSocial,closed=false,publicOrigin=origin;
 const mac=value=>crypto.createHmac('sha256',key).update(value).digest('hex');
 const fingerprint=value=>mac('browser\n'+value);
 const authority=createHomeAuthority({key,verify,lookup,clock,admissionOptions,onInvalid:sid=>{const view=bySid.get(sid);if(view)drop(view);}});
 const secure=()=>new URL(publicOrigin).protocol==='https:'?'; Secure':'';
 const setCookie=(name,value,scope,seconds)=>`${name}=${value}; Path=${scope}; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure()}`;
 function browser(req){const value=cookie(req.headers.cookie,BROWSER),match=/^([a-f0-9]{40})\.([a-f0-9]{64})$/.exec(value||'');return match&&equal(match[2],mac('binder\n'+match[1]))?fingerprint(match[1]):null;}
 function issueBrowser(res){const nonce=crypto.randomBytes(20).toString('hex');res.setHeader('Set-Cookie',setCookie(BROWSER,nonce+'.'+mac('binder\n'+nonce),BASE,7200));}
 function headers(res){
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('Permissions-Policy','camera=(), microphone=(), display-capture=()');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; worker-src 'none'");
 }
 function send(res,status,value){if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
 function page(res,name){const value=staticPages.get(name);if(!value)fail(404,'not_found');res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(value);}
 function ip(req){const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');return trustedProxyIps.includes(peer)&&net.isIP(req.headers['x-real-ip']||'')?req.headers['x-real-ip']:peer;}
 function rate(req,max=2000){const id=mac('rate\n'+ip(req)),now=clock();let row=limits.get(id);
  if(!row||row.until<=now){if(limits.size>=5000)for(const [id,value]of limits)if(value.until<=now)limits.delete(id);if(limits.size>=5000)fail(503,'unavailable');row={until:now+60000,count:0};limits.set(id,row);}
  if(++row.count>max)fail(429,'rate_limited');}
 function sameOrigin(req){if(req.headers.origin!==publicOrigin||req.headers['sec-fetch-site']==='cross-site')fail(403,'wrong_origin');}
 function publicUrl(req){
  if(req.headers.host!==new URL(publicOrigin).host||typeof req.url!=='string'||req.url.length>2048||req.url.startsWith('//')||/%(?:2f|5c|2e|00)/i.test(req.url.split('?')[0])||req.url.includes('\\'))fail(404,'not_found');
  const url=new URL(req.url,publicOrigin);if(!url.pathname.startsWith(BASE))fail(404,'not_found');return url;
 }
 function rootQuery(url){const entries=[...url.searchParams];if(entries.length>1||entries.length===1&&(entries[0][0]!=='besuch'||!/^[A-F0-9]{10}$/.test(entries[0][1])))fail(404,'not_found');}
 function bound(req,id){const view=views.get(id),sid=cookie(req.headers.cookie,VIEW);
  if(!view||view.closed||view.browser!==browser(req)||sid!==view.sid||!authority.valid(view.sid))fail(401,'session_expired');return view;}
 function backendHeaders(req,view){return {host:new URL(publicOrigin).host,origin:publicOrigin,'content-type':req.headers['content-type']||'application/json',
  cookie:view.gameCookie,'x-village-client':'2','x-forwarded-proto':new URL(publicOrigin).protocol.slice(0,-1),'x-real-ip':ip(req)};}
 function backendRequest(route,{method='GET',requestHeaders={},body,signal}={}){
  return new Promise((resolve,reject)=>{const request=http.request(backend+route,{method,headers:{host:new URL(publicOrigin).host,...requestHeaders},signal},resolve);
   request.setTimeout(8000,()=>request.destroy(Error('Home backend timed out')));request.once('error',reject);request.end(body);});
 }
 function logout(view){
  if(!view.gameCookie||!backend)return;const value=view.gameCookie;view.gameCookie=null;
  const requestHeaders={host:new URL(publicOrigin).host,origin:publicOrigin,cookie:value,'content-type':'application/json','x-forwarded-proto':new URL(publicOrigin).protocol.slice(0,-1)};
  const lastDevice=view.actor&&![...views.values()].some(other=>other.actor===view.actor&&!other.closed);
  const pending=(async()=>{
   if(lastDevice)try{const response=await backendRequest('/api/visits',{method:'POST',requestHeaders,body:'{"action":"leave"}'});response.resume();}catch{}
   try{const response=await backendRequest('/api/logout',{method:'POST',requestHeaders,body:'{}'});response.resume();}catch{}
  })().finally(()=>logouts.delete(pending));logouts.add(pending);
 }
 function drop(view){if(view.closed)return;view.closed=true;views.delete(view.id);bySid.delete(view.sid);
  if(view.entry.view===view)view.entry.view=null;for(const resource of [...view.resources])resource();view.resources.clear();logout(view);}
 async function open(req,res,abort){
  sameOrigin(req);rate(req);const input=await jsonBody(req,['clientId','requestId']);if(!UUID.test(input.clientId)||!UUID.test(input.requestId))fail(400,'invalid_request');
  if(!browser(req))fail(401,'browser_required');await verify.preflight(req.headers.authorization);
  const browserId=browser(req),id=mac(browserId+'\n'+input.clientId);let entry=entries.get(id);
  if(!entry){if(entries.size>=1200)fail(503,'unavailable');entry={revision:0,view:null};entries.set(id,entry);}
  entry.last=clock();entry.requestId=input.requestId;const revision=++entry.revision,prior=entry.view;
  let grant,gameCookie;
  try{
   grant=await authority.open(req.headers.authorization,{previousSid:prior?.sid,signal:abort.signal});
   if(closed||abort.signal.aborted||entry.revision!==revision||entries.get(id)!==entry)fail(409,'superseded');
   const claim=JSON.parse(Buffer.from(grant.ticket.split('.')[0],'base64url').toString('utf8')),moderator=claim.role==='teacher'&&claim.moderator===true;
   if(prior&&!prior.closed&&prior.sid===grant.sid){
    prior.moderator=moderator;
    res.setHeader('Set-Cookie',setCookie(VIEW,grant.sid,BASE+'view/'+prior.id+'/',Math.max(0,Math.floor((grant.validUntil-clock())/1000))));
    send(res,200,{ready:true,view:prior.id,leaseMs:Math.max(0,grant.validUntil-clock())});return;
   }
   const response=await backendRequest('/auth/bridge',{method:'POST',requestHeaders:{origin:publicOrigin,'content-type':'application/x-www-form-urlencoded','x-forwarded-proto':new URL(publicOrigin).protocol.slice(0,-1),'x-real-ip':ip(req)},
    body:new URLSearchParams({ticket:grant.ticket}).toString(),signal:abort.signal});
   response.resume();const cookies=response.headers['set-cookie']||[];
   if(response.statusCode!==303||cookies.length!==2)fail(503,'unavailable');
   const selected=cookies.filter(value=>/^sternenhueter_school=[a-f0-9]{40};/.test(value));if(selected.length!==1)fail(503,'unavailable');gameCookie=selected[0].split(';')[0];
   if(closed||abort.signal.aborted||entry.revision!==revision||entries.get(id)!==entry||!authority.valid(grant.sid))fail(409,'superseded');
   const view={id:crypto.randomUUID(),sid:grant.sid,browser:browserId,entry,gameCookie,moderator,actor:mac('game-actor\n'+claim.sub),resources:new Set(),closed:false};
   entry.view=view;views.set(view.id,view);bySid.set(view.sid,view);gameCookie=null;
   res.setHeader('Set-Cookie',setCookie(VIEW,view.sid,BASE+'view/'+view.id+'/',Math.max(0,Math.floor((grant.validUntil-clock())/1000))));
   send(res,200,{ready:true,view:view.id,leaseMs:Math.max(0,grant.validUntil-clock())});
  }catch(error){if(grant&&entry.view?.sid!==grant.sid)authority.revoke(grant.sid);if(gameCookie)logout({gameCookie});throw error;}
 }
 async function leave(req,res){
  sameOrigin(req);const input=await jsonBody(req,['clientId','requestId','view']);if(!UUID.test(input.clientId)||!UUID.test(input.requestId)||input.view!==null&&!UUID.test(input.view))fail(400,'invalid_request');
  const binder=browser(req),entry=binder?entries.get(mac(binder+'\n'+input.clientId)):null;
  if(entry&&entry.requestId===input.requestId){++entry.revision;if(entry.view&&(input.view===null||entry.view.id===input.view))authority.revoke(entry.view.sid);}
  send(res,200,{left:true});
 }
 function apiAllowed(route,method){return APIS.get(route)?.includes(method);}
 async function proxy(req,res,view,route,url){
  if(req.headers.origin&&req.headers.origin!==publicOrigin||req.headers['sec-fetch-site']==='cross-site')fail(403,'wrong_origin');
  const api=route.startsWith('/api/');if(api){if(!apiAllowed(route,req.method)||url.search)fail(404,'not_found');if(route==='/api/moderation/chat'&&!view.moderator)fail(403,'not_allowed');if(req.method==='POST'){sameOrigin(req);if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'invalid_request');}}
  else if(req.method!=='GET'||!assetPaths.has(route)||url.search)fail(404,'not_found');
  if(route==='/game/room-social.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(roomSocial);return;}
  const body=req.method==='POST'?await collect(req,16384):undefined;
  await new Promise((resolve,reject)=>{
   const upstream=http.request(backend+route,{method:req.method,headers:backendHeaders(req,view)},async incoming=>{
    try{
     if(view.closed||!authority.valid(view.sid)){incoming.destroy();fail(401,'session_expired');}
     const type=incoming.headers['content-type']||'application/octet-stream';
     if(api){const raw=await collect(incoming,512*1024);if(view.closed||!authority.valid(view.sid))fail(401,'session_expired');
      let value;try{value=project(JSON.parse(raw.toString('utf8')));if(route==='/api/guest'&&incoming.statusCode===200)value={me:value.me,account:value.account,loginURL:publicOrigin+BASE,mediaProbe:false};}catch{fail(503,'unavailable');}
      send(res,incoming.statusCode,value);resolve();
     }else{
      res.writeHead(incoming.statusCode,{'Content-Type':type,...(incoming.headers['content-length']?{'Content-Length':incoming.headers['content-length']}:{})});incoming.pipe(res);incoming.once('end',resolve);incoming.once('error',reject);
     }
    }catch(error){reject(error);}
   });
   const cancel=()=>{upstream.destroy();res.destroy();};view.resources.add(cancel);
   const cleanup=()=>{view.resources.delete(cancel);upstream.destroy();};res.once('close',cleanup);res.once('finish',cleanup);
   upstream.setTimeout(8000,()=>upstream.destroy(Error('Home proxy timed out')));upstream.once('error',reject);upstream.end(body);
  });
 }
 const server=http.createServer(async(req,res)=>{
  headers(res);const abort=new AbortController(),cancel=()=>{if(!res.writableEnded)abort.abort();};res.once('close',cancel);
  try{
   const url=publicUrl(req),route=url.pathname.slice(BASE.length);
   if(route==='health'&&req.method==='GET'&&!url.search){send(res,200,{ready:!!backend&&!closed});return;}
   if(route==='authority/check'){
    if(req.method!=='POST'||url.search)fail(404,'not_found');const raw=(await collect(req,8192)).toString('utf8');
    const result=await authority.check(raw,Object.fromEntries(['timestamp','nonce','signature'].map(name=>[name,req.headers['x-sterne-'+name]])));
    res.setHeader('X-Sterne-Signature',result.signature);res.writeHead(200,{'Content-Type':'application/json'});res.end(result.body);return;
   }
   if(!backend||closed)fail(503,'unavailable');
   if(route===''&&req.method==='GET'){rootQuery(url);if(!browser(req))issueBrowser(res);page(res,'index.html');return;}
   if(['entry.js','entry.css','room.css','icons.js'].includes(route)&&req.method==='GET'&&!url.search){page(res,route);return;}
   if(route==='session'&&req.method==='POST'&&!url.search){const task=open(req,res,abort);controls.add(task);try{await task;}finally{controls.delete(task);}return;}
   if(route==='leave'&&req.method==='POST'&&!url.search){await leave(req,res);return;}
   const match=/^view\/([a-f0-9-]{36})(\/.*)$/.exec(route);if(!match||!UUID.test(match[1]))fail(404,'not_found');
   const view=bound(req,match[1]);let target;try{target=decodeURIComponent(match[2]);}catch{fail(404,'not_found');}
   if(target==='/'&&req.method==='GET'&&!url.search){page(res,'exit.html');return;}
   if(target==='/exit.js'&&req.method==='GET'&&!url.search){page(res,'exit.js');return;}
   if(target==='/zimmer/'&&req.method==='GET'){rootQuery(url);page(res,'room.html');return;}
   if(target.startsWith('/moderation/')||target==='/lehrer/'){
    if(!view.moderator)fail(403,'not_allowed');if(req.method!=='GET'||url.search)fail(404,'not_found');
    if(target==='/lehrer/'){res.writeHead(303,{Location:BASE+'view/'+view.id+'/moderation/'});res.end();return;}
    const name=target==='/moderation/'?'moderation.html':target.slice('/moderation/'.length);
    if(!['moderation.html','moderation.js','moderation.css'].includes(name))fail(404,'not_found');page(res,name);return;
   }
   await proxy(req,res,view,target,url);
  }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');if(!res.headersSent){if(safe.status===429||safe.status===503)res.setHeader('Retry-After','1');send(res,safe.status,{error:safe.code});}else res.destroy();}
  finally{res.removeListener('close',cancel);}
 });
 server.on('connection',socket=>{connections.add(socket);socket.once('close',()=>connections.delete(socket));});
 server.on('upgrade',(req,socket,head)=>{
  try{
   const url=publicUrl(req);sameOrigin(req);if(url.search||closed)fail(403,'not_allowed');
   const match=new RegExp('^'+BASE+'view/([a-f0-9-]{36})/room-live$').exec(url.pathname);if(!match||!UUID.test(match[1]))fail(404,'not_found');
   const view=bound(req,match[1]);if(req.headers['sec-websocket-version']!=='13'||typeof req.headers['sec-websocket-key']!=='string'||! /^[A-Za-z0-9+/]{22}==$/.test(req.headers['sec-websocket-key']))fail(400,'invalid_request');
   const upstream=http.request(backend+'/room-live',{headers:{...backendHeaders(req,view),upgrade:'websocket',connection:'Upgrade','sec-websocket-key':req.headers['sec-websocket-key'],'sec-websocket-version':'13'}});
   let peer;const cancel=()=>{upstream.destroy();peer?.destroy();socket.destroy();};view.resources.add(cancel);
   const cleanup=()=>{view.resources.delete(cancel);upstream.destroy();peer?.destroy();};socket.once('close',cleanup);socket.once('error',cancel);
   upstream.setTimeout(5000,cancel);upstream.once('upgrade',(response,incoming,bytes)=>{
    peer=incoming;if(view.closed||!authority.valid(view.sid)){cancel();return;}
    upstream.setTimeout(0);socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+response.headers['sec-websocket-accept']+'\r\n\r\n');
    if(bytes.length)socket.write(bytes);if(head.length)peer.write(head);socket.pipe(peer).pipe(socket);peer.once('error',cancel);peer.once('close',()=>socket.destroy());
   });upstream.once('response',response=>{response.resume();socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});upstream.once('error',cancel);upstream.end();
  }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
 });
 server.requestTimeout=12000;server.headersTimeout=8000;server.maxConnections=1000;
 let timer;
 async function close(){if(closed)return;closed=true;clearInterval(timer);authority.close();for(const socket of connections)socket.destroy();
  await new Promise(resolve=>server.close(resolve));await Promise.allSettled([...controls]);await Promise.allSettled([...logouts]);await game?.close();}
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});publicOrigin||='http://127.0.0.1:'+server.address().port;
  const value=await createGame({school:{secret:key,portalOrigin:publicOrigin,loginURL:publicOrigin+BASE,introspectionURL:publicOrigin+BASE+'authority/check',...(allowInsecureLocal?{allowInsecureLocal:true}:{})},
   cookiePath:BASE,trustProxy:true,requireSchool:true,media:null,testMode:false});
  game=value.game;assetPaths=value.assetPaths;roomSocial=value.roomSocial;
  if(!game?.server||typeof game.close!=='function'||!(assetPaths instanceof Set)||assetPaths.size>400||typeof roomSocial!=='string')throw Error('Reviewed room assets required');
  await new Promise((resolve,reject)=>{game.server.once('error',reject);game.server.listen(0,'127.0.0.1',resolve);});backend='http://127.0.0.1:'+game.server.address().port;
  timer=setInterval(()=>{authority.sweep();for(const [id,entry]of entries)if(!entry.view&&clock()-entry.last>60000)entries.delete(id);},1000);timer.unref();
  return {server,url:publicOrigin+BASE,close,inspectForTest:()=>({views:views.size,entries:entries.size})};
 }catch(error){await close();throw error;}
}
module.exports={createHomeGateway,cookie,project};
