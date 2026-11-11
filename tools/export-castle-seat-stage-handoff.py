"""Export only the disposable loopback-stage identity, never a school credential."""
import json
import os
from pathlib import Path
import pwd
source=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui-r2/browser-stage/handoff.private.json')
raw=source.read_bytes();value=json.loads(raw)
assert value['stageOnly'] is True and value['origin']=='http://localhost:13301' and value['identity'].endswith('@invalid.local')
target=Path('/tmp/wvh-seat-ui-stage-r2.private.json');assert not target.exists() and not target.is_symlink()
with target.open('xb') as handle:handle.write(raw)
target.chmod(0o600);account=pwd.getpwnam('wilhelm');os.chown(target,account.pw_uid,account.pw_gid)
print(json.dumps({'exported':True,'stageOnly':True,'realCredentialsIncluded':False}))
