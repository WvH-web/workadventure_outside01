"""Run the full preserved-platform audit before the reviewed browser-only publication."""
import hashlib
from pathlib import Path
import runpy

audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
helper=Path('/tmp/wvh-castle-round-recovery-ops.py')
assert audit.resolve()==audit and hashlib.sha256(audit.read_bytes()).hexdigest()=='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
runpy.run_path(str(audit))['main']()
runpy.run_path(str(helper))['main']('deploy')
