"""Build a frontend-only candidate and start an isolated loopback browser stage."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import pwd
import secrets
import shutil
import ssl
import subprocess
import time
import urllib.request
import uuid

os.umask(0o077)
ROOT=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
OLD=Path('/root/togetherWorkadventure/upgrades/20261107')
STAGE=ROOT/'browser-stage';PROJECT='wvh-castle-client-20261109'
IMAGE='wvh-workadventure-play:1.34.5-school-v4-onboarding'
BASE='sha256:9ba04071c3153970743b39301192ee0ec6f3bd09e3b85f3b4c64f5a4d3e635f3'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def image(name):return json.loads(run('docker','image','inspect',name))[0]

prepared=json.loads((ROOT/'prepared.json').read_text());built=json.loads((ROOT/'build-result.json').read_text())
assert prepared['passed'] and built['passed'] and prepared['archive_sha256']==built['archive_sha256']
assert image(built['image'])['Id']==built['image_id'] and image('wvh-workadventure-play:1.34.5-school-v3')['Id']==BASE
assert shutil.disk_usage(ROOT).free>20*1024**3
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio','wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board']}
assert before['workadventure-play-1']['Image']==BASE
dockerfile=Path('/tmp/wvh-onboarding-runtime.Dockerfile').read_bytes().replace(b'\r\n',b'\n')
assert sha(dockerfile)=='d46734af9abc1197be12156e78c59a09f1f517c7bcbc8f68ccd07079e42f483f'
context=ROOT/'runtime-build';context.mkdir(mode=0o700,exist_ok=True)
assert set(path.name for path in context.iterdir())<= {'Dockerfile'}
(context/'Dockerfile').write_bytes(dockerfile)
present=subprocess.run(['docker','image','inspect',IMAGE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
if not present:
    with (ROOT/'runtime-build.log').open('w') as output:
        result=subprocess.run(['docker','build','--network','none','--pull=false','--label','wvh.onboarding.source='+prepared['archive_sha256'],
          '-t',IMAGE,str(context)],stdout=output,stderr=subprocess.STDOUT,timeout=300)
    assert result.returncode==0,'Runtime assembly failed; live services unchanged'
candidate=image(IMAGE)
assert candidate['Config']['Labels']['wvh.onboarding.source']==prepared['archive_sha256']
assert candidate['Config']['User']==image('wvh-workadventure-play:1.34.5-school-v3')['Config']['User']
assert candidate['Config']['Cmd']==image('wvh-workadventure-play:1.34.5-school-v3')['Config']['Cmd']
if not STAGE.exists():
    assert not run('ss','-ltnH','sport = :13300').strip()
    assert not run('docker','ps','-a','--filter','label=com.docker.compose.project='+PROJECT,'--format','{{.Names}}').strip()
    STAGE.mkdir(mode=0o700)
    config=json.loads((OLD/'stage.compose.json').read_text());services=config['services']
    assert set(services)=={'play','back','map-storage','uploader','redis','gateway'}
    secret=secrets.token_hex(32);(STAGE/'stage-secret').write_text(secret)
    for name,service in services.items():
        assert not service.get('ports') or name=='gateway'
        for key in list(service.get('environment',{})):
            if key=='SECRET_KEY':service['environment'][key]=secret
        service['restart']='no'
    services['play']['image']=IMAGE
    services['play']['volumes']=[m['Source']+':'+m['Destination']+':ro' for m in before['workadventure-play-1']['Mounts']]
    assert len(services['play']['volumes'])==5 and all('/src/pusher/' in m['Destination'] for m in before['workadventure-play-1']['Mounts'])
    maps=STAGE/'maps';maps.mkdir(mode=0o755);os.chown(maps,1000,1000)
    target=maps/'castle-preview';target.mkdir(mode=0o755);os.chown(target,1000,1000)
    source=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
    manifest=json.loads(Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json').read_text())['files']
    assert len(manifest)==16 and set(p.name for p in source.iterdir())==set(manifest)
    for name,digest in manifest.items():
        raw=(source/name).read_bytes();assert sha(raw)==digest
        (target/name).write_bytes(raw);(target/name).chmod(0o644);os.chown(target/name,1000,1000)
    services['map-storage']['volumes']=[str(maps)+':/maps']
    (STAGE/'gateway.conf').write_bytes((OLD/'stage-nginx.conf').read_bytes())
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',str(STAGE/'stage.key'),
      '-out',str(STAGE/'stage.crt'),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],check=True,capture_output=True)
    services['gateway']['ports']=['127.0.0.1:13300:80']
    services['gateway']['volumes']=[str(STAGE/'gateway.conf')+':/etc/nginx/nginx.conf:ro',str(STAGE/'stage.crt')+':/etc/nginx/stage.crt:ro',str(STAGE/'stage.key')+':/etc/nginx/stage.key:ro']
    (STAGE/'compose.private.json').write_text(json.dumps(config,indent=2)+'\n')
else:
    assert STAGE.resolve()==STAGE and not STAGE.is_symlink()
    config=json.loads((STAGE/'compose.private.json').read_text())
    assert config['services']['play']['image']==IMAGE and config['services']['gateway']['ports']==['127.0.0.1:13300:80']
args=['docker','compose','-p',PROJECT,'-f',str(STAGE/'compose.private.json')]
with (STAGE/'start.log').open('w') as log:subprocess.run(args+['up','-d','--pull','never'],check=True,stdout=log,stderr=subprocess.STDOUT)
for _ in range(50):
    try:
        with urllib.request.urlopen('https://127.0.0.1:13300/ping',context=ssl._create_unverified_context(),timeout=3) as response:
            if response.status==200:break
    except Exception:pass
    time.sleep(1)
else:raise RuntimeError('Isolated browser stage not ready; production unchanged')
secret=(STAGE/'stage-secret').read_text().encode()
def encode(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
def token():
    identity='onboarding-'+uuid.uuid4().hex+'@invalid.local'
    value=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':identity,'username':'Tutorialprobe','tags':['student'],'exp':int(time.time())+7200})
    return (value+b'.'+base64.urlsafe_b64encode(hmac.new(secret,value,hashlib.sha256).digest()).rstrip(b'=')).decode()
handoff=Path('/tmp/wvh-onboarding-browser.private.json');handoff.write_text(json.dumps({'stageOnly':True,'tokens':{key:token() for key in ['A','B','C']}}))
account=pwd.getpwnam('wilhelm');os.chown(handoff,account.pw_uid,account.pw_gid);handoff.chmod(0o600)
assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in before.items())
proof={'ready':True,'project':PROJECT,'image':IMAGE,'image_id':candidate['Id'],'loopback_only':True,'own_secret_redis_and_maps':True,
 'live_services_unchanged':True,'source_archive':prepared['archive_sha256'],'compose_sha256':sha((STAGE/'compose.private.json').read_bytes())}
(STAGE/'ready.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
