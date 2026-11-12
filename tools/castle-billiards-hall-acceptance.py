"""Bind normal game-hall acceptance to the exact published map, policy and service."""
import hashlib
import json
import math
from pathlib import Path

PRIVATE=Path('/opt/wvh-castle-billiards-hall/private')
HALL_SHA='7af7b7dbe79fd73c3e714fcdef705c43c7d0f2733c12d8b331ccad02a8e23172'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def validate(proof,stage):
    assert proof['passed'] is True and proof['normalMicrosoftPupils']==2 and proof['errors']==[] and len(proof['cases'])>=7
    for key in ['syntheticApprovedAccountsOnly','normalGameHallActivated','compactNativeSeatControlVerified','sharedNativeSitChoice','lateSitterAutomaticallyFollows',
      'actualAuthoritativeStroke','nativeVoiceBetweenStools','nativeVoiceWithWindowSpectator','originalChessPreservedAndIsolated',
      'creatorMayLeaveAndRejoin','lastStandingResetsChoice','mobileAndDesktop','nativeMovementResumes']:
        assert proof[key] is True
    for key in ['stageOnly','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400']:assert proof[key] is False
    expected=dict(stage['candidateFiles']);del expected['castle/spielesaal-billard2-preview.tmj'];expected['castle/spielesaal.tmj']=stage['candidateMapSha256']
    assert {'castle/'+name:digest for name,digest in proof['publishedCandidateFiles'].items()}==expected
    assert proof['wamSha256']==stage['wamAfterSha256'] and len(proof['voices'])==3
    for voice,suffix in zip(proof['voices'],['area-fensterleser','area-fensterleser','area-buchclub']):
        assert len(voice['before'])==len(voice['after'])==2
        for before,after in zip(voice['before'],voice['after']):
            for key in ['inbound','energy']:
                assert type(before[key]) in [int,float] and type(after[key]) in [int,float]
                assert math.isfinite(before[key]) and math.isfinite(after[key]) and after[key]>before[key]>=0
        assert any(name.endswith(suffix) and name in voice['after'][1]['rooms'] for name in voice['after'][0]['rooms'])
    for before,after in [(proof['firstIsolation']['before'],proof['firstIsolation']['after']),(proof['isolationBefore'],proof['isolationAfter'])]:
        assert len(before)==len(after)==2 and not set(after[0]['rooms'])&set(after[1]['rooms'])
        for initial,final in zip(before,after):
            assert type(initial['energy']) in [int,float] and type(final['energy']) in [int,float]
            assert math.isfinite(initial['energy']) and math.isfinite(final['energy']) and initial['energy']>=0 and final['energy']>=0
            assert final['energy']<=initial['energy']+0.000001


def operator():
    path=PRIVATE/'publication-ops.py';assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert sha(raw)==HALL_SHA
    scope={'__name__':'billiards_hall_acceptance_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope


def verify_receipt(hall):
    stage=hall['load'](PRIVATE/'stage.json');receipt=hall['load'](PRIVATE/'native-acceptance.json')
    validate(hall['load'](PRIVATE/'native-proof.json'),stage)
    assert receipt['passed'] is True and receipt['normalGameHallActivated'] is True
    for name,key in [('native-proof.json','proofSha256'),('stage.json','stageSha256'),('deployment.json','deploymentSha256'),('acceptance-ops.py','operatorSha256')]:
        assert sha(hall['raw_private'](PRIVATE/name))==receipt[key]
    print(json.dumps({'passed':True,'normalGameHallAccepted':True,'compactSeatControlVerified':True,'nativeVoiceMeasurements':3,'oldCastleReplaced':False,'fullCastleApprovalFor400':False}))


def accept(expected_sha):
    hall=operator();hall['verify']()
    path=Path('/tmp/wvh-castle-billiards-hall-native.json');assert path.resolve()==path and path.is_file() and path.stat().st_size<100000
    raw=path.read_bytes();assert sha(raw)==expected_sha;validate(json.loads(raw),hall['load'](PRIVATE/'stage.json'))
    for name in ['native-proof.json','native-acceptance.json','acceptance-ops.py']:assert not (PRIVATE/name).exists()
    hall['write']('native-proof.json',raw);hall['write']('acceptance-ops.py',Path(__file__).read_bytes())
    hall['write']('native-acceptance.json',hall['encoded']({'version':1,'passed':True,'normalGameHallActivated':True,
      'proofSha256':sha(raw),'stageSha256':sha(hall['raw_private'](PRIVATE/'stage.json')),
      'deploymentSha256':sha(hall['raw_private'](PRIVATE/'deployment.json')),'operatorSha256':sha(hall['raw_private'](PRIVATE/'acceptance-ops.py'))}))
    verify_receipt(hall);hall['verify']()


if __name__=='__main__':
    hall=operator();hall['verify']();verify_receipt(hall)
