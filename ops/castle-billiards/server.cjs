'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {GatewayError}=require('../hall-audio/errors.cjs'),{createSchoolVerifier}=require('../castle-school/identity.cjs');
const {validateProfile}=require('../castle-school/policy.cjs'),{createLookup}=require('../castle-school/lookup.cjs');
const {ChessJournal:AtomicJournal}=require('../castle-chess/journal.cjs');
const {BilliardsRooms,TABLES}=require('./rooms.cjs'),{PhysicsPool}=require('./physics-pool.cjs');
const {createBilliardsAdmission}=require('./admission.cjs');
const PREFIX='/castle-billiards/';
const fail=(status,code)=>{throw new GatewayError(status,code);};
async function body(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'invalid_request');
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)fail(413,'invalid_request');chunks.push(chunk);}
 try{const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}catch{fail(400,'invalid_request');}
}
function staticFiles(){
 const root=path.join(__dirname,'public'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'vendor-manifest.json'))),files=new Map();
 const names=['index.html','billiards.css','billiards.js','renderer.js','credits.html',...manifest.files.filter(file=>file.path.startsWith('public/')).map(file=>file.path.slice(7))];
 for(const name of names){if(name.split('/').some(p=>!p||p==='..'))throw Error('Invalid static billiards asset');
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(name)]||'text/plain';files.set(PREFIX+name,{bytes:fs.readFileSync(path.join(root,name)),type});}
 const shared=[['/castle-content/vendor/lucide.min.js','../hall-audio/public/vendor/lucide.min.js']];
 for(const name of ['index.js','parse.js','types.js','errors.js'])shared.push(['/castle-chess/vendor/eventsource-parser/dist/'+name,'../castle-chess/public/vendor/eventsource-parser/dist/'+name]);
 for(const [url,file]of shared)files.set(url,{bytes:fs.readFileSync(path.join(__dirname,file)),type:'text/javascript'});
 for(const [name,file]of [['tailuge.GPL-3.0','vendor/tailuge/LICENSE'],['lucide.LICENSE','../hall-audio/public/vendor/lucide.LICENSE'],['eventsource-parser.LICENSE','../castle-chess/public/vendor/eventsource-parser/LICENSE']])
  files.set(PREFIX+'licenses/'+name,{bytes:fs.readFileSync(path.join(__dirname,file)),type:'text/plain'});
 return files;
}
function createBilliardsServer({config,lookup,rooms,clock=Date.now,verify=createSchoolVerifier(config.secret,{clock}),admit=()=>true}){
 if(typeof lookup!=='function'||typeof admit!=='function'||!rooms)throw Error('Fresh school lookup, admission policy and bounded rooms required');
 const files=staticFiles(),streams=new Map(),buckets=new Map(),salt=crypto.randomBytes(32);let closed=false,queued=false;
 const opaque=value=>crypto.createHmac('sha256',salt).update(value).digest('base64url');
 function limit(key,max){const now=clock();let value=buckets.get(key);if(!value||value.until<=now){if(buckets.size>=4000)fail(503,'unavailable');value={until:now+60000,count:0};buckets.set(key,value);}if(++value.count>max)fail(429,'rate_limited');}
 function end(record,expired=true){if(streams.get(record.id)!==record)return;streams.delete(record.id);if(!record.res.destroyed&&!record.res.writableEnded){if(expired)record.res.write('event: expired\ndata: {}\n\n');record.res.end();}rooms.disconnect(record.id);}
 function sendState(record){
  if(record.res.destroyed||record.res.writableEnded){end(record,false);return;}if(record.blocked){record.pending=true;return;}
  try{
   let value=rooms.snapshot(record.id,{frames:false});const animation=value.board.animation;
   if(animation&&animation.id!==record.shot)value=rooms.snapshot(record.id);
   const data='event: state\ndata: '+JSON.stringify(value)+'\n\n';
   const buffered=[...streams.values()].reduce((total,stream)=>total+stream.res.writableLength,0);
   if(record.res.writableLength>4000000||Buffer.byteLength(data)>4000000||buffered+Buffer.byteLength(data)>16*1024*1024){end(record);return;}
   record.pending=false;record.blocked=!record.res.write(data);record.shot=animation?.id??null;
  }catch{end(record);}
 }
 const unsubscribe=rooms.subscribe(()=>{if(closed||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!closed)for(const stream of streams.values())sendState(stream);});});
 const sweep=setInterval(()=>{rooms.sweep();for(const [key,value]of buckets)if(value.until<=clock())buckets.delete(key);for(const stream of streams.values())try{rooms.session(stream.id);}catch{end(stream);}},1000);sweep.unref();
 const keepalive=setInterval(()=>{for(const stream of streams.values())if(!stream.blocked&&!stream.res.destroyed)stream.blocked=!stream.res.write(': keepalive\n\n');},5000);keepalive.unref();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','microphone=(), camera=(), display-capture=()');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  const send=(status,value)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}};
  try{
   const url=new URL(req.url,config.origin);if(url.search)fail(404,'not_found');const asset=files.get(url.pathname===PREFIX?PREFIX+'index.html':url.pathname);
   if(asset){if(req.method!=='GET')fail(405,'method_not_allowed');res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'");
    res.writeHead(200,{'Content-Type':asset.type+'; charset=utf-8'});res.end(asset.bytes);return;}
   if(!url.pathname.startsWith(PREFIX))fail(404,'not_found');const route=url.pathname.slice(PREFIX.length);
   if(route==='health'&&req.method==='GET'){admit(null);send(200,{ready:!closed&&rooms.pool.slots?.some(slot=>!slot.disabled)});return;}
   if(!['session','ping','command','leave','state','events'].includes(route))fail(404,'not_found');if(req.method!==(['state','events'].includes(route)?'GET':'POST'))fail(405,'method_not_allowed');
   if(req.headers.origin&&req.headers.origin!==config.origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')fail(403,'wrong_origin');
   const peer=(req.socket.remoteAddress||'').replace(/^::ffff:/,''),forwarded=req.headers['x-real-ip'];
   const ip=config.trustedProxyIps.includes(peer)&&typeof forwarded==='string'&&net.isIP(forwarded)?forwarded:peer;
   limit('ip:'+opaque(ip),4000);const auth=await verify(req.headers.authorization);limit('account:'+opaque(auth.identifier),120);
   const value=req.method==='POST'?await body(req):null;
   if(route!=='command'&&value&&Object.keys(value).length&&!(route==='session'&&Object.keys(value).length===1&&TABLES.includes(value.tableId)))fail(400,'invalid_request');
   const profile=validateProfile(await lookup(auth.schoolIdentifier??auth.identifier),clock()),actor={id:opaque('billiards:'+auth.identifier),staff:profile.kind==='staff',expiresAt:auth.expiresAt};
   if(!profile.eligible||!['student','staff'].includes(profile.kind)){rooms.revoke(actor.id);fail(403,'school_required');}
   if(!admit(auth)){rooms.revoke(actor.id);fail(403,'preview_only');}
   if(route==='session'){limit('sessions:'+actor.id,15);send(200,rooms.create(actor,value.tableId??'tisch-1'));return;}
   const id=req.headers['x-billiards-session'];rooms.ping(id,actor);
   if(route==='events'){
    if(streams.size>=96&&!streams.has(id))fail(503,'unavailable');const old=streams.get(id);if(old){streams.delete(id);old.res.end();}
    rooms.connect(id,actor);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no'});res.flushHeaders();
    const record={id,res,shot:null,blocked:false,pending:false};streams.set(id,record);res.on('drain',()=>{record.blocked=false;if(record.pending&&streams.get(id)===record)sendState(record);});
    res.on('close',()=>end(record,false));res.on('error',()=>end(record,false));sendState(record);return;
   }
   if(route==='leave'){const result=rooms.leave(id,actor),stream=streams.get(id);if(stream)end(stream);send(200,result);return;}
   if(route==='command'){send(200,await rooms.command(id,actor,value));return;}
   send(200,rooms.snapshot(id,{frames:route!=='ping'}));
  }catch(error){const safe=error instanceof GatewayError?error:new GatewayError(503,'unavailable');if([429,503].includes(safe.status))res.setHeader('Retry-After','3');send(safe.status,{error:safe.code});}
 });
 server.requestTimeout=8000;server.headersTimeout=8000;const originalClose=server.close.bind(server);let closeTask;
 server.close=callback=>{if(!closeTask){closed=true;clearInterval(sweep);clearInterval(keepalive);unsubscribe();for(const stream of [...streams.values()])end(stream,false);buckets.clear();
  closeTask=Promise.all([new Promise((resolve,reject)=>originalClose(error=>error&&error.code!=='ERR_SERVER_NOT_RUNNING'?reject(error):resolve())),rooms.pool.close()]);}
  void closeTask.then(()=>callback?.(),error=>callback?.(error));return server;};
 return server;
}
async function main(){
 if(process.env.CASTLE_BILLIARDS_DATA_DIR!=='/srv/billiards-data'||process.env.CASTLE_BILLIARDS_POLICY_DIR!=='/srv/billiards-policy'||!process.env.SECRET_KEY||!process.env.CASTLE_SCHOOL_LOOKUP_KEY)throw Error('Private billiards configuration required');
 const config={origin:'https://together.deine-schule.com',secret:process.env.SECRET_KEY,trustedProxyIps:(process.env.CASTLE_BILLIARDS_TRUSTED_PROXY_IPS||'').split(',').filter(Boolean)};
 const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
 const admit=createBilliardsAdmission('/srv/billiards-policy/admission.json');admit(null);
 const pool=new PhysicsPool();let server;
 try{
  const rooms=new BilliardsRooms({pool,journal:new AtomicJournal('/srv/billiards-data/state.json')});server=createBilliardsServer({config,lookup,rooms,admit});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3231,'0.0.0.0',resolve);});
 }catch(error){
  if(server)await new Promise(resolve=>{server.close(()=>resolve());server.closeAllConnections();});
  else await pool.close();
  throw error;
 }
 const stop=()=>{server.close();server.closeIdleConnections();};process.once('SIGINT',stop);process.once('SIGTERM',stop);console.info('Private school billiards ready');
}
if(require.main===module)main().catch(()=>{console.error('Private school billiards could not start');process.exitCode=1;});
module.exports={createBilliardsServer};
