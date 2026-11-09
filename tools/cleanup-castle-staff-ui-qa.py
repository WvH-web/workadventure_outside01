"""Remove only the short-lived, explicitly named staff UI probe credential."""
import json
from pathlib import Path
import pwd

target=Path('/tmp/wvh-castle-games-ui.private.json')
if target.exists():
    assert not target.is_symlink() and target.stat().st_uid==pwd.getpwnam('wilhelm').pw_uid and target.stat().st_mode&0o777==0o600
    data=json.loads(target.read_text());assert set(data)=={'staff'} and isinstance(data['staff'],str)
    target.unlink()
print('Short-lived staff UI probe file removed; no login keys changed.')
