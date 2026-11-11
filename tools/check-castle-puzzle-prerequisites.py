"""Read-only prerequisite check for the reviewed temporary puzzle-map operator."""
import hashlib
import json
from pathlib import Path

files={
    '/tmp/wvh-castle-piano-ops.py':'4c67a5cc74678992fa8cf0f82c613075ba4eab07c76139bfd1882e9e36415fa3',
    '/opt/wvh-castle-school/private/game-host-publication-ops.py':'54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3',
    '/opt/wvh-castle-school/private/game-host-published-proof-ops.py':'61a1f36fd958040b603cac9a5425290062776c773d19f01a842cdf793a755c86',
    '/tmp/wvh-castle-stars-stage.py':'0045b3664f4d8be56fe602414496a49a9a4d1f8b41ec7214a86d0616105a6617',
    '/tmp/wvh-castle-stars-publication.json':'2f478a8eeadad88942bf9e9914f75054bf8e778b94e277b52d0fa54622b3cb7d'}
for name,digest in files.items():
    path=Path(name);assert path.resolve()==path and path.is_file()
    assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
storage=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
assert storage.resolve()==storage and len(list(storage.iterdir()))==16 and not (storage/'sternprobe.wam').exists()
print(json.dumps({'passed':True,'reviewedInputsVerified':len(files),'existingMaps':16,'changesMade':False}))
