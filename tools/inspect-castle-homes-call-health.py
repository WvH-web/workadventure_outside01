"""Read-only post-publication health and resource evidence; no account or key output."""
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
import urllib.request

ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
if Path('/opt/wvh-castle-school/private/round-recovery-deployment.json').exists():
    assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
    ops,_=runpy.run_path(str(helper))['historical'](ops)
before=ops['baseline']()
private=Path('/opt/wvh-castle-homes/private')
record=json.loads((private/'calls-deployment.json').read_text())
assert record['passed'] and record['before']==record['after']
expected=record['after'];native=private/'native-entry-deployment.json'
if native.exists():
    transition=json.loads(native.read_text())
    assert transition['passed'] and not transition['provisional'] and transition['before']==expected
    assert transition['previewMapsChanged']==['obergeschoss.wam'] and transition['allOtherMapsAndServicesUnchanged']
    expected=transition['after']
home_baseline=expected
museum=Path('/opt/wvh-castle-content/private/museum-tour-deployment.json')
if museum.exists():
    helper=Path('/tmp/wvh-check-castle-museum-deployment.py');assert helper.resolve()==helper
    assert hashlib.sha256(helper.read_bytes()).hexdigest()=='7ea09b480cfddae730ebdcc2b8638811cf904a52c81bd8a573346aef5f740203'
    expected,accepted=runpy.run_path(str(helper))['verify'](ops,expected,fetch_public=False);assert accepted
assert expected==before
config=(private/'service.json').read_bytes()
assert hashlib.sha256(config).hexdigest()==record['configAfterSha256']
checks={}
renewal=private/'control-renewal-deployment.json'
renewed=json.loads(renewal.read_text()) if renewal.exists() else None
if renewed:assert renewed['passed'] and renewed['before']==renewed['after']==home_baseline and renewed['configSha256']==record['configAfterSha256']
for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service']:
    raw=subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState,MemoryCurrent,MemoryPeak,NRestarts'],text=True,timeout=10)
    values=dict(line.split('=',1) for line in raw.splitlines())
    assert values['ActiveState']=='active' and values['SubState']=='running' and int(values['MainPID'])>0
    assert subprocess.check_output(['systemctl','is-enabled',name],text=True,timeout=10).strip()=='enabled'
    process=Path('/proc')/values['MainPID']
    uid=int(next(line for line in (process/'status').read_text().splitlines() if line.startswith('Uid:')).split()[1])
    assert (uid==0)==name.endswith('-control.service')
    release=renewed['release'] if renewed and name=='wvh-castle-homes.service' else record['release']
    assert release.encode() in (process/'cmdline').read_bytes()
    checks[name]={'active':True,'rootControlOnly':uid==0,'memoryBytes':int(values['MemoryCurrent']),
        'peakBytes':int(values['MemoryPeak']),'automaticRestarts':int(values['NRestarts'])}
for url in ['https://together.deine-schule.com/castle-homes/health','http://127.0.0.1:13252/health']:
    with urllib.request.urlopen(url,timeout=5) as response:
        assert response.status==200 and json.loads(response.read())=={'ready':True}
assert not Path('/run/wvh-homes-calls-stage').exists()
assert not (private/'calls-stage.service.json').exists()
assert ops['baseline']()==before
print(json.dumps(dict(passed=True,readOnly=True,services=checks,publicAndLoopbackHealth=True,temporaryStageAndCredentialGone=True,
    existingServicesAndMapsUnchanged=True,fullCastleApprovalFor400=False)))
