"""Accept the actual two-school-account native client probe, not a local mock."""
import hashlib
from pathlib import Path
path=Path('/opt/wvh-castle-seat-ui-retry/private/deployment-ops.py');raw=path.read_bytes()
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
assert hashlib.sha256(raw).hexdigest()=='f77faf75b39108d8d5d25e018b9d5a1d2430f2d83c6246e125fe38e1fac9fa1a'
assert hashlib.sha256(Path('/tmp/wvh-check-castle-seat-native.cjs').read_bytes()).hexdigest()=='2b1385d24d86cf99c21b053d7ffb05db1507890d89497799cbcba5330d58f98c'
assert hashlib.sha256(Path('/tmp/wvh-seat-client-native.json').read_bytes()).hexdigest()=='cc59d88c557ea0baa0e5cffff67fdf6dca3f1d84495b59f602679de0538d0e1c'
scope={'__name__':'castle_seat_acceptance','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['main']('accept')
