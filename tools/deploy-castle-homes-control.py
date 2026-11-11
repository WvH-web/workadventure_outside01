"""Publish only the accepted private-room renewal correction; roll back unless public proof arrives."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import sqlite3
import subprocess
import time
import urllib.request
import zipfile

EXPECTED='1b28495f0e9dfb1e8b8d51cae702de8b767a6c83e2377236e6e83d9465231495'
ROOT=Path('/opt/wvh-castle-homes');PRIVATE=ROOT/'private'
UNIT=Path('/etc/systemd/system/wvh-castle-homes.service');CONFIG=PRIVATE/'service.json'
SERVICE='wvh-castle-homes.service';RECEIPT=PRIVATE/'control-renewal-deployment.json'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-control-live.ready.private.json')
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def proof(value,candidate=False):
    for name in ['passed','ordinaryMicrosoftStatesUsed','normalLoginRepeated','syntheticPupilsOnly','realPublicGateway','realPublicSchoolContext','realPublicSfu',
        'browserFakeDevicesOnly','noHumanMicrophoneOrCameraUsed','bothActualMediaKindsEndedOnEveryExit','cameraExplicitlyEnabledAfterEveryNewConnection',
        'offlineUsesActualBrowserNetworkEmulation','accountSwitchUsesOnlyApprovedNormalTokens']:assert value[name] is True
    assert value['browserVersion'].startswith('157.') and value['networkResponsesSubstituted'] is candidate
    for name in ['schoolOverrides','servicesRestarted','nativeWorkAdventureTested','realAdministratorLoginTested','loadApprovalFor400']:assert value[name] is False
    assert value['errors']==[] and value['unexpectedResourceFailures']==0
    episodes=['offline','online','second-device-open','device-transfer','account-switch','logout']
    assert [row['episode'] for row in value['transitions']]==episodes
    flags=[['actualTracksEnded','ownedFrameRemoved','remoteMediaRemoved'],['roomReauthorized','noAutomaticCaptureOrCall','explicitRejoinAndBothDirectionsDecoded'],
        ['doesNotStealExistingCall','noCaptureOnNewDevice'],['oldActualTracksEnded','newCaptureOnlyAfterExplicitClick','noAutomaticTakeback','formerDeviceDepartureDoesNotEndCurrentCall'],
        ['oldGuestTracksEnded','newAccountOwnRoomVerified','noAutomaticCapture','oldProtectedViewRejected','otherDeviceCallNotStolen'],['ownedFrameRemoved','allOwnCapturesEnded']]
    for row,required in zip(value['transitions'],flags):assert all(row[name] is True for name in required)
    pairs=[(stage,label) for stage,labels in [('initial-call',['owner-first-device','guest-mobile']),('online',['owner-first-device','guest-mobile']),
        ('second-device-open',['owner-first-device','guest-mobile']),('explicit-device-transfer',['owner-second-device','guest-mobile']),
        ('former-device-departure',['owner-second-device','guest-mobile'])] for label in labels]
    assert [(row['stage'],row['label']) for row in value['decodedRemoteMicrophones']]==pairs
    assert [(row['stage'],row['label']) for row in value['decodedRemoteOptionalCameras']]==pairs
    assert all(type(row['rms']) in [int,float] and .002<row['rms']<1 for row in value['decodedRemoteMicrophones'])
    assert all(all(type(row[key]) is int and row[key]>0 for key in ['width','height','decodedFrames']) for row in value['decodedRemoteOptionalCameras'])
    if candidate:assert value['candidateSourcesOnlyInsideTestBrowsers'] and value['candidateRoutes']==['castle-room-control.js','proximity.js']
    else:assert not value['candidateSourcesOnlyInsideTestBrowsers'] and value['candidateRoutes']==[] and value['candidateSources']=={}


def main():
    os.umask(0o077);assert not RECEIPT.exists() and not INPUT.exists()
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py');raw=helper_path.read_bytes()
    assert helper_path.resolve()==helper_path and sha(raw)=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_control_tools'};exec(compile(raw,str(helper_path),'exec'),helper)
    run,atomic,running=(helper[name] for name in ['run','atomic','running']);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    previous_raw=(PRIVATE/'calls-deployment.json').read_bytes();previous=json.loads(previous_raw)
    native_raw=(PRIVATE/'native-entry-deployment.json').read_bytes();native=json.loads(native_raw)
    assert previous['passed'] and native['passed'] and not native['provisional'] and native['after']==before
    old_release=Path(previous['release']);assert old_release==ROOT/'releases'/previous['archiveSha256'][:16] and len(previous['files'])==69
    old_unit=UNIT.read_bytes();config=CONFIG.read_bytes()
    assert sha(old_unit)==previous['unitAfterSha256'] and sha(config)==previous['configAfterSha256']
    processes={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in native['processes']}
    rollback_raw=(PRIVATE/'control-renewal-rollback-1.json').read_bytes();rollback=json.loads(rollback_raw)
    assert rollback['passed'] and rollback['restored'] and rollback['beforeProcesses']==native['processes'] and rollback['baseline']==before
    assert processes==rollback['afterProcesses'] and rollback['unitSha256']==sha(old_unit) and rollback['configSha256']==sha(config)
    archive_path=Path('/tmp/wvh-castle-homes-control.zip');assert archive_path.resolve()==archive_path and sha(archive_path.read_bytes())==EXPECTED
    additions={'ops/castle-homes/public/room-control.js','tests/castle-home-control.test.mjs'}
    changes={'ops/castle-homes/public/room-call.js','ops/castle-homes/game-adapter.cjs','ops/castle-homes/gateway.cjs','tests/castle-home-calls.test.cjs'}
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==71 and set(archive.namelist())==set(previous['files'])|additions
        assert sum(item.file_size for item in archive.infolist())<35*1024*1024
        payload={name:archive.read(name) for name in archive.namelist()}
    assert all(sha((old_release/name).read_bytes())==digest for name,digest in previous['files'].items())
    assert all(sha(payload[name])==digest for name,digest in previous['files'].items() if name not in changes)
    candidate_hashes={'proximity.js':sha(payload['ops/castle-homes/public/room-call.js']),'castle-room-control.js':sha(payload['ops/castle-homes/public/room-control.js'])}
    candidates=[]
    for number in [1,2]:
        path=Path('/home/wilhelm/.cache/wvh-school-qa')/('homes-control-candidate-'+str(number)+'.private.json')
        assert path.resolve()==path and path.parent.stat().st_mode&0o777==0o700;path.chmod(0o600)
        data=path.read_bytes();value=json.loads(data);proof(value,True);assert value['candidateSources']==candidate_hashes
        candidates.append((data,path))
    release=ROOT/'releases'/EXPECTED[:16];assert release.resolve()==release and release!=old_release
    release.mkdir(mode=0o755,exist_ok=True)
    for name,data in payload.items():
        target=release/name;assert target.resolve()==target and target.is_relative_to(release)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():assert target.read_bytes()==data
        else:atomic(target,data,0o644)
    assert not any(path.is_symlink() for path in release.rglob('*'))
    for path in [release,*release.rglob('*')]:
        if path.is_dir():path.chmod(0o755)
    node='/opt/plesk/node/24/bin/node';source=ROOT/'game-releases'/'8a7b5a2e1bf03405'
    tests=subprocess.run(['systemd-run','--quiet','--collect','--wait','--pipe','--unit=wvh-homes-control-tests-'+EXPECTED[:12],
        '--property=DynamicUser=yes','--property=PrivateTmp=yes','--property=InaccessiblePaths=/opt/wvh-sterne-kollegium',
        '--property=ProtectSystem=strict','--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=512M','--property=CPUQuota=100%',
        '--property=RuntimeMaxSec=90s','--setenv=NODE_PATH='+str(source/'dorfplatz/node_modules'),node,'--test','--test-concurrency=1',
        *(str(release/'tests'/name) for name in ['castle-home-service.test.cjs','castle-home-runtime.test.cjs','castle-home-gateway.test.cjs',
            'castle-home-media.test.cjs','castle-home-progressive.test.cjs','castle-home-calls.test.cjs','castle-home-control.test.mjs'])],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=105)
    atomic(PRIVATE/'control-renewal-linux-tests.private.log',(tests.stdout+'\n'+tests.stderr).encode())
    assert tests.returncode==0,'Control-renewal Linux regression failed; production unchanged'
    backup=PRIVATE/'before-control-renewal-2';assert not backup.exists();backup.mkdir(mode=0o700)
    atomic(backup/'service.snapshot',old_unit)
    database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve();assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite')
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup/'pilot.sqlite') as writer:reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    for number,(data,_) in enumerate(candidates,1):atomic(PRIVATE/('control-candidate-'+str(number)+'.private.json'),data)
    old_path=str(old_release/'ops/castle-homes/service.cjs').encode();assert old_unit.count(old_path)==1
    new_unit=old_unit.replace(old_path,str(release/'ops/castle-homes/service.cjs').encode())
    changed=False;accepted=False
    try:
        assert ops['baseline']()==before and running()==docker_before and UNIT.read_bytes()==old_unit and CONFIG.read_bytes()==config
        atomic(UNIT,new_unit,0o644);changed=True;run('systemctl','daemon-reload');run('systemctl','restart',SERVICE)
        for _ in range(60):
            try:
                with urllib.request.urlopen('https://together.deine-schule.com/castle-homes/health',timeout=3) as response:
                    if json.loads(response.read())=={'ready':True} and response.headers.get('Permissions-Policy')=='camera=(self), microphone=(self), display-capture=()':break
            except Exception:pass
            time.sleep(.3)
        else:raise RuntimeError('Room correction failed health; reverting')
        after_processes={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in processes}
        assert all(value==after_processes[name] for name,value in processes.items() if name!=SERVICE)
        assert after_processes[SERVICE]!=processes[SERVICE] and 'ActiveState=active' in after_processes[SERVICE]
        assert ops['baseline']()==before and running()==docker_before
        print(json.dumps(dict(provisional=True,linuxTestsPassed=True,awaitingPublicBrowserProof=True,onlyRoomPilotRestarted=True)),flush=True)
        deadline=time.monotonic()+600
        while not INPUT.exists() and time.monotonic()<deadline:
            assert run('systemctl','is-active',SERVICE).strip()=='active';time.sleep(1)
        assert INPUT.exists(),'Public renewal proof absent; restoring previous room service'
        assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700;INPUT.chmod(0o600)
        live_raw=INPUT.read_bytes();assert len(live_raw)<150000;live=json.loads(live_raw);proof(live,False);assert live['servedModuleSha256']==candidate_hashes
        assert ops['baseline']()==before and running()==docker_before and UNIT.read_bytes()==new_unit and CONFIG.read_bytes()==config
        atomic(PRIVATE/'control-renewal-browser.private.json',live_raw)
        record=dict(passed=True,archiveSha256=EXPECTED,release=str(release),files={name:sha(data) for name,data in payload.items()},before=before,after=before,
            callsReceiptSha256=sha(previous_raw),nativeEntryReceiptSha256=sha(native_raw),rollbackReceiptSha256=sha(rollback_raw),processesBefore=processes,processesAfter=after_processes,
            unitBeforeFile=str(backup/'service.snapshot'),unitBeforeSha256=sha(old_unit),unitAfterSha256=sha(new_unit),configSha256=sha(config),
            recoveryDatabaseFile=str(backup/'pilot.sqlite'),recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),
            candidateProofs=[sha(data) for data,_ in candidates],publicBrowserProofSha256=sha(live_raw),
            linuxTestLogSha256=sha((PRIVATE/'control-renewal-linux-tests.private.log').read_bytes()),
            originalEngineFilesUnchanged=True,schoolKeysSubjectsAndSoleModeratorUnchanged=True,onlyRoomPilotRestarted=True,
            allOtherServicesAndMapsUnchanged=True,loadApprovalFor400=False,checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record);accepted=True
        print(json.dumps(dict(passed=True,release=EXPECTED[:16],publicAudioVideoLifecycleVerified=True,onlyRoomPilotRestarted=True,oldCastleReplaced=False)),flush=True)
    finally:
        if changed and not accepted:
            assert UNIT.read_bytes() in [old_unit,new_unit] and CONFIG.read_bytes()==config,'Concurrent change; do not overwrite'
            atomic(UNIT,old_unit,0o644);run('systemctl','daemon-reload');run('systemctl','restart',SERVICE)
            restored={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in processes}
            assert ops['baseline']()==before and all(item==restored[name] for name,item in processes.items() if name!=SERVICE)
            ops['atomic'](PRIVATE/'control-renewal-rollback-2.json',dict(passed=True,restored=True,beforeProcesses=processes,afterProcesses=restored,
                baseline=before,unitSha256=sha(old_unit),configSha256=sha(config),oldRelease=previous['release'],previousRollbackSha256=sha(rollback_raw)))
        if INPUT.exists() and accepted:INPUT.unlink()
        if accepted:
            for _,path in candidates:path.unlink()


if __name__=='__main__':main()
