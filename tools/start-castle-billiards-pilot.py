"""Execute one exact, reviewed billiards pilot artifact; retain its root-owned operations source."""
import hashlib
from pathlib import Path
import stat

source=Path('/tmp/wvh-castle-billiards-deployment.py')
assert source.resolve()==source and source.is_file()
raw=source.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d'
scope={'__name__':'castle_billiards_release','__file__':str(source)}
exec(compile(raw,str(source),'exec'),scope)
try:
    scope['start']('4a81fa9246b809bff1cf1ca119e0a081c58fc29bcb12cde7cc6eb25e52792e44')
finally:
    private=Path('/opt/wvh-castle-billiards-pilot-r3/private')
    if private.exists():
        assert private.resolve()==private and private.stat().st_uid==0 and stat.S_IMODE(private.stat().st_mode)==0o700
        target=private/'deployment-ops.py';assert not target.exists()
        with target.open('xb') as handle:handle.write(raw)
        target.chmod(0o600)
