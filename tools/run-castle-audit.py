"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
