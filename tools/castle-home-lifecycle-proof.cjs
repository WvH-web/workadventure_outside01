'use strict';
const assert=require('node:assert/strict');
const episodes={
 offline:['actualTracksEnded','ownedFrameRemoved','remoteMediaRemoved'],
 online:['roomReauthorized','noAutomaticCaptureOrCall','explicitRejoinAndBothDirectionsDecoded'],
 'second-device-open':['doesNotStealExistingCall','noCaptureOnNewDevice'],
 'device-transfer':['oldActualTracksEnded','newCaptureOnlyAfterExplicitClick','noAutomaticTakeback','formerDeviceDepartureDoesNotEndCurrentCall'],
 'account-switch':['oldGuestTracksEnded','newAccountOwnRoomVerified','noAutomaticCapture','oldProtectedViewRejected','otherDeviceCallNotStolen'],
 logout:['ownedFrameRemoved','allOwnCapturesEnded'],
};
const pairs=[['initial-call','owner-first-device'],['initial-call','guest-mobile'],['online','owner-first-device'],['online','guest-mobile'],
 ['second-device-open','owner-first-device'],['second-device-open','guest-mobile'],['explicit-device-transfer','owner-second-device'],
 ['explicit-device-transfer','guest-mobile'],['former-device-departure','owner-second-device'],['former-device-departure','guest-mobile']];
function validate(value,{candidate=false}={}){
 for(const key of ['passed','ordinaryMicrosoftStatesUsed','normalLoginRepeated','syntheticPupilsOnly','realPublicGateway','realPublicSchoolContext','realPublicSfu',
  'browserFakeDevicesOnly','noHumanMicrophoneOrCameraUsed','bothActualMediaKindsEndedOnEveryExit','cameraExplicitlyEnabledAfterEveryNewConnection',
  'offlineUsesActualBrowserNetworkEmulation','accountSwitchUsesOnlyApprovedNormalTokens'])assert.equal(value[key],true,key);
 assert.equal(value.networkResponsesSubstituted,candidate);
 if(!candidate){assert.deepEqual(Object.keys(value.servedModuleSha256).sort(),['castle-room-control.js','proximity.js']);for(const digest of Object.values(value.servedModuleSha256))assert.match(digest,/^[a-f0-9]{64}$/);}
 if(candidate){assert.equal(value.candidateSourcesOnlyInsideTestBrowsers,true);assert.deepEqual(value.candidateRoutes,['castle-room-control.js','proximity.js']);
  assert.deepEqual(Object.keys(value.candidateSources).sort(),value.candidateRoutes);for(const digest of Object.values(value.candidateSources))assert.match(digest,/^[a-f0-9]{64}$/);}
 for(const key of ['schoolOverrides','servicesRestarted','nativeWorkAdventureTested','realAdministratorLoginTested','loadApprovalFor400'])assert.equal(value[key],false,key);
 assert.match(value.browserVersion,/^157\./);assert.deepEqual(value.errors,[]);assert.equal(value.unexpectedResourceFailures,0);
 assert.deepEqual(value.transitions.map(row=>row.episode),Object.keys(episodes));
 for(const row of value.transitions)for(const flag of episodes[row.episode])assert.equal(row[flag],true,row.episode+': '+flag);
 for(const key of ['decodedRemoteMicrophones','decodedRemoteOptionalCameras']){
  const rows=value[key];assert.deepEqual(rows.map(row=>[row.stage,row.label]),pairs);
  for(const row of rows)if(key==='decodedRemoteMicrophones')assert.ok(Number.isFinite(row.rms)&&row.rms>.002);
  else assert.ok([row.width,row.height,row.decodedFrames].every(number=>Number.isInteger(number)&&number>0));
 }
 for(const row of value.expectedHttpFailures){
  assert.ok(row.status===404&&row.path==='/rtc/v1/validate'||row.status===409&&row.path.endsWith('/api/proximity')&&['explicit-device-transfer','former-device-departure'].includes(row.stage)||
   row.status===401&&row.stage==='account-switch'&&/^\/castle-homes\/view\/[a-f0-9-]{36}\/api\/bedroom$/.test(row.path));
 }
 for(const row of value.requestFailures)assert.ok(row.error==='net::ERR_ABORTED'||row.stage==='offline'&&['net::ERR_INTERNET_DISCONNECTED','net::ERR_NETWORK_CHANGED'].includes(row.error));
 return {episodes:value.transitions.length,decodedAudioSamples:value.decodedRemoteMicrophones.length,decodedVideoSamples:value.decodedRemoteOptionalCameras.length};
}
module.exports={validate,episodes,pairs};
if(require.main===module){try{const proof=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify({passed:true,...validate(proof,{candidate:process.argv.includes('--candidate')})}));}
 catch(error){console.error('Room lifecycle evidence rejected: '+error.name);process.exitCode=1;}}
