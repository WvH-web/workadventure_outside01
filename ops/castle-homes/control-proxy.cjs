'use strict';
const http=require('node:http'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),net=require('node:net');
const execute=promisify(execFile),PREFIX='sterne-video-castle-homes-',ROOM=new RegExp('^'+PREFIX+'[a-f0-9]{12}-[a-f0-9]{40}$');
const paths=new Map([['/twirp/livekit.RoomService/ListRooms','list'],['/twirp/livekit.RoomService/DeleteRoom','delete']]);
async function read(stream,limit){const chunks=[];let bytes=0;for await(const part of stream){bytes+=part.length;if(bytes>limit)throw Error('Body limit');chunks.push(part);}return Buffer.concat(chunks);}
function checkedControl(path,raw){
 const action=paths.get(path),value=JSON.parse(raw.toString('utf8'));
 if(!action||!value||Array.isArray(value)||typeof value!=='object')throw Error('Unsupported operation');
 if(action==='delete'){
  if(Object.keys(value).join(',')!=='room'||typeof value.room!=='string'||!ROOM.test(value.room))throw Error('Foreign room');
 }else if(Object.keys(value).some(key=>key!=='names')||value.names!==undefined&&(!Array.isArray(value.names)||value.names.length>100||value.names.some(name=>typeof name!=='string'||!ROOM.test(name))))throw Error('Foreign room filter');
 return action;
}
async function containerAddress(){
 const {stdout}=await execute('/usr/bin/docker',['inspect','--format','{{json .NetworkSettings.Networks}}','workadventure-livekit-1'],{timeout:2500,maxBuffer:16000});
 const rows=Object.values(JSON.parse(stdout)),address=rows.map(row=>row.IPAddress).find(ip=>net.isIPv4(ip)&&(/^(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(ip)));
 if(!address)throw Error('Private SFU address unavailable');return address;
}
async function createControlProxy({address=containerAddress,port=13252,upstreamPort=7880}={}){
 if(!Number.isSafeInteger(upstreamPort)||upstreamPort<1||upstreamPort>65535)throw Error('Invalid control port');
 let active=0;const sockets=new Set();
 const server=http.createServer(async(req,res)=>{
  const answer=(status,value)=>{if(!res.headersSent&&!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
  if(req.method==='GET'&&req.url==='/health'){answer(200,{ready:true});return;}
  if(req.method!=='POST'||!paths.has(req.url)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||!/^Bearer [A-Za-z0-9_.-]{40,4096}$/.test(req.headers.authorization||'')){answer(403,{code:'permission_denied',msg:'Control operation denied'});return;}
  if(active>=4){answer(503,{code:'unavailable',msg:'Control capacity reached'});return;}
  active++;
  try{
   const raw=await read(req,16384),action=checkedControl(req.url,raw),host=await address();
   await new Promise((resolve,reject)=>{
    const upstream=http.request({hostname:host,port:upstreamPort,path:req.url,method:'POST',headers:{'Content-Type':'application/json',Authorization:req.headers.authorization}},async incoming=>{
     try{
      const body=await read(incoming,2*1024*1024),value=JSON.parse(body.toString('utf8'));
      if(incoming.statusCode===200){if(action==='list'){if(!Array.isArray(value.rooms??[]))throw Error('Invalid room listing');answer(200,{rooms:(value.rooms||[]).filter(room=>ROOM.test(room.name))});}else answer(200,{});}
      else answer(incoming.statusCode,{code:typeof value.code==='string'?value.code:'unavailable',msg:'Scoped media operation failed'});
      resolve();
     }catch(error){reject(error);}
    });
    const abort=()=>upstream.destroy();res.once('close',abort);upstream.setTimeout(2500,()=>upstream.destroy(Error('Control timeout')));upstream.once('error',reject);upstream.once('close',()=>res.removeListener('close',abort));upstream.end(raw);
   });
  }catch{answer(503,{code:'unavailable',msg:'Scoped media control unavailable'});}
  finally{active--;}
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});server.maxConnections=32;server.requestTimeout=5000;server.headersTimeout=4000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {server,async close(){for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){
 if(process.platform!=='linux'||process.getuid()!==0)throw Error('Protected container-address lookup required');
 createControlProxy().then(proxy=>{process.once('SIGTERM',()=>void proxy.close());process.once('SIGINT',()=>void proxy.close());console.log('Loopback-only castle room media control ready');}).catch(()=>{console.error('Castle media control could not start');process.exitCode=1;});
}
module.exports={checkedControl,createControlProxy,ROOM,PREFIX};
