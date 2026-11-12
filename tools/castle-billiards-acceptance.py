"""Record a genuine two-account native pilot, without claiming a published map action."""
import hashlib
import json
import math
from pathlib import Path

PRIVATE=Path('/opt/wvh-castle-billiards-pilot-r3/private')
OPS_SHA='2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d'
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def validate(proof,archive):
    assert proof['passed'] is True and proof['archiveSha256']==archive and proof['normalMicrosoftPupils']==2
    assert proof['errors']==[] and len(proof['cases'])>=6
    for key in ['syntheticApprovedAccountsOnly','realPublishedHttpsService','realNativeSidePanels','panelsOpenedByQaThroughNativeApi',
      'normalCastleTableNotYetPublished','bothPlayersExecutedActualStrokes','mutualRematchAndSeatSwap','explicitNativePanelRejoin','desktopAndTouch','nativeAudioDecodedBothWays','normalPublishedCssUsed','placesReleasedAfterConfirmation']:
        assert proof[key] is True
    for key in ['normalMapActivityActivated','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400','candidateCssOnly']:
        assert proof[key] is False
    assert len(proof['audio']['before'])==len(proof['audio']['after'])==2
    for before,after in zip(proof['audio']['before'],proof['audio']['after']):
        for key in ['inbound','energy']:
            assert type(before[key]) in [int,float] and type(after[key]) in [int,float]
            assert math.isfinite(before[key]) and math.isfinite(after[key]) and after[key]>before[key]>=0
        assert any(name.endswith('area-buchclub') for name in after['rooms'])
    assert any(name.endswith('area-buchclub') and name in proof['audio']['after'][1]['rooms'] for name in proof['audio']['after'][0]['rooms'])
    for shot in [proof['first'],proof['second']]:
        assert type(shot['frames']) is int and 4<shot['frames']<10000 and type(shot['version']) is int and shot['version']>=1
        assert len(shot['positionsSha256'])==64 and all(char in '0123456789abcdef' for char in shot['positionsSha256'])
    assert proof['second']['version']>proof['first']['version']

def verify():
    receipt=json.loads((PRIVATE/'acceptance.json').read_text());raw=(PRIVATE/'native-proof.json').read_bytes()
    deployment=(PRIVATE/'deployment.json').read_bytes();validate(json.loads(raw),json.loads(deployment)['archiveSha256'])
    assert receipt['passed'] is True and receipt['proofSha256']==sha(raw) and receipt['deploymentSha256']==sha(deployment)
    assert receipt['normalMicrosoftPupils']==2 and receipt['publishedMapAction'] is False

def main():
    path=PRIVATE/'deployment-ops.py';raw=path.read_bytes();assert path.resolve()==path and sha(raw)==OPS_SHA
    scope={'__name__':'billiards_acceptance_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);scope['verify']()
    assert not (PRIVATE/'acceptance.json').exists() and not (PRIVATE/'native-proof.json').exists() and not (PRIVATE/'acceptance-ops.py').exists()
    file=Path('/tmp/wvh-castle-billiards-native.json');assert file.resolve()==file and file.is_file() and file.stat().st_size<100000
    raw=file.read_bytes();proof=json.loads(raw);deployment=(PRIVATE/'deployment.json').read_bytes();validate(proof,json.loads(deployment)['archiveSha256'])
    def write(name,bytes):
        target=PRIVATE/name
        with target.open('xb') as handle:handle.write(bytes)
        target.chmod(0o600)
    write('acceptance-ops.py',Path(__file__).read_bytes());write('native-proof.json',raw)
    write('acceptance.json',(json.dumps({'version':1,'passed':True,'proofSha256':sha(raw),'deploymentSha256':sha(deployment),
      'normalMicrosoftPupils':2,'publishedMapAction':False},indent=2)+'\n').encode())
    verify();scope['verify']()

if __name__=='__main__':main()
