"""Read-only publication preflight metadata; no credentials or private content."""
import json
from pathlib import Path

paths=['/opt/wvh-castle-billiards-ui/private/publication-ops.py','/opt/wvh-castle-billiards-pilot-r3/private/deployment-ops.py',
 '/opt/wvh-castle-school/private/game-host-publication-ops.py','/tmp/wvh-castle-piano-ops.py','/opt/wvh-castle-billiards-table-r2/private/acceptance-ops.py']
print(json.dumps([{'file':str(path),'owner':path.stat().st_uid,'mode':oct(path.stat().st_mode&0o777)} for path in map(Path,paths)]))
path=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview/spielesaal.wam')
print(json.dumps({'areas':json.loads(path.read_bytes())['areas']}))
input=Path('/tmp/wvh-castle-billiards-hall.wam')
if input.exists():
    before=json.loads(path.read_bytes());after=json.loads(input.read_bytes())
    print(json.dumps({'topLevelDifferences':{key:{'before':before.get(key),'after':after.get(key)} for key in set(before)|set(after) if key not in ['mapUrl','areas'] and before.get(key)!=after.get(key)}}))
print(json.dumps({'temporaryUploads':[{'name':item.name,'owner':item.stat().st_uid,'bytes':item.stat().st_size} for item in Path('/tmp').glob('wvh-castle-billiards-*') if item.is_file() and item.resolve()==item]}))
