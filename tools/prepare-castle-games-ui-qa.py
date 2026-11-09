"""Issue a short-lived staff token only for a non-participant UI probe; no pupil account changes."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import pwd
import subprocess
import tempfile
import time
import urllib.request

identifier=os.environ.get('CASTLE_SCHOOL_QA_IDENTIFIER','')
assert '@' in identifier and len(identifier)<=254
container=json.loads(subprocess.check_output(['docker','inspect','wvh-castle-school'],text=True))[0]
env=dict(item.split('=',1) for item in container['Config']['Env'] if '=' in item)
request=urllib.request.Request('https://www.deine-schule.com/workadventure-castle-context.php',method='POST',
 headers={'Content-Type':'application/json','X-Castle-School-Key':env['CASTLE_SCHOOL_LOOKUP_KEY']},data=json.dumps({'identifier':identifier}).encode())
with urllib.request.urlopen(request,timeout=10) as response:profile=json.load(response)
assert profile['eligible'] and profile['kind']=='staff'
encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
value=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':identifier,'username':'Private Game UI QA','tags':['student'],'exp':int(time.time())+1200})
token=(value+b'.'+base64.urlsafe_b64encode(hmac.new(env['SECRET_KEY'].encode(),value,hashlib.sha256).digest()).rstrip(b'=')).decode()
target=Path('/tmp/wvh-castle-games-ui.private.json');assert not target.is_symlink()
account=pwd.getpwnam('wilhelm')
if target.exists():assert target.stat().st_uid==account.pw_uid and target.stat().st_mode&0o777==0o600 and set(json.loads(target.read_text()))=={'staff'}
fd,temporary=tempfile.mkstemp(dir='/tmp',prefix='.wvh-castle-games-ui-')
try:
    with os.fdopen(fd,'w') as output:json.dump({'staff':token},output)
    os.chown(temporary,account.pw_uid,account.pw_gid);os.replace(temporary,target)
finally:
    if os.path.exists(temporary):os.unlink(temporary)
print('Twenty-minute UI-only staff credential prepared privately after fresh role verification; no WA participant created.')
