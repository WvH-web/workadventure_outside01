'use strict';
const crypto=require('node:crypto');
const {createVerifier}=require('../hall-audio/auth.cjs');
const {GatewayError}=require('../hall-audio/errors.cjs');
const GRAPH='https://graph.microsoft.com/v1.0/me?$select=id,userPrincipalName';
const email=value=>typeof value==='string'&&value.length<=254&&/^[^\s@\u0000-\u001f]+@[^\s@\u0000-\u001f]+\.[^\s@\u0000-\u001f]+$/.test(value);
function createSchoolVerifier(secret,{clock=Date.now,fetcher=fetch,timeout=3000,concurrency=16,maxEntries=600,identityTtl=30000}={}){
  const verify=createVerifier(secret,{clock}),cache=new Map(),pending=new Map(),salt=crypto.randomBytes(32);let active=0;
  async function microsoft(token,expiresAt){
    const key=crypto.createHmac('sha256',salt).update(token).digest('hex'),now=clock();
    for(const [id,entry]of cache)if(entry.until<=now)cache.delete(id);
    const cached=cache.get(key);if(cached)return cached.upn;if(pending.has(key))return pending.get(key);
    if(active>=concurrency||cache.size+pending.size>=maxEntries)throw new GatewayError(503,'unavailable');
    active++;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    const job=Promise.resolve().then(async()=>{
      try{
        // Graph validates its own opaque access token. Never infer an email from decoded claims.
        const response=await fetcher(GRAPH,{method:'GET',redirect:'error',signal:controller.signal,headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
        if(response.status===401||response.status===403){await response.body?.cancel();throw new GatewayError(401,'unauthorized');}
        if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('identity');}
        const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>4096){controller.abort();throw Error('identity');}chunks.push(chunk);}
        const user=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(!user||typeof user!=='object'||Array.isArray(user)||typeof user.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user.id)||!email(user.userPrincipalName))throw Error('identity');
        const upn=user.userPrincipalName.toLowerCase();cache.set(key,{upn,until:Math.min(expiresAt,clock()+identityTtl)});return upn;
      }catch(error){throw error instanceof GatewayError?error:new GatewayError(503,'unavailable');}
      finally{clearTimeout(timer);active--;pending.delete(key);}
    });pending.set(key,job);return job;
  }
  return async header=>{
    const auth=await verify(header);
    // Only these exact, already authenticated WorkAdventure claims are inspected.
    const claims=JSON.parse(Buffer.from(header.slice(7).split('.')[1],'base64url').toString('utf8')),expiresAt=claims.exp*1000;
    let schoolIdentifier=email(auth.identifier)?auth.identifier.toLowerCase():'';
    if(!schoolIdentifier&&typeof claims.accessToken==='string'&&claims.accessToken.length>=20&&claims.accessToken.length<=16384&&!/\s/.test(claims.accessToken))
      schoolIdentifier=await microsoft(claims.accessToken,expiresAt);
    return {...auth,schoolIdentifier,expiresAt};
  };
}
module.exports={createSchoolVerifier};
