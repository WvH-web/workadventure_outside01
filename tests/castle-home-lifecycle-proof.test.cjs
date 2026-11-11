'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate,episodes,pairs}=require('../tools/castle-home-lifecycle-proof.cjs');
function fixture(){
 const value={browserVersion:'157.test',errors:[],unexpectedResourceFailures:0,expectedHttpFailures:[],requestFailures:[],servedModuleSha256:{'proximity.js':'a'.repeat(64),'castle-room-control.js':'b'.repeat(64)},
  transitions:Object.entries(episodes).map(([episode,flags])=>Object.fromEntries([['episode',episode],...flags.map(flag=>[flag,true])])),
  decodedRemoteMicrophones:pairs.map(([stage,label])=>({stage,label,rms:.01})),decodedRemoteOptionalCameras:pairs.map(([stage,label])=>({stage,label,width:320,height:180,decodedFrames:2}))};
 for(const key of ['passed','ordinaryMicrosoftStatesUsed','normalLoginRepeated','syntheticPupilsOnly','realPublicGateway','realPublicSchoolContext','realPublicSfu',
  'browserFakeDevicesOnly','noHumanMicrophoneOrCameraUsed','bothActualMediaKindsEndedOnEveryExit','cameraExplicitlyEnabledAfterEveryNewConnection',
  'offlineUsesActualBrowserNetworkEmulation','accountSwitchUsesOnlyApprovedNormalTokens'])value[key]=true;
 for(const key of ['networkResponsesSubstituted','schoolOverrides','servicesRestarted','nativeWorkAdventureTested','realAdministratorLoginTested','loadApprovalFor400'])value[key]=false;
 return value;
}
test('lifecycle evidence requires all six genuine audio/video episodes without claiming unrelated acceptance',()=>{
 assert.deepEqual(validate(fixture()),{episodes:6,decodedAudioSamples:10,decodedVideoSamples:10});
 for(const [key,item]of Object.entries(fixture()))if(typeof item==='boolean'){const changed=fixture();changed[key]=!item;assert.throws(()=>validate(changed),key);}
 for(const [episode,flags]of Object.entries(episodes))for(const flag of flags){const changed=fixture();changed.transitions.find(row=>row.episode===episode)[flag]=false;assert.throws(()=>validate(changed),episode+flag);}
 const absent=fixture();absent.transitions.pop();assert.throws(()=>validate(absent));
});
test('missing or duplicated recipients, silent audio, absent frames and invalid numeric evidence cannot pass',()=>{
 for(const key of ['decodedRemoteMicrophones','decodedRemoteOptionalCameras']){
  const absent=fixture();absent[key].pop();assert.throws(()=>validate(absent));const duplicate=fixture();duplicate[key][1]={...duplicate[key][0]};assert.throws(()=>validate(duplicate));
 }
 for(const rms of [0,.002,NaN,Infinity,'0.01']){const changed=fixture();changed.decodedRemoteMicrophones[0].rms=rms;assert.throws(()=>validate(changed));}
 for(const key of ['width','height','decodedFrames'])for(const number of [0,-1,NaN,1.5,'320']){const changed=fixture();changed.decodedRemoteOptionalCameras[0][key]=number;assert.throws(()=>validate(changed));}
});
test('only explicit offline/cancellation and the specific compatibility or retired-session failures are permitted',()=>{
 const good=fixture();good.expectedHttpFailures.push({status:404,path:'/rtc/v1/validate',stage:'initial-call'},
  {status:409,path:'/castle-homes/view/example/api/proximity',stage:'explicit-device-transfer'},
  {status:401,path:'/castle-homes/view/00000000-0000-4000-8000-000000000000/api/bedroom',stage:'account-switch'});
 good.requestFailures.push({error:'net::ERR_ABORTED',stage:'account-switch'},{error:'net::ERR_INTERNET_DISCONNECTED',stage:'offline'});assert.doesNotThrow(()=>validate(good));
 for(const row of [{status:404,path:'/missing-artwork',stage:'initial-call'},{status:409,path:'/api/proximity',stage:'initial-call'},
  {status:401,path:'/api/bedroom',stage:'account-switch'},{status:500,path:'/api/proximity',stage:'explicit-device-transfer'}]){const changed=fixture();changed.expectedHttpFailures.push(row);assert.throws(()=>validate(changed));}
 const failed=fixture();failed.requestFailures.push({error:'net::ERR_INTERNET_DISCONNECTED',stage:'initial-call'});assert.throws(()=>validate(failed));
 const error=fixture();error.errors.push('JavaScript error');assert.throws(()=>validate(error));
});

test('a candidate is explicitly labelled and can substitute only its two reviewed browser modules, never school or media responses',()=>{
 const value={...fixture(),networkResponsesSubstituted:true,candidateSourcesOnlyInsideTestBrowsers:true,
  candidateSources:{'castle-room-control.js':'a'.repeat(64),'proximity.js':'b'.repeat(64)},candidateRoutes:['castle-room-control.js','proximity.js']};
 assert.doesNotThrow(()=>validate(value,{candidate:true}));assert.throws(()=>validate(value));
 const changed=structuredClone(value);changed.candidateRoutes.push('session');assert.throws(()=>validate(changed,{candidate:true}));
});
