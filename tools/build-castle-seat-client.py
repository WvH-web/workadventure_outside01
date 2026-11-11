"""Run the reviewed frontend-only compiler, without restarting production."""
import hashlib
from pathlib import Path
path=Path('/tmp/wvh-castle-seat-client-build.py');raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='fb3ecd13e8b6d0201c1fef936624c3a29de96c511ff12e8ff09e5325eff0d72c'
scope={'__name__':'castle_seat_build','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['build']()
