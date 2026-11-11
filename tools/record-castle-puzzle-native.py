"""Retain the actual protected-stage proof without modifying historical acceptance."""
import hashlib
import json
import math
from pathlib import Path
import re
import time

PRIVATE=Path('/opt/wvh-castle-stars/private')
OPERATOR=PRIVATE/'stage-ops.py'
OPERATOR_SHA='0045b3664f4d8be56fe602414496a49a9a4d1f8b41ec7214a86d0616105a6617'
PROBE=Path('/tmp/wvh-check-castle-stars-native.cjs')
PROBE_SHA='3a1ca6433289ddeea86adbbd07bd2e2cf4203eaf8960484e8bd3fe0f9abdda0b'
INPUT=Path('/tmp/wvh-castle-stars-native.json')
CASES={
    'visible group choice; automatic late-join panel; complementary clues; native voice',
    'actual two-way edits and solved state',
    'next puzzle shared; chooser may stand; late return keeps puzzle',
    'manual side-panel close respected; reopening keeps seated state',
    'all three puzzles solved in both actual clients; concurrent distinct ring edits preserved',
    'confirmed reset reaches both participants',
    'empty table creates a new round; both native canvases nonblank; no mobile overflow; movement after standing'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
STAGE_ROOM=re.compile(r'https://together\.deine-schule\.com\.[a-z0-9]{6}-school-castle-stars-qa-area-buchclub')


def validate(proof,stage):
    for key in ['passed','syntheticApprovedAccountsOnly','desktopAndTouchMobile','isolatedProtectedStage',
                'allThreePuzzlesSolvedInBothClients','concurrentDistinctRingsPreserved']:
        assert proof[key] is True
    for key in ['networkResponsesSubstituted','authorizationResponsesSubstituted','publishedOriginalMapsChanged','loadApprovalFor400']:
        assert proof[key] is False
    assert type(proof['normalMicrosoftPupils']) is int and proof['normalMicrosoftPupils']==2 and proof['errors']==[]
    assert len(proof['cases'])==7 and set(proof['cases'])==CASES
    expected={name.removeprefix('castle/'):digest for name,digest in stage['publication']['files'].items()}
    assert proof['fileHashes']==expected
    assert proof['candidateBundleSha256']==expected['puzzle-preview.bundle.js']
    assert proof['publishedOriginalMapSha256']==stage['originalPublicMapSha256']
    assert proof['requests'] and all(row['authorizationPresent'] is False for row in proof['requests'])
    measurements=proof['nativeAudioMeasurements'];assert len(measurements)==3
    assert {row['label'] for row in measurements}=={'automatic-puzzle','late-return','completed-puzzles'}
    for row in measurements:
        assert len(row['before'])==len(row['after'])==2
        for before,after in zip(row['before'],row['after']):
            for sample in [before,after]:
                for key in ['energy','inbound']:
                    assert type(sample[key]) in [int,float] and math.isfinite(sample[key]) and sample[key]>=0
            assert after['energy']>before['energy'] and after['inbound']>before['inbound']
        assert any(STAGE_ROOM.fullmatch(name) and name in row['after'][1]['rooms'] for name in row['after'][0]['rooms'])


def main():
    assert OPERATOR.resolve()==OPERATOR and OPERATOR.stat().st_uid==0 and OPERATOR.stat().st_mode&0o777==0o600
    raw=OPERATOR.read_bytes();assert sha(raw)==OPERATOR_SHA
    ops={'__name__':'castle_stars_record','__file__':str(OPERATOR)};exec(compile(raw,str(OPERATOR),'exec'),ops)
    stage=json.loads((PRIVATE/'stage.json').read_bytes());assert stage['passed'] and stage['active']
    assert ops['checked'](ops['OPS'],ops['OPS_SHA'])['baseline']()==stage['after']
    helper=ops['checked'](ops['HELPER'],ops['HELPER_SHA'])
    assert helper['running']()==stage['running'] and helper['processes']()==stage['processes']
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==PROBE_SHA
    assert INPUT.resolve()==INPUT and INPUT.is_file() and INPUT.stat().st_size<80000
    proof_raw=INPUT.read_bytes();proof=json.loads(proof_raw);validate(proof,stage)
    ops['write_new'](PRIVATE/'native-proof.json',proof_raw)
    ops['write_new'](PRIVATE/'native-acceptance.json',ops['encoded']({'version':1,'passed':True,'stageOnly':True,
        'nativeProofSha256':sha(proof_raw),'probeSha256':PROBE_SHA,'publicationCommit':stage['publication']['publicationCommit'],
        'normalMicrosoftPupils':2,'allThreePuzzlesSolvedInBothClients':True,'concurrentDistinctRingsPreserved':True,
        'nativeAudioBothDirections':True,'nativeAudioMeasurements':3,'existingMapsAndServicesUnchanged':True,
        'networkResponsesSubstituted':False,'oldCastleReplaced':False,'fullCastleApprovalFor400':False,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))
    print(json.dumps({'passed':True,'stageOnly':True,'normalMicrosoftPupils':2,'nativeScenarios':7,
        'nativeAudioMeasurements':3,'allThreePuzzlesSolvedInBothClients':True,'existingMapsAndServicesUnchanged':True}))


if __name__=='__main__':main()
