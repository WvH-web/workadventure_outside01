"""Read only the routing facts needed for an isolated static castle-content path."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
path=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
data=path.read_bytes()
print(json.dumps({'nginx_sha256':hashlib.sha256(data).hexdigest(),
    'locations':re.findall(r'location\s+[^\{]+\{',data.decode()),
    'castle_content_directory_exists':Path('/opt/wvh-castle-content').exists(),
    'nginx_test_ok':subprocess.run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0},indent=2))
