"""Read-only post-publication health and resource evidence; no account or key output."""
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
import urllib.request

ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
before=ops['baseline']()
private=Path('/opt/wvh-castle-homes/private')
record=json.loads((private/'calls-deployment.json').read_text())
assert record['passed'] and record['before']==record['after']==before
config=(private/'service.json').read_bytes()
assert hashlib.sha256(config).hexdigest()==record['configAfterSha256']
checks={}
for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service']:
    raw=subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState,MemoryCurrent,MemoryPeak,NRestarts'],text=True,timeout=10)
    values=dict(line.split('=',1) for line in raw.splitlines())
    assert values['ActiveState']=='active' and values['SubState']=='running' and int(values['MainPID'])>0
    assert subprocess.check_output(['systemctl','is-enabled',name],text=True,timeout=10).strip()=='enabled'
    process=Path('/proc')/values['MainPID']
    uid=int(next(line for line in (process/'status').read_text().splitlines() if line.startswith('Uid:')).split()[1])
    assert (uid==0)==name.endswith('-control.service')
    assert record['release'].encode() in (process/'cmdline').read_bytes()
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
