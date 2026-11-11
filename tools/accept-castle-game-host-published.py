"""Retain the reviewed published probe and append its independent live acceptance."""
import hashlib
import os
from pathlib import Path
import runpy

os.umask(0o077)
source=Path('/tmp/wvh-castle-game-host-published-proof-upload.py')
target=Path('/opt/wvh-castle-school/private/game-host-published-proof-ops.py')
expected='61a1f36fd958040b603cac9a5425290062776c773d19f01a842cdf793a755c86'
assert source.resolve()==source and target.resolve()==target
raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==expected
if target.exists():assert target.read_bytes()==raw and target.stat().st_uid==0 and target.stat().st_mode&0o777==0o600
else:
    with target.open('xb') as handle:handle.write(raw)
    target.chmod(0o600)
runpy.run_path(str(target))['main']('accept')
