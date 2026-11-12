"""Remove exact redundant uploads only after the temporary room is gone and retained copies match."""
import hashlib
import json
from pathlib import Path

ui=Path('/opt/wvh-castle-billiards-ui');pilot=Path('/opt/wvh-castle-billiards-pilot-r3/private');table=Path('/opt/wvh-castle-billiards-table/private')
path=ui/'private/publication-ops.py';raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='04cb4fe7cc43d44979ddd3d30d8d2e6977250674fc85355acaefed1e98d3653e'
scope={'__name__':'billiards_upload_cleanup','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);scope['verify']()
assert json.loads((table/'cleanup.json').read_text())['probeRemoved'] is True
assert not Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview/billardprobe.wam').exists()
assert not (ui/'private/staging-cleanup.json').exists()
pairs=[('/tmp/wvh-castle-billiards-ui.css',ui/'public/billiards.css'),('/tmp/wvh-castle-billiards-ui-publication.py',path),
 ('/home/wilhelm/.cache/wvh-school-qa/billiards-ui-candidate.private.json',ui/'private/candidate-proof.json'),
 ('/tmp/wvh-castle-billiards-acceptance.py',pilot/'acceptance-ops.py'),('/tmp/wvh-castle-billiards-native.json',pilot/'native-proof.json'),
 ('/tmp/wvh-castle-billiards-publication.json',table/'publication.json'),('/tmp/wvh-castle-billiards-probe.wam',table/'probe-input.json'),
 ('/tmp/wvh-castle-billiards-table-stage.py',table/'stage-ops.py'),('/tmp/wvh-castle-billiards-table-failure.json',table/'native-failure.json')]
removed=[]
for name,retained in pairs:
    target=Path(name)
    assert target.resolve()==target and target.is_file() and target.stat().st_size<100000
    assert retained.resolve()==retained and retained.is_file() and target.read_bytes()==retained.read_bytes()
for name,retained in pairs:
    target=Path(name);removed.append({'path':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()});target.unlink()
scope['verify']();scope['write']('staging-cleanup.json',{'version':1,'retainedCopiesVerified':True,'removed':removed})
print(json.dumps({'passed':True,'temporaryUploadsRemoved':len(removed),'bytesRemoved':sum(item['bytes'] for item in removed),'privateProofsAndLiveFilesRetained':True}))
