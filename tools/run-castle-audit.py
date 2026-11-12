"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path
import runpy

billiards=Path('/opt/wvh-castle-billiards-pilot-r3/private')
if (billiards/'deployment.json').exists() and not (billiards/'rollback.json').exists():
    path=billiards/'deployment-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d'
    scope={'__name__':'castle_billiards_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['verify']();raise SystemExit(0)

seat=Path('/opt/wvh-castle-seat-ui-retry/private')
if (seat/'deployment.json').exists() and not (seat/'rollback.json').exists():
    path=seat/'deployment-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='f77faf75b39108d8d5d25e018b9d5a1d2430f2d83c6246e125fe38e1fac9fa1a'
    scope={'__name__':'castle_seat_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['main']('verify');raise SystemExit(0)

stars=Path('/opt/wvh-castle-stars/private')
if (stars/'publication-deployment.json').exists() and not (stars/'publication-rollback.json').exists():
    path=stars/'publication-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='4a77f6f24b9e69afd60d5e9796e03c90262cba1b67c59fbebb97d8602c7dd1a2'
    scope={'__name__':'castle_stars_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['main']('verify');raise SystemExit(0)

private=Path('/opt/wvh-castle-school/private')
published=private/'game-host-deployment.json'
rollback=private/'game-host-publication-rollback.json'
if published.exists() and (private/'game-host-published-acceptance.json').exists():
    path=private/'game-host-published-proof-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    assert hashlib.sha256(path.read_bytes()).hexdigest()=='61a1f36fd958040b603cac9a5425290062776c773d19f01a842cdf793a755c86'
    runpy.run_path(str(path))['main']('verify')
    raise SystemExit(0)
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
