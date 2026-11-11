"""Preserve the fresh native regression without replacing the original gallery acceptance."""
import hashlib
import json
from pathlib import Path
import runpy
import subprocess

private=Path('/opt/wvh-castle-homes/private');record_raw=(private/'control-renewal-deployment.json').read_bytes();record=json.loads(record_raw)
sha=lambda raw:hashlib.sha256(raw).hexdigest()
assert record['passed'] and record['archiveSha256']=='1b28495f0e9dfb1e8b8d51cae702de8b767a6c83e2377236e6e83d9465231495'
ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');assert ops['baseline']()==record['after']
helper=Path('/tmp/wvh-deploy-castle-home-entry.py');raw=helper.read_bytes()
assert helper.resolve()==helper and sha(raw)=='7866c65e54385a0e789568e60f76bd9e69816345caede525467d60d5b5e4c8d1'
namespace={'__name__':'castle_native_proof_tools'};exec(compile(raw,str(helper),'exec'),namespace)
source=Path('/home/wilhelm/.cache/wvh-school-qa/homes-control-native.private.json');assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700
source.chmod(0o600);proof_raw=source.read_bytes();proof=json.loads(proof_raw);namespace['proof'](proof,preview=True)
native=json.loads((private/'native-entry-deployment.json').read_text())
assert proof['candidateMapSha256']==native['sourceSha256'] and proof['entryScriptSha256']==native['entryScriptSha256']
for name,expected in record['processesAfter'].items():assert subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)==expected
target=private/'control-renewal-native-browser.private.json';acceptance=private/'control-renewal-native-acceptance.json'
assert not target.exists() and not acceptance.exists();target.write_bytes(proof_raw);target.chmod(0o600)
ops['atomic'](acceptance,dict(passed=True,controlReceiptSha256=sha(record_raw),nativeProofSha256=sha(proof_raw),twoNormalMicrosoftPupils=True,
    actualNativeAndPrivateSpeechDecoded=True,quietEntryIsolated=True,departureEndsActualTracks=True,noMapApi=True,desktopAndMobile=True,
    networkResponsesSubstituted=False,allServicesAndMapsUnchanged=True,loadApprovalFor400=False))
source.unlink();print(json.dumps(dict(passed=True,freshNativeRegressionPreserved=True,allServicesAndMapsUnchanged=True)))
