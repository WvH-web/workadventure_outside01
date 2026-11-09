"""Read-only metadata for unrelated web-configuration drift; never print config values."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess

path=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
raw=path.read_bytes();digest=hashlib.sha256(raw).hexdigest()
client=json.loads(subprocess.check_output(['docker','inspect','workadventure-play-1'],text=True))[0]
manifests=[]
for filename,key in [('/opt/wvh-castle-content/private/deployment.json','nginx_sha256'),
    ('/opt/wvh-castle-school/private/deployment.json','nginx_after_sha256'),
    ('/opt/wvh-castle-chess/private/deployment.json','nginx_after_sha256'),
    ('/opt/wvh-castle-art/private/deployment.json','nginx_after_sha256')]:
    value=json.loads(Path(filename).read_text())[key]
    manifests.append({'manifest':filename,'matches_current':value==digest,'recorded_hash':value})
result={'current_hash':digest,'config_modified_at_utc':datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),
    'play_started_at_utc':client['State']['StartedAt'],'manifests':manifests,
    'has_sterne_kollegium_location':bool(re.search(rb'location\s+[^\n]*?/sterne-kollegium/',raw)),
    'has_castle_content_location':b'/castle-content/' in raw,'has_castle_school_location':b'/castle-school/' in raw,
    'has_castle_chess_location':b'/castle-chess/' in raw,'has_castle_art_location':b'/castle-art/' in raw}
print(json.dumps(result,indent=2))
