"""Run the full preserved-platform audit before the reviewed browser-only publication."""
import hashlib
from pathlib import Path
import runpy

audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
runpy.run_path(str(audit))['main']()
runpy.run_path(str(helper))['main']('deploy')
