"""Install the reviewed client-only operator after its non-disruptive preflight."""
import hashlib
import os
from pathlib import Path
os.umask(0o077)
source=Path('/tmp/wvh-castle-seat-deployment-upload.py');raw=source.read_bytes()
assert source.resolve()==source and hashlib.sha256(raw).hexdigest()=='f77faf75b39108d8d5d25e018b9d5a1d2430f2d83c6246e125fe38e1fac9fa1a'
proof=Path('/tmp/wvh-seat-stage-result.json')
assert hashlib.sha256(proof.read_bytes()).hexdigest()=='2dc327bb8004efd71afe2549e651b55fd2d79e09eeb0cd10af5f8f16d5fe53df'
scope={'__name__':'castle_seat_operator','__file__':str(source)};exec(compile(raw,str(source),'exec'),scope)
scope['main']('stage')
target=Path('/opt/wvh-castle-seat-ui-retry/private/deployment-ops.py');assert not target.exists() and target.resolve()==target
with target.open('xb') as handle:handle.write(raw)
target.chmod(0o600)
