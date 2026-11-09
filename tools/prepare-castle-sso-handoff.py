"""Create a private, non-web directory for the two authorized school-login probe tokens."""
import os
from pathlib import Path
import pwd
base=Path('/home/wilhelm/.cache/wvh-school-qa')
assert base.resolve()==base and not base.is_symlink()
account=pwd.getpwnam('wilhelm')
base.mkdir(parents=True,exist_ok=True);base.chmod(0o700);os.chown(base,account.pw_uid,account.pw_gid)
print('Private temporary school-SSO probe directory ready.')
