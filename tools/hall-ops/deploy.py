"""Install an isolated hall gateway; never restart or reconfigure WorkAdventure."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request
import zipfile

os.umask(0o077)
base = Path('/opt/wvh-hall-audio')
archive = Path('/tmp/wvh-hall-audio-release.zip')
nginx = Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
expected_nginx = 'f34cb43da0bd0ff14513fd0578daa313c6fd1e0cb397c2809960d27141003084'
container = 'wvh-hall-audio'
def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE)
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
if digest(nginx) != expected_nginx:
    raise RuntimeError('Gateway routing changed since review; refusing to overwrite it.')
if run('docker','ps','-a','--filter','name=^/'+container+'$','--format','{{.Names}}').strip():
    raise RuntimeError('A hall gateway already exists; review it before updating.')
before = json.loads(run('docker','inspect','workadventure-play-1'))[0]
env = dict(item.split('=',1) for item in before['Config']['Env'] if '=' in item)
private = base/'private'
verifier = json.loads((private/'code.json').read_text())
release_id = '20261107-' + digest(archive)[:12]
release = base/'releases'/release_id
release.mkdir(parents=True, exist_ok=False)
with zipfile.ZipFile(archive) as bundle:
    for item in bundle.infolist():
        target = (release/item.filename).resolve()
        if not target.is_relative_to(release.resolve()) or item.filename.startswith(('/', '\\')):
            raise RuntimeError('Unsafe release archive path')
    bundle.extractall(release)
for p in [base, base/'releases', release]:
    p.chmod(0o755)
for p in release.rglob('*'):
    p.chmod(0o755 if p.is_dir() else 0o644)
network = json.loads(run('docker','network','inspect','workadventure_default'))[0]
gateways = [item['Gateway'] for item in network['IPAM']['Config'] if item.get('Gateway')]
settings = {key:env[key] for key in ['SECRET_KEY','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','LIVEKIT_HOST','LIVEKIT_URL']}
settings.update({
    'PORT':'3210', 'HALL_AUDIO_HOST':'0.0.0.0',
    'HALL_AUDIO_ORIGIN':'https://together.deine-schule.com',
    'HALL_AUDIO_MAP_ID':'https://together.deine-schule.com/_/global/wvh-web.github.io/workadventure_outside01/castle/grosse-halle.tmj',
    'HALL_AUDIO_MAP_URL':'https://wvh-web.github.io/workadventure_outside01/castle/grosse-halle.tmj',
    'HALL_AUDIO_MAP_NAME':'Die Grosse Halle',
    'HALL_AUDIO_PODIUM_BOUNDS':json.dumps({'x':624,'y':272,'width':288,'height':88},separators=(',',':')),
    'HALL_AUDIO_CODE_SALT':verifier['salt'], 'HALL_AUDIO_CODE_HASH':verifier['hash'],
    'HALL_AUDIO_TRUSTED_PROXY_IPS':','.join(gateways), 'NODE_PATH':'/usr/src/node_modules',
})
if any('\n' in str(v) or '\r' in str(v) for v in settings.values()):
    raise RuntimeError('Invalid environment material')
env_file = private/'runtime.env'
env_file.write_text(''.join(key+'='+value+'\n' for key,value in settings.items()))
env_file.chmod(0o600)
backup = private/'vhost-before-hall.conf'
shutil.copy2(nginx,backup)
backup.chmod(0o600)
location = '''
# Isolated school-castle announcement gateway. Existing map routes stay unchanged.
location ^~ /castle-audio/ {
    proxy_pass http://127.0.0.1:3210;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_connect_timeout 5s;
    proxy_read_timeout 15s;
}
'''
created = False
try:
    run('docker','run','-d','--name',container,'--restart','unless-stopped',
        '--network','workadventure_default','-p','127.0.0.1:3210:3210',
        '--env-file',str(env_file),'--mount','type=bind,src='+str(release)+',dst=/srv/hall-audio,readonly',
        '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m',
        '--cap-drop','ALL','--security-opt','no-new-privileges:true',
        '--memory','384m','--cpus','1','--log-opt','max-size=5m','--log-opt','max-file=2',
        '--entrypoint','node',before['Config']['Image'],'/srv/hall-audio/server.cjs')
    created = True
    healthy = False
    for _ in range(25):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3210/castle-audio/health',timeout=2) as response:
                healthy = response.status == 200 and json.load(response).get('ready') is True
            if healthy:
                break
        except Exception:
            pass
        time.sleep(1)
    if not healthy:
        raise RuntimeError('Isolated hall gateway did not become ready')
    mode = nginx.stat().st_mode & 0o777
    nginx.write_bytes(backup.read_bytes()+location.encode())
    nginx.chmod(mode)
    run('nginx','-t')
    run('systemctl','reload','nginx')
    after = json.loads(run('docker','inspect','workadventure-play-1'))[0]
    if before['Id'] != after['Id'] or before['State']['StartedAt'] != after['State']['StartedAt']:
        raise RuntimeError('WorkAdventure runtime changed during deployment')
    report = {'release':release_id,'archive_sha256':digest(archive),
              'nginx_before_sha256':expected_nginx,'nginx_after_sha256':digest(nginx),
              'gateway_ready':True,'workadventure_not_restarted':True,
              'loopback_only':True,'secret_material_public':False}
    (private/'deployment.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
except Exception:
    shutil.copyfile(backup,nginx)
    try:
        run('nginx','-t');run('systemctl','reload','nginx')
    except Exception:
        pass
    if created:
        subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    raise RuntimeError('Hall gateway deployment failed; original routing restored') from None
