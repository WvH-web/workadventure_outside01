"""Apply the already prepared, exact new-castle game-hall transition."""
import hashlib
from pathlib import Path

path=Path('/opt/wvh-castle-billiards-hall/private/publication-ops.py')
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='7af7b7dbe79fd73c3e714fcdef705c43c7d0f2733c12d8b331ccad02a8e23172'
scope={'__name__':'billiards_hall_publication','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);scope['publish']()
