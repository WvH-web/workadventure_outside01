"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path
import runpy

private=Path('/opt/wvh-castle-school/private')
published=private/'game-host-deployment.json'
rollback=private/'game-host-publication-rollback.json'
if published.exists() or rollback.exists():
    path=private/'game-host-publication-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    assert hashlib.sha256(path.read_bytes()).hexdigest()=='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
    runpy.run_path(str(path))['main']('verify' if published.exists() else 'verify_rollback')
    raise SystemExit(0)

path=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
exec(compile(raw,str(path),'exec'),{'__name__':'__main__','__file__':str(path)})
