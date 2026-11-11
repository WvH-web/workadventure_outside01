"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='f1e104adadb73d17798538c43750c61e2346efe84d80a2e77c0ea15fdee1c83b'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
