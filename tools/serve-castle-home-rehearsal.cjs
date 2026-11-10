'use strict';
const http=require('node:http'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises');
const {createRehearsal}=require('./castle-home-rehearsal.cjs');
async function main(){
 let fixture,closed=false;const connections=new Set(),instanceId=crypto.randomUUID();
 const output=path.resolve(__dirname,'../../output/castle-homes'),record=path.join(output,'local-server.json');await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const origin='http://127.0.0.1:'+server.address().port;
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(req.headers.host!==new URL(origin).host){res.writeHead(403);res.end();return;}
   const url=new URL(req.url,origin);
   if(url.pathname==='/_local/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ready:!!fixture&&!closed,syntheticAccountsOnly:true,processId:process.pid,instanceId}));return;}
   if(url.pathname==='/'){res.writeHead(303,{Location:'/_local/'});res.end();return;}
   if(url.pathname==='/_local/'&&req.method==='GET'){
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lokale Zimmerprobe</title><style>body{font:16px/1.6 system-ui;background:#eef3f1;color:#203a35;margin:0;padding:40px 20px}main{max-width:480px;margin:auto}h1{font-size:26px}button{font:inherit;padding:12px 16px;display:block;margin:12px 0;background:#fff;border:1px solid #8ba99b;border-radius:6px;color:inherit;cursor:pointer}button:focus-visible{outline:3px solid #187b91}</style><main><h1>Lokale Zimmerprobe</h1><p>Erfundene Konten. Kein Schulzugang und keine echten Schuelerdaten.</p><form method="post" action="./enter"><button name="account" value="a">Testkind, Klasse 3</button><button name="account" value="b">Testjugendlicher, Klasse 7</button></form><form method="post" action="./stop"><button>Lokale Probe beenden</button></form></main></html>');return;
   }
   if(['/_local/enter','/_local/stop'].includes(url.pathname)&&req.method==='POST'){
    if(!fixture){res.writeHead(503);res.end();return;}
    if(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403);res.end();return;}
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1024)throw Error('Oversized local request');}
    if(url.pathname==='/_local/stop'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('Die lokale Zimmerprobe ist beendet.');setTimeout(()=>void stop(),50);return;}
    const form=new URLSearchParams(raw),who=form.get('account');if([...form.keys()].join(',')!=='account'||!['a','b'].includes(who)||!fixture){res.writeHead(400);res.end();return;}
    const token=await fixture.issueToken(who),nonce=crypto.randomBytes(16).toString('hex');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'nonce-"+nonce+"'; frame-ancestors 'none'");
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="de"><meta charset="utf-8"><title>Zimmer oeffnen</title><script nonce="'+nonce+'">localStorage.setItem("authToken",'+JSON.stringify(token)+');location.replace("/castle-homes/");</script></html>');return;
   }
   if(!fixture||!url.pathname.startsWith('/castle-homes/')){res.writeHead(404);res.end();return;}
   const upstream=http.request('http://127.0.0.1:'+fixture.gateway.server.address().port+req.url,{method:req.method,headers:req.headers},incoming=>{
    res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);
   });upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});res.on('close',()=>upstream.destroy());req.pipe(upstream);
  }catch{if(!res.headersSent)res.writeHead(400);res.end();}
 });
 server.on('connection',socket=>{connections.add(socket);socket.once('close',()=>connections.delete(socket));});
 server.on('upgrade',(req,socket,head)=>{
  if(!fixture||req.headers.host!=='127.0.0.1:'+server.address().port){socket.destroy();return;}
  const upstream=http.request('http://127.0.0.1:'+fixture.gateway.server.address().port+req.url,{headers:req.headers});let peer;
  upstream.on('upgrade',(response,incoming,bytes)=>{peer=incoming;socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([key,value])=>key+': '+value).join('\r\n')+'\r\n\r\n');if(bytes.length)socket.write(bytes);if(head.length)peer.write(head);socket.pipe(peer).pipe(socket);peer.on('error',()=>socket.destroy());peer.on('close',()=>socket.destroy());});
  upstream.on('response',response=>{response.resume();socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});upstream.on('error',()=>socket.destroy());socket.on('close',()=>{upstream.destroy();peer?.destroy();});upstream.end();
 });
 for(let port=4318;port<4329;port++){
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});break;}
  catch(error){if(error.code!=='EADDRINUSE'||port===4328)throw error;}
 }
 const origin='http://127.0.0.1:'+server.address().port;
 try{fixture=await createRehearsal({origin});}catch(error){for(const socket of connections)socket.destroy();await new Promise(resolve=>server.close(resolve));throw error;}
 const value={url:origin+'/_local/',processId:process.pid,instanceId,syntheticAccountsOnly:true,existingServicesChanged:false,stopped:false};
 await fs.writeFile(record,JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(value));
 async function stop(){if(closed)return;closed=true;for(const socket of connections)socket.destroy();await new Promise(resolve=>server.close(resolve));await fixture.close();await fs.writeFile(record,JSON.stringify({...value,stopped:true},null,2)+'\n');}
 process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
}
main().catch(error=>{console.error('Local room rehearsal stopped: '+error.name);process.exitCode=1;});
