"""Read-only evidence that four completed generic-software uploads have retained VPS releases."""
import hashlib
import json
from pathlib import Path
import re

private=Path('/opt/wvh-castle-homes/private')
records={'wvh-castle-homes-calls.zip':'calls-deployment.json','wvh-castle-homes-owned.zip':'owned-runtime-deployment.json',
         'wvh-castle-homes-progressive.zip':'progressive-deployment.json','wvh-castle-homes-media.zip':'media-deployment.json'}
rows={}
for archive,name in records.items():
    path=private/name;assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();value=json.loads(raw);assert value['passed'] is True
    digest=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',digest)
    release=Path(value['release']);assert release.resolve()==release and release.parent==private.parent/'releases'
    assert not any(item.is_symlink() for item in release.rglob('*'))
    files=value['files'];assert isinstance(files,dict) and files
    for relative,expected in files.items():
        child=Path(relative);assert not child.is_absolute() and '..' not in child.parts
        assert hashlib.sha256((release/relative).read_bytes()).hexdigest()==expected
    rows[archive]={'archiveSha256':digest,'retainedReleaseVerified':True,'retainedFileCount':len(files),'receiptSha256':hashlib.sha256(raw).hexdigest()}
print(json.dumps({'passed':True,'readOnly':True,'schoolDataRead':False,'archives':rows}))
