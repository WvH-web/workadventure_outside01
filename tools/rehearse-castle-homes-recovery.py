"""Restore generic runtime bytes in isolation; never replace live room data."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import shutil
import sqlite3
import subprocess
import tarfile
import time

ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
EXPECTED='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d'


def main():
    os.umask(0o077)
    os.nice(10)
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')
    raw=helper_path.read_bytes()
    assert helper_path.resolve()==helper_path and hashlib.sha256(raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_homes_recovery_tools'}
    exec(compile(raw,str(helper_path),'exec'),helper)
    run,sha,atomic,running=(helper[name] for name in ['run','sha','atomic','running'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    services={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in ['wvh-castle-homes.service','wvh-sterne-kollegium.service']}
    receipt=PRIVATE/'owned-runtime-recovery.json'
    assert not receipt.exists()
    deployment_raw=(PRIVATE/'owned-runtime-deployment.json').read_bytes()
    deployment=json.loads(deployment_raw)
    stage=json.loads((PRIVATE/'owned-runtime-stage.json').read_text())
    assert deployment['passed'] and stage['passed'] and deployment['runtimeManifestSha256']==stage['manifestSha256']==EXPECTED
    archive=Path(stage['archive'])
    assert archive==PRIVATE/'runtime-backups'/(EXPECTED[:16]+'.tar.gz') and archive.resolve()==archive
    assert archive.stat().st_mode&0o777==0o600 and sha(archive.read_bytes())==stage['archiveSha256']
    source=ROOT/'game-releases'/EXPECTED[:16]
    manifest_raw=(source/'.castle-homes-runtime.json').read_bytes()
    assert sha(manifest_raw)==EXPECTED
    manifest=json.loads(manifest_raw)
    files={**manifest['sourceFiles'],**manifest['dependencyFiles'],'.castle-homes-runtime.json':EXPECTED}
    assert len(files)==4869
    parent=ROOT/'recovery-checks'
    assert parent.resolve()==parent
    parent.mkdir(mode=0o755,exist_ok=True)
    parent.chmod(0o755)
    assert parent.stat().st_uid==0 and not parent.stat().st_mode&0o022
    restored=parent/(EXPECTED[:16]+'-'+secrets.token_hex(6))
    assert not restored.exists() and restored.resolve()==restored and restored.parent==parent
    restored.mkdir(mode=0o755)
    restored.chmod(0o755)
    scratch=PRIVATE/('recovery-sqlite-'+secrets.token_hex(6)+'.sqlite')
    assert not scratch.exists() and scratch.resolve()==scratch
    try:
        with tarfile.open(archive,'r:gz') as reader:
            members=reader.getmembers()
            assert len(members)==len(files) and {item.name for item in members}==set(files)
            for member in members:
                assert member.isfile() and member.name in files and not any(part in ['', '.', '..'] for part in member.name.split('/'))
                target=restored/member.name
                assert target.resolve()==target and target.is_relative_to(restored)
                content=reader.extractfile(member).read()
                assert sha(content)==files[member.name]
                target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
                atomic(target,content,0o644)
        for item in restored.rglob('*'):
            if item.is_dir():
                item.chmod(0o755)
        assert {item.relative_to(restored).as_posix() for item in restored.rglob('*') if item.is_file()}==set(files)
        assert not any(item.is_symlink() for item in restored.rglob('*'))
        release=Path(deployment['release'])
        assert release==ROOT/'releases'/deployment['archiveSha256'][:16] and release.resolve()==release
        unit='wvh-homes-owned-recovery-'+secrets.token_hex(6)
        common=['systemd-run','--quiet','--wait','--pipe','--collect','--property=DynamicUser=yes','--property=PrivateTmp=yes',
            '--property=InaccessiblePaths=/opt/wvh-sterne-kollegium','--property=ProtectSystem=strict','--property=ProtectHome=yes',
            '--property=NoNewPrivileges=yes','--property=MemoryMax=512M','--property=CPUQuota=100%',
            '--property=BindReadOnlyPaths='+str(restored)+':'+str(source),'--setenv=NODE_PATH='+str(source/'dorfplatz/node_modules')]
        validate="const fs=require('fs'),r=require(process.argv[1]+'/ops/castle-homes/runtime.cjs');const m=r.reviewedRuntime(fs.readFileSync(process.argv[1]+'/ops/castle-homes/game.manifest.json'),fs.readFileSync(process.argv[1]+'/castle-homes-runtime.manifest.json'));r.validateRuntimeFiles(r.SOURCE,m.files).then(()=>console.log('Restored inventory verified')).catch(()=>process.exitCode=1);"
        inventory=subprocess.run([*common,'--unit='+unit+'-inventory','--property=RuntimeMaxSec=60s','/opt/plesk/node/24/bin/node','-e',validate,str(release)],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
        atomic(PRIVATE/'owned-runtime-recovery-inventory.private.log',(inventory.stdout+'\n'+inventory.stderr).encode())
        assert inventory.returncode==0
        probe=subprocess.run([*common,'--unit='+unit,'--property=RuntimeDirectory='+unit,'--property=RuntimeDirectoryMode=0700',
            '--property=RuntimeMaxSec=60s','/opt/plesk/node/24/bin/node',str(release/'tools/check-castle-homes-owned.cjs'),str(release)],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
        atomic(PRIVATE/'owned-runtime-recovery-engine.private.log',(probe.stdout+'\n'+probe.stderr).encode())
        assert probe.returncode==0
        canary=json.loads(probe.stdout.strip().splitlines()[-1])
        assert canary['passed'] and canary['originalRuntimeInaccessible'] and canary['onlyDisposableRuntimeDatabase']
        # A private consistent snapshot is restored offline and compared, not applied to live users.
        database=Path(deployment['recoveryDatabaseFile'])
        assert database.resolve()==database and database.parent.parent==PRIVATE and database.parent.name.startswith('before-owned-')
        assert sha(database.read_bytes())==deployment['recoveryDatabaseSha256']
        with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(scratch) as writer:
            assert reader.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
            reader.backup(writer)
            assert writer.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
            assert sha('\n'.join(reader.iterdump()).encode())==sha('\n'.join(writer.iterdump()).encode())
        scratch.chmod(0o600)
        assert ops['baseline']()==before and running()==docker_before
        assert all(run('systemctl','show',name,'--property=MainPID,ActiveState,SubState')==value for name,value in services.items())
        # Export only the generic software archive, never any database or key.
        export_parent=Path('/home/wilhelm/.cache/wvh-school-qa')
        assert export_parent.resolve()==export_parent and export_parent.stat().st_mode&0o777==0o700
        export=export_parent/('castle-homes-runtime-'+EXPECTED[:16]+'.tar.gz')
        assert export.resolve()==export
        if export.exists():
            assert export.is_file() and sha(export.read_bytes())==stage['archiveSha256']
        else:
            atomic(export,archive.read_bytes())
        os.chown(export,export_parent.stat().st_uid,export_parent.stat().st_gid)
        export.chmod(0o600)
        record=dict(passed=True,deploymentReceiptSha256=sha(deployment_raw),runtimeManifestSha256=EXPECTED,
            runtimeArchiveSha256=stage['archiveSha256'],restoredRegularFiles=len(files),runtimeRestoredFromArchive=True,
            restoredTreeBoundReadOnly=True,originalRuntimeInaccessible=True,twoSyntheticParticipants=True,
            recoveredEngineCanary=canary,offlineSqliteIntegrityAndExactContents=True,liveDatabaseReplaced=False,
            productionAndColleagueProcessesUnchanged=True,softwareExportOnly=True,offServerCopyVerified=False,
            inventoryLogSha256=sha((PRIVATE/'owned-runtime-recovery-inventory.private.log').read_bytes()),
            engineLogSha256=sha((PRIVATE/'owned-runtime-recovery-engine.private.log').read_bytes()),
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](receipt,record)
        print(json.dumps(record))
    finally:
        if scratch.exists():
            assert scratch.resolve()==scratch and scratch.parent==PRIVATE and scratch.name.startswith('recovery-sqlite-') and scratch.is_file()
            scratch.unlink()
        if restored.exists():
            assert restored.resolve()==restored and restored.parent==parent and restored.name.startswith(EXPECTED[:16]+'-')
            assert not any(item.is_symlink() for item in restored.rglob('*'))
            assert {item.relative_to(restored).as_posix() for item in restored.rglob('*') if item.is_file()}<=set(files)
            shutil.rmtree(restored)


if __name__=='__main__':
    main()
