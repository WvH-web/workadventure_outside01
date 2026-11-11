"""Create or remove an isolated loopback-only native client UI rehearsal."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import urllib.request
import uuid

ROOT=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui-r2')
STAGE=ROOT/'browser-stage';PROJECT='wvh-castle-seat-20261111-r2';ORIGIN='http://localhost:13301'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def containers():
    return {value['Name']:{'id':value['Id'],'started':value['State']['StartedAt'],'image':value['Image']}
            for value in json.loads(run('docker','inspect',*run('docker','ps','-q').split()))}
def write(path,value):
    assert not path.exists();path.write_text(json.dumps(value,indent=2)+'\n');path.chmod(0o600)
def main(action):
    os.umask(0o077);assert action in ['start','stop']
    before=json.loads((ROOT/'prepared.json').read_text())['running']
    command=['docker','compose','-p',PROJECT,'-f',str(STAGE/'compose.private.json')]
    if action=='stop':
        assert STAGE.resolve()==STAGE and not STAGE.is_symlink()
        ready=json.loads((STAGE/'ready.json').read_text());assert sha((STAGE/'compose.private.json').read_bytes())==ready['composeSha256']
        with (STAGE/'stop.log').open('x') as log:subprocess.run(command+['down','--remove-orphans'],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=120)
        assert containers()==before
        write(STAGE/'stopped.json',{'passed':True,'productionServicesUnchanged':True,'onlyOwnStageRemoved':True})
        print(json.dumps({'stopped':True,'productionServicesUnchanged':True}));return
    built=json.loads((ROOT/'build-result.json').read_text());assert built['passed'] and containers()==before
    assert (not STAGE.exists() or STAGE.resolve()==STAGE and STAGE.is_dir() and not list(STAGE.iterdir()))
    assert not run('ss','-ltnH','sport = :13301').strip()
    assert not run('docker','ps','-a','--filter','label=com.docker.compose.project='+PROJECT,'--format','{{.Names}}').strip()
    assert json.loads(run('docker','image','inspect',built['image']))[0]['Id']==built['image_id']
    STAGE.mkdir(mode=0o700,exist_ok=True)
    template=Path('/root/togetherWorkadventure/upgrades/20261107/stage.compose.json')
    config=json.loads(template.read_text());services=config['services'];assert set(services)=={'play','back','map-storage','uploader','redis','gateway'}
    secret=secrets.token_hex(32)
    for name,service in services.items():
        assert not service.get('ports') or name=='gateway';service['restart']='no'
        for key,value in service.get('environment',{}).items():
            if key=='SECRET_KEY':service['environment'][key]=secret
            elif isinstance(value,str):service['environment'][key]=value.replace('https://localhost:13300',ORIGIN)
    services['play']['image']=built['image']
    live=json.loads(run('docker','inspect','workadventure-play-1'))[0]
    expected_mounts={'/usr/src/play/src/pusher/'+name for name in ['data/woka.json','services/LocalAdmin.ts','services/WvhRoleLookup.ts',
        'enums/EnvironmentVariable.ts','enums/EnvironmentVariableValidator.ts','controllers/AuthenticateController.ts']}
    assert {item['Destination'] for item in live['Mounts']}==expected_mounts and all(not item['RW'] for item in live['Mounts'])
    services['play']['volumes']=[item['Source']+':'+item['Destination']+':ro' for item in live['Mounts']]
    maps=STAGE/'maps';maps.mkdir(mode=0o755);os.chown(maps,1000,1000)
    target=maps/'castle-preview';target.mkdir(mode=0o755);os.chown(target,1000,1000)
    source=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
    manifest=json.loads(Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json').read_text())['files']
    assert len(manifest)==16 and set(p.name for p in source.iterdir())==set(manifest)
    for name,digest in manifest.items():
        raw=(source/name).read_bytes();assert sha(raw)==digest
        path=target/name;path.write_bytes(raw);path.chmod(0o644);os.chown(path,1000,1000)
    services['map-storage']['volumes']=[str(maps)+':/maps']
    gateway=Path('/root/togetherWorkadventure/upgrades/20261107/stage-nginx.conf').read_text()
    assert 'listen 80 ssl;' in gateway
    gateway=gateway.replace('listen 80 ssl;','listen 80;')
    gateway='\n'.join(line for line in gateway.splitlines() if 'ssl_certificate' not in line)+'\n'
    (STAGE/'gateway.conf').write_text(gateway)
    services['gateway']['ports']=['127.0.0.1:13301:80']
    services['gateway']['volumes']=[str(STAGE/'gateway.conf')+':/etc/nginx/nginx.conf:ro']
    write(STAGE/'compose.private.json',config)
    with (STAGE/'start.log').open('x') as log:subprocess.run(command+['up','-d','--pull','never'],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=180)
    for _ in range(60):
        try:
            with urllib.request.urlopen('http://127.0.0.1:13301/ping',timeout=3) as response:
                if response.status==200:break
        except Exception:pass
        time.sleep(1)
    else:raise RuntimeError('Native rehearsal did not start; production unchanged')
    def encode(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
    identity='seat-ui-'+uuid.uuid4().hex+'@invalid.local'
    unsigned=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':identity,'username':'Sitzprobe','tags':['student'],'exp':int(time.time())+7200})
    token=(unsigned+b'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),unsigned,hashlib.sha256).digest()).rstrip(b'=')).decode()
    write(STAGE/'handoff.private.json',{'stageOnly':True,'origin':ORIGIN,'identity':identity,'token':token,'imageId':built['image_id']})
    actual=containers();assert all(actual.get(name)==value for name,value in before.items())
    proof={'passed':True,'loopbackOnly':True,'syntheticDataOnly':True,'productionServicesUnchanged':True,'imageId':built['image_id'],
           'composeSha256':sha((STAGE/'compose.private.json').read_bytes()),'certificateChecksBypassed':False,'isolatedRedisAndMaps':True}
    write(STAGE/'ready.json',proof);print(json.dumps(proof))

if __name__=='__main__':main('start')
