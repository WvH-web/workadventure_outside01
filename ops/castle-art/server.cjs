'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {createProxyServer}=require('./vendor/httpxy.mjs');
const {createSchoolVerifier}=require('../castle-school/identity.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {createLookup}=require('../castle-school/lookup.cjs');
const {validateProfile}=require('../castle-school/policy.cjs');
const {ArtSessions,cookieFrom,cookieHeader,internalToken}=require('./sessions.cjs');
const {artRoute,PREFIX,manifest}=require('./routes.cjs');
function verifier(secret,{clock=Date.now}={}){
  return createSchoolVerifier(secret,{clock});
}
async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new GatewayError(415,'invalid_request');
  let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>256)throw new GatewayError(413,'invalid_request');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join(',')!=='clientId')throw Error();return value;}
  catch{throw new GatewayError(400,'invalid_request');}
}
function staticFiles(){
  const files=new Map();for(const name of ['index.html','art.js','art.css','credits.html','rules.html']){
    const extension=path.extname(name),type={'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extension];
    files.set(name,{type,bytes:fs.readFileSync(path.join(__dirname,'public',name))});
  }
  for(const [name,file,type]of [['source/wbo-2.18.33.tar.gz',manifest.wbo.archive,'application/gzip'],['source/WBO-LICENSE','upstream/WBO-LICENSE','text/plain'],['source/httpxy-LICENSE','vendor/httpxy-LICENSE','text/plain']])
    files.set(name,{type,bytes:fs.readFileSync(path.join(__dirname,file))});
  return files;
}
function createArtServer({config,lookup,sessions=new ArtSessions(),verify=verifier(config.secret),clock=Date.now}){
  if(typeof lookup!=='function'||!/^[a-f0-9]{64}$/.test(config.boardSecret)||config.secret===config.boardSecret)throw Error('Separate art configuration required');
  const target=new URL(config.target);if(target.protocol!=='http:'||target.username||target.password||target.search||target.hash||target.pathname!=='/')throw Error('Fixed private board target required');
  if(!['127.0.0.1','wvh-castle-art-board'].includes(target.hostname))throw Error('Private board host required');
  const files=staticFiles(),proxy=createProxyServer({target:target.href,changeOrigin:false,xfwd:false,followRedirects:false,proxyTimeout:35000,upgradeTimeout:4000}),buckets=new Map(),wsRequests=new WeakMap();
  let healthUntil=0,healthReady=false,healthPending;
  async function ready(){
    if(clock()<healthUntil)return healthReady;if(healthPending)return healthPending;
    healthPending=(async()=>{try{const response=await fetch(new URL('/favicon.svg',target),{signal:AbortSignal.timeout(1500),redirect:'error'});await response.body?.cancel();healthReady=response.ok;}catch{healthReady=false;}
      healthUntil=clock()+1000;return healthReady;})().finally(()=>{healthPending=null;});return healthPending;
  }
  function ip(req){const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');const value=req.headers['x-real-ip'];return config.trustedProxyIps.includes(peer)&&typeof value==='string'&&net.isIP(value)?value:peer;}
  function limit(key,max){let value=buckets.get(key);const now=clock();if(!value||value.until<=now){if(buckets.size>=8000)throw new GatewayError(503,'unavailable');value={until:now+60000,count:0};buckets.set(key,value);}if(++value.count>max)throw new GatewayError(429,'rate_limited');}
  function origin(req,upgrade=false){
    if(req.headers.origin&&req.headers.origin!==config.origin||upgrade&&req.headers.origin!==config.origin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))throw new GatewayError(403,'wrong_origin');
  }
  // WBO's pinned SVG baseline contains exactly this static inline stylesheet.
  function security(){return {'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'SAMEORIGIN',
    'permissions-policy':'microphone=(), camera=(), display-capture=()',
    'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self' 'sha256-ixj4uRHZtqwzknHoLOJJEXj3LMQtuk44lz8ss8ELK+w='; style-src-attr 'unsafe-inline'; connect-src 'self' "+config.origin.replace(/^http/,'ws')+"; img-src 'self' data: blob:; font-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"};}
  function prepare(req,route,lease){
    const requestUrl=new URL(route.pathname+route.search,config.origin);if(route.kind==='proxy')requestUrl.searchParams.set('token',internalToken(lease,config.boardSecret,clock()));
    const realIp=ip(req),headers={host:new URL(config.origin).host,'x-real-ip':realIp,'x-forwarded-for':realIp,'x-forwarded-proto':new URL(config.origin).protocol.slice(0,-1)};
    for(const name of ['accept','accept-language','accept-encoding','content-type','content-length','upgrade','connection','sec-websocket-key','sec-websocket-version','sec-websocket-extensions','origin'])if(req.headers[name])headers[name]=req.headers[name];
    if(lease)headers.cookie='wbo-user-secret-v1='+lease.userSecret;
    req.headers=headers;req.url=requestUrl.pathname+requestUrl.search;
  }
  proxy.on('proxyRes',(upstream)=>{
    Object.assign(upstream.headers,security());delete upstream.headers['set-cookie'];delete upstream.headers['etag'];
    if(upstream.headers.location){delete upstream.headers.location;upstream.statusCode=502;}
  });
  proxy.on('proxyReqWs',(outgoing,req)=>{
    outgoing.prependListener('upgrade',(response,peer)=>{
      Object.assign(response.headers,security());delete response.headers['set-cookie'];
      const record=wsRequests.get(req);if(record){record.upstream=peer;if(record.closed||!sessions.leases.has(record.lease.id))peer.destroy();}
    });
  });
  proxy.on('error',(_error,_req,res)=>{
    if(typeof res.writeHead==='function'){
      if(res.headersSent){res.destroy();return;}res.writeHead(503,{'Content-Type':'application/json; charset=utf-8'});res.end('{"error":"unavailable"}');
    }else res.destroy();
  });
  let closed=false;
  const sweep=setInterval(()=>{sessions.sweep();const now=clock();for(const [key,value]of buckets)if(value.until<=now)buckets.delete(key);},1000);sweep.unref();
  const server=http.createServer(async(req,res)=>{
    for(const [name,value]of Object.entries(security()))res.setHeader(name,value);
    const send=(status,value)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}};
    try{
      const route=artRoute(req.url,config.origin);
      if(route.kind==='static'){
        if(req.method!=='GET')throw new GatewayError(405,'method_not_allowed');const file=files.get(route.file);res.writeHead(200,{'Content-Type':file.type+(file.type==='application/gzip'?'':'; charset=utf-8')});res.end(file.bytes);return;
      }
      if(route.kind==='health'){
        if(req.method!=='GET')throw new GatewayError(405,'method_not_allowed');
        const available=await ready();send(available?200:503,{ready:available});return;
      }
      origin(req);limit('ip:'+sessions.opaque(ip(req)),12000);
      if(route.kind==='session'||route.kind==='leave'){
        if(req.method!=='POST')throw new GatewayError(405,'method_not_allowed');const identity=await verify(req.headers.authorization);limit('account:'+sessions.opaque(identity.identifier),60);
        const input=await body(req),actor=sessions.actor(identity.identifier,false,identity.expiresAt);
        if(route.kind==='leave'){
          const lease=sessions.get(cookieFrom(req.headers.cookie),actor);if(lease.client!==input.clientId)throw new GatewayError(403,'not_allowed');sessions.revoke(lease.id);send(200,{left:true});return;
        }
        const ticket=sessions.begin(input.clientId,actor);
        try{
          const profile=validateProfile(await lookup(identity.schoolIdentifier??identity.identifier),clock());
          if(!profile.eligible||!['student','staff'].includes(profile.kind)){sessions.revokeActor(actor.id);throw new GatewayError(403,'school_required');}
          if(!await ready())throw new GatewayError(503,'unavailable');
          actor.staff=profile.kind==='staff';const result=sessions.complete(ticket,actor,cookieFrom(req.headers.cookie));
          res.setHeader('Set-Cookie',cookieHeader(result.cookie,result.lease,{secure:config.origin.startsWith('https:'),clock}));send(200,result.context);
        }catch(error){if(error.code!=='account_changed')sessions.revokeActor(actor.id);throw error;}return;
      }
      if(!['GET','POST'].includes(req.method)||req.method==='POST'&&!route.socket)throw new GatewayError(405,'method_not_allowed');
      if(route.kind==='asset'){
        prepare(req,route,null);await proxy.web(req,res);return;
      }
      const lease=sessions.get(cookieFrom(req.headers.cookie));
      const remove=sessions.track(lease,'http',()=>res.destroy());res.once('close',remove);res.once('finish',remove);
      prepare(req,route,lease);await proxy.web(req,res);
    }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');if(res.headersSent){res.destroy();return;}if([429,503].includes(safe.status))res.setHeader('Retry-After','3');send(safe.status,{error:safe.code});}
  });
  server.on('upgrade',(req,socket,head)=>{
    try{
      const route=artRoute(req.url,config.origin,{upgrade:true});origin(req,true);limit('ws-ip:'+sessions.opaque(ip(req)),300);
      const lease=sessions.get(cookieFrom(req.headers.cookie)),record={lease,closed:false};wsRequests.set(req,record);
      const remove=sessions.track(lease,'ws',()=>{record.closed=true;socket.destroy();record.upstream?.destroy();});
      socket.once('close',()=>{record.closed=true;remove();record.upstream?.destroy();});socket.on('error',()=>{});
      prepare(req,route,lease);void proxy.ws(req,socket,{},head).catch(()=>{remove();socket.destroy();record.upstream?.destroy();});
    }catch(error){const status=error instanceof GatewayError?error.status:503;socket.end('HTTP/1.1 '+status+' Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');}
  });
  server.requestTimeout=35000;server.headersTimeout=8000;
  const close=server.close.bind(server);server.close=callback=>{if(!closed){closed=true;clearInterval(sweep);sessions.close();buckets.clear();proxy.close();}return close(callback);};
  return server;
}
async function main(){
  if(!process.env.SECRET_KEY||!/^[a-f0-9]{64}$/.test(process.env.CASTLE_ART_BOARD_SECRET||''))throw Error('Private school art configuration required');
  const config={origin:'https://together.deine-schule.com',target:'http://wvh-castle-art-board:8080',secret:process.env.SECRET_KEY,boardSecret:process.env.CASTLE_ART_BOARD_SECRET,
    trustedProxyIps:(process.env.CASTLE_ART_TRUSTED_PROXY_IPS||'').split(',').filter(Boolean)};
  const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
  const server=createArtServer({config,lookup});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3231,'0.0.0.0',resolve);});
  const stop=()=>{server.close();server.closeIdleConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);console.info('Private school art gateway ready');
}
if(require.main===module)main().catch(()=>{console.error('School art gateway could not start');process.exitCode=1;});
module.exports={createArtServer,verifier};
