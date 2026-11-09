"""Prepare and unit-test the first-entry tutorial patch, without changing live services."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

os.umask(0o077)
SOURCE=Path('/root/togetherWorkadventure/upgrades/20261107/source')
STAGE=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
EXPECTED_ARCHIVE='6e7d34bdd55cd8afd58b3dfe304f6af21467a2cbf6c2f7dc93a1881b6db008ec'
BASELINES={'play/src/front/Stores/OnboardingStore.ts':'55f5da1ecd4594a22530b44395e38972ad615ceabdd3b0bd1a2d5c5e5e3d952c',
 'play/src/front/Components/Onboarding/Onboarding.svelte':'0d488980e5a2ca819d57d84c06f03a242450bc38d92e07b762813429872ea535'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
assert run('git','-C',str(SOURCE),'rev-parse','HEAD').strip()=='38c808924267157fb3bd3f7a943de35f026e4773'
assert shutil.disk_usage(SOURCE).free>20*1024**3
archive=Path('/tmp/wvh-castle-onboarding.zip');assert sha(archive.read_bytes())==EXPECTED_ARCHIVE
with zipfile.ZipFile(archive) as bundle:
    assert set(bundle.namelist())=={'onboarding.patch','OnboardingVisit.ts','WvhOnboarding.test.ts'} and len(bundle.infolist())==3
    assert sum(info.file_size for info in bundle.infolist())<50000
    payload={name:bundle.read(name) for name in bundle.namelist()}
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board']}
if not STAGE.exists():
    assert all(sha((SOURCE/file).read_bytes())==digest for file,digest in BASELINES.items())
    assert not (SOURCE/'play/src/front/Stores/OnboardingVisit.ts').exists() and not (SOURCE/'play/tests/WvhOnboarding.test.ts').exists()
    changed=run('git','-C',str(SOURCE),'diff','HEAD','--name-only').splitlines()
    preserved={name:sha((SOURCE/name).read_bytes()) for name in changed}
    STAGE.mkdir(mode=0o700);(STAGE/'originals').mkdir(mode=0o700)
    for name,raw in payload.items():(STAGE/name).write_bytes(raw)
    for file in BASELINES:
        target=STAGE/'originals'/file;target.parent.mkdir(mode=0o700,parents=True,exist_ok=True);target.write_bytes((SOURCE/file).read_bytes())
    (STAGE/'preserved.json').write_text(json.dumps(preserved,indent=2))
    run('git','-C',str(SOURCE),'apply','--check','--recount',str(STAGE/'onboarding.patch'))
    run('git','-C',str(SOURCE),'apply','--recount',str(STAGE/'onboarding.patch'))
    (SOURCE/'play/src/front/Stores/OnboardingVisit.ts').write_bytes(payload['OnboardingVisit.ts'])
    (SOURCE/'play/tests/WvhOnboarding.test.ts').write_bytes(payload['WvhOnboarding.test.ts'])
else:
    assert STAGE.resolve()==STAGE and all((STAGE/name).read_bytes()==raw for name,raw in payload.items())
    run('git','-C',str(SOURCE),'apply','--check','--reverse','--recount',str(STAGE/'onboarding.patch'))
    assert (SOURCE/'play/src/front/Stores/OnboardingVisit.ts').read_bytes()==payload['OnboardingVisit.ts']
    assert (SOURCE/'play/tests/WvhOnboarding.test.ts').read_bytes()==payload['WvhOnboarding.test.ts']
preserved=json.loads((STAGE/'preserved.json').read_text());assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in preserved.items())
assert not any(path.is_symlink() for path in STAGE.rglob('*'))
mounts={**{file:SOURCE/file for file in BASELINES},'play/src/front/Stores/OnboardingVisit.ts':SOURCE/'play/src/front/Stores/OnboardingVisit.ts',
 'play/tests/WvhOnboarding.test.ts':SOURCE/'play/tests/WvhOnboarding.test.ts','play/tests/WvhUpgrade.test.ts':SOURCE/'play/tests/WvhUpgrade.test.ts'}
for path in mounts.values():path.chmod(0o644)
args=['docker','run','--rm','--network','none','--memory','3g','--cpus','2','-w','/usr/src/play','-e','PLAY_URL=http://localhost:13300','-e','ADMIN_URL=']
for name,path in mounts.items():args+=['--mount','type=bind,src='+str(path)+',dst=/usr/src/'+name+',readonly']
args+=['wvh-workadventure-checks:1.34.5-onboarding-v1','npx','vitest','run','tests/WvhOnboarding.test.ts','tests/WvhUpgrade.test.ts','--no-file-parallelism']
with (STAGE/'unit-checks.log').open('w') as log:
    result=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,timeout=240)
print((STAGE/'unit-checks.log').read_text()[-5500:])
assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in before.items())
record={'passed':result.returncode==0,'archive_sha256':EXPECTED_ARCHIVE,'source_head':'38c808924267157fb3bd3f7a943de35f026e4773',
 'files':{name:sha(path.read_bytes()) for name,path in mounts.items()},'unrelated_source_preserved':True,'live_services_changed':False}
(STAGE/'prepared.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
assert result.returncode==0,'Tutorial checks failed; running services have not been changed'
