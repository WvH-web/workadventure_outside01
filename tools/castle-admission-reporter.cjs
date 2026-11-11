'use strict';
function diagnostic(message){
 let value;try{value=JSON.parse(message);}catch{return null;}
 if(!value||Array.isArray(value))return null;
 if(value.httpStatuses&&typeof value.httpStatuses==='object'&&!Array.isArray(value.httpStatuses)){
  const rows=Object.entries(value.httpStatuses);
  if(rows.length<=10&&rows.every(([key,count])=>/^\d{3}$/.test(key)&&Number.isSafeInteger(count)&&count>=0&&count<=400))
   return {httpStatuses:Object.fromEntries(rows)};
 }
 if(value.scope==='controlled synthetic HTTP burst; no real provider or database requests'){
  const fields=['requests','successful','elapsedMs','maximumGraph','maximumProfiles','graphActive','profileActive','profileRequests','providerRequests'];
  if(!fields.every(key=>Number.isFinite(value[key])&&value[key]>=0)||value.normalMicrosoftLoginLoadTested!==false||value.fullCastleApprovalFor400!==false)return null;
  return Object.fromEntries([['scope',value.scope],...fields.map(key=>[key,value[key]]),['transportPreconnected',value.transportPreconnected],
   ['normalMicrosoftLoginLoadTested',false],['fullCastleApprovalFor400',false]]);
 }
 return null;
}
async function* reporter(source){
 yield JSON.stringify({type:'runtime',node:process.version,platform:process.platform,arch:process.arch})+'\n';
 for await(const event of source){
  if(event.type==='test:diagnostic'){const value=diagnostic(event.data?.message);if(value)yield JSON.stringify({type:'diagnostic',value})+'\n';}
  if(event.type==='test:fail')yield JSON.stringify({type:'failure',name:event.data?.name,errorType:event.data?.details?.error?.name||'Error'})+'\n';
 }
}
reporter.diagnostic=diagnostic;module.exports=reporter;
