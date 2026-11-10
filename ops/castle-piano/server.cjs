'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
process.env.WS_NO_BUFFER_UTIL='1';process.env.WS_NO_UTF_8_VALIDATE='1';
const {WebSocketServer}=require('./vendor/ws');
const {PianoRooms,cookieFrom,cookieHeader}=require('./rooms.cjs');
const {createSchoolVerifier}=require('../castle-school/identity.cjs');
const {createLookup}=require('../castle-school/lookup.cjs');
const {validateProfile}=require('../castle-school/policy.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const PREFIX='/castle-piano/';
const fail=(status,code)=>{throw new GatewayError(status,code);};
async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'invalid_request');
  let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>1024)fail(413,'invalid_request');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
  catch{fail(400,'invalid_request');}
}
function publicFiles(){
  const files=new Map(),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'vendor-manifest.json'),'utf8'));
  const items=['index.html','piano.js','piano.css','keys.css','audio.js','projection.js','credits.html'].map(file=>({path:'public/'+file}));
  items.push(...manifest.files.filter(file=>file.path.startsWith('public/')));
  for(const file of items){
    if(!/^public\/[a-zA-Z0-9_./-]+$/.test(file.path)||file.path.split('/').includes('..'))throw Error('Invalid public piano path');
    const bytes=fs.readFileSync(path.join(__dirname,file.path));
    if(file.sha256&&crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Piano vendor integrity mismatch');
    let name=file.path.slice('public/'.length);if(name.startsWith('samples/'))name=name.replace('samples/','samples/'+manifest.samples.commit+'/');
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'}[path.extname(name)]||'text/plain';
    files.set(name,{bytes,type,immutable:name.startsWith('samples/')});
  }return files;
}
function createPianoServer({config,lookup,rooms=new PianoRooms(),clock=Date.now,verify=createSchoolVerifier(config.secret)}){
  const parsed=new URL(config.origin);
  if(parsed.origin!==config.origin||parsed.username||parsed.password||!['http:','https:'].includes(parsed.protocol)||typeof lookup!=='function'||!Array.isArray(config.trustedProxyIps))throw Error('Invalid piano server configuration');
  const files=publicFiles(),buckets=new Map(),wss=new WebSocketServer({noServer:true,clientTracking:true,perMessageDeflate:false,maxPayload:1024,
    handleProtocols:protocols=>protocols.has('castle-piano-v1')?'castle-piano-v1':false});
  let closed=false;
  function limit(key,max,window=60000){
    let entry=buckets.get(key);const now=clock();if(!entry||entry.until<=now){if(buckets.size>=6000)fail(503,'unavailable');entry={until:now+window,count:0};buckets.set(key,entry);}
    if(++entry.count>max)fail(429,'rate_limited');
  }
  function ip(req){const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');const header=req.headers['x-real-ip'];return config.trustedProxyIps.includes(peer)&&typeof header==='string'&&net.isIP(header)?header:peer;}
  function origin(req,upgrade=false){
    if(req.headers.origin&&req.headers.origin!==config.origin||upgrade&&req.headers.origin!==config.origin||
      req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))fail(403,'wrong_origin');
  }
  const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN',
    'Permissions-Policy':'microphone=(), camera=(), display-capture=(), midi=()',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' "+config.origin.replace(/^http/,'ws')+
      "; img-src 'self'; media-src 'self'; worker-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"};
  const timer=setInterval(()=>{rooms.sweep();for(const [key,value]of buckets)if(value.until<=clock())buckets.delete(key);},500);timer.unref();
  const server=http.createServer(async(req,res)=>{
    for(const [key,value]of Object.entries(security))res.setHeader(key,value);
    const send=(status,value)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}};
    try{
      const url=new URL(req.url,config.origin);if(url.search||!url.pathname.startsWith(PREFIX))fail(404,'not_found');
      const route=url.pathname.slice(PREFIX.length)||'index.html';
      if(files.has(route)){
        if(req.method!=='GET')fail(405,'method_not_allowed');const file=files.get(route);
        if(file.immutable)res.setHeader('Cache-Control','public, max-age=31536000, immutable');
        res.writeHead(200,{'Content-Type':file.type+(file.type==='audio/mpeg'?'':'; charset=utf-8')});res.end(file.bytes);return;
      }
      if(route==='health'&&req.method==='GET'){send(200,{ready:true});return;}
      if(!['session','leave','panic'].includes(route))fail(404,'not_found');if(req.method!=='POST')fail(405,'method_not_allowed');
      origin(req);limit('ip:'+rooms.opaque(ip(req)),12000);const auth=await verify(req.headers.authorization),actor=rooms.actor(auth);
      limit('account:'+actor.id,90);const input=await body(req);
      if(route==='session'){
        const ticket=rooms.begin(input,auth);
        try{
          const profile=validateProfile(await lookup(auth.schoolIdentifier??auth.identifier),clock());
          const result=rooms.complete(ticket,profile,cookieFrom(req.headers.cookie));
          res.setHeader('Set-Cookie',cookieHeader(result.cookie,result.lease,{clock,secure:parsed.protocol==='https:'}));send(200,result.context);
        }catch(error){if(error.code!=='account_changed'&&error.code!=='session_in_use')rooms.revokeActor(actor.id);throw error;}
        return;
      }
      if(Object.keys(input).sort().join(',')!==(route==='leave'?'clientId':'clientId,roomId'))fail(400,'invalid_request');
      const lease=rooms.get(cookieFrom(req.headers.cookie),actor);if(input.clientId!==lease.client)fail(403,'not_allowed');
      if(route==='leave'){
        rooms.revoke(lease.id);res.setHeader('Set-Cookie','wvh_castle_piano=; Path=/castle-piano/; Max-Age=0; HttpOnly; SameSite=Strict'+(parsed.protocol==='https:'?'; Secure':''));
        send(200,{left:true});return;
      }
      const profile=validateProfile(await lookup(auth.schoolIdentifier??auth.identifier),clock());send(200,rooms.panic(auth,profile,input.roomId));
    }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');if([429,503].includes(safe.status))res.setHeader('Retry-After','3');send(safe.status,{error:safe.code});}
  });
  server.on('upgrade',(req,socket,head)=>{
    let ticket,timeout;
    try{
      const url=new URL(req.url,config.origin);if(url.pathname!==PREFIX+'socket'||url.search)fail(404,'not_found');origin(req,true);
      limit('upgrade-ip:'+rooms.opaque(ip(req)),300);
      const protocols=(req.headers['sec-websocket-protocol']||'').split(',').map(value=>value.trim());
      if(protocols.length!==2||protocols[0]!=='castle-piano-v1'||!/^visit\.[a-f0-9]{24}$/.test(protocols[1]))fail(400,'invalid_request');
      ticket=rooms.reserve(cookieFrom(req.headers.cookie),protocols[1].slice('visit.'.length));
      timeout=setTimeout(()=>{rooms.cancel(ticket);socket.destroy();},4000);socket.once('close',()=>{clearTimeout(timeout);rooms.cancel(ticket);});
      wss.handleUpgrade(req,socket,head,ws=>{
        clearTimeout(timeout);const send=value=>{
          if(ws.readyState!==1)return;if(ws.bufferedAmount>65536){ws.close(1013,'slow_consumer');return;}
          ws.send(JSON.stringify(value),error=>{if(error)ws.terminate();});
        };
        let connection;
        try{connection=rooms.connect(ticket,send,()=>ws.close(1000,'session_ended'));}
        catch{ws.close(1008,'session_expired');return;}
        let alive=true,invalid=0;
        const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},15000);heartbeat.unref();
        ws.on('pong',()=>{alive=true;});ws.on('error',()=>{});
        ws.on('message',(raw,binary)=>{
          try{
            if(binary)fail(400,'invalid_request');let input;try{input=JSON.parse(raw.toString('utf8'));}catch{fail(400,'invalid_request');}
            rooms.command(connection.lease,connection.stamp,input);invalid=0;
          }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');send({version:1,type:'error',code:safe.code});
            if(++invalid>=3||[401,403,410,503].includes(safe.status))ws.close(1008,'not_allowed');}
        });
        ws.once('close',()=>{clearInterval(heartbeat);rooms.disconnect(connection.lease,connection.stamp);});
      });
    }catch(error){if(timeout)clearTimeout(timeout);if(ticket)rooms.cancel(ticket);const status=error instanceof GatewayError?error.status:503;
      socket.end('HTTP/1.1 '+status+' Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');}
  });
  server.requestTimeout=8000;server.headersTimeout=8000;
  const close=server.close.bind(server);server.close=callback=>{if(!closed){closed=true;clearInterval(timer);rooms.close();for(const ws of wss.clients)ws.terminate();wss.close();buckets.clear();}return close(callback);};
  return server;
}
async function main(){
  if(!process.env.SECRET_KEY)throw Error('Private piano school configuration required');
  const config={origin:'https://together.deine-schule.com',secret:process.env.SECRET_KEY,trustedProxyIps:(process.env.CASTLE_PIANO_TRUSTED_PROXY_IPS||'').split(',').filter(Boolean)};
  const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
  const server=createPianoServer({config,lookup});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3241,'0.0.0.0',resolve);});
  const stop=()=>{server.close();server.closeIdleConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);console.info('School piano ready');
}
if(require.main===module)main().catch(()=>{console.error('School piano could not start');process.exitCode=1;});
module.exports={createPianoServer,publicFiles,PREFIX};
