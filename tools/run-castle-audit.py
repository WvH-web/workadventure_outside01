"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
