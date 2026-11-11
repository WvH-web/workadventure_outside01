"""Run the reviewed small preparation and unit checks through the pinned SSH wrapper."""
import hashlib
from pathlib import Path
path=Path('/tmp/wvh-castle-seat-client-build.py');raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='fb3ecd13e8b6d0201c1fef936624c3a29de96c511ff12e8ff09e5325eff0d72c'
scope={'__name__':'castle_seat_build','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['prepare']('1982e173f9e90d9069e7b927f717465ee67774ca6e67d99448a2c6d3a256a172')
scope['unit']()
