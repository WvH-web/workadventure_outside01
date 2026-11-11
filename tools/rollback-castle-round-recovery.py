"""Restore only an unaccepted static-route transition, never a later accepted release."""
import hashlib
from pathlib import Path
import runpy

helper=Path('/tmp/wvh-castle-round-recovery-ops.py');audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
runpy.run_path(str(helper))['main']('rollback')
runpy.run_path(str(audit))['main']()
