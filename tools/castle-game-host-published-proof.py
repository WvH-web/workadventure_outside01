"""Accept actual published pupil boundaries and native audio without approving providers."""
import hashlib
import json
import math
import os
from pathlib import Path
import runpy
import time

PRIVATE=Path('/opt/wvh-castle-school/private')
OPERATOR=PRIVATE/'game-host-publication-ops.py'
OPERATOR_SHA='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
SOURCE='8dc68e99c36dabfebc0714ec7124aaa7b19d935a130fcd3052fdf6a6229a6355'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/game-host-published.private.json')
PROOF=PRIVATE/'game-host-published-native-proof.json'
RECORD=PRIVATE/'game-host-published-acceptance.json'
PROBE=Path('/tmp/wvh-check-castle-rounds-native-published.cjs')
PROBE_SHA='4cda49f1e5ecaba1c29da0a9fb7b3672aaf6774b4588e880f4227f918db7ddcb'
PUBLIC=['games.html','games.js','games.css','rounds.html','rounds.js','round-client.js','presence.html','presence.js']
FLAGS={
    'native-library':['oneMobileTouch','tableAudioDecodedBoth','directoryDoesNotMuteConversation','onePixelPrivateBridge',
        'realGradeFiltering','stageClassOverrideNotPublished','creatorDepartureKeepsPeer','explicitReentryWorks','heartbeatWithoutOpenDirectory'],
    'native-travel':['crossMapArrivalReauthorized','visitReleasesPreviousMembership','lastPhysicalDepartureRemovesAnnouncement',
        'normalMovementAfterClosure','nonblankNativeCanvas','noSeatOrGameClaimed'],
    'bounded-recovery':['oneExplicitPreAdmission503','sameLeaseRetained','noCachedDeadlineExtension','freshRealServerRenewal',
        'noCreateOrJoinReplay','noModuleInterception'],
    'published-game-boundary':['oneMobileTouch','actualPublishedSources','allSevenRealDraftsDenied','noTargetUrlDisclosure',
        'explicitHostCannotBypassDraft','noGameInvented','sameSidebarBothDirections','sameLeaseBothDirections','noExtraTab',
        'ownRoundBundled','tableAudioAfterPanelReturn']}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def private(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    return path.read_bytes()


def audio(value):
    assert type(value) is dict and len(value['before'])==len(value['after'])==2
    assert type(value['connectionAndAudioWaitMilliseconds']) is int and 0<value['connectionAndAudioWaitMilliseconds']<=27000
    for before,after in zip(value['before'],value['after']):
        for row in [before,after]:
            assert type(row['energy']) in [int,float] and math.isfinite(row['energy']) and row['energy']>=0
            assert type(row['inbound']) in [int,float] and math.isfinite(row['inbound']) and row['inbound']>=0
        assert after['energy']>before['energy'] and after['inbound']>before['inbound']
    assert any(room.endswith('area-lesekamin') and room in value['after'][1]['rooms'] for room in value['after'][0]['rooms'])


def proof(value,files):
    assert value['passed'] is True and value['errors']==[] and value['realNativeWorkAdventure'] is True and value['publishedPreview'] is True
    for key in ['stageOnly','mapsModifiedOnlyInsideTestBrowsers','realClassOverrideOnlyInStage','productionSchoolAndWebConfigChanged','loadApprovalFor400']:
        assert value[key] is False
    rows={row['case']:row for row in value['results']};assert len(rows)==len(value['results'])==4 and set(rows)==set(FLAGS)
    for case,flags in FLAGS.items():
        row=rows[case];assert all(row[key] is True for key in flags)
        expected={'case',*flags}
        if case in ['native-library','published-game-boundary']:
            expected.add('normalMicrosoftPupils');assert type(row['normalMicrosoftPupils']) is int and row['normalMicrosoftPupils']==2
        assert set(row)==expected
    audio(value['audio']);recovery=value['recovery'];audio(recovery['audio'])
    assert recovery['candidate'] is False and recovery['moduleInterception'] is False and recovery['mapInterception'] is False
    assert recovery['schoolDecisionInterception'] is False and recovery['naturalHeartbeatFault'] is True
    assert recovery['explicitFaultInjection']=={'route':'round-heartbeat','status':503,'count':1}
    expected={name:files['castle-school/public/'+name] for name in PUBLIC}
    assert recovery['moduleSha256']==expected
    assert recovery['observed']=={str(number)+':'+name:digest for number in [1,2] for name,digest in expected.items()}
    assert value['gameHostPublication']=={'actualPublishedRoutes':True,'providerCatalogSubstituted':False,'providerContentSubstituted':False,
        'realExternalGameTested':False,'realProviderStudentApproval':False,'serverOrMapInterception':False}


def operator():
    assert sha(private(OPERATOR))==OPERATOR_SHA
    return runpy.run_path(str(OPERATOR))


def verify(fetch_public=True):
    helper=operator();ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');deployment=helper['verify'](ops,fetch_public)
    stage=json.loads(private(PRIVATE/'game-host-publication-stage.json'))
    assert deployment['sourceArchiveSha256']==SOURCE
    value=json.loads(private(RECORD));assert value['version']==1 and value['passed'] is True and value['published'] is True
    assert value['sourceArchiveSha256']==SOURCE and value['deploymentReceiptSha256']==sha(private(PRIVATE/'game-host-deployment.json'))
    assert value['nativeProofSha256']==sha(private(PROOF)) and value['probeSha256']==PROBE_SHA==sha(PROBE.read_bytes())
    assert value['after']==deployment['after'] and value['normalMicrosoftPupils']==2 and value['nativePublishedAcceptancePending'] is False
    assert value['realProviderStudentApproval'] is False and value['realExternalGameTested'] is False and value['fullCastleApprovalFor400'] is False
    proof(json.loads(private(PROOF)),stage['files'])
    assert ops['baseline']()==deployment['after'] and helper['running']()==deployment['runningAfter']
    return value


def accept():
    os.umask(0o077);assert not RECORD.exists()
    helper=operator();ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');deployment=helper['verify'](ops)
    stage=json.loads(private(PRIVATE/'game-host-publication-stage.json'))
    assert INPUT.resolve()==INPUT and INPUT.is_file() and INPUT.parent.stat().st_mode&0o777==0o700 and INPUT.stat().st_size<300000
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==PROBE_SHA
    raw=INPUT.read_bytes();proof(json.loads(raw),stage['files']);helper['write_new'](PROOF,raw)
    value={'version':1,'passed':True,'published':True,'sourceArchiveSha256':SOURCE,
        'deploymentReceiptSha256':sha(private(PRIVATE/'game-host-deployment.json')),'nativeProofSha256':sha(raw),'probeSha256':PROBE_SHA,
        'after':deployment['after'],'normalMicrosoftPupils':2,'sameNativeSidebarBothDirections':True,
        'freshDraftBoundariesVerified':True,'nativeAudioAnd503RecoveryVerified':True,'nativePublishedAcceptancePending':False,
        'realProviderStudentApproval':False,'realExternalGameTested':False,'oldCastleReplaced':False,'fullCastleApprovalFor400':False,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    helper['write_new'](RECORD,helper['encoded'](value));verify(False);INPUT.unlink()
    print(json.dumps({key:value[key] for key in ['passed','published','normalMicrosoftPupils','nativeAudioAnd503RecoveryVerified',
        'sameNativeSidebarBothDirections','freshDraftBoundariesVerified','nativePublishedAcceptancePending','realProviderStudentApproval','oldCastleReplaced']}))


def main(action):
    assert action in ['accept','verify']
    if action=='accept':accept()
    else:
        value=verify();print(json.dumps({'passed':True,'gameHostPublicationVerified':True,'nativePublishedAcceptancePending':False,
            'normalMicrosoftPupils':2,'nativeAudioAnd503RecoveryVerified':True,'otherServicesAndMapsUnchanged':True,
            'realProviderStudentApproval':False,'fullCastleApprovalFor400':False,'acceptedAt':value['checkedAt']}))
