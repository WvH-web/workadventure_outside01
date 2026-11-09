"""Resource-bounded isolated compiler build; no live deployment, pruning or service restart."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

os.umask(0o077)
SOURCE=Path('/root/togetherWorkadventure/upgrades/20261107/source')
STAGE=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
IMAGE='wvh-workadventure-checks:1.34.5-onboarding-v1';BUILDER='wvh-castle-onboarding'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
record=json.loads((STAGE/'prepared.json').read_text())
assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in record['files'].items())
assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in json.loads((STAGE/'preserved.json').read_text()).items())
assert shutil.disk_usage(SOURCE).free>30*1024**3
processes=run('ps','-eo','args').splitlines()
assert not any('docker buildx build' in line for line in processes),'Another compiler is running'
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-castle-chess','wvh-castle-art','wvh-castle-school']}
exists=subprocess.run(['docker','buildx','inspect',BUILDER],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
if not exists:run('docker','buildx','create','--name',BUILDER,'--driver','docker-container','--driver-opt','memory=4g,memory-swap=6g,cpu-period=100000,cpu-quota=200000')
args=['docker','buildx','build','--builder',BUILDER,'--load','--progress','plain','--target','builder',
 '--build-arg','NODE_OPTIONS=--max-old-space-size=3072','--label','wvh.onboarding.source='+record['archive_sha256'],
 '-t',IMAGE,'-f','play/Dockerfile','.']
print(json.dumps({'stage':'isolated-compiler','freeDiskGiB':round(shutil.disk_usage(SOURCE).free/1024**3,1),'maxMemoryGiB':4,'maxCpus':2,'liveServicesChanged':False}),flush=True)
with (STAGE/'build.log').open('w') as log:
    process=subprocess.Popen(args,cwd=SOURCE,stdout=log,stderr=subprocess.STDOUT)
    (STAGE/'build-process.json').write_text(json.dumps({'pid':process.pid,'image':IMAGE,'started':time.time()}))
    while process.poll() is None:
        if shutil.disk_usage(SOURCE).free<15*1024**3:
            process.terminate()
            try:process.wait(timeout=30)
            except subprocess.TimeoutExpired:process.kill();process.wait()
            raise RuntimeError('Compiler stopped to preserve the disk reserve; live services untouched')
        time.sleep(10)
    code=process.returncode
print('\n'.join((STAGE/'build.log').read_text().splitlines()[-22:]),flush=True)
assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in before.items())
proof={'passed':code==0,'image':IMAGE,'archive_sha256':record['archive_sha256'],'live_services_changed':False,
 'free_disk_gib':round(shutil.disk_usage(SOURCE).free/1024**3,1)}
if code==0:proof['image_id']=json.loads(run('docker','image','inspect',IMAGE))[0]['Id']
(STAGE/'build-result.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof),flush=True)
assert code==0,'Isolated compiler failed; live services untouched'
