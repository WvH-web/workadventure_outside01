"""Read the bounded fixture-only canary log; it uses no real school credentials."""
from pathlib import Path

path=Path('/opt/wvh-castle-homes/private/owned-runtime-canary.private.log')
assert path.resolve()==path and path.stat().st_mode&0o777==0o600
raw=path.read_text()
assert len(raw)<12000
print(raw)
