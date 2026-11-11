"""Retain real published-browser evidence and verify the entire accepted transition."""
import hashlib
import json
import os
from pathlib import Path
import runpy

os.umask(0o077)
audit=Path('/tmp/wvh-check-castle-piano-deployment.py');helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
functions=runpy.run_path(str(helper));source=Path('/home/wilhelm/.cache/wvh-school-qa/round-recovery-published.private.json')
assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700
raw=source.read_bytes();functions['proof'](json.loads(raw),False)
target=functions['PRIVATE']/source.name;assert not target.exists() or target.read_bytes()==raw
target.write_bytes(raw);target.chmod(0o600);source.unlink()
functions['main']('accept')
runpy.run_path(str(audit))['main']()
