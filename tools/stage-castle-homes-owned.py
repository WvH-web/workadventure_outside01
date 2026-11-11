"""Materialize a separate, pinned game tree and prove it with the old tree hidden."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import shutil
import subprocess
import tarfile
import time

ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
SOURCE=Path('/opt/wvh-sterne-kollegium/releases/20261109T191624Z')
EXPECTED='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d'
PROBE=Path('/tmp/wvh-check-castle-homes-owned.cjs')
PROBE_SHA='ae5204027ce1c072e5a3f275ec68064801f98ab5e0edf7d9bb028b7f37f1d314'


def main():
    os.umask(0o077)
    os.nice(10)
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')
    assert helper_path.resolve()==helper_path
    raw=helper_path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_home_copy_tools'}
    exec(compile(raw,str(helper_path),'exec'),helper)
    run,sha,atomic,running=(helper[name] for name in ['run','sha','atomic','running'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    services={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in ['wvh-castle-homes.service','wvh-sterne-kollegium.service']}
    assert ROOT.resolve()==ROOT and PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    receipt=PRIVATE/'owned-runtime-stage.json'
    assert not receipt.exists()
    manifest_raw=(PRIVATE/'owned-runtime-manifest.canonical.json').read_bytes()
    assert sha(manifest_raw)==EXPECTED
    manifest=json.loads(manifest_raw)
    assert manifest['originalSource']==str(SOURCE) and len(manifest['sourceFiles'])==162 and len(manifest['dependencyFiles'])==4706
    assert manifest['originalSourceManifestSha256']=='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6'
    files={**manifest['sourceFiles'],**manifest['dependencyFiles']}
    assert len(files)==4868 and manifest['dependencyBytes']==80401400
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==PROBE_SHA
    probe_root=ROOT/'preflight-owned'/PROBE_SHA[:16]
    assert probe_root.resolve()==probe_root
    probe_root.mkdir(mode=0o755,parents=True,exist_ok=True)
    probe_root.chmod(0o755)
    probe_root.parent.chmod(0o755)
    scoped_probe=probe_root/'check.cjs'
    atomic(scoped_probe,PROBE.read_bytes(),0o644)
    source_bytes=sum((SOURCE/name).stat().st_size for name in files)
    assert shutil.disk_usage(ROOT).free>source_bytes*4+512*1024*1024
    destination=ROOT/'game-releases'/EXPECTED[:16]
    assert destination.resolve()==destination
    destination.mkdir(mode=0o755,parents=True,exist_ok=True)
    destination.chmod(0o755)
    destination.parent.chmod(0o755)
    for name,digest in files.items():
        source=SOURCE/name
        assert source.resolve()==source and source.is_file() and sha(source.read_bytes())==digest
        assert source.stat().st_uid==0 and not source.stat().st_mode&0o022
        target=destination/name
        assert target.resolve()==target and target.is_relative_to(destination)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():
            assert sha(target.read_bytes())==digest
        else:
            atomic(target,source.read_bytes(),0o644)
        assert (target.stat().st_dev,target.stat().st_ino)!=(source.stat().st_dev,source.stat().st_ino)
    atomic(destination/'.castle-homes-runtime.json',manifest_raw,0o644)
    for current in destination.rglob('*'):
        assert not current.is_symlink()
        if current.is_dir():
            current.chmod(0o755)
    assert {path.relative_to(destination).as_posix() for path in destination.rglob('*') if path.is_file()}==set(files)|{'.castle-homes-runtime.json'}
    published=json.loads((PRIVATE/'progressive-deployment.json').read_text())
    release=Path(published['release'])
    assert release==ROOT/'releases'/published['archiveSha256'][:16] and published['passed']
    probe_unit='wvh-homes-owned-'+EXPECTED[:12]
    result=subprocess.run(['systemd-run','--quiet','--wait','--pipe','--collect','--unit='+probe_unit,
        '--property=DynamicUser=yes','--property=RuntimeDirectory='+probe_unit,'--property=RuntimeDirectoryMode=0700',
        '--property=InaccessiblePaths=/opt/wvh-sterne-kollegium','--property=PrivateTmp=yes',
        '--property=ProtectSystem=strict','--property=ProtectHome=yes','--property=NoNewPrivileges=yes',
        '--property=MemoryMax=512M','--property=CPUQuota=100%','--property=RuntimeMaxSec=60s',
        '--setenv=NODE_PATH='+str(destination/'dorfplatz/node_modules'),
        '/opt/plesk/node/24/bin/node',str(scoped_probe),str(release)],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
    atomic(PRIVATE/'owned-runtime-canary.private.log',(result.stdout+'\n'+result.stderr).encode())
    assert result.returncode==0, 'Owned runtime canary failed; private diagnostic retained'
    canary=json.loads(result.stdout.strip().splitlines()[-1])
    assert canary['passed'] and canary['originalRuntimeInaccessible'] and canary['onlyDisposableRuntimeDatabase']
    backups=PRIVATE/'runtime-backups'
    assert backups.resolve()==backups
    backups.mkdir(mode=0o700,exist_ok=True)
    archive=backups/(EXPECTED[:16]+'.tar.gz')
    assert archive.resolve()==archive and not archive.exists()
    with tarfile.open(archive,'w:gz',format=tarfile.PAX_FORMAT,compresslevel=3) as writer:
        for name in sorted(set(files)|{'.castle-homes-runtime.json'}):
            path=destination/name
            info=writer.gettarinfo(str(path),arcname=name)
            assert info.isfile()
            info.uid=info.gid=0
            info.uname=info.gname='root'
            info.mode=0o644
            with path.open('rb') as stream:
                writer.addfile(info,stream)
    archive.chmod(0o600)
    with tarfile.open(archive,'r:gz') as reader:
        assert set(reader.getnames())==set(files)|{'.castle-homes-runtime.json'}
        for name,digest in files.items():
            assert sha(reader.extractfile(name).read())==digest
    assert ops['baseline']()==before and running()==docker_before
    assert all(run('systemctl','show',name,'--property=MainPID,ActiveState,SubState')==value for name,value in services.items())
    assert all(sha((SOURCE/name).read_bytes())==digest for name,digest in files.items())
    record={'passed':True,'installed':False,'runtimeRoot':str(destination),'manifestSha256':EXPECTED,
        'files':len(files),'sourceBytes':source_bytes,'sourceFiles':162,'baseSourceFiles':107,'dependencyFiles':4706,'packages':len(manifest['packages']),
        'canary':canary,'canaryLogSha256':sha((PRIVATE/'owned-runtime-canary.private.log').read_bytes()),
        'archive':str(archive),'archiveBytes':archive.stat().st_size,'archiveSha256':sha(archive.read_bytes()),
        'sourceUnmodified':True,'independentFileInodes':True,'colleagueAndLiveHomesServicesUnchanged':True,
        'credentialsAndDataCopied':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    ops['atomic'](receipt,record)
    print(json.dumps(record))


if __name__=='__main__':
    main()
