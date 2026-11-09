"""Resource-bounded compiler with an exclusive, disposable builder; never deploys."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import uuid

SOURCE=Path('/root/togetherWorkadventure/upgrades/20261107/source')
STAGE=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
IMAGE='wvh-workadventure-checks:1.34.5-onboarding-v1'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
class OwnedBuilder:
    """Only the process that created this unique builder may dispose of it."""
    def __init__(self,runner=run):
        self.runner=runner;self.name='wvh-castle-onboarding-'+uuid.uuid4().hex;self.created=False

    def create(self):
        if self.created:raise RuntimeError('Builder already created by this run')
        self.runner('docker','buildx','create','--name',self.name,'--driver','docker-container',
          '--driver-opt','memory=4g,memory-swap=6g,cpu-period=100000,cpu-quota=200000')
        self.created=True

    def cleanup(self,process_done=False):
        if not self.created:return {'removed':False,'reason':'not-owned-by-this-run'}
        if not process_done:return {'removed':False,'reason':'own-build-still-running'}
        if not re.fullmatch(r'wvh-castle-onboarding-[a-f0-9]{32}',self.name):raise RuntimeError('Refusing a non-exclusive builder name')
        clients=self.runner('ps','-eo','args').splitlines()
        if any(self.name in line and ('buildx build' in line or 'docker-buildx build' in line) for line in clients):
            return {'removed':False,'reason':'another-build-client-uses-this-builder'}
        # No prune, no wildcard, no --force and no --keep-state: only our private instance.
        self.runner('docker','buildx','rm',self.name)
        self.created=False
        return {'removed':True,'reason':'completed-exclusive-run','cacheRetained':False}

def main():
    os.umask(0o077)
    record=json.loads((STAGE/'prepared.json').read_text())
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in record['files'].items())
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in json.loads((STAGE/'preserved.json').read_text()).items())
    assert shutil.disk_usage(SOURCE).free>30*1024**3
    processes=run('ps','-eo','args').splitlines()
    assert not any('buildx build' in line or 'docker-buildx build' in line for line in processes),'Another compiler is running'
    before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-castle-chess','wvh-castle-art','wvh-castle-school']}
    builder=OwnedBuilder();process=None
    try:
        builder.create()
        args=['docker','buildx','build','--builder',builder.name,'--load','--progress','plain','--target','builder',
          '--build-arg','NODE_OPTIONS=--max-old-space-size=3072','--label','wvh.onboarding.source='+record['archive_sha256'],
          '-t',IMAGE,'-f','play/Dockerfile','.']
        print(json.dumps({'stage':'isolated-compiler','builder':builder.name,'freeDiskGiB':round(shutil.disk_usage(SOURCE).free/1024**3,1),
          'maxMemoryGiB':4,'maxCpus':2,'liveServicesChanged':False}),flush=True)
        with (STAGE/'build.log').open('w') as log:
            process=subprocess.Popen(args,cwd=SOURCE,stdout=log,stderr=subprocess.STDOUT)
            (STAGE/'build-process.json').write_text(json.dumps({'pid':process.pid,'image':IMAGE,'builder':builder.name,'builder_owned_by_run':True,'started':time.time()}))
            while process.poll() is None:
                if shutil.disk_usage(SOURCE).free<15*1024**3:raise RuntimeError('Compiler stopped to preserve the disk reserve; live services untouched')
                time.sleep(10)
            code=process.returncode
        print('\n'.join((STAGE/'build.log').read_text().splitlines()[-22:]),flush=True)
        assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in before.items())
        proof={'passed':code==0,'image':IMAGE,'archive_sha256':record['archive_sha256'],'live_services_changed':False,
          'builder':builder.name,'free_disk_gib':round(shutil.disk_usage(SOURCE).free/1024**3,1)}
        if code==0:proof['image_id']=json.loads(run('docker','image','inspect',IMAGE))[0]['Id']
        (STAGE/'build-result.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof),flush=True)
        assert code==0,'Isolated compiler failed; live services untouched'
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:process.wait(timeout=30)
            except subprocess.TimeoutExpired:process.kill();process.wait()
        try:cleanup=builder.cleanup(process_done=process is None or process.poll() is not None)
        except Exception as error:cleanup={'removed':False,'reason':'cleanup-error','errorType':type(error).__name__}
        result={'builder':builder.name,**cleanup}
        (STAGE/'builder-cleanup.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
        if builder.created:raise RuntimeError('Exclusive builder cleanup deferred; no foreign or busy builder was removed')

if __name__=='__main__':main()
