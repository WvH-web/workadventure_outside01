export const LEASE_KEY='castleRoundMembershipV1',JOURNEY_KEY='castleRoundJourneyV1';
export const TRAVEL_REQUEST='castleRoundTravelV1',TRAVEL_READY='castleRoundTravelReadyV1';
export const TRAVEL_FAILED='castleRoundTravelFailedV1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const fail=code=>Object.assign(Error(code),{code});
export function retryAfterMs(value,now=Date.now()){
  if(typeof value!=='string'||value.length>80||/[\u0000-\u001f]/.test(value))return 0;
  const text=value.trim();if(/^\d+$/.test(text))return Math.min(120000,Number(text)*1000);
  const date=Date.parse(text);return Number.isFinite(date)?Math.min(120000,Math.max(0,date-now)):0;
}
export function recoveryDeadline(lease,journey){
  const until=lease?.confirmedUntil??lease?.expiresAt;
  const travelling=journey&&Number.isFinite(journey.createdAt)?journey.createdAt+90000:Infinity;
  return Math.min(lease?Number.isFinite(until)?until:0:Infinity,travelling);
}
export function recoveryDelay(error,until,attempt,now=Date.now(),random=Math.random){
  if(!['unavailable','rate_limited'].includes(error?.code)||![0,429,500,502,503,504].includes(error.status||0)||
    !Number.isFinite(until)||!Number.isFinite(now)||until<=now||until-now>120000||!Number.isSafeInteger(attempt)||attempt<0||attempt>30)return null;
  const hint=Number.isFinite(error.retryAfterMs)&&error.retryAfterMs>=0?Math.min(120000,error.retryAfterMs):0;
  const spread=random();if(!Number.isFinite(spread)||spread<0||spread>=1)return null;
  const delay=Math.max(1000*2**Math.min(attempt,3),hint)+500+Math.floor(spread*1000);
  return delay<until-now?delay:null;
}
export function destination(value){
  if(!value||typeof value.mapId!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(value.mapId)||
    !value.arrival||!['x','y'].every(key=>Number.isFinite(value.arrival[key])&&value.arrival[key]>=0&&value.arrival[key]<=8192)||
    !value.bounds||!['x','y','width','height'].every(key=>Number.isFinite(value.bounds[key])&&value.bounds[key]>=0)||
    value.playUri!==new URL('/~/castle-preview/'+value.mapId+'.wam#start',location.origin).href)throw fail('unavailable');
  return value;
}
export class RoundClient{
  constructor(change=()=>{}){
    this.change=change;this.epoch=0;this.requests=new Set();this.closed=false;this.sync(false);
    this.storage=event=>{
      if(['authToken','localUser',null].includes(event.key))this.sync();
      if([LEASE_KEY,JOURNEY_KEY].includes(event.key))this.change('state');
    };window.addEventListener('storage',this.storage);
  }
  token(){try{return localStorage.getItem('authToken')||'';}catch{return '';}}
  account(){try{const value=JSON.parse(localStorage.getItem('localUser')||'null')?.uuid;return typeof value==='string'&&value.length<=320?value:'session';}catch{return 'session';}}
  sync(notify=true){
    const token=this.token(),scope=this.account();
    if(token===this.auth&&scope===this.scope)return;
    const accountChanged=this.scope!==undefined&&this.scope!==scope;
    this.auth=token;this.scope=scope;this.epoch++;
    for(const controller of this.requests)controller.abort();this.requests.clear();
    if(accountChanged||!token){this.drop(LEASE_KEY);this.drop(JOURNEY_KEY);}
    if(notify)this.change('auth');
  }
  read(key){
    try{const raw=sessionStorage.getItem(key);if(!raw||raw.length>4096)return null;const value=JSON.parse(raw);
      return value?.v===1&&value.scope===this.scope?value:null;
    }catch{return null;}
  }
  write(key,value){try{sessionStorage.setItem(key,JSON.stringify({v:1,scope:this.scope,...value}));}catch{throw fail('storage_unavailable');}this.change('state');}
  drop(key){try{sessionStorage.removeItem(key);}catch{};}
  lease(){const value=this.read(LEASE_KEY);return value&&UUID.test(value.roundId)&&typeof value.leaseId==='string'&&/^[a-f0-9]{48}$/.test(value.leaseId)&&Number.isFinite(value.expiresAt)?value:null;}
  journey(){const value=this.read(JOURNEY_KEY);if(!value)return null;
    if(UUID.test(value.roundId)&&UUID.test(value.nonce)&&['join','visit'].includes(value.mode)&&
      typeof value.mapId==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(value.mapId)&&typeof value.sourceMap==='string'&&
      Number.isFinite(value.createdAt)&&Date.now()-value.createdAt>=-2000&&Date.now()-value.createdAt<90000)return value;
    this.drop(JOURNEY_KEY);return null;
  }
  remember(value){
    if(!value?.round||!UUID.test(value.round.id)||typeof value.leaseId!=='string'||!/^[a-f0-9]{48}$/.test(value.leaseId)||
      !Number.isFinite(value.expiresAt)||!Number.isFinite(value.checkedAt)||value.expiresAt<=value.checkedAt||value.expiresAt-value.checkedAt>120000)throw fail('unavailable');
    destination(value.destination);this.write(LEASE_KEY,{roundId:value.round.id,leaseId:value.leaseId,expiresAt:value.expiresAt,confirmedUntil:Date.now()+value.expiresAt-value.checkedAt});
  }
  confirmLease(expected,value){
    const current=this.lease();if(!current||current.leaseId!==expected)return false;
    if(value?.leaseId!==expected||value.round?.id!==current.roundId)throw fail('unavailable');
    this.remember(value);return true;
  }
  clearLease(expected){const current=this.lease();if(current&&(!expected||current.leaseId===expected)){this.drop(LEASE_KEY);this.change('state');}}
  clearJourney(expected){const current=this.journey();if(current&&(!expected||current.nonce===expected)){this.drop(JOURNEY_KEY);this.change('state');}}
  async api(route,body){
    this.sync();if(this.closed)throw fail('cancelled');if(!this.auth)throw fail('unauthorized');
    if(!/^round-(?:context|create|join|visit|heartbeat|leave|close)$/.test(route))throw fail('invalid_request');
    const epoch=this.epoch,token=this.auth,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);this.requests.add(controller);
    try{
      const response=await fetch('/castle-school/'+route,{method:body===undefined?'GET':'POST',credentials:'omit',cache:'no-store',
        headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
      const value=await response.json();
      if(this.closed||epoch!==this.epoch||token!==this.token()||this.scope!==this.account())throw fail('cancelled');
      if(!response.ok)throw Object.assign(fail(value.error||'unavailable'),{status:response.status,retryAfterMs:retryAfterMs(response.headers.get('Retry-After'))});return value;
    }catch(error){if(this.closed||epoch!==this.epoch||token!==this.token()||this.scope!==this.account())throw fail('cancelled');throw typeof error.code==='string'?error:fail('unavailable');}
    finally{clearTimeout(timer);this.requests.delete(controller);}
  }
  dispose(){this.closed=true;this.epoch++;for(const controller of this.requests)controller.abort();this.requests.clear();window.removeEventListener('storage',this.storage);}
}
