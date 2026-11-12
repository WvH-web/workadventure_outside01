"""Remove only three exact, no-longer-needed uploads after verifying the retained pilot."""
import hashlib
import json
from pathlib import Path

private=Path('/opt/wvh-castle-billiards-pilot-r3/private');source=private/'deployment-ops.py'
raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()=='2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d'
scope={'__name__':'billiards_cleanup_dependency','__file__':str(source)};exec(compile(raw,str(source),'exec'),scope);scope['verify']()
targets={Path('/tmp/wvh-castle-billiards.zip'):'4a81fa9246b809bff1cf1ca119e0a081c58fc29bcb12cde7cc6eb25e52792e44',
 Path('/tmp/wvh-castle-billiards-deployment.py'):'2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d',
 Path('/home/wilhelm/.cache/wvh-school-qa/billiards-accounts.private.json'):'5c2c2b81373aa016a079d2f3ea72298a33d43dd23b9ff43add14ea77b4ed6b0c'}
removed=[]
for path,digest in targets.items():
    assert path.resolve()==path and path.is_file() and not path.is_symlink() and path.stat().st_size<4000000
    assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
for path,digest in targets.items():
    size=path.stat().st_size;path.unlink();removed.append({'path':str(path),'sha256':digest,'bytes':size})
scope['verify']();scope['write'](private/'staging-cleanup.json',{'version':1,'removed':removed,'retainedSourcesAndEvidence':True})
print(json.dumps({'passed':True,'temporaryUploadsRemoved':len(removed),'bytesRemoved':sum(item['bytes'] for item in removed),
 'retainedSourcesAndEvidence':True,'otherProjectsTouched':False}))
