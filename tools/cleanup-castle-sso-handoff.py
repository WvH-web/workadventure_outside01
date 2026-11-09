"""Delete only the temporary authorized probe-token handoff, never the test accounts."""
import json
from pathlib import Path
target=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
assert target.resolve()==target and target.parent.stat().st_mode&0o777==0o700
if target.exists():
    assert not target.is_symlink() and target.stat().st_mode&0o777==0o600
    value=json.loads(target.read_text());assert set(value)=={'A','B'} and all(isinstance(token,str) for token in value.values());target.unlink()
print('Temporary school-login probe handoff removed; accounts and security settings unchanged.')
