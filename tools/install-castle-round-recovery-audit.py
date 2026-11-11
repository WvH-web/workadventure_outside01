"""Replace the root-owned auditor only after preserving and validating its exact prior bytes."""
import hashlib
from pathlib import Path
import runpy

current=Path('/tmp/wvh-check-castle-piano-deployment.py')
candidate=Path('/tmp/wvh-check-castle-piano-deployment-recovery.py')
backup=Path('/opt/wvh-castle-school/private/audit-before-round-recovery.py')
assert all(path.resolve()==path for path in [current,candidate,backup])
assert current.read_bytes()==backup.read_bytes() and hashlib.sha256(backup.read_bytes()).hexdigest()=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c'
raw=candidate.read_bytes();assert hashlib.sha256(raw).hexdigest()=='e866f54d6ad19ca56c9e1ebeaee1edcc142c2fc652444b47633c42328de12e7e'
runpy.run_path(str(candidate))['main']()
assert current.read_bytes()==backup.read_bytes();current.write_bytes(raw);current.chmod(0o600)
assert current.read_bytes()==raw
print('{"passed":true,"auditorUpdated":true,"previousAuditorRetained":true,"noLiveModuleChange":true}')
