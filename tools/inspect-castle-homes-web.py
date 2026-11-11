"""Report only error categories for the new endpoint, never unrelated school requests."""
import json
from pathlib import Path
import re

base = Path('/var/www/vhosts/system/deine-schule.com')
found = []
for name in ['error_log','proxy_error_log']:
    log = base/'logs'/name
    if not log.is_file():
        continue
    with log.open('rb') as stream:
        stream.seek(max(0,log.stat().st_size-200000))
        lines = stream.read().decode('utf8','replace').splitlines()
    matches = [line for line in lines if 'workadventure-castle-homes.php' in line]
    for line in matches[-5:]:
        found.append({'log':name,'apacheCodes':re.findall(r'\bAH[0-9]{5}\b',line),
                      'categories':[word for word in ['open_basedir','Permission denied','Primary script unknown',
                         'SoftException','UID','GID','ownership','not allowed','Failed opening required'] if word in line]})
groups = []
pools = [base/'conf/php-fpm.conf',*Path('/opt/plesk/php').glob('*/etc/php-fpm.d/deine-schule.com.conf')]
for pool in pools:
    if not pool.is_file():
        continue
    for line in pool.read_text().splitlines():
        if re.match(r'^\s*(?:user|group|listen.owner|listen.group)\s*=',line):
            groups.append(line.strip())
smoke = Path('/opt/wvh-castle-homes/private/context-smoke.private.json')
value = json.loads(smoke.read_text()) if smoke.is_file() else None
public = Path('/opt/wvh-castle-homes/private/public-health-smoke.private.json')
probe = Path('/opt/wvh-castle-homes/private/public-probe.private.log')
probe_lines = probe.read_text().splitlines() if probe.is_file() else []
safe_probe = [json.loads(line) for line in probe_lines if line.startswith('{') and '"passed":false' in line]
print(json.dumps({'endpointErrors':found,'phpPoolIdentity':groups,'contextSmoke':value,
                  'publicHealthSmoke':json.loads(public.read_text()) if public.is_file() else None,'probeErrors':safe_probe}))
