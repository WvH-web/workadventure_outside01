"""Execute the reviewed uploaded audit without exceeding Windows command limits."""
import hashlib
from pathlib import Path
import runpy

hall=Path('/opt/wvh-castle-billiards-hall/private')
if (hall/'deployment.json').exists() and not (hall/'rollback.json').exists():
    path=hall/'publication-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='7af7b7dbe79fd73c3e714fcdef705c43c7d0f2733c12d8b331ccad02a8e23172'
    scope={'__name__':'castle_billiards_hall_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['verify']();raise SystemExit(0)

second_table=Path('/opt/wvh-castle-billiards-table-r2/private')
if (second_table/'stage.json').exists() and not (second_table/'cleanup.json').exists():
    path=second_table/'stage-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='47d4dd1ce3bcc74d2cb21aab1d94410db18c711e526daab2d832ef800a7bb46a'
    scope={'__name__':'castle_billiards_second_table_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['verify']();raise SystemExit(0)

table=Path('/opt/wvh-castle-billiards-table/private')
if (table/'stage.json').exists() and not (table/'cleanup.json').exists():
    path=table/'stage-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='3615983189238dc8a2142fb3da727b4791bf37f9904d3c9228c77c174ac480e5'
    scope={'__name__':'castle_billiards_table_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    scope['verify']();raise SystemExit(0)

style=Path('/opt/wvh-castle-billiards-ui/private')
if (style/'deployment.json').exists() and not (style/'rollback.json').exists():
    path=style/'publication-ops.py'
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='04cb4fe7cc43d44979ddd3d30d8d2e6977250674fc85355acaefed1e98d3653e'
    scope={'__name__':'castle_billiards_ui_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
    acceptance=Path('/opt/wvh-castle-billiards-pilot-r3/private/acceptance.json')
    if acceptance.exists():
        path=acceptance.with_name('acceptance-ops.py')
        assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
        raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='8c3c6533417165ce7a9e520736c5dd9c8a18e5243a4fbcbfcc4eb64cfee5c6e2'
        proof={'__name__':'castle_billiards_acceptance_audit','__file__':str(path)};exec(compile(raw,str(path),'exec'),proof);proof['verify']()
    scope['verify']();raise SystemExit(0)

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
