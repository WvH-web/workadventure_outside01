"""Restore the staged predecessor only while its canonical public map still matches."""
import hashlib
from pathlib import Path

path=Path('/opt/wvh-castle-stars/private/publication-ops.py')
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='4a77f6f24b9e69afd60d5e9796e03c90262cba1b67c59fbebb97d8602c7dd1a2'
scope={'__name__':'castle_stars_publication','__file__':str(path)}
exec(compile(raw,str(path),'exec'),scope);scope['main']('rollback')
