"""Actual normal-room puzzle proof, separate from the retained isolated-stage proof."""
import hashlib
import json
import math
from pathlib import Path
import re
import time

PRIVATE=Path('/opt/wvh-castle-stars/private')
INPUT=Path('/tmp/wvh-castle-stars-published-native.json')
PROBE=Path('/tmp/wvh-check-castle-stars-published.cjs')
ROOM=re.compile(r'https://together\.deine-schule\.com\.[a-z0-9]{6}-school-castle-v2-sternwarte-area-buchclub')
CASES={
    'visible group choice; automatic late-join panel; complementary clues; native voice',
    'actual two-way edits and solved state',
    'next puzzle shared; chooser may stand; late return keeps puzzle',
    'manual side-panel close respected; reopening keeps seated state',
    'all three puzzles solved in both actual clients; concurrent distinct ring edits preserved',
    'confirmed reset reaches both participants',
    'empty table creates a new round; both native canvases nonblank; no mobile overflow; movement after standing'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def validate(proof,stage):
    for key in ['passed','syntheticApprovedAccountsOnly','desktopAndTouchMobile','normalPublishedPreview',
                'normalPreviewWrapperChanged','allThreePuzzlesSolvedInBothClients','concurrentDistinctRingsPreserved']:
        assert proof[key] is True
    for key in ['isolatedProtectedStage','networkResponsesSubstituted','authorizationResponsesSubstituted','loadApprovalFor400']:
        assert proof[key] is False
    assert type(proof['normalMicrosoftPupils']) is int and proof['normalMicrosoftPupils']==2 and proof['errors']==[]
    assert len(proof['cases'])==7 and set(proof['cases'])==CASES
    expected={name.removeprefix('castle/'):digest for name,digest in stage['publication']['files'].items()}
    assert proof['fileHashes']==expected and proof['candidateBundleSha256']==expected['puzzle-preview.bundle.js']
    assert proof['publishedWrapperSha256']==stage['newWamSha256']
    assert proof['canonicalSourceSha256DuringProbe'] in [stage['canonicalBeforeSha256'],stage['candidateMapSha256']]
    assert proof['canonicalSourceSynchronizedDuringProbe'] is (proof['canonicalSourceSha256DuringProbe']==stage['candidateMapSha256'])
    assert proof['requests'] and all(row['authorizationPresent'] is False for row in proof['requests'])
    rows=proof['nativeAudioMeasurements'];assert len(rows)==3
    assert {row['label'] for row in rows}=={'automatic-puzzle','late-return','completed-puzzles'}
    for row in rows:
        assert len(row['before'])==len(row['after'])==2
        for before,after in zip(row['before'],row['after']):
            for sample in [before,after]:
                for key in ['energy','inbound']:assert type(sample[key]) in [int,float] and math.isfinite(sample[key]) and sample[key]>=0
            assert after['energy']>before['energy'] and after['inbound']>before['inbound']
        assert any(ROOM.fullmatch(name) and name in row['after'][1]['rooms'] for name in row['after'][0]['rooms'])


def verify_receipt(stage,record,operator):
    raw=operator['raw_private'](PRIVATE/'publication-native-proof.json')
    accepted=operator['load'](PRIVATE/'publication-acceptance.json')
    assert accepted['version']==1 and accepted['passed'] and accepted['normalPublishedPreview'] and not accepted['stageOnly']
    assert accepted['nativeProofSha256']==sha(raw)
    assert accepted['stageReceiptSha256']==sha(operator['raw_private'](operator['STAGE']))
    assert accepted['deploymentReceiptSha256']==sha(operator['raw_private'](operator['RECORD']))
    assert accepted['newWamSha256']==stage['newWamSha256'] and accepted['normalMicrosoftPupils']==2
    assert accepted['nativeScenarios']==7 and accepted['nativeAudioMeasurements']==3
    assert accepted['allThreePuzzlesSolvedInBothClients'] and accepted['concurrentDistinctRingsPreserved']
    assert not accepted['oldCastleReplaced'] and not accepted['fullCastleApprovalFor400']
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==accepted['probeSha256']
    validate(json.loads(raw),stage)


def accept(operator,probe_digest):
    stage,record=operator['verify']()
    assert not (PRIVATE/'publication-acceptance.json').exists()
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==probe_digest
    assert INPUT.resolve()==INPUT and INPUT.is_file() and INPUT.stat().st_size<80000
    raw=INPUT.read_bytes();proof=json.loads(raw);validate(proof,stage)
    operator['write_new'](PRIVATE/'publication-native-proof.json',raw)
    operator['write_new'](PRIVATE/'publication-acceptance.json',operator['encoded']({'version':1,'passed':True,'normalPublishedPreview':True,'stageOnly':False,
        'nativeProofSha256':sha(raw),'probeSha256':probe_digest,'newWamSha256':stage['newWamSha256'],
        'stageReceiptSha256':sha(operator['raw_private'](operator['STAGE'])),'deploymentReceiptSha256':sha(operator['raw_private'](operator['RECORD'])),
        'normalMicrosoftPupils':2,'nativeScenarios':7,'nativeAudioMeasurements':3,'allThreePuzzlesSolvedInBothClients':True,
        'concurrentDistinctRingsPreserved':True,'oldCastleReplaced':False,'fullCastleApprovalFor400':False,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))
    verify_receipt(stage,record,operator)
    print(json.dumps({'passed':True,'normalPublishedPreview':True,'normalMicrosoftPupils':2,'nativeScenarios':7,'nativeAudioMeasurements':3,
        'onlyPreviewMapChanged':'sternwarte.wam','oldCastleReplaced':False}))
