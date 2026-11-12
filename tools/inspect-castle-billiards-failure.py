"""Read only the owned pilot failure metadata; do not print credentials or identities."""
import hashlib
import json
from pathlib import Path
import subprocess

root=Path('/opt/wvh-castle-billiards-pilot-r2/private');assert root.resolve()==root
files={path.name:{'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for path in root.iterdir() if path.is_file()}
result={'files':files,'rollback':json.loads((root/'rollback.json').read_text()),'pilotContainerExists':bool(subprocess.check_output(['docker','ps','-a','--filter','name=^/wvh-castle-billiards$','--format','{{.Names}}'],text=True).strip())}
failure=root/'failure.private.log'
if failure.exists():
    text=failure.read_text();runtime=root/'runtime.env'
    if runtime.exists():
        for line in runtime.read_text().splitlines():
            key,_,value=line.partition('=')
            if value and ('KEY' in key or 'SECRET' in key):text=text.replace(value,'[redacted]')
    result['startupLog']=text[-2500:]
print(json.dumps(result,indent=2))
