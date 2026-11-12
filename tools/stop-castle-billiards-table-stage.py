"""Retain the failed native preflight and remove only its additional temporary room."""
import hashlib
from pathlib import Path

private=Path('/opt/wvh-castle-billiards-table/private');path=private/'stage-ops.py'
raw=path.read_bytes();assert path.resolve()==path and hashlib.sha256(raw).hexdigest()=='3615983189238dc8a2142fb3da727b4791bf37f9904d3c9228c77c174ac480e5'
scope={'__name__':'castle_billiards_table_cleanup','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
failure=Path('/tmp/wvh-castle-billiards-table-failure.json');assert failure.resolve()==failure
data=failure.read_bytes();assert hashlib.sha256(data).hexdigest()=='5a0afddd19f138603065a4189568261f8dfdf3e21c0c28ec3d76d2eec73c7644'
scope['write']('native-failure.json',data);scope['cleanup']()
