"""Install the pinned one-shot operator privately and run its non-disruptive stage."""
import hashlib
import os
from pathlib import Path
import runpy

os.umask(0o077)
source=Path('/tmp/wvh-castle-game-host-deployment-ops-upload.py')
target=Path('/opt/wvh-castle-school/private/game-host-publication-ops.py')
expected='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
assert source.resolve()==source and target.resolve()==target
raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==expected
if target.exists():assert target.read_bytes()==raw and target.stat().st_uid==0 and target.stat().st_mode&0o777==0o600
else:
    with target.open('xb') as handle:handle.write(raw)
    target.chmod(0o600)
assert hashlib.sha256(target.read_bytes()).hexdigest()==expected
runpy.run_path(str(target))['main']('stage')
