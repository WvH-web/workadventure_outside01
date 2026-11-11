"""Remove only the exact owned native preflight and its temporary account environment."""
import hashlib
from pathlib import Path
import runpy

helper=Path('/tmp/wvh-castle-game-host-stage.py')
assert helper.resolve()==helper and hashlib.sha256(helper.read_bytes()).hexdigest()=='4b842a7747531f4693a4c99fa4726d5247e69f747882a8b46f72d5e6218e4b03'
runpy.run_path(str(helper))['stop'](1)
