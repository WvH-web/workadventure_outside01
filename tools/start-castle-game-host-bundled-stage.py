"""Start the exact bundled-status native candidate; leave the previous receipts intact."""
import hashlib
from pathlib import Path
import runpy

helper=Path('/tmp/wvh-castle-game-host-bundled-stage.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='85f57fe1953c86a5e511b0c06e259b7fa3f8ab87b8fdd4f07e1008aec93686e7'
runpy.run_path(str(helper))['start'](1)
