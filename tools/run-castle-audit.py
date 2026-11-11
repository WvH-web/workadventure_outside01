"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='1840d81f91287a1ca169632ac4ca3c2ca0246bc14084525b86257c4d06e0bbcf'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
