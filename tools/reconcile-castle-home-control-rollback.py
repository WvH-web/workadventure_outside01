"""Record the verified automatic rollback caused by a partially transferred proof; change no service."""
import hashlib
import json
from pathlib import Path
import runpy
import subprocess

private=Path('/opt/wvh-castle-homes/private');ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
calls=json.loads((private/'calls-deployment.json').read_text());native=json.loads((private/'native-entry-deployment.json').read_text())
assert ops['baseline']()==native['after'] and not (private/'control-renewal-deployment.json').exists()
unit=Path('/etc/systemd/system/wvh-castle-homes.service');config=private/'service.json'
assert sha(unit.read_bytes())==calls['unitAfterSha256'] and sha(config.read_bytes())==calls['configAfterSha256']
assert (private/'before-control-renewal/service.snapshot').read_bytes()==unit.read_bytes()
helper=Path('/tmp/wvh-deploy-castle-homes-control.py');raw=helper.read_bytes()
assert helper.resolve()==helper and sha(raw)=='37c1ed19c8f2ba0261029a8048748c2de8a99e997731bf52f68b15a139968d9c'
proof=Path('/home/wilhelm/.cache/wvh-school-qa/homes-control-live.private.json');data=proof.read_bytes()
assert proof.resolve()==proof and sha(data)=='b6341e7fb1cd8ad4aa11a63c69a9fbe3020f9c30361f97e77afbc0f76d70b6df'
assert json.loads(data)['passed']
processes={name:subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10) for name in native['processes']}
assert all(value==processes[name] for name,value in native['processes'].items() if name!='wvh-castle-homes.service')
assert processes['wvh-castle-homes.service']!=native['processes']['wvh-castle-homes.service']
pid=dict(line.split('=',1) for line in processes['wvh-castle-homes.service'].splitlines())['MainPID']
assert calls['release'].encode() in (Path('/proc')/pid/'cmdline').read_bytes() and 'ActiveState=active' in processes['wvh-castle-homes.service']
for name,payload in [('control-first-attempt.py',raw),('control-first-live.private.json',data)]:
    target=private/name;assert not target.exists();target.write_bytes(payload);target.chmod(0o600)
record=private/'control-renewal-rollback-1.json';assert not record.exists()
ops['atomic'](record,dict(passed=True,restored=True,beforeProcesses=native['processes'],afterProcesses=processes,baseline=native['after'],
    unitSha256=calls['unitAfterSha256'],configSha256=calls['configAfterSha256'],oldRelease=calls['release'],
    failedHelperSha256=sha(raw),publicMediaProofSha256=sha(data),cause='non-atomic proof upload observed at 16384 bytes',noServicesChangedByReconciliation=True))
proof.unlink()
print(json.dumps(dict(passed=True,previousRoomReleaseVerified=True,allOtherServicesAndMapsUnchanged=True,partialUploadCauseRecorded=True,noRestartPerformed=True)))
