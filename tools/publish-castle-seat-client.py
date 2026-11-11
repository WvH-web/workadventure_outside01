"""Consume this chat's explicit, bounded play-only interruption approval once."""
import hashlib
from pathlib import Path
import time
path=Path('/opt/wvh-castle-seat-ui-retry/private/deployment-ops.py');data=path.read_bytes()
assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
assert hashlib.sha256(data).hexdigest()=='f77faf75b39108d8d5d25e018b9d5a1d2430f2d83c6246e125fe38e1fac9fa1a'
scope={'__name__':'castle_seat_deployment','__file__':str(path)};exec(compile(data,str(path),'exec'),scope)
private=scope['PRIVATE'];stage=scope['load'](private/'stage.json');now=int(time.time())
scope['write'](private/'maintenance-approval.json',{'version':1,'approvedBy':'current-user',
    'approvalText':'Ja, erneut kurz aktualisieren','scope':'play-only-compact-castle-seating','allowActiveSessions':True,
    'approvedAt':now,'expiresAt':now+1200,'baseImageId':scope['BASE'],'imageId':stage['build']['image_id'],
    'overrideSha256':stage['overrideBeforeSha256']})
scope['main']('publish')
