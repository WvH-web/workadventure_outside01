export const LEASE_KEY='castleRoundMembershipV1',JOURNEY_KEY='castleRoundJourneyV1';
export const TRAVEL_REQUEST='castleRoundTravelV1',TRAVEL_READY='castleRoundTravelReadyV1';
export const TRAVEL_FAILED='castleRoundTravelFailedV1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const fail=code=>Object.assign(Error(code),{code});
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
  lease(){const value=this.read(LEASE_KEY);return value&&UUID.test(value.roundId)&&typeof value.leaseId==='string'&&/^[a-f0-9]{48}$/.test(value.leaseId)?value:null;}
  journey(){const value=this.read(JOURNEY_KEY);return value&&UUID.test(value.roundId)&&UUID.test(value.nonce)&&['join','visit'].includes(value.mode)&&
    typeof value.mapId==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(value.mapId)&&typeof value.sourceMap==='string'&&
    Number.isFinite(value.createdAt)&&Date.now()-value.createdAt>=-2000&&Date.now()-value.createdAt<90000?value:null;}
  remember(value){
    if(!value?.round||!UUID.test(value.round.id)||typeof value.leaseId!=='string'||!/^[a-f0-9]{48}$/.test(value.leaseId)||!Number.isFinite(value.expiresAt))throw fail('unavailable');
    destination(value.destination);this.write(LEASE_KEY,{roundId:value.round.id,leaseId:value.leaseId,expiresAt:value.expiresAt});
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
      if(!response.ok)throw fail(value.error||'unavailable');return value;
    }catch(error){if(this.closed||epoch!==this.epoch||token!==this.token()||this.scope!==this.account())throw fail('cancelled');throw error.code?error:fail('unavailable');}
    finally{clearTimeout(timer);this.requests.delete(controller);}
  }
  dispose(){this.closed=true;this.epoch++;for(const controller of this.requests)controller.abort();this.requests.clear();window.removeEventListener('storage',this.storage);}
}
