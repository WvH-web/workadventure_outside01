'use strict';
const crypto=require('node:crypto'),{SignJWT}=require('../../ops/hall-audio/node_modules/jose');
const {createPianoServer}=require('../../ops/castle-piano/server.cjs'),{PianoRooms}=require('../../ops/castle-piano/rooms.cjs');
const {createSchoolVerifier}=require('../../ops/castle-school/identity.cjs');
const secret='synthetic-piano-test-secret-not-a-school-key';
module.exports=async function fixture(t,{leaseMs=45000,capacity=8,realClock=false}={}){
  let now=Date.now(),calls=0,lookupFailure=false;const clock=()=>realClock?Date.now():now,profiles=new Map(),config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]};
  const lookup=async id=>{calls++;if(lookupFailure)throw Error('Private lookup failure');return {version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:clock()};};
  const rooms=new PianoRooms({clock,leaseMs,capacity}),server=createPianoServer({config,lookup,rooms,clock,verify:createSchoolVerifier(secret,{clock})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
  const close=async()=>{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});};t?.after(close);
  async function actor(id,kind='student',expiry=clock()+600000){
    profiles.set(id,kind==='student'?{kind,eligible:true,age:12,gradeLevel:7,classId:17}:{kind,eligible:kind==='staff'||kind==='parent',age:null,gradeLevel:null,classId:null});
    const token=await new SignJWT({identifier:id,tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(expiry/1000)).sign(new TextEncoder().encode(secret));
    return {id,token,clientId:crypto.randomUUID()};
  }
  async function api(actor,route,data,extra={}){
    const response=await fetch(config.origin+'/castle-piano/'+route,{method:data===undefined?'GET':'POST',headers:{...(actor?.token?{Authorization:'Bearer '+actor.token}:{}),
      ...(actor?.cookie?{Cookie:actor.cookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
    const bytes=Buffer.from(await response.arrayBuffer());return {status:response.status,headers:response.headers,value:response.headers.get('content-type')?.includes('json')?JSON.parse(bytes.toString('utf8')):bytes};
  }
  async function join(actor,more={}){const result=await api(actor,'session',{clientId:actor.clientId,mode:'together',roomId:'musiksalon',takeover:false,...more});
    if(result.status===200){actor.cookie=result.headers.get('set-cookie').split(';')[0];actor.context=result.value;}return result;}
  return {config,server,rooms,profiles,clock,actor,api,join,close,advance:ms=>{now+=ms;rooms.sweep();},failLookup:value=>{lookupFailure=value;},get calls(){return calls;}};
};
