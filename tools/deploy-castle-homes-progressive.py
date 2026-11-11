"""Activate the verified on-demand room renderer in the isolated pupil pilot only."""
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

EXPECTED='c609afec40261d7c76a682c0e33bd5c6c4ffbc2035ebb761c506987aa9c12349'
ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
UNIT=Path('/etc/systemd/system/wvh-castle-homes.service')
SERVICE='wvh-castle-homes.service'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
RECEIPT=PRIVATE/'progressive-deployment.json'
HELPER=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')


def main():
    os.umask(0o077)
    assert HELPER.resolve()==HELPER
    helper_raw=HELPER.read_bytes()
    assert hashlib.sha256(helper_raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_home_media_tools'}
    exec(compile(helper_raw,str(HELPER),'exec'),helper)
    run,sha,atomic,running,request=(helper[name] for name in ['run','sha','atomic','running','request'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    colleague=run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    previous_raw=(PRIVATE/'media-deployment.json').read_bytes()
    previous=json.loads(previous_raw)
    assert previous['passed'] and previous['before']==previous['after']==before
    previous_release=Path(previous['release'])
    assert previous_release==ROOT/'releases'/previous['archiveSha256'][:16] and previous_release.resolve()==previous_release
    assert all(sha((previous_release/name).read_bytes())==digest for name,digest in previous['files'].items())
    original_unit=UNIT.read_bytes()
    assert sha(original_unit)==previous['unitAfterSha256'] and UNIT.stat().st_uid==0 and UNIT.stat().st_mode&0o777==0o644
    moderation=json.loads((PRIVATE/'moderation-deployment.json').read_text())
    protected={name:digest for name,digest in {**moderation['changedFiles'],**moderation['contextFiles']}.items() if name!=str(UNIT)}
    assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items())
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600)
    accounts=json.loads(INPUT.read_text())
    assert set(accounts)=={'version','accounts'} and accounts['version']==1 and [row['key'] for row in accounts['accounts']]==['A','B']
    archive_path=Path('/tmp/wvh-castle-homes-progressive.zip')
    assert sha(archive_path.read_bytes())==EXPECTED and archive_path.stat().st_size<35*1024*1024
    additions={'ops/castle-homes/progressive-adapter.cjs','ops/castle-homes/public/room-media.js',
        'tests/castle-home-progressive.test.cjs','ops/castle-homes/progressive-browser-proof.json'}
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==58 and set(archive.namelist())==set(previous['files'])|additions
        assert sum(row.file_size for row in archive.infolist())<35*1024*1024
        payload={name:archive.read(name) for name in archive.namelist()}
    changes={'ops/castle-homes/game-adapter.cjs','ops/castle-homes/gateway.cjs','ops/castle-homes/public/room.css',
        'tests/castle-home-gateway.test.cjs','tests/castle-home-media.test.cjs'}
    assert all(sha(payload[name])==digest for name,digest in previous['files'].items() if name not in changes)
    proof=json.loads(payload['ops/castle-homes/progressive-browser-proof.json'])
    assert proof['passed'] and proof['browserVersion'].startswith('157.') and not proof['errors']
    assert not proof['positiveNetworkInterception'] and proof['negativeImageFaultInjectionOnly']
    assert proof['syntheticDatabaseOnly'] and proof['syntheticPointsSeededOnlyInPrivateFixture']
    assert proof['realOpaqueAndTransparentHitTesting'] and proof['realCatalogAndPurchaseHandlers']
    assert proof['savedFloorAndFurnitureOnFreshDevice'] and proof['freshDeviceRequiredImages']==6
    assert proof['sharedVisitAndReceivedPhrase'] and proof['interruptedImageRetryAndSavedRoomRecovery']
    assert not proof['normalMicrosoftLoginTested'] and not proof['publicDeploymentTested'] and not proof['nativeWorkAdventureTested']
    assert [row['account'] for row in proof['checks']]==['a','b']
    assert all(row['initialImageCount']==4 and row['noUnusedAtlasOrFloor'] and row['allCatalogAtlasesRendered']==13 and row['floorPreviewAndExactCancellation'] for row in proof['checks'])
    runtime=json.loads(payload['castle-homes-runtime.manifest.json'])
    assert proof['sourcePins']=={'renderer':runtime['files']['planung/zimmer-editor/renderer.js'],'app':runtime['files']['planung/zimmer-editor/app.js']}
    source=Path(runtime['sourceRelease'])
    assert len(runtime['files'])==107 and all((source/name).resolve()==source/name and sha((source/name).read_bytes())==digest for name,digest in runtime['files'].items())
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
        if path.is_dir():
            path.chmod(0o755)
    node='/opt/plesk/node/24/bin/node'
    common=['systemd-run','--quiet','--wait','--pipe','--collect','--property=DynamicUser=yes','--property=PrivateTmp=yes',
        '--property=ProtectSystem=strict','--property=ProtectHome=yes','--property=NoNewPrivileges=yes',
        '--property=MemoryMax=256M','--property=CPUQuota=100%','--setenv=NODE_PATH='+str(source/'dorfplatz/node_modules')]
    tests=subprocess.run([*common,'--unit=wvh-homes-progressive-tests-'+EXPECTED[:12],'--property=RuntimeMaxSec=60s',node,'--test',
        *(str(release/'tests'/name) for name in ['castle-home-service.test.cjs','castle-home-gateway.test.cjs','castle-home-media.test.cjs','castle-home-progressive.test.cjs'])],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
    atomic(PRIVATE/'progressive-linux-tests.private.log',(tests.stdout+'\n'+tests.stderr).encode())
    assert tests.returncode==0, 'Progressive room Linux tests failed'
    backup=PRIVATE/('before-progressive-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(3))
    assert backup.resolve()==backup
    backup.mkdir(mode=0o700)
    atomic(backup/'service.snapshot',original_unit)
    database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
    assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite')
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup/'pilot.sqlite') as writer:
        reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    unit=original_unit.replace(str(previous_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert unit!=original_unit
    changed=False
    committed=False
    try:
        assert UNIT.read_bytes()==original_unit
        atomic(UNIT,unit,0o644)
        changed=True
        run('systemctl','daemon-reload')
        run('systemctl','restart',SERVICE)
        healthy=False
        for _ in range(40):
            try:
                status,body,_=request('https://together.deine-schule.com/castle-homes/health',{'Cache-Control':'no-cache'})
                if status==200 and json.loads(body)=={'ready':True}:
                    healthy=True
                    break
            except Exception:
                pass
            time.sleep(.4)
        assert healthy
        qa=subprocess.run([*common,'--unit=wvh-homes-progressive-public-'+EXPECTED[:12],'--property=RuntimeMaxSec=125s',
            '--property=LoadCredential=accounts.json:'+str(INPUT),node,str(release/'tools/check-castle-homes-public.cjs')],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=140)
        atomic(PRIVATE/'progressive-public-probe.private.log',(qa.stdout+'\n'+qa.stderr).encode())
        assert qa.returncode==0, 'Public pupil regression failed'
        acceptance=json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks'])==7
        assert ops['baseline']()==before and running()==docker_before
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')==colleague
        assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items())
        assert UNIT.read_bytes()==unit and run('systemctl','is-active',SERVICE).strip()=='active'
        record=dict(passed=True,archiveSha256=EXPECTED,release=str(release),mediaReceiptSha256=sha(previous_raw),before=before,after=before,
            files={name:sha(content) for name,content in payload.items()},unitBeforeFile=str(backup/'service.snapshot'),unitBeforeSha256=sha(original_unit),unitAfterSha256=sha(unit),
            recoveryDatabaseFile=str(backup/'pilot.sqlite'),recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),
            linuxTestLogSha256=sha((PRIVATE/'progressive-linux-tests.private.log').read_bytes()),
            browserProofSha256=sha(payload['ops/castle-homes/progressive-browser-proof.json']),acceptance=acceptance,
            privateAuthorityAndModerationUnchanged=True,originalRuntimeAndImagesUnchanged=True,existingServicesAndMapsUnchanged=True,
            onlyRoomPilotRestarted=True,broadSchoolRoomAccess=False,voiceEnabled=False,
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        committed=True
        print(json.dumps({key:record[key] for key in ['passed','archiveSha256','privateAuthorityAndModerationUnchanged',
            'originalRuntimeAndImagesUnchanged','existingServicesAndMapsUnchanged','onlyRoomPilotRestarted','checkedAt']}))
    finally:
        if changed and not committed:
            assert UNIT.read_bytes()==unit, 'Concurrent live change; do not overwrite'
            atomic(UNIT,original_unit,0o644)
            run('systemctl','daemon-reload')
            run('systemctl','restart',SERVICE)


if __name__=='__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
