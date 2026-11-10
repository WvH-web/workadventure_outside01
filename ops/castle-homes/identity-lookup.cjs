'use strict';
const crypto=require('node:crypto');
const {GatewayError}=require('../hall-audio/errors.cjs');
const URL='https://www.deine-schule.com/workadventure-castle-homes.php';
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
function validateIdentity(value,now){
 if(!exact(value,['version','checkedAt','identity'])||value.version!==1||!Number.isSafeInteger(value.checkedAt)||value.checkedAt<now-10000||value.checkedAt>now+5000)throw Error('Invalid identity response');
 const id=value.identity;if(id===null)return null;
 if(!exact(id,['sub','role','grade','age','moderator','read_only'])||id.read_only!==false||typeof id.moderator!=='boolean'||
  !['student','parent','teacher'].includes(id.role)||!new RegExp('^wvh:'+({student:'student',parent:'family',teacher:'staff'}[id.role])+':[1-9][0-9]{0,15}$').test(id.sub)||
  !(id.age===null||Number.isInteger(id.age)&&id.age>=0&&id.age<=120)||
  !(id.role==='student'?Number.isInteger(id.grade)&&id.grade>=1&&id.grade<=13:id.grade===null)||
  id.moderator&&id.role!=='teacher'||id.role!=='student'&&id.age!==null)throw Error('Invalid canonical identity');
 return Object.freeze({...id});
}
function createIdentityLookup({key,url=URL,fetcher=fetch,clock=Date.now,timeout=3000,concurrency=16}){
 if(url!==URL||!/^[a-f0-9]{64}$/.test(key)||!Number.isInteger(concurrency)||concurrency<1||concurrency>64||!Number.isInteger(timeout)||timeout<1||timeout>5000)throw Error('Invalid identity lookup configuration');
 let active=0;
 return async identifier=>{
  if(typeof identifier!=='string'||identifier.length>254||!/^[^\s@\u0000-\u001f]+@[^\s@\u0000-\u001f]+\.[^\s@\u0000-\u001f]+$/.test(identifier))return null;
  if(active>=concurrency)throw new GatewayError(503,'unavailable');active++;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout),timestamp=String(Math.floor(clock()/1000)),nonce=crypto.randomBytes(20).toString('hex'),body=JSON.stringify({identifier});
  const mac=value=>crypto.createHmac('sha256',key).update(value).digest('hex');
  try{
   const response=await fetcher(url,{method:'POST',redirect:'error',signal:abort.signal,headers:{'Content-Type':'application/json',
    'X-Castle-Homes-Timestamp':timestamp,'X-Castle-Homes-Nonce':nonce,'X-Castle-Homes-Signature':mac(timestamp+'\n'+nonce+'\n'+body)},body});
   if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Context unavailable');}
   const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>4096){abort.abort();throw Error('Oversized identity response');}chunks.push(chunk);}
   const raw=Buffer.concat(chunks).toString('utf8'),signature=response.headers.get('x-castle-homes-signature');
   if(typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||!crypto.timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(mac(nonce+'\n'+raw),'hex')))throw Error('Invalid signed identity response');
   return validateIdentity(JSON.parse(raw),clock());
  }catch{throw new GatewayError(503,'unavailable');}finally{clearTimeout(timer);active--;}
 };
}
module.exports={createIdentityLookup,validateIdentity};
