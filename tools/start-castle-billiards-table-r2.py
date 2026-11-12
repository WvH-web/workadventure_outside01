"""Install the exact second candidate without changing any original room."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-castle-billiards-table-r2-stage.py');assert path.resolve()==path and path.is_file()
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='47d4dd1ce3bcc74d2cb21aab1d94410db18c711e526daab2d832ef800a7bb46a'
scope={'__name__':'castle_billiards_second_table_release','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['stage']('975f3ff50f3354c7331d7d940f3007b08ba00e0ffde4e1e116d05ca276cb4063','4bd247d074cb158aaa2461ec3993891fca94ce0a639cd659e10f188ae6971879')
