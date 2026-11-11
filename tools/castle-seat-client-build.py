"""Bounded, frontend-only seat UI preparation and compiler; no live restart."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import zipfile

SOURCE=Path('/root/togetherWorkadventure/upgrades/20261107/source')
ROOT=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui-r2')
PREVIOUS=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui')
CHECKS='wvh-workadventure-checks:1.34.5-onboarding-v1'
BASE='sha256:ed2d18546b8f8dc5a2503edb98dddcb8e38efbac50c45b60b2124f9ad8f5f60b'
BASE_TAG='wvh-workadventure-play:1.34.5-school-v4-onboarding'
IMAGE='wvh-workadventure-play:1.34.5-school-v5-seat-ui-r2'
DEST={'CastleSeatAction.ts':'play/src/front/Components/PopUp/CastleSeatAction.ts',
      'PopUpTriggerActionMessage.svelte':'play/src/front/Components/PopUp/PopUpTriggerActionMessage.svelte',
      'WvhSeatAction.test.ts':'play/tests/WvhSeatAction.test.ts'}
ORIGINAL='''<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import PopUpContainer from "./PopUpContainer.svelte";

    interface Props {
        message: string;
        onclick: () => void;
        userInputManager: UserInputManager;
    }

    let { message, onclick, userInputManager }: Props = $props();

    onMount(() => {
        userInputManager.addSpaceEventListener(onclick);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(onclick);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true} {onclick}>
    {message}
</PopUpContainer>
'''
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def containers():
    return {value['Name']:{'id':value['Id'],'started':value['State']['StartedAt'],'image':value['Image']}
            for value in json.loads(run('docker','inspect',*run('docker','ps','-q').split()))}
def write(path,value):
    assert not path.exists();path.write_text(json.dumps(value,indent=2)+'\n');path.chmod(0o600)
def unchanged(record):
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in record['preserved'].items())
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in record['files'].items())
    assert containers()==record['running'],'A live service changed during the isolated preparation'
def mounted():
    args=[]
    for name in DEST.values():args+=['--mount',f'type=bind,src={SOURCE/name},dst=/usr/src/{name},readonly']
    return args
def prepare(expected):
    os.umask(0o077);assert not ROOT.exists() and shutil.disk_usage(SOURCE).free>20*1024**3
    assert run('git','-C',str(SOURCE),'rev-parse','HEAD').strip()=='38c808924267157fb3bd3f7a943de35f026e4773'
    assert inspect('workadventure-play-1')['Image']==BASE
    archive=Path('/tmp/wvh-castle-seat-ui.zip');assert sha(archive.read_bytes())==expected
    with zipfile.ZipFile(archive) as bundle:
        assert len(bundle.infolist())==3 and set(bundle.namelist())==set(DEST)
        assert sum(info.file_size for info in bundle.infolist())<50000
        payload={name:bundle.read(name).replace(b'\r\n',b'\n') for name in DEST}
    previous=json.loads((PREVIOUS/'prepared.json').read_text())
    assert previous['archive_sha256']=='ad43865b7b73dd82521bf6f4d1c287e0701a5a7ef9bc537ebdb100dd1d2746dd'
    assert json.loads((PREVIOUS/'browser-stage/stopped.json').read_text())['passed']
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in previous['files'].items())
    target=SOURCE/DEST['PopUpTriggerActionMessage.svelte'];assert (PREVIOUS/'original-component.svelte').read_text()==ORIGINAL
    paths=set(run('git','-C',str(SOURCE),'diff','HEAD','--name-only').splitlines())
    paths.update(run('git','-C',str(SOURCE),'ls-files','--others','--exclude-standard').splitlines())
    preserved={name:sha((SOURCE/name).read_bytes()) for name in paths if name not in DEST.values()}
    before=containers();ROOT.mkdir(mode=0o700)
    (ROOT/'original-component.svelte').write_bytes((PREVIOUS/'original-component.svelte').read_bytes())
    (ROOT/'previous-candidate-component.svelte').write_bytes(target.read_bytes())
    # Verify the cached compiler contains every previous customization before reusing it.
    names=sorted(name for name in preserved if name.startswith(('play/','libs/')))
    command='import fs from "node:fs";import crypto from "node:crypto";const names='+json.dumps(names)+';console.log(JSON.stringify(Object.fromEntries(names.map(n=>[n,crypto.createHash("sha256").update(fs.readFileSync("/usr/src/"+n)).digest("hex")]))));'
    actual=json.loads(run('docker','run','--rm','--network','none',CHECKS,'node','--input-type=module','-e',command))
    assert actual=={name:preserved[name] for name in names},'Cached compiler does not contain all previous client customizations'
    for name,raw in payload.items():(SOURCE/DEST[name]).write_bytes(raw);(SOURCE/DEST[name]).chmod(0o644)
    record={'archive_sha256':expected,'files':{dest:sha((SOURCE/dest).read_bytes()) for dest in DEST.values()},
            'preserved':preserved,'running':before,'base_image_id':BASE,'compiler_image_id':json.loads(run('docker','image','inspect',CHECKS))[0]['Id']}
    write(ROOT/'prepared.json',record);unchanged(record)
    print(json.dumps({'prepared':True,'sourceFiles':3,'previousCustomizationsPreserved':len(preserved),'liveServicesChanged':False}),flush=True)
def unit():
    record=json.loads((ROOT/'prepared.json').read_text());unchanged(record)
    args=['docker','run','--rm','--network','none','--memory','3g','--cpus','2','-w','/usr/src/play',
          '-e','PLAY_URL=http://localhost:13301','-e','ADMIN_URL=']+mounted()+[CHECKS,'npx','vitest','run',
          'tests/WvhSeatAction.test.ts','tests/WvhOnboarding.test.ts','tests/WvhUpgrade.test.ts','--no-file-parallelism']
    with (ROOT/'unit.log').open('w') as log:result=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,timeout=240)
    print((ROOT/'unit.log').read_text()[-6500:]);unchanged(record)
    write(ROOT/'unit-result.json',{'passed':result.returncode==0,'archive_sha256':record['archive_sha256']})
    assert result.returncode==0,'Native component/unit checks failed; live services unchanged'
def build():
    record=json.loads((ROOT/'prepared.json').read_text());unchanged(record)
    assert json.loads((ROOT/'unit-result.json').read_text())['passed'] and not (ROOT/'build-result.json').exists()
    assert shutil.disk_usage(ROOT).free>20*1024**3
    output=ROOT/'dist';assert output.resolve()==output and not output.is_symlink();output.mkdir(mode=0o755,exist_ok=True)
    attempt=str(time.time_ns());log_path=ROOT/('build-'+attempt+'.log')
    args=['docker','run','--rm','--name','wvh-castle-seat-compiler-20261111-r2','--network','none','--memory','4g','--cpus','2',
          '-e','NODE_OPTIONS=--max-old-space-size=3072','-w','/usr/src/play',
          '--mount',f'type=bind,src={output},dst=/usr/src/play/dist/public']+mounted()+[CHECKS,'npm','run','build']
    print(json.dumps({'compiling':True,'network':'none','maxCpus':2,'memoryGiB':4,'noBuildCacheCreated':True}),flush=True)
    with log_path.open('x') as log:
        process=subprocess.Popen(args,stdout=log,stderr=subprocess.STDOUT)
        write(ROOT/('build-process-'+attempt+'.json'),{'pid':process.pid,'container':'wvh-castle-seat-compiler-20261111-r2','started':time.time()})
        try:
            while process.poll() is None:
                if shutil.disk_usage(ROOT).free<12*1024**3:raise RuntimeError('Disk reserve reached')
                time.sleep(5)
        finally:
            if process.poll() is None:
                subprocess.run(['docker','stop','-t','20','wvh-castle-seat-compiler-20261111-r2'],check=True,capture_output=True);process.wait(timeout=40)
    print('\n'.join(log_path.read_text().splitlines()[-20:]),flush=True)
    unchanged(record);assert process.returncode==0,'Frontend compiler failed; live services unchanged'
    assert (output/'index.html').is_file() and len(list((output/'assets').glob('*.js')))>10
    assert json.loads(run('docker','image','inspect',BASE_TAG))[0]['Id']==BASE
    (ROOT/'Dockerfile').write_text('FROM '+BASE_TAG+'\nUSER root\nCOPY --chown=node:node dist /usr/src/play/dist/public\nUSER node\n')
    (ROOT/'.dockerignore').write_text('*\n!Dockerfile\n!dist\n!dist/**\n')
    with (ROOT/('runtime-build-'+attempt+'.log')).open('x') as log:
        result=subprocess.run(['docker','build','--network','none','--pull=false','--label','wvh.seat-ui.source='+record['archive_sha256'],
                               '-t',IMAGE,str(ROOT)],stdout=log,stderr=subprocess.STDOUT,timeout=300)
    assert result.returncode==0;candidate=json.loads(run('docker','image','inspect',IMAGE))[0]
    base=json.loads(run('docker','image','inspect',BASE))[0]
    assert candidate['RootFS']['Layers'][:len(base['RootFS']['Layers'])]==base['RootFS']['Layers']
    for key in ['Env','Cmd','Entrypoint','WorkingDir','User','ExposedPorts']:assert candidate['Config'].get(key)==base['Config'].get(key)
    unchanged(record)
    proof={'passed':True,'image':IMAGE,'image_id':candidate['Id'],'base_image_id':BASE,'archive_sha256':record['archive_sha256'],
           'onlyFrontendAssetsReplaced':True,'previousHashedChunksRetained':True,'liveServicesChanged':False,'freeDiskGiB':round(shutil.disk_usage(ROOT).free/1024**3,1)}
    write(ROOT/'build-result.json',proof);print(json.dumps(proof),flush=True)

if __name__=='__main__':
    import sys
    action=sys.argv[1];assert action in ['prepare','unit','build']
    prepare(sys.argv[2]) if action=='prepare' else globals()[action]()
