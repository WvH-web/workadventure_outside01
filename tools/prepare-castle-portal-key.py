"""Prepare a private one-time transfer of the existing catalog lookup key, not the login verifier."""
import json
import os
from pathlib import Path
import pwd
import re
import subprocess

container=json.loads(subprocess.check_output(['docker','inspect','wvh-castle-school'],text=True))[0]
env=dict(item.split('=',1) for item in container['Config']['Env'] if '=' in item)
key=env.get('CASTLE_SCHOOL_LOOKUP_KEY','')
assert re.fullmatch('[a-f0-9]{64}',key)
target=Path('/tmp/wvh-castle-portal-config.php')
fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
with os.fdopen(fd,'w') as output:output.write("<?php\nreturn ['key'=>'"+key+"'];\n")
account=pwd.getpwnam('wilhelm');os.chown(target,account.pw_uid,account.pw_gid)
print('Existing private catalog key prepared for one-time protected transfer; no login secret copied.')
