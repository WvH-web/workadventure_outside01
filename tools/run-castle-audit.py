"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='739758b23406b13effd69fcb0c5521f93a4f8d99cb43c2fd5a01861f86d244c0'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
