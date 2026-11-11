"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
