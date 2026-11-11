"""Retain real published-browser evidence and verify the entire accepted transition."""
import hashlib
import json
import os
from pathlib import Path
import runpy

os.umask(0o077)
audit=Path('/tmp/wvh-check-castle-piano-deployment.py');helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
functions=runpy.run_path(str(helper));source=Path('/home/wilhelm/.cache/wvh-school-qa/round-recovery-published.private.json')
assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700
raw=source.read_bytes();functions['proof'](json.loads(raw),False)
target=functions['PRIVATE']/source.name;assert not target.exists() or target.read_bytes()==raw
target.write_bytes(raw);target.chmod(0o600);source.unlink()
functions['main']('accept')
runpy.run_path(str(audit))['main']()
