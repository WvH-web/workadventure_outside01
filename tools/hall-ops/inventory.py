"""Read-only deployment inventory. Never prints environment secret values."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

def run(*args):
    return subprocess.check_output(args, text=True)

facts = {}
for name in ['workadventure-play-1', 'workadventure-back-1']:
    data = json.loads(run('docker', 'inspect', name))[0]
    env = dict(item.split('=', 1) for item in data['Config'].get('Env', []) if '=' in item)
    facts[name] = {
        'image': data['Config']['Image'], 'user': data['Config'].get('User'),
        'networks': list(data['NetworkSettings']['Networks']),
        'secret_keys_present': {key: bool(env.get(key)) for key in ['SECRET_KEY', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']},
        'livekit_host': env.get('LIVEKIT_HOST'), 'livekit_url': env.get('LIVEKIT_URL'),
    }
config = Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
content = config.read_bytes()
facts['nginx'] = {'path': str(config), 'sha256': hashlib.sha256(content).hexdigest(),
                  'locations': re.findall(r'location\s+[^\{]+\{', content.decode())}
facts['node'] = run('docker', 'exec', 'workadventure-play-1', 'node', '--version').strip()
facts['port3210_in_use'] = bool(run('ss', '-ltnH', 'sport = :3210').strip())
print(json.dumps(facts, indent=2))
