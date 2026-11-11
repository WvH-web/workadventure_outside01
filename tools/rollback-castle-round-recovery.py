"""Restore only an unaccepted static-route transition, never a later accepted release."""
import hashlib
from pathlib import Path
import runpy

helper=Path('/tmp/wvh-castle-round-recovery-ops.py');audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
runpy.run_path(str(helper))['main']('rollback')
runpy.run_path(str(audit))['main']()
