"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='17e2ecd2ee517a0c1ef0d058e9b4b14df94931703ba79c8b4c3df45ca144b376'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
