"""Stop only the verified additional native probe and restore the exact prior map inventory."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-stage-castle-home-native.py')
assert path.resolve()==path and path.is_file()
raw=path.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='04495f65bcf218055e1b471dd691f5a6817cd5e97d192468e13bec146a40dea8'
namespace={'__name__':'castle_home_native_probe'}
exec(compile(raw,str(path),'exec'),namespace)
namespace['cleanup']()
