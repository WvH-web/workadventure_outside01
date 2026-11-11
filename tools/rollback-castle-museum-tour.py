"""Restore only the former new-preview museum if public acceptance fails."""
import hashlib
from pathlib import Path
import runpy

path=Path('/tmp/wvh-deploy-castle-museum-tour.py')
assert path.resolve()==path and hashlib.sha256(path.read_bytes()).hexdigest()=='1d81afc61a085e6d1bec98febc2fdef25b4ebf61f4f2bc675ad005e9a9f04cd2'
runpy.run_path(str(path))['rollback']()
