"""Retain the prior exact auditor and privately validate the two-account candidate proof."""
import hashlib
import json
import os
from pathlib import Path
import runpy

os.umask(0o077)
helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='413e9bbb3fd644c031b44f06fd20de01cd2ba7a0cba6a929c22c70c071d71902'
functions=runpy.run_path(str(helper));private=functions['PRIVATE']
source=Path('/home/wilhelm/.cache/wvh-school-qa/round-recovery-candidate.private.json')
assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700
raw=source.read_bytes();functions['proof'](json.loads(raw),True)
target=private/source.name;assert not target.exists() or target.read_bytes()==raw
target.write_bytes(raw);target.chmod(0o600);source.unlink()
audit=Path('/tmp/wvh-check-castle-piano-deployment.py');old=audit.read_bytes()
assert hashlib.sha256(old).hexdigest()=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c'
backup=private/'audit-before-round-recovery.py';assert not backup.exists() or backup.read_bytes()==old
backup.write_bytes(old);backup.chmod(0o600)
print(json.dumps({'passed':True,'candidateProofValidated':True,'previousAuditorRetained':True,'noLiveChange':True}))
