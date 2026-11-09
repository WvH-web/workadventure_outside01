"""Run manually only after the user explicitly approves a brief play-client restart."""
import hashlib
import json
import os
from pathlib import Path
import time

os.umask(0o077)
root=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
override=Path('/root/togetherWorkadventure/workadventure/docker-compose.override.yaml')
assert root.resolve()==root and not root.is_symlink()
assert override.resolve()==override and not override.is_symlink()
assert not (root/'live-deployment.json').exists(),'Candidate is already deployed'
assert not (root/'maintenance-window-used.private.json').exists(),'Grant was already consumed'
grant=root/'maintenance-window.private.json'
assert not grant.exists(),'Review the existing grant before issuing another'
now=int(time.time())
value={'version':1,'scope':'play-only','approved_by':'current-user','allow_active_sessions':True,
    'approved_at':now,'expires_at':now+900,
    'image_id':'sha256:ed2d18546b8f8dc5a2503edb98dddcb8e38efbac50c45b60b2124f9ad8f5f60b',
    'base_image_id':'sha256:9ba04071c3153970743b39301192ee0ec6f3bd09e3b85f3b4c64f5a4d3e635f3',
    'override_sha256':hashlib.sha256(override.read_bytes()).hexdigest()}
with grant.open('x') as output:
    json.dump(value,output,indent=2);output.write('\n')
grant.chmod(0o600)
print('One-use maintenance approval created for this candidate and current configuration; expires in 15 minutes.')
