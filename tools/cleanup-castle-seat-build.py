"""Remove only verified, unmounted outputs from this completed client build."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT=Path('/root/togetherWorkadventure/upgrades')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def main():
    os.umask(0o077)
    private=Path('/opt/wvh-castle-seat-ui-retry/private')
    assert json.loads((private/'acceptance.json').read_text())['passed']
    assert not (private/'build-cleanup.json').exists()
    ids=run('docker','ps','-aq').split();containers=json.loads(run('docker','inspect',*ids))
    assert not any(item['Name'].startswith('/wvh-castle-seat-compiler-') for item in containers)
    assert not any(item['Name'].startswith('/wvh-castle-seat-20261111') for item in containers)
    mounts=[Path(mount['Source']).resolve() for item in containers for mount in item['Mounts']]
    removed=[];total=0
    for name in ['20261111-seat-ui','20261111-seat-ui-r2']:
        root=ROOT/name;target=root/'dist';prepared=json.loads((root/'prepared.json').read_text())
        assert root.resolve()==root and root.stat().st_uid==0 and root.stat().st_mode&0o777==0o700
        assert prepared['base_image_id']=='sha256:ed2d18546b8f8dc5a2503edb98dddcb8e38efbac50c45b60b2124f9ad8f5f60b'
        assert json.loads((root/'build-result.json').read_text())['passed']
        assert json.loads((root/'browser-stage/stopped.json').read_text())['passed']
        assert target.resolve()==target and target.is_dir() and not target.is_symlink()
        assert all(not path.is_symlink() for path in target.rglob('*'))
        assert not any(mount==target or mount.is_relative_to(target) or target.is_relative_to(mount) for mount in mounts)
        assert (target/'index.html').is_file()
        total+=sum(path.stat().st_size for path in target.rglob('*') if path.is_file())
        shutil.rmtree(target);removed.append(str(target))
    tag='wvh-workadventure-play:1.34.5-school-v5-seat-ui'
    image=json.loads(run('docker','image','inspect',tag))[0]
    assert image['Id']=='sha256:84cb24095531be90ba505883346ee29ec5419569afc99bd9ad6543b1147c2cf5'
    assert image['Config']['Labels']['wvh.seat-ui.source']=='ad43865b7b73dd82521bf6f4d1c287e0701a5a7ef9bc537ebdb100dd1d2746dd'
    assert image['RepoTags']==[tag] and all(item['Image']!=image['Id'] for item in containers)
    run('docker','image','rm',tag)
    temporary=[Path('/tmp/wvh-seat-ui-stage.private.json'),Path('/tmp/wvh-seat-ui-stage-r2.private.json'),
        *[ROOT/name/'browser-stage/handoff.private.json' for name in ['20261111-seat-ui','20261111-seat-ui-r2']]]
    for path in temporary:
        assert path.resolve()==path and path.is_file() and not path.is_symlink()
        value=json.loads(path.read_text());assert value['stageOnly'] and value['origin']=='http://localhost:13301' and value['identity'].endswith('@invalid.local')
        path.unlink()
    result={'passed':True,'removedOnlyOwnUnmountedBuildOutput':removed,'buildOutputBytesRemoved':total,'unusedRejectedCandidateImageRemoved':True,
        'currentAndRollbackImagesRetained':True,'noGlobalPrune':True,'stageIdentitiesRemoved':len(temporary),'evidenceAndSourcesRetained':True,
        'freeDiskGiB':round(shutil.disk_usage(ROOT).free/1024**3,1),'at':int(time.time())}
    with (private/'build-cleanup.json').open('x') as handle:json.dump(result,handle,indent=2)
    (private/'build-cleanup.json').chmod(0o600);print(json.dumps(result))
if __name__=='__main__':main()
