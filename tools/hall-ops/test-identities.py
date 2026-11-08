"""Create short-lived synthetic test accounts, never touch real student accounts."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import pwd
import subprocess
import time

play = json.loads(subprocess.check_output(['docker','inspect','workadventure-play-1'],text=True))[0]
env = dict(item.split('=',1) for item in play['Config']['Env'] if '=' in item)
def b64(value):
    return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
tokens = {}
for number in range(1,5):
    payload = b64({'alg':'HS256','typ':'JWT'})+b'.'+b64({
        'identifier':f'hall-qa-{int(time.time())}-{number}@invalid.local',
        'username':f'Hallenprobe {number}','tags':['student'],'exp':int(time.time())+3600})
    tokens[str(number)] = (payload+b'.'+base64.urlsafe_b64encode(
        hmac.new(env['SECRET_KEY'].encode(),payload,hashlib.sha256).digest()).rstrip(b'=')).decode()
path = Path('/tmp/wvh-hall-qa.private.json')
path.write_text(json.dumps(tokens))
path.chmod(0o600)
account = pwd.getpwnam('wilhelm')
os.chown(path,account.pw_uid,account.pw_gid)
print('Four unique one-hour test identities prepared privately; no real accounts changed.')
