"""Remove only the known, synthetic PHP QA result after it has been retrieved."""
import json
from pathlib import Path

path = Path('/tmp/wvh-castle-notices-qa-result.json')
if path.is_symlink() or not path.is_file() or path.stat().st_size > 200000:
    raise RuntimeError('Unexpected QA result')
value = json.loads(path.read_text())
if value.get('fixtures', {}).get('realSchoolRowsWritten') is not False or value.get('isolatedDatabaseRemoved') is not True:
    raise RuntimeError('Not an accepted synthetic result')
path.unlink()
assert not path.exists() and not Path('/tmp/wvh-castle-notices-qa.zip').exists()
print('Synthetic QA result and upload removed; no application sources or school data changed.')
