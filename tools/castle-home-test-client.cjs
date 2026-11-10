'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
function client(base,token){
 const cookies=new Map(),clientId=crypto.randomUUID();let requestId,view;
 const header=url=>[...cookies.values()].filter(row=>new URL(url).pathname.startsWith(row.path)).map(row=>row.name+'='+row.value).join('; ');
 async function request(route,body,extra={}){
  const url=new URL(route,base),response=await fetch(url,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{cookie:header(url),'Content-Type':'application/json',Origin:new URL(base).origin,'Sec-Fetch-Site':'same-origin',
   ...(route==='session'?{Authorization:'Bearer '+token}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  for(const raw of response.headers.getSetCookie()){
   const [first,...attrs]=raw.split(';'),[name,value]=first.split('='),scope=attrs.find(part=>part.trim().toLowerCase().startsWith('path='))?.trim().slice(5)||'/';
   cookies.set(name+';'+scope,{name,value,path:scope});assert.ok(raw.includes('HttpOnly')&&raw.includes('SameSite=Strict'));assert.equal(name==='sternenhueter_school',false);
  }
  const raw=await response.text();return {status:response.status,value:response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):raw,headers:response.headers};
 }
 return {clientId,cookies,header,request,get view(){return view;},get requestId(){return requestId;},
  async open(){assert.equal((await request('')).status,200);requestId=crypto.randomUUID();const result=await request('session',{clientId,requestId});assert.equal(result.status,200);view=result.value.view;return result;},
  async renew(){requestId=crypto.randomUUID();const result=await request('session',{clientId,requestId});assert.equal(result.status,200);assert.equal(result.value.view,view);return result;},
  api(route,body,headers){return request('view/'+view+'/api/'+route,body,headers);},
  leave(){return request('leave',{clientId,requestId,view});}
 };
}
async function socket(client,base,WS){
 const url=new URL('view/'+client.view+'/room-live',base);url.protocol=new URL(base).protocol==='https:'?'wss:':'ws:';
 const ws=new WS(url,{headers:{Origin:new URL(base).origin,Cookie:client.header(url)}}),messages=[];
 ws.on('message',raw=>{messages.push(JSON.parse(raw));if(messages.length>150)messages.shift();});
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 return {ws,messages,async wait(predicate,timeout=4000){const until=Date.now()+timeout;while(Date.now()<until){const value=messages.find(predicate);if(value)return value;await delay(20);}throw Error('Expected room message absent');}};
}
module.exports={client,socket};
