"""Final preflight audit after removing the isolated rounds service and its temporary tokens."""
import json
from pathlib import Path
import runpy
import time
import urllib.request

ops=runpy.run_path('/tmp/wvh-castle-rounds-ops.py')
record=json.loads(ops['STAGE'].read_text());assert record['stopped'] is True
assert not ops['exists'](ops['NAME']) and not ops['run']('docker','ps','-aq','--filter','label=wvh.component=castle-rounds-stage').strip()
assert not ops['run']('ss','-ltnH','sport = :13212').strip()
assert not Path(record['qa']).exists() and not ops['TOKEN'].exists()
ops['unchanged'](record['before'])
assert ops['sha'](ops['RECORD'].read_bytes())==ops['EXPECTED_RECORD']
release=Path(record['release']);assert release==ops['BASE']/'releases'/record['release_id'] and release.resolve()==release
assert all(ops['sha']((release/name).read_bytes())==digest for name,digest in record['files'].items())
proof_path=ops['PRIVATE']/'rounds-native-stage-proof.json';raw=proof_path.read_bytes()
assert ops['sha'](raw)==record['native_proof_sha256']
proof=json.loads(raw);assert proof['passed'] and proof['errors']==[]
for url in ['https://together.deine-schule.com/ping','https://together.deine-schule.com/castle-school/health',
 'https://together.deine-schule.com/castle-audio/health']:
    with urllib.request.urlopen(url,timeout=15) as response:assert response.status==200
uploaded=Path('/home/wilhelm/.cache/wvh-school-qa/rounds-native-stage-result.json')
if uploaded.exists():
    assert uploaded.resolve()==uploaded and not uploaded.is_symlink() and ops['sha'](uploaded.read_bytes())==ops['sha'](raw)
    uploaded.unlink()
result={'passed':True,'checked_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
 'candidate':record['release_id'],'realSchoolApiProofRetained':True,'nativeMicrosoftPupils':2,
 'nativeAudioTouchTravelProofRetained':True,'stageStopped':True,'temporaryStageTokensRemoved':True,
 'productionServiceAndAllProtectedFilesUnchanged':True,'all16PreviewWamsUnchanged':True,
 'oldCastleNotReplaced':True,'productionRoundDirectoryEnabled':False,'loadApprovalFor400':False}
ops['atomic'](ops['PRIVATE']/'rounds-preflight-final.json',result)
print(json.dumps(result,indent=2))
