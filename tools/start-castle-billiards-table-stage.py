"""Install only the exact additional protected room with reviewed public candidate assets."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-castle-billiards-table-stage.py');assert path.resolve()==path and path.is_file()
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='3615983189238dc8a2142fb3da727b4791bf37f9904d3c9228c77c174ac480e5'
scope={'__name__':'castle_billiards_table_release','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['stage']('35b4fc0e05b3ba8e1198830217ef59d2316d0cd339c2a2eb36e042ea22a23cf1','d8c8126d719d6a3741e35c06016a40b9d73e3628cd1ec51533c907932f00abfd')
