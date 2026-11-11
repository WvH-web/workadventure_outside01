"""Publish only the already restricted room pilot; require real public media proof or roll back."""
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

EXPECTED='dde4ccfa915002833f9fb7d5beb5b4f78436ea22a74c0ad8441353a63e4faaa9'
ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
UNIT=Path('/etc/systemd/system/wvh-castle-homes.service')
CONTROL=Path('/etc/systemd/system/wvh-castle-homes-control.service')
SERVICE='wvh-castle-homes.service'
CONTROL_SERVICE='wvh-castle-homes-control.service'
CONFIG=PRIVATE/'service.json'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
LIVE_PROOF=INPUT.with_name('homes-calls-live-proof.private.json')
RECEIPT=PRIVATE/'calls-deployment.json'


def browser_proof(value,live):
    assert value['passed'] and value['browserVersion'].startswith('157.') and value['ordinaryMicrosoftStatesUsed'] and value['syntheticPupilAccountsOnly']
    assert value['realPublicSchoolContext'] and value['realPublicSfu'] and value['livePublicGateway']==live and value['loopbackGatewayThroughPinnedSsh']!=live
    assert value['backendIntrospectionAlsoThroughPinnedSsh']!=live and not value['networkInterception'] and value['browserFakeDevicesOnly'] and value['noHumanMicrophoneOrCameraUsed']
    assert value['separateOwnerRoomsIsolated'] and value['joinDoesNotCaptureDevices'] and value['microphoneAndCameraRequireSeparateClicks'] and value['roomChangeStopsCapture']
    assert len(value['decodedRemoteMicrophonesBoth'])==2 and all(row['rms']>.002 and row['remoteAudioTracks']==1 for row in value['decodedRemoteMicrophonesBoth'])
    assert len(value['decodedRemoteOptionalCamera'])==1 and all(row['width']>0 and row['height']>0 and row['decodedFrames']>0 for row in value['decodedRemoteOptionalCamera'])
    assert value['desktopAnd390And320Fit'] and value['receivedContactReportSubmitted'] and value['pupilModerationDenied'] and value['ownerClosureStopsCaptureAndRemotes']
    assert value['errors']==[] and value['unexpectedResourceFailures']==0 and not value['nativeWorkAdventureTested'] and not value['realAdministratorLoginTested']


