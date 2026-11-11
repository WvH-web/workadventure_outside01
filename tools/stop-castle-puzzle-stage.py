"""Remove only the receipt-pinned temporary puzzle map and verify the predecessor."""
import hashlib
from pathlib import Path

path=Path('/opt/wvh-castle-stars/private/stage-ops.py')
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='0045b3664f4d8be56fe602414496a49a9a4d1f8b41ec7214a86d0616105a6617'
scope={'__name__':'castle_stars_cleanup','__file__':str(path)}
exec(compile(raw,str(path),'exec'),scope);scope['cleanup']()
