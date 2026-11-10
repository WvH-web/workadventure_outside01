"""Update only the isolated hall gateway, retaining its previous container for rollback."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
import zipfile

os.umask(0o077)
base=Path('/opt/wvh-hall-audio')
archive=Path('/tmp/wvh-hall-audio-release.zip')
release=base/'releases'/('20261107-'+hashlib.sha256(archive.read_bytes()).hexdigest()[:12])
name='wvh-hall-audio'
previous=name+'-previous'
def run(*args):
    return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
if run('docker','ps','-a','--filter','name=^/'+previous+'$','--format','{{.Names}}').strip():
    raise RuntimeError('A rollback container already exists; review before another update')
before=json.loads(run('docker','inspect','workadventure-play-1'))[0]
old=json.loads(run('docker','inspect',name))[0]
release.mkdir(parents=True,exist_ok=False)
allowed={'auth.cjs','config.cjs','controller.cjs','errors.cjs','media.cjs','server.cjs',
         'package.json','package-lock.json','README.md','public/index.html','public/widget.css',
         'public/widget.js','public/vendor/livekit-client.umd.js','public/vendor/livekit-client.LICENSE',
         'public/vendor/lucide.min.js','public/vendor/lucide.LICENSE'}
with zipfile.ZipFile(archive) as bundle:
    if set(bundle.namelist())!=allowed:
        raise RuntimeError('Release archive differs from the explicit file allowlist')
    bundle.extractall(release)
release.chmod(0o755)
for p in release.rglob('*'):
    p.chmod(0o755 if p.is_dir() else 0o644)
run('docker','stop','-t','12',name)
run('docker','rename',name,previous)
created=False
try:
    run('docker','run','-d','--name',name,'--restart','unless-stopped',
        '--network','workadventure_default','-p','127.0.0.1:3210:3210',
        '--env-file',str(base/'private/runtime.env'),'--mount','type=bind,src='+str(release)+',dst=/srv/hall-audio,readonly',
        '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m','--cap-drop','ALL',
        '--security-opt','no-new-privileges:true','--memory','384m','--cpus','1',
        '--log-opt','max-size=5m','--log-opt','max-file=2',
        '--health-cmd',"node -e \"fetch('http://127.0.0.1:3210/castle-audio/health',{signal:AbortSignal.timeout(1500)}).then(async r=>process.exit(r.ok&&(await r.json()).ready===true?0:1)).catch(()=>process.exit(1))\"",
        '--health-interval','10s','--health-timeout','3s','--health-start-period','10s','--health-retries','3',
        '--entrypoint','node',old['Config']['Image'],'/srv/hall-audio/server.cjs')
    created=True
    healthy=False
    for _ in range(25):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3210/castle-audio/health',timeout=2) as response:
                healthy=response.status==200 and json.load(response).get('ready') is True
            if healthy:
                break
        except Exception:
            pass
        time.sleep(1)
    if not healthy:
        raise RuntimeError('Updated gateway did not become ready')
    after=json.loads(run('docker','inspect','workadventure-play-1'))[0]
    assert before['Id']==after['Id'] and before['State']['StartedAt']==after['State']['StartedAt']
    print(json.dumps({'ready':True,'release':release.name,'workadventure_unchanged':True,
                      'routing_unchanged':True,'rollback_container_retained':True}))
except Exception:
    if created:
        subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    run('docker','rename',previous,name)
    run('docker','start',name)
    raise RuntimeError('Gateway update failed; previous hall service restored') from None
