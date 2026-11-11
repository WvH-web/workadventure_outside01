"""Install exactly the reviewed puzzle-stage inputs, then add one temporary map."""
import hashlib
import os
from pathlib import Path

BASE=Path('/opt/wvh-castle-stars');PRIVATE=BASE/'private'
FILES=[(Path('/tmp/wvh-castle-stars-stage.py'),PRIVATE/'stage-ops.py','0045b3664f4d8be56fe602414496a49a9a4d1f8b41ec7214a86d0616105a6617'),
       (Path('/tmp/wvh-castle-stars-publication.json'),PRIVATE/'publication.json','2f478a8eeadad88942bf9e9914f75054bf8e778b94e277b52d0fa54622b3cb7d')]
os.umask(0o077)
for directory in [BASE,PRIVATE]:
    assert directory.resolve()==directory and not directory.is_symlink()
    directory.mkdir(mode=0o700,exist_ok=True)
    assert directory.stat().st_uid==0 and directory.stat().st_mode&0o777==0o700
for source,target,digest in FILES:
    assert source.resolve()==source and source.is_file()
    raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==digest
    if target.exists():assert target.resolve()==target and target.stat().st_uid==0 and target.stat().st_mode&0o777==0o600 and target.read_bytes()==raw
    else:
        with target.open('xb') as handle:handle.write(raw)
        target.chmod(0o600)
scope={'__name__':'castle_stars_stage','__file__':str(FILES[0][1])}
exec(compile(FILES[0][1].read_bytes(),str(FILES[0][1]),'exec'),scope)
scope['stage']()
