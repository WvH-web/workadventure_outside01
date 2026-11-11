"""Read-only web/runtime preconditions for a separate, two-account room pilot."""
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess

ops = runpy.run_path('/tmp/wvh-castle-piano-ops.py')
before = ops['baseline']()
web = Path('/var/www/vhosts/deine-schule.com')
paths = [web/'httpdocs', web/'private', web/'private/castle-school',
         web/'private/castle-school/config.json', web/'httpdocs/workadventure-castle-context.php']
metadata = {str(p): {'uid': p.stat().st_uid, 'gid': p.stat().st_gid,
                     'mode': oct(p.stat().st_mode & 0o777)} for p in paths}
nginx = Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
config = nginx.read_text()
example = re.search(r'location \^~ /castle-piano/ \{([^{}]*)\}', config)
safe = []
if example:
    safe = [line.strip() for line in example.group(1).splitlines() if re.match(
        r'\s*(?:proxy_pass |proxy_set_header (?:Host|X-Real-IP|Upgrade|Connection)|proxy_http_version |proxy_read_timeout |proxy_buffering |client_max_body_size )', line)]
php = sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
modules = subprocess.run([str(php), '-m'], check=True, capture_output=True, text=True).stdout.splitlines()
port = subprocess.run(['ss', '-ltnH', 'sport = :3251'], check=True, capture_output=True, text=True).stdout
assert ops['baseline']() == before
print(json.dumps({'readOnly': True, 'pathMetadata': metadata,
                  'newPublicContextAbsent': not (web/'httpdocs/workadventure-castle-homes.php').exists(),
                  'newPrivateContextAbsent': not (web/'private/castle-homes').exists(),
                  'newNginxRouteAbsent': 'location ^~ /castle-homes/' not in config,
                  'newPortFree': not port.strip(), 'php': str(php),
                  'phpPdoMysql': 'pdo_mysql' in modules, 'phpPdoSqlite': 'pdo_sqlite' in modules,
                  'proxyExample': safe, 'nginxSha256': hashlib.sha256(nginx.read_bytes()).hexdigest(),
                  'protectedBaselineUnchanged': True}))
