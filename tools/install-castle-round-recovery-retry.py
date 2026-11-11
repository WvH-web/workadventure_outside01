"""Retain the failed attempt's exact tools before installing diagnostic readiness checks."""
import hashlib
import json
import os
from pathlib import Path
import runpy

os.umask(0o077)
private=Path('/opt/wvh-castle-school/private');helper=Path('/tmp/wvh-castle-round-recovery-ops.py');audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
new_helper=Path('/tmp/wvh-castle-round-recovery-ops-retry.py');new_audit=Path('/tmp/wvh-check-castle-piano-deployment-retry.py')
assert all(path.resolve()==path for path in [private,helper,audit,new_helper,new_audit])
assert not (private/'round-recovery-deployment.json').exists() and not (private/'round-recovery-stage.json').exists()
assert json.loads((private/'round-recovery-failure.json').read_text())['restored'] is True
old_helper=helper.read_bytes();old_audit=audit.read_bytes()
assert hashlib.sha256(old_helper).hexdigest()=='413e9bbb3fd644c031b44f06fd20de01cd2ba7a0cba6a929c22c70c071d71902'
assert hashlib.sha256(old_audit).hexdigest()=='e866f54d6ad19ca56c9e1ebeaee1edcc142c2fc652444b47633c42328de12e7e'
payload=new_helper.read_bytes();checker=new_audit.read_bytes()
assert hashlib.sha256(payload).hexdigest()=='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
assert hashlib.sha256(checker).hexdigest()=='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
for name,raw in [('round-recovery-first-attempt.py',old_helper),('audit-before-recovery-retry.py',old_audit)]:
    path=private/name;assert not path.exists() or path.read_bytes()==raw
    path.write_bytes(raw);path.chmod(0o600)
ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
assert runpy.run_path(str(helper))['NGINX'].read_bytes()==(private/'nginx-before-round-recovery.private.conf').read_bytes()
def replace(path,raw):
    temporary=path.with_name(path.name+'.root-recovery-install')
    assert path in [helper,audit] and temporary.resolve()==temporary and not temporary.exists()
    with temporary.open('xb') as stream:stream.write(raw)
    temporary.chmod(0o600);temporary.replace(path)
try:
    replace(helper,payload);replace(audit,checker)
    runpy.run_path(str(audit))['main']();assert ops['baseline']()==before
except Exception:
    if helper.read_bytes()!=old_helper:replace(helper,old_helper)
    if audit.read_bytes()!=old_audit:replace(audit,old_audit)
    assert ops['baseline']()==before;raise
print('{"passed":true,"firstAttemptAndAuditorRetained":true,"diagnosticsUpdated":true,"noLiveModuleChange":true}')
