'use strict';
const {GatewayError}=require('../hall-audio/errors.cjs');
const NAMESPACE='sterne-video-castle-homes',URL='wss://together.deine-schule.com',API='http://127.0.0.1:13252';
function checkedCalls(value,{allowInsecureLocal=false}={}){
 if(value===null||value===undefined)return null;
 const keys=['url','apiURL','apiKey','apiSecret','namespace','roles','fixedGroups'];
 if(!value||Array.isArray(value)||Object.keys(value).filter(key=>key!=='allowInsecureLocal').sort().join(',')!==keys.sort().join(',')||value.namespace!==NAMESPACE||value.fixedGroups!==true||
  JSON.stringify(value.roles)!=='["student","teacher"]'||typeof value.apiKey!=='string'||!value.apiKey||value.apiKey.length>128||typeof value.apiSecret!=='string'||value.apiSecret.length<32||value.apiSecret.length>512)throw Error('Reviewed room call configuration required');
 const loopback=(raw,protocol)=>{try{const u=new global.URL(raw);return u.protocol===protocol&&u.hostname==='127.0.0.1'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';}catch{return false;}};
 const local=allowInsecureLocal&&loopback(value.url,'ws:')&&loopback(value.apiURL,'http:');
 const controlled=value.url===URL&&value.apiURL===API;
 if(!controlled&&!local||value.allowInsecureLocal!==undefined&&value.allowInsecureLocal!==true)throw Error('Fixed room media endpoints required');
 return Object.freeze({...value,...(local||controlled?{allowInsecureLocal:true}:{}),roles:Object.freeze([...value.roles])});
}
function checkedCallBody(raw,route){
 const deny=()=>{throw new GatewayError(400,'invalid_request');};
 let body;try{body=JSON.parse(raw.toString('utf8'));}catch{deny();}
 if(!body||Array.isArray(body)||typeof body!=='object')deny();
 const exact=keys=>Object.keys(body).sort().join(',')===keys.sort().join(',');
 if(route==='/api/proximity'){
  if(body.action==='join'){
   if(!exact(['action','surface','mode','requestId'])||body.surface!=='bedroom'||body.mode!=='group'||!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId||''))deny();
  }else if(!['pulse','leave'].includes(body.action)||!exact(['action','client'])||!/^[a-f0-9]{40}$/.test(body.client||''))deny();
 }else if(route==='/api/proximity/reports'){
  if(!exact(['contact','reason','note','requestId'])||typeof body.contact!=='string'||!body.contact||!['unkind','personal','worry','other'].includes(body.reason)||typeof body.note!=='string'||[...body.note].length>300||!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId||''))deny();
 }else if(route==='/api/moderation/proximity'){
  if(!exact(['id','action'])||typeof body.id!=='string'||!body.id||!['resolve','timeout'].includes(body.action))deny();
 }else deny();
 return body;
}
module.exports={checkedCalls,checkedCallBody,NAMESPACE,URL,API};
