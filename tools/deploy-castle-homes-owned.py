"""Switch only the isolated room pilot to its verified, independent game tree."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import sqlite3
import subprocess
import time
import zipfile

EXPECTED='4846d94ddfe65cc2ea289a1d8273b2d05e9d4a9e169ba7f7c84892b9e86b5731'
OWNED_SHA='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d'
ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
SOURCE=ROOT/'game-releases'/OWNED_SHA[:16]
OLD=Path('/opt/wvh-sterne-kollegium/releases/20261109T191624Z')
UNIT=Path('/etc/systemd/system/wvh-castle-homes.service')
SERVICE='wvh-castle-homes.service'
CONFIG=PRIVATE/'service.json'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
RECEIPT=PRIVATE/'owned-runtime-deployment.json'


def main():
    os.umask(0o077)
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')
    assert helper_path.resolve()==helper_path
    raw=helper_path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_homes_owned_tools'}
    exec(compile(raw,str(helper_path),'exec'),helper)
    run,sha,atomic,running,request=(helper[name] for name in ['run','sha','atomic','running','request'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    colleague=run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    previous_raw=(PRIVATE/'progressive-deployment.json').read_bytes()
    previous=json.loads(previous_raw)
    assert previous['passed'] and previous['before']==previous['after']==before
    previous_release=Path(previous['release'])
    assert previous_release==ROOT/'releases'/previous['archiveSha256'][:16] and previous_release.resolve()==previous_release
    assert all(sha((previous_release/name).read_bytes())==digest for name,digest in previous['files'].items())
    staged_raw=(PRIVATE/'owned-runtime-stage.json').read_bytes()
    staged=json.loads(staged_raw)
    assert staged['passed'] and not staged['installed'] and staged['runtimeRoot']==str(SOURCE) and staged['manifestSha256']==OWNED_SHA
    assert staged['canary']['originalRuntimeInaccessible'] and staged['canary']['twoSyntheticParticipants']
    assert staged['sourceUnmodified'] and staged['independentFileInodes'] and not staged['credentialsAndDataCopied']
    recovery=Path(staged['archive'])
    assert recovery==PRIVATE/'runtime-backups'/(OWNED_SHA[:16]+'.tar.gz') and recovery.resolve()==recovery
    assert recovery.stat().st_mode&0o777==0o600 and recovery.stat().st_size==staged['archiveBytes'] and sha(recovery.read_bytes())==staged['archiveSha256']
    original_unit=UNIT.read_bytes()
    original_config=CONFIG.read_bytes()
    assert sha(original_unit)==previous['unitAfterSha256'] and UNIT.stat().st_uid==0 and UNIT.stat().st_mode&0o777==0o644
    assert CONFIG.resolve()==CONFIG and CONFIG.stat().st_uid==0 and CONFIG.stat().st_mode&0o777==0o600
    old_config=json.loads(original_config)
    assert old_config['version']==2 and old_config['source']==str(OLD)
    moderation=json.loads((PRIVATE/'moderation-deployment.json').read_text())
    protected={name:digest for name,digest in {**moderation['changedFiles'],**moderation['contextFiles']}.items() if name not in [str(UNIT),str(CONFIG)]}
    assert sha(original_config)==moderation['changedFiles'][str(CONFIG)]
    assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items())
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600)
    accounts=json.loads(INPUT.read_text())
    assert set(accounts)=={'version','accounts'} and accounts['version']==1 and [row['key'] for row in accounts['accounts']]==['A','B']
    archive_path=Path('/tmp/wvh-castle-homes-owned.zip')
    assert archive_path.resolve()==archive_path and sha(archive_path.read_bytes())==EXPECTED and archive_path.stat().st_size<35*1024*1024
    additions={'ops/castle-homes/runtime.cjs','ops/castle-homes/game.manifest.json','tests/castle-home-runtime.test.cjs','tools/check-castle-homes-owned.cjs'}
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==62 and set(archive.namelist())==set(previous['files'])|additions
        assert sum(row.file_size for row in archive.infolist())<35*1024*1024
        payload={name:archive.read(name) for name in archive.namelist()}
    changes={'ops/castle-homes/service.cjs','tests/castle-home-service.test.cjs','tools/check-castle-homes-public.cjs'}
    assert all(sha(payload[name])==digest for name,digest in previous['files'].items() if name not in changes)
    manifest_raw=payload['ops/castle-homes/game.manifest.json']
    assert sha(manifest_raw)==OWNED_SHA and (SOURCE/'.castle-homes-runtime.json').read_bytes()==manifest_raw
    manifest=json.loads(manifest_raw)
    files={**manifest['sourceFiles'],**manifest['dependencyFiles'],'.castle-homes-runtime.json':OWNED_SHA}
    assert len(files)==4869 and SOURCE.resolve()==SOURCE
    assert {path.relative_to(SOURCE).as_posix() for path in SOURCE.rglob('*') if path.is_file()}==set(files)
    for name,digest in files.items():
        path=SOURCE/name
        assert path.resolve()==path and path.stat().st_uid==0 and not path.stat().st_mode&0o022 and sha(path.read_bytes())==digest
    release=ROOT/'releases'/EXPECTED[:16]
    assert release.resolve()==release and release!=previous_release
    release.mkdir(mode=0o755,exist_ok=True)
    release.chmod(0o755)
    for name,content in payload.items():
        target=release/name
        assert target.resolve()==target and target.is_relative_to(release)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():
            assert target.read_bytes()==content
        else:
            atomic(target,content,0o644)
    for path in release.rglob('*'):
        assert not path.is_symlink()
        if path.is_dir():
            path.chmod(0o755)
    node='/opt/plesk/node/24/bin/node'
    common=['systemd-run','--quiet','--wait','--pipe','--collect','--property=DynamicUser=yes','--property=PrivateTmp=yes',
        '--property=InaccessiblePaths=/opt/wvh-sterne-kollegium','--property=ProtectSystem=strict','--property=ProtectHome=yes',
        '--property=NoNewPrivileges=yes','--property=MemoryMax=512M','--property=CPUQuota=100%',
        '--setenv=NODE_PATH='+str(SOURCE/'dorfplatz/node_modules')]
    def probe(suffix,arguments,seconds):
        result=subprocess.run([*common,'--unit=wvh-homes-owned-'+suffix+'-'+EXPECTED[:12],'--property=RuntimeMaxSec='+str(seconds)+'s',*arguments],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=seconds+15)
        log=PRIVATE/('owned-runtime-'+suffix+'.private.log')
        atomic(log,(result.stdout+'\n'+result.stderr).encode())
        assert result.returncode==0, 'Owned runtime '+suffix+' failed; private diagnostic retained'
        return result,sha(log.read_bytes())
    tests,test_sha=probe('tests',[node,'--test',*(str(release/'tests'/name) for name in [
        'castle-home-service.test.cjs','castle-home-runtime.test.cjs','castle-home-gateway.test.cjs','castle-home-media.test.cjs','castle-home-progressive.test.cjs'])],60)
    canary_result,canary_sha=probe('engine',['--property=RuntimeDirectory=wvh-homes-owned-engine-'+EXPECTED[:12],
        '--property=RuntimeDirectoryMode=0700',node,str(release/'tools/check-castle-homes-owned.cjs'),str(release)],60)
    canary=json.loads(canary_result.stdout.strip().splitlines()[-1])
    assert canary['passed'] and canary['originalRuntimeInaccessible'] and canary['onlyDisposableRuntimeDatabase']
    # Validate the same complete inventory under the unprivileged service restrictions.
    validate="const fs=require('fs'),p=require('path'),r=require(process.argv[1]+'/ops/castle-homes/runtime.cjs');const m=r.reviewedRuntime(fs.readFileSync(process.argv[1]+'/ops/castle-homes/game.manifest.json'),fs.readFileSync(process.argv[1]+'/castle-homes-runtime.manifest.json'));r.validateRuntimeFiles(r.SOURCE,m.files).then(()=>console.log('Exact owned runtime verified')).catch(()=>process.exitCode=1);"
    _,inventory_sha=probe('inventory',[node,'-e',validate,str(release)],60)
    backup=PRIVATE/('before-owned-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(3))
    assert backup.resolve()==backup
    backup.mkdir(mode=0o700)
    atomic(backup/'service.snapshot',original_unit)
    atomic(backup/'config.snapshot',original_config)
    database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
    assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite')
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup/'pilot.sqlite') as writer:
        reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    assert original_unit.count(str(previous_release/'ops/castle-homes/service.cjs').encode())==1
    assert original_unit.count(str(OLD/'dorfplatz/node_modules').encode())==1 and b'InaccessiblePaths=' not in original_unit
    unit=original_unit.replace(str(previous_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    unit=unit.replace(str(OLD/'dorfplatz/node_modules').encode(),str(SOURCE/'dorfplatz/node_modules').encode())
    assert unit.count(b'[Service]\n')==1
    unit=unit.replace(b'[Service]\n',b'[Service]\nInaccessiblePaths=/opt/wvh-sterne-kollegium\n')
    config=(json.dumps({**old_config,'version':3,'source':str(SOURCE)},sort_keys=True,separators=(',',':'))+'\n').encode()
    changed=False
    committed=False
    try:
        assert UNIT.read_bytes()==original_unit and CONFIG.read_bytes()==original_config
        changed=True
        atomic(CONFIG,config)
        atomic(UNIT,unit,0o644)
        run('systemctl','daemon-reload')
        run('systemctl','restart',SERVICE)
        healthy=False
        for _ in range(60):
            try:
                status,body,_=request('https://together.deine-schule.com/castle-homes/health',{'Cache-Control':'no-cache'})
                if status==200 and json.loads(body)=={'ready':True}:
                    healthy=True
                    break
            except Exception:
                pass
            time.sleep(.4)
        assert healthy, 'Owned pilot did not become ready'
        qa,qa_sha=probe('public',['--property=LoadCredential=accounts.json:'+str(INPUT),node,str(release/'tools/check-castle-homes-public.cjs')],125)
        acceptance=json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks'])==7
        pid=int(run('systemctl','show',SERVICE,'--property=MainPID','--value').strip())
        hidden=subprocess.run(['nsenter','--target',str(pid),'--mount','--','runuser','-u','nobody','--','ls','/opt/wvh-sterne-kollegium'],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=10)
        assert hidden.returncode!=0 and 'Permission denied' in hidden.stderr
        assert ops['baseline']()==before and running()==docker_before
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')==colleague
        assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items())
        assert UNIT.read_bytes()==unit and CONFIG.read_bytes()==config and run('systemctl','is-active',SERVICE).strip()=='active'
        assert json.loads(config)=={**old_config,'version':3,'source':str(SOURCE)}
        record=dict(passed=True,archiveSha256=EXPECTED,release=str(release),progressiveReceiptSha256=sha(previous_raw),
            stageReceiptSha256=sha(staged_raw),runtimeRoot=str(SOURCE),runtimeManifestSha256=OWNED_SHA,runtimeFileCount=len(files),before=before,after=before,
            files={name:sha(content) for name,content in payload.items()},unitBeforeFile=str(backup/'service.snapshot'),unitBeforeSha256=sha(original_unit),unitAfterSha256=sha(unit),
            configBeforeFile=str(backup/'config.snapshot'),configBeforeSha256=sha(original_config),configAfterSha256=sha(config),
            recoveryDatabaseFile=str(backup/'pilot.sqlite'),recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),
            linuxTestLogSha256=test_sha,canaryLogSha256=canary_sha,inventoryLogSha256=inventory_sha,publicLogSha256=qa_sha,
            canary=canary,acceptance=acceptance,liveServiceOriginalRuntimeInaccessible=True,
            sourceAndExistingServicesUnchanged=True,privateKeysSubjectsAndModerationUnchanged=True,onlyRoomPilotRestarted=True,
            broadSchoolRoomAccess=False,voiceEnabled=False,checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        committed=True
        print(json.dumps({key:record[key] for key in ['passed','archiveSha256','runtimeFileCount','liveServiceOriginalRuntimeInaccessible',
            'sourceAndExistingServicesUnchanged','privateKeysSubjectsAndModerationUnchanged','onlyRoomPilotRestarted','checkedAt']}))
    finally:
        if changed and not committed:
            assert UNIT.read_bytes() in [unit,original_unit] and CONFIG.read_bytes() in [config,original_config], 'Concurrent live change; do not overwrite'
            atomic(CONFIG,original_config)
            atomic(UNIT,original_unit,0o644)
            run('systemctl','daemon-reload')
            run('systemctl','restart',SERVICE)


if __name__=='__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