def main():
    os.umask(0o077)
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')
    raw=helper_path.read_bytes()
    assert helper_path.resolve()==helper_path and hashlib.sha256(raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_homes_call_publish_tools'}
    exec(compile(raw,str(helper_path),'exec'),helper)
    run,sha,atomic,running,request=(helper[name] for name in ['run','sha','atomic','running','request'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    colleague=run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and not CONTROL.exists() and CONTROL.resolve()==CONTROL and not LIVE_PROOF.exists()
    assert not run('ss','-ltnH','sport = :13252').strip() and not run('ss','-ltnH','sport = :13251').strip()
    previous_raw=(PRIVATE/'owned-runtime-deployment.json').read_bytes()
    previous=json.loads(previous_raw)
    assert previous['passed'] and previous['before']==previous['after']==before
    previous_release=Path(previous['release'])
    assert previous_release==ROOT/'releases'/previous['archiveSha256'][:16] and previous_release.resolve()==previous_release
    assert all(sha((previous_release/name).read_bytes())==digest for name,digest in previous['files'].items())
    stage_raw=(PRIVATE/'calls-stage.json').read_bytes()
    staged=json.loads(stage_raw)
    accepted_raw=(PRIVATE/'calls-stage-acceptance.json').read_bytes()
    accepted=json.loads(accepted_raw)
    assert accepted['passed'] and accepted['stopped'] and accepted['stageReceiptSha256']==sha(stage_raw) and accepted['existingServicesAndMapsUnchanged']
    assert accepted['stageCredentialRemoved'] and not Path(staged['credentialFile']).exists()
    assert staged['before']==staged['after']==before and len(staged['files'])==68
    stage_release=Path(staged['release'])
    assert stage_release==ROOT/'releases'/staged['archiveSha256'][:16] and stage_release.resolve()==stage_release
    assert all(sha((stage_release/name).read_bytes())==digest for name,digest in staged['files'].items())
    stage_browser=(PRIVATE/'calls-stage-browser.private.json').read_bytes()
    assert sha(stage_browser)==accepted['browserProofSha256']
    browser_proof(json.loads(stage_browser),False)
    original_unit=UNIT.read_bytes()
    original_config=CONFIG.read_bytes()
    assert sha(original_unit)==previous['unitAfterSha256'] and sha(original_config)==previous['configAfterSha256']
    assert CONFIG.resolve()==CONFIG and CONFIG.stat().st_uid==0 and CONFIG.stat().st_mode&0o777==0o600
    archive_path=Path('/tmp/wvh-castle-homes-calls-live.zip')
    assert archive_path.resolve()==archive_path and sha(archive_path.read_bytes())==EXPECTED and archive_path.stat().st_size<35*1024*1024
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==69 and set(archive.namelist())==set(staged['files'])|{'ops/castle-homes/control.service'}
        assert sum(item.file_size for item in archive.infolist())<35*1024*1024
        payload={name:archive.read(name) for name in archive.namelist()}
    assert all(sha(payload[name])==digest for name,digest in staged['files'].items() if name!='tools/check-castle-homes-public.cjs')
    release=ROOT/'releases'/EXPECTED[:16]
    assert release.resolve()==release
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
    old=json.loads(original_config)
    source=Path(old['source'])
    assert old['version']==3 and source==ROOT/'game-releases'/'8a7b5a2e1bf03405'
    node='/opt/plesk/node/24/bin/node'
    common=['systemd-run','--quiet','--wait','--pipe','--collect','--property=DynamicUser=yes','--property=PrivateTmp=yes',
        '--property=InaccessiblePaths=/opt/wvh-sterne-kollegium','--property=ProtectSystem=strict','--property=ProtectHome=yes',
        '--property=NoNewPrivileges=yes','--property=MemoryMax=512M','--property=CPUQuota=100%',
        '--setenv=NODE_PATH='+str(source/'dorfplatz/node_modules')]
    tests=subprocess.run([*common,'--unit=wvh-homes-call-live-tests-'+EXPECTED[:12],'--property=RuntimeMaxSec=90s',node,'--test','--test-concurrency=1',
        *(str(release/'tests'/name) for name in ['castle-home-service.test.cjs','castle-home-runtime.test.cjs','castle-home-gateway.test.cjs','castle-home-media.test.cjs','castle-home-progressive.test.cjs','castle-home-calls.test.cjs'])],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=105)
    atomic(PRIVATE/'calls-live-linux-tests.private.log',(tests.stdout+'\n'+tests.stderr).encode())
    assert tests.returncode==0, 'Call publication Linux tests failed'
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600)
    accounts=json.loads(INPUT.read_text())
    assert accounts['version']==1 and [row['key'] for row in accounts['accounts']]==['A','B']
    code="const {loadConfig}=require('/srv/hall-audio/config.cjs');const c=loadConfig();console.log(JSON.stringify({url:c.livekit.browserUrl,apiKey:c.livekit.apiKey,apiSecret:c.livekit.apiSecret}));"
    media=json.loads(run('docker','exec','wvh-hall-audio','node','-e',code))
    assert media['url']=='wss://together.deine-schule.com'
    calls={**media,'apiURL':'http://127.0.0.1:13252','namespace':'sterne-video-castle-homes','roles':['student','teacher'],'fixedGroups':True}
    config=(json.dumps({**old,'version':4,'calls':calls},sort_keys=True,separators=(',',':'))+'\n').encode()
    template=payload['ops/castle-homes/control.service']
    assert template.count(b'@RELEASE@')==1
    control_unit=template.replace(b'@RELEASE@',str(release).encode())
    assert original_unit.count(str(previous_release/'ops/castle-homes/service.cjs').encode())==1 and original_unit.count(b'[Unit]\n')==1
    unit=original_unit.replace(str(previous_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    unit=unit.replace(b'[Unit]\n',b'[Unit]\nWants=wvh-castle-homes-control.service\nAfter=wvh-castle-homes-control.service\n')
    backup=PRIVATE/('before-calls-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(3))
    assert backup.resolve()==backup
    backup.mkdir(mode=0o700)
    atomic(backup/'service.snapshot',original_unit)
    atomic(backup/'config.snapshot',original_config)
    database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
    assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite')
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup/'pilot.sqlite') as writer:
        reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    changed=False
    created_control=False
    committed=False
    try:
        assert UNIT.read_bytes()==original_unit and CONFIG.read_bytes()==original_config and not CONTROL.exists()
        atomic(CONTROL,control_unit,0o644)
        created_control=True
        run('systemd-analyze','verify',str(CONTROL))
        run('systemctl','daemon-reload')
        run('systemctl','enable','--now',CONTROL_SERVICE)
        changed=True
        atomic(CONFIG,config)
        atomic(UNIT,unit,0o644)
        run('systemctl','daemon-reload')
        run('systemctl','restart',SERVICE)
        healthy=False
        for _ in range(60):
            try:
                status,body,headers=request('https://together.deine-schule.com/castle-homes/health',{'Cache-Control':'no-cache'})
                if status==200 and json.loads(body)=={'ready':True} and headers.get('Permissions-Policy')=='camera=(self), microphone=(self), display-capture=()':
                    healthy=True
                    break
            except Exception:
                pass
            time.sleep(.4)
        assert healthy, 'Call pilot failed readiness'
        qa=subprocess.run([*common,'--unit=wvh-homes-call-live-public-'+EXPECTED[:12],'--property=RuntimeMaxSec=125s',
            '--property=LoadCredential=accounts.json:'+str(INPUT),node,str(release/'tools/check-castle-homes-public.cjs'),'--calls'],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=140)
        atomic(PRIVATE/'calls-live-public.private.log',(qa.stdout+'\n'+qa.stderr).encode())
        assert qa.returncode==0, 'Call public API regression failed'
        acceptance=json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['voiceEnabled'] and not acceptance['actualVoiceMediaTested']
        print(json.dumps(dict(provisional=True,publicApiPassed=True,awaitingPublicBrowserMediaProof=True,onlyExistingRestartWasRoomPilot=True)),flush=True)
        deadline=time.monotonic()+300
        while not LIVE_PROOF.exists() and time.monotonic()<deadline:
            assert run('systemctl','is-active',SERVICE).strip()=='active' and run('systemctl','is-active',CONTROL_SERVICE).strip()=='active'
            time.sleep(1)
        assert LIVE_PROOF.exists(), 'Public call browser proof did not arrive; restoring old room pilot'
        assert LIVE_PROOF.resolve()==LIVE_PROOF
        LIVE_PROOF.chmod(0o600)
        live_raw=LIVE_PROOF.read_bytes()
        assert len(live_raw)<16000
        browser_proof(json.loads(live_raw),True)
        atomic(PRIVATE/'calls-public-browser.private.json',live_raw)
        assert ops['baseline']()==before and running()==docker_before
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')==colleague
        assert UNIT.read_bytes()==unit and CONFIG.read_bytes()==config and CONTROL.read_bytes()==control_unit
        record=dict(passed=True,archiveSha256=EXPECTED,release=str(release),files={name:sha(content) for name,content in payload.items()},
            ownedReceiptSha256=sha(previous_raw),stageReceiptSha256=sha(stage_raw),stageAcceptanceSha256=sha(accepted_raw),stageBrowserProofSha256=sha(stage_browser),
            before=before,after=before,unitBeforeFile=str(backup/'service.snapshot'),unitBeforeSha256=sha(original_unit),unitAfterSha256=sha(unit),
            configBeforeFile=str(backup/'config.snapshot'),configBeforeSha256=sha(original_config),configAfterSha256=sha(config),
            controlUnit=str(CONTROL),controlUnitSha256=sha(control_unit),controlUnitPreviouslyAbsent=True,
            recoveryDatabaseFile=str(backup/'pilot.sqlite'),recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),
            linuxTestLogSha256=sha((PRIVATE/'calls-live-linux-tests.private.log').read_bytes()),publicApiLogSha256=sha((PRIVATE/'calls-live-public.private.log').read_bytes()),
            publicBrowserProofSha256=sha(live_raw),acceptance=acceptance,voiceEnabled=True,voiceOptionalAndRoomBound=True,
            keysSubjectsAndSoleModeratorPreserved=True,existingServicesAndMapsUnchanged=True,onlyExistingRestartWasRoomPilot=True,
            broadSchoolRoomAccess=False,nativeMapEntryEnabled=False,realAdministratorLoginTested=False,loadApprovalFor400=False,
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        committed=True
        print(json.dumps({key:record[key] for key in ['passed','archiveSha256','voiceEnabled','voiceOptionalAndRoomBound','keysSubjectsAndSoleModeratorPreserved',
            'existingServicesAndMapsUnchanged','onlyExistingRestartWasRoomPilot','checkedAt']}),flush=True)
    finally:
        if changed and not committed:
            assert UNIT.read_bytes() in [unit,original_unit] and CONFIG.read_bytes() in [config,original_config], 'Concurrent room change; do not overwrite'
            atomic(CONFIG,original_config)
            atomic(UNIT,original_unit,0o644)
            run('systemctl','daemon-reload')
            run('systemctl','restart',SERVICE)
        if created_control and not committed:
            assert CONTROL.read_bytes()==control_unit, 'Concurrent control change; do not overwrite'
            run('systemctl','disable','--now',CONTROL_SERVICE)
            CONTROL.unlink()
            run('systemctl','daemon-reload')


if __name__=='__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
        LIVE_PROOF.unlink(missing_ok=True)
