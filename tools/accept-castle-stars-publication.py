"""Accept only the actual normal-room pupil proof; keep the isolated proof unchanged."""
import hashlib
from pathlib import Path

private=Path('/opt/wvh-castle-stars/private')
def checked(name,digest):
    path=private/name;assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==digest
    scope={'__name__':'castle_stars_acceptance','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope
operator=checked('publication-ops.py','4a77f6f24b9e69afd60d5e9796e03c90262cba1b67c59fbebb97d8602c7dd1a2')
proof=checked('published-proof-ops.py','f40a9cd7d3affaef4fe1bc91e97582209b7b188873b4381ab04de004277c9569')
proof['accept'](operator,'4982fa9fb0e7c44602e47a29ab93d7f102d51c4dbc35d830b3dc6ab65914c734')
operator['main']('verify')
