"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='e45bd6af93b7d0698823cac8d75a774644f20ccdccc1bc0fec57d49e811efc3d'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
