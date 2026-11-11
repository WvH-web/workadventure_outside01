"""Restore only this provisional gallery transition; refuse concurrent changes."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-deploy-castle-home-entry.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='7866c65e54385a0e789568e60f76bd9e69816345caede525467d60d5b5e4c8d1'
namespace={'__name__':'castle_home_entry_deployment'}
exec(compile(raw,str(path),'exec'),namespace)
namespace['rollback']()
