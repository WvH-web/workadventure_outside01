"""Report only bounded deployment state and public static headers, never private configuration."""
import hashlib
import json
from pathlib import Path
import runpy

helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest() in ['413e9bbb3fd644c031b44f06fd20de01cd2ba7a0cba6a929c22c70c071d71902','e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba','31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea']
functions=runpy.run_path(str(helper));private=functions['PRIVATE']
failure={name:json.loads((private/name).read_text()) for name in ['round-recovery-failure.json','round-recovery-failure-2.json','round-recovery-failure-3.json'] if (private/name).exists()}
staged=json.loads(functions['STAGE'].read_text()) if functions['STAGE'].exists() else None
backup=private/'nginx-before-round-recovery.private.conf';headers={}
for name in functions['FILES']:
    status,body,values=functions['request'](name)
    headers[name]={'status':status,'sha256':hashlib.sha256(body).hexdigest(),'headers':{key:values.get_all(key) for key in [*functions['HEADERS'],'Content-Type']}}
print(json.dumps({'failure':failure,'configurationRestored':functions['NGINX'].read_bytes()==backup.read_bytes(),
    'stageExists':functions['STAGE'].exists(),'acceptedExists':functions['RECORD'].exists(),'public':headers,
    'readiness':staged['routeReadiness'] if staged else None,'release':Path(staged['directory']).name if staged else None}))
