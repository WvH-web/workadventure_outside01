"""Install the two reviewed immutable publication helpers, then seal the predecessor."""
import hashlib
import os
from pathlib import Path

private=Path('/opt/wvh-castle-stars/private')
assert private.resolve()==private and private.stat().st_uid==0 and private.stat().st_mode&0o777==0o700
files=[(Path('/tmp/wvh-castle-stars-publication-ops.py'),private/'publication-ops.py','4a77f6f24b9e69afd60d5e9796e03c90262cba1b67c59fbebb97d8602c7dd1a2'),
       (Path('/tmp/wvh-castle-stars-published-proof.py'),private/'published-proof-ops.py','f40a9cd7d3affaef4fe1bc91e97582209b7b188873b4381ab04de004277c9569')]
os.umask(0o077)
for source,target,digest in files:
    assert source.resolve()==source and source.is_file();raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==digest
    if target.exists():assert target.resolve()==target and target.stat().st_uid==0 and target.stat().st_mode&0o777==0o600 and target.read_bytes()==raw
    else:
        with target.open('xb') as handle:handle.write(raw)
        target.chmod(0o600)
scope={'__name__':'castle_stars_publication','__file__':str(files[0][1])}
exec(compile(files[0][1].read_bytes(),str(files[0][1]),'exec'),scope);scope['main']('stage')
