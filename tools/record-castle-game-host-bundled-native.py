"""Bind the actual native preflight to its exact candidate and confirmed stage cleanup."""
import hashlib
import json
import math
import os
from pathlib import Path
import runpy

SOURCE='8dc68e99c36dabfebc0714ec7124aaa7b19d935a130fcd3052fdf6a6229a6355'
PRIVATE=Path('/opt/wvh-castle-school/private')
PROBE_SHA='606573ac82ab76990ccb781f8ec98614f6527882d4b3d82ed21ed1671ce2d113'
PUBLIC=['games.html','games.js','games.css','rounds.html','rounds.js','round-client.js','presence.html','presence.js']
CASE_FLAGS={
    'native-group-start':['mobileTouch','commonRound','gameOpensInSideFrame','noProviderAuthorizationHeader','noMapApiInProvider','realDecodedTableAudioBoth'],
    'link-and-panel-lifecycle':['stagePinUpdaterOnly','changedLinkRequiresConfirmation','peerAutoUpdates','freshStartDeniesOldBinding',
        'newTargetActuallyLoaded','nativeRoundApiAfterReturn','sameLeaseAfterBothDirections','noExtraTab'],
    'physical-departure':['creatorDepartureEndsOnlyHost','peerConversationRegistrationPreserved','noAutomaticHostTransfer',
        'explicitSuccessorWorks','lastDepartureRemovesRound','normalMovementAfterClosure','desktopAndMobileCanvasNonblank']}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def proof(value,files):
    assert value['passed'] is True and value['errors']==[] and value['routeFailures']==[]
    assert value['normalMicrosoftPupils']==2 and value['realNativeWorkAdventure'] is True
    assert all(value[key] is True for key in ['realSchoolAuthenticationAndProfiles','allSchoolResourcesForwardedToRestrictedStage',
        'syntheticProviderCatalogOnlyInStage','providerResponsesReplaced','stageFixtureReset'])
    assert all(value[key] is False for key in ['schoolProfileInterception','mapsReplaced','liveSchoolOrPortalChanged','published','loadApprovalFor400'])
    rows={row['case']:row for row in value['results']}
    assert len(rows)==len(value['results'])==3 and set(rows)==set(CASE_FLAGS)
    for name,row in rows.items():
        expected={'case',*CASE_FLAGS[name]}|({'normalMicrosoftPupils'} if name=='native-group-start' else set())
        assert set(row)==expected and row['case']==name and all(row[key] is True for key in CASE_FLAGS[name])
        if name=='native-group-start':assert type(row['normalMicrosoftPupils']) is int and row['normalMicrosoftPupils']==2
    labels=['before-game-window','while-playing','after-link-change','after-panel-return']
    assert [sample['label'] for sample in value['audio']]==labels
    for sample in value['audio']:
        assert len(sample['before'])==len(sample['after'])==2 and 0<sample['milliseconds']<=27000
        for before,after in zip(sample['before'],sample['after']):
            assert all(type(row['energy']) in [int,float] and math.isfinite(row['energy']) for row in [before,after])
            assert after['energy']>before['energy']>=0 and after['inbound']>before['inbound']>=0
        assert any(room.endswith('area-lesekamin') and room in sample['after'][1]['rooms'] for room in sample['after'][0]['rooms'])
    observed=set()
    for item in value['served']:
        assert set(item)=={'number','file','sha256'} and item['number'] in [1,2] and item['file'] in PUBLIC
        assert item['sha256']==files['castle-school/public/'+item['file']];observed.add((item['number'],item['file']))
    assert observed=={(number,file) for number in [1,2] for file in PUBLIC}
    assert {item['code'] for item in value['providerRequests']}=={'one','two'}
    assert all(set(item)=={'number','code'} and item['number']==2 for item in value['providerRequests'])
    for item in value['routeCancellations']:
        assert set(item)=={'number','path','errorType','reason'} and item['number'] in [1,2]
        assert item['errorType']!='AssertionError' and item['reason'] in ['shutdown','detached-frame','controlled-navigation']


def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    stage=PRIVATE/('game-host-native-'+SOURCE[:16]+'-attempt-1')
    start_path=stage/'stage.json';stop_path=stage/'stopped.json'
    for path in [start_path,stop_path]:assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    start_raw=start_path.read_bytes();stop_raw=stop_path.read_bytes();start=json.loads(start_raw);stopped=json.loads(stop_raw)
    assert start['passed'] and start['archiveSha256']==SOURCE and start['approvedSyntheticAccounts']==2
    assert start['normalSchoolAuthenticationAndLookup'] and start['syntheticCatalogOnlyInLoopbackStage'] and not start['published']
    assert stopped['passed'] and stopped['stopped'] and stopped['temporaryIdentifierEnvironmentRemoved']
    assert stopped['stageReceiptSha256']==sha(start_raw) and stopped['before']==stopped['after']==start['before']==ops['baseline']()
    assert not (stage/'identifiers.env').exists() and not ops['exists'](start['name'])
    assert not ops['run']('ss','-ltnH','sport = :13213').strip()
    source=Path('/home/wilhelm/.cache/wvh-school-qa/game-host-native.private.json')
    assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700 and source.stat().st_size<100000
    raw=source.read_bytes();value=json.loads(raw);proof(value,start['files'])
    probe=Path('/tmp/wvh-check-castle-game-host-native.cjs');assert probe.resolve()==probe and sha(probe.read_bytes())==PROBE_SHA
    target=PRIVATE/('game-host-native-proof-'+SOURCE[:16]+'.json');assert not target.exists() or target.read_bytes()==raw
    target.write_bytes(raw);target.chmod(0o600);source.unlink()
    record=PRIVATE/('game-host-native-acceptance-'+SOURCE[:16]+'.json');assert not record.exists()
    ops['atomic'](record,{'passed':True,'published':False,'sourceArchiveSha256':SOURCE,'stageReceiptSha256':sha(start_raw),
        'stoppedReceiptSha256':sha(stop_raw),'nativeProofSha256':sha(raw),'probeSha256':PROBE_SHA,'normalMicrosoftPupils':2,
        'realDecodedTableAudioBothAtFourPoints':True,'syntheticProviderCatalogOnlyInStage':True,'realProviderTested':False,
        'temporaryStageAndIdentifierEnvironmentGone':True,'before':start['before'],'after':ops['baseline'](),'loadApprovalFor400':False})
    print(json.dumps({'passed':True,'nativePreflightAccepted':True,'normalMicrosoftPupils':2,'audioChecks':4,'stageStopped':True,'published':False}))


if __name__=='__main__':main()
