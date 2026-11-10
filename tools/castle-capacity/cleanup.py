import runpy
import json
from pathlib import Path
request=Path('/tmp/wvh-castle-capacity-cleanup-request.json')
assert not request.is_symlink() and request.stat().st_size<256
value=json.loads(request.read_text());assert list(value)==['room']
request.unlink()
runpy.run_path('/tmp/wvh-castle-capacity-ops.py')['cleanup'](value['room'])
