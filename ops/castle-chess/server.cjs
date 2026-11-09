'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {createSchoolVerifier}=require('../castle-school/identity.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {createLookup}=require('../castle-school/lookup.cjs');
const {validateProfile}=require('../castle-school/policy.cjs');
const {ChessRooms}=require('./rooms.cjs');
const {ChessJournal}=require('./journal.cjs');
const PREFIX='/castle-chess/';
function createChessVerifier(secret,{clock=Date.now}={}){
  return createSchoolVerifier(secret,{clock});
}
async function readJson(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new GatewayError(415,'invalid_request');
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096)throw new GatewayError(413,'invalid_request');chunks.push(chunk);}
  try{const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||Array.isArray(body)||typeof body!=='object')throw Error();return body;}
  catch{throw new GatewayError(400,'invalid_request');}
}
function staticFiles(){
  const root=path.join(__dirname,'public'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'vendor-manifest.json'),'utf8'));
  const names=['index.html','chess.css','chess.js','training.js','credits.html',...manifest.files.filter(file=>file.path.startsWith('public/')).map(file=>file.path.slice(7))];
  const files=new Map();for(const name of names){
    if(name.split('/').includes('..')||path.resolve(root,name)!==path.join(root,name))throw Error('Invalid chess asset');
    const extension=path.extname(name),type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extension]||'text/plain';
    files.set(name,{type,bytes:fs.readFileSync(path.join(root,name))});
  }
  return files;
}
function createChessServer({config,lookup,rooms=new ChessRooms(),verify=createChessVerifier(config.secret),clock=Date.now}){
  if(typeof lookup!=='function')throw Error('Fresh school lookup required');
  const files=staticFiles(),streams=new Map(),buckets=new Map(),salt=crypto.randomBytes(32);
  const opaque=value=>crypto.createHmac('sha256',salt).update(value).digest('base64url');
  function ip(req){const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');const header=req.headers['x-real-ip'];return config.trustedProxyIps.includes(peer)&&typeof header==='string'&&net.isIP(header)?header:peer;}
  function limit(key,max){let bucket=buckets.get(key);const now=clock();if(!bucket||bucket.until<=now){if(buckets.size>=8000)throw new GatewayError(503,'unavailable');bucket={until:now+60000,count:0};buckets.set(key,bucket);}if(++bucket.count>max)throw new GatewayError(429,'rate_limited');}
  let closed=false,queued=false;
  function endStream(record,event){
    if(streams.get(record.id)!==record)return;streams.delete(record.id);
    if(!record.res.destroyed&&!record.res.writableEnded){if(event)record.res.write('event: expired\ndata: {}\n\n');record.res.end();}
    rooms.disconnect(record.id);
  }
  function sendState(record){
    if(record.res.destroyed||record.res.writableEnded){endStream(record);return;}
    if(record.blocked){record.pending=true;return;}
    try{
      const state=rooms.snapshot(record.id);if(record.res.writableLength>65536){endStream(record,true);return;}
      record.pending=false;record.blocked=!record.res.write('id: '+state.sequence+'\nevent: state\ndata: '+JSON.stringify(state)+'\n\n');
    }catch{endStream(record,true);}
  }
  const unsubscribe=rooms.subscribe(()=>{if(closed||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!closed)for(const record of streams.values())sendState(record);});});
  const sweep=setInterval(()=>{rooms.sweep();const now=clock();for(const [id,bucket]of buckets)if(bucket.until<=now)buckets.delete(id);for(const record of streams.values()){
    try{rooms.session(record.id);}catch{endStream(record,true);}
  }},1000);sweep.unref();
  const keepalive=setInterval(()=>{for(const record of streams.values())if(!record.blocked&&!record.res.destroyed&&!record.res.writableEnded)record.blocked=!record.res.write(': keepalive\n\n');},5000);keepalive.unref();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','microphone=(), camera=(), display-capture=()');
    res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const send=(status,value)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}};
    try{
      const url=new URL(req.url,config.origin);if(url.search||!url.pathname.startsWith(PREFIX))throw new GatewayError(404,'not_found');
      const route=url.pathname.slice(PREFIX.length);
      if(route==='health'&&req.method==='GET'){send(200,{ready:true});return;}
      const file=files.get(route||'index.html');if(file){
        if(req.method!=='GET')throw new GatewayError(405,'method_not_allowed');
        // The pinned renderer calculates SVG coordinates and drag styles; scripts remain self-only.
        res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'");
        res.writeHead(200,{'Content-Type':file.type+'; charset=utf-8'});res.end(file.bytes);return;
      }
      if(!['session','ping','command','leave','state','events','pgn'].includes(route))throw new GatewayError(404,'not_found');
      if(req.method!==(['state','events','pgn'].includes(route)?'GET':'POST'))throw new GatewayError(405,'method_not_allowed');
      if(req.headers.origin&&req.headers.origin!==config.origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')throw new GatewayError(403,'wrong_origin');
      limit('ip:'+opaque(ip(req)),10000);const auth=await verify(req.headers.authorization);limit('id:'+opaque(auth.identifier),120);
      let body;if(req.method==='POST'){body=await readJson(req);if(route!=='command'&&Object.keys(body).length)throw new GatewayError(400,'invalid_request');}
      const profile=validateProfile(await lookup(auth.schoolIdentifier??auth.identifier),clock()),actor={id:opaque('chess:'+auth.identifier),staff:profile.kind==='staff',expiresAt:auth.expiresAt};
      if(!profile.eligible||!['staff','student'].includes(profile.kind)){rooms.revoke(actor.id);throw new GatewayError(403,'school_required');}
      if(route==='session'){limit('session:'+actor.id,20);send(200,rooms.create(actor));return;}
      const sessionId=req.headers['x-chess-session'];rooms.ping(sessionId,actor);
      if(route==='events'){
        if(streams.size>=600&&!streams.has(sessionId))throw new GatewayError(503,'unavailable');
        const previous=streams.get(sessionId);if(previous){streams.delete(sessionId);previous.res.end();}
        const record={id:sessionId,res,blocked:false,pending:false};streams.set(sessionId,record);
        rooms.connect(sessionId,actor);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no'});res.flushHeaders();
        res.on('drain',()=>{record.blocked=false;if(record.pending&&streams.get(sessionId)===record)sendState(record);});
        res.on('close',()=>{if(streams.get(sessionId)===record)endStream(record);});res.on('error',()=>endStream(record));sendState(record);return;
      }
      if(route==='leave'){const result=rooms.leave(sessionId,actor);const stream=streams.get(sessionId);if(stream)endStream(stream,true);send(200,result);return;}
      if(route==='ping'){send(200,rooms.ping(sessionId,actor));return;}
      if(route==='command'){send(200,rooms.command(sessionId,actor,body));return;}
      if(route==='pgn'){
        const data=rooms.pgn(sessionId,actor);res.writeHead(200,{'Content-Type':'application/x-chess-pgn; charset=utf-8','Content-Disposition':'attachment; filename="schloss-schach.pgn"'});res.end(data);return;
      }
      send(200,rooms.snapshot(sessionId));
    }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');if(safe.status===429||safe.status===503)res.setHeader('Retry-After',safe.status===429?'30':'3');send(safe.status,{error:safe.code});}
  });
  server.requestTimeout=8000;server.headersTimeout=8000;
  const close=server.close.bind(server);server.close=callback=>{closed=true;clearInterval(sweep);clearInterval(keepalive);unsubscribe();for(const stream of [...streams.values()])endStream(stream);buckets.clear();return close(callback);};
  return server;
}
async function main(){
  if(process.env.CASTLE_CHESS_DATA_DIR!=='/srv/chess-data'||!process.env.SECRET_KEY)throw Error('Chess runtime configuration required');
  const config={origin:'https://together.deine-schule.com',secret:process.env.SECRET_KEY,trustedProxyIps:(process.env.CASTLE_CHESS_TRUSTED_PROXY_IPS||'').split(',').filter(Boolean)};
  const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
  const rooms=new ChessRooms({journal:new ChessJournal('/srv/chess-data/state.json')}),server=createChessServer({config,lookup,rooms});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3221,'0.0.0.0',resolve);});
  const stop=()=>{server.close();server.closeIdleConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);console.info('Private school chess ready');
}
if(require.main===module)main().catch(()=>{console.error('Private school chess could not start');process.exitCode=1;});
module.exports={createChessServer,createChessVerifier};
