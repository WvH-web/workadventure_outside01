"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='79198c2c26f3d74cc7b45f833aca3fa6ee309b2adcaa5e58bc0469e84e66c1d7'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
