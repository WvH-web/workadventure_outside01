"""Use the approved short school-only restart after the exact accepted stage."""
import hashlib
from pathlib import Path
import runpy

path=Path('/opt/wvh-castle-school/private/game-host-publication-ops.py')
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
assert hashlib.sha256(path.read_bytes()).hexdigest()=='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
runpy.run_path(str(path))['main']('publish')
