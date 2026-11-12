"""Preserve the real second table probe before removing only its temporary WAM."""
import hashlib
import json
import math
from pathlib import Path

PRIVATE=Path('/opt/wvh-castle-billiards-table-r2/private')
OPS_SHA='47d4dd1ce3bcc74d2cb21aab1d94410db18c711e526daab2d832ef800a7bb46a'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def validate(proof,stage):
    assert proof['passed'] is True and proof['normalMicrosoftPupils']==2 and proof['errors']==[] and len(proof['cases'])>=6
    for key in ['stageOnly','syntheticApprovedAccountsOnly','sharedNativeSitChoice','lateSitterAutomaticallyFollows',
      'actualAuthoritativeStroke','nativeVoiceBetweenStools','nativeVoiceWithWindowSpectator','originalChessPreservedAndIsolated',
      'creatorMayLeaveAndRejoin','lastStandingResetsChoice','mobileAndDesktop','nativeMovementResumes']:
        assert proof[key] is True
    for key in ['normalGameHallActivated','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400']:
        assert proof[key] is False
    assert proof['wamSha256']==stage['probeSha256']
    assert {'castle/'+name:digest for name,digest in proof['publishedCandidateFiles'].items()}==stage['files']
    assert len(proof['voices'])==3
    for voice,suffix in zip(proof['voices'],['area-fensterleser','area-fensterleser','area-buchclub']):
        assert len(voice['before'])==len(voice['after'])==2
        for before,after in zip(voice['before'],voice['after']):
            for key in ['inbound','energy']:
                assert type(before[key]) in [int,float] and type(after[key]) in [int,float]
                assert math.isfinite(before[key]) and math.isfinite(after[key]) and after[key]>before[key]>=0
        assert any(name.endswith(suffix) and name in voice['after'][1]['rooms'] for name in voice['after'][0]['rooms'])
    for before,after in [(proof['firstIsolation']['before'],proof['firstIsolation']['after']),(proof['isolationBefore'],proof['isolationAfter'])]:
        assert len(before)==len(after)==2
        assert not set(after[0]['rooms'])&set(after[1]['rooms'])
        for initial,final in zip(before,after):
            assert type(initial['energy']) in [int,float] and type(final['energy']) in [int,float]
            assert math.isfinite(initial['energy']) and math.isfinite(final['energy']) and initial['energy']>=0 and final['energy']>=0
            assert final['energy']<=initial['energy']+0.000001


def operator():
    path=PRIVATE/'stage-ops.py';assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert sha(raw)==OPS_SHA
    scope={'__name__':'billiards_table_acceptance_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope


def write(name,raw):
    path=PRIVATE/name;assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)


def verify():
    ops=operator();stage=ops['load'](PRIVATE/'stage.json');receipt=ops['load'](PRIVATE/'native-acceptance.json')
    proof=ops['load'](PRIVATE/'native-proof.json');validate(proof,stage)
    assert receipt['passed'] is True and receipt['normalGameHallActivated'] is False
    for name,key in [('stage.json','stageSha256'),('native-proof.json','proofSha256'),('acceptance-ops.py','operatorSha256')]:
        assert sha((PRIVATE/name).read_bytes())==receipt[key]
    if (PRIVATE/'cleanup.json').exists():
        cleanup=ops['load'](PRIVATE/'cleanup.json');assert cleanup['passed'] and cleanup['probeRemoved'] and cleanup['stageSha256']==receipt['stageSha256']
        assert not ops['PROBE'].exists()
    else:ops['verify']()
    print(json.dumps({'passed':True,'nativeTableAccepted':True,'twoNormalSchoolAccounts':True,'threeActualNativeVoiceChecks':True,
      'normalGameHallActivated':False,'temporaryProbeRemoved':(PRIVATE/'cleanup.json').exists(),'fullCastleApprovalFor400':False}))


def accept(expected_sha):
    ops=operator();ops['verify']();assert not (PRIVATE/'cleanup.json').exists()
    path=Path('/tmp/wvh-castle-billiards-table-native.json');assert path.resolve()==path and path.is_file() and path.stat().st_size<100000
    raw=path.read_bytes();assert sha(raw)==expected_sha;validate(json.loads(raw),ops['load'](PRIVATE/'stage.json'))
    for name in ['native-acceptance.json','native-proof.json','acceptance-ops.py']:assert not (PRIVATE/name).exists()
    write('acceptance-ops.py',Path(__file__).read_bytes());write('native-proof.json',raw)
    write('native-acceptance.json',(json.dumps({'version':1,'passed':True,'stageSha256':sha((PRIVATE/'stage.json').read_bytes()),
      'proofSha256':sha(raw),'operatorSha256':sha((PRIVATE/'acceptance-ops.py').read_bytes()),'normalGameHallActivated':False},indent=2)+'\n').encode())
    verify()


if __name__=='__main__':verify()
