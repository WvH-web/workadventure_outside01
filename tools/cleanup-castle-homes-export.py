"""Remove only the verified generic archive's temporary SFTP export."""
import hashlib
import json
from pathlib import Path

parent=Path('/home/wilhelm/.cache/wvh-school-qa')
path=parent/'castle-homes-runtime-8a7b5a2e1bf03405.tar.gz'
original=Path('/opt/wvh-castle-homes/private/runtime-backups/8a7b5a2e1bf03405.tar.gz')
assert parent.resolve()==parent and parent.stat().st_mode&0o777==0o700
assert path.resolve()==path and path.is_file() and path.stat().st_mode&0o777==0o600
assert path.stat().st_uid==parent.stat().st_uid and path.stat().st_size==84095464
sha=lambda file:hashlib.sha256(file.read_bytes()).hexdigest()
assert sha(path)==sha(original)=='a3b7e21e359445f6fb42dc692ffc1f90fb27b5bb0260101166730891fc27d0b5'
path.unlink()
assert original.is_file() and not path.exists()
print(json.dumps(dict(temporarySoftwareExportRemoved=True,protectedRecoveryArchiveRetained=True)))
