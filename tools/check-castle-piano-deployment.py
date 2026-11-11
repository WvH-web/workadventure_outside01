"""Read-only acceptance of the published piano, helper front-end and single music wrapper."""
import json
import os
from pathlib import Path
import runpy
import time
import hashlib
import urllib.error
import urllib.request
import re
import subprocess

def request(path,body=None):
    req=urllib.request.Request('https://together.deine-schule.com'+path,headers={'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
    try:response=urllib.request.urlopen(req,timeout=10)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(2000000),response.headers
def verify_school_admission(ops,expected):
    path=Path('/opt/wvh-castle-school/private/admission-deployment.json')
    if not path.exists():return expected,False
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    value=json.loads(path.read_text());assert value['passed'] and value['healthy'] and value['before']==expected
    before,after=value['before'],value['after'];name='wvh-castle-school';manifest='/opt/wvh-castle-school/private/deployment.json'
    assert {key:item for key,item in before['services'].items() if key!=name}=={key:item for key,item in after['services'].items() if key!=name}
    assert {key:item for key,item in before['files'].items() if key!=manifest}=={key:item for key,item in after['files'].items() if key!=manifest}
    sha=ops['sha'];current=ops['inspect'](name);old=ops['inspect'](value['rollbackContainer'])
    assert current['Id']==value['containerId']==after['services'][name]['id'] and current['Image']==value['image']==old['Image']
    assert current['State']['Health']['Status']=='healthy' and old['Id']==before['services'][name]['id'] and not old['State']['Running']
    assert sha(json.dumps(old['Config'],sort_keys=True).encode())==value['configBeforeSha256']
    assert sha(json.dumps(current['Config'],sort_keys=True).encode())==value['configSha256']
    assert sha(json.dumps(current['HostConfig'],sort_keys=True).encode())==value['hostConfigSha256']
    previous=Path(value['oldRecordPath']);assert previous.resolve()==previous and previous.parent==path.parent and previous.stat().st_mode&0o777==0o600
    assert sha(previous.read_bytes())==value['oldRecordSha256']==before['files'][manifest]
    old_record=json.loads(previous.read_text());assert old_record['release']==value['oldRelease'] and len(old_record['files'])==40
    release=Path(value['release']);assert release.resolve()==release and release.parent==path.parent.parent/'releases'
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==42
    assert all(sha((release/file).read_bytes())==digest for file,digest in value['files'].items())
    assert all(sha((Path(old_record['release'])/file).read_bytes())==digest for file,digest in old_record['files'].items())
    old_config=json.loads(json.dumps(old['Config']));old_config['Image']=old['Image'];old_config['Labels']['wvh.release']=value['releaseId']
    assert current['Config']==old_config
    host=json.loads(json.dumps(old['HostConfig']));changed=0
    for mount in host['Mounts']:
        if mount['Target']=='/srv/release':assert mount['ReadOnly'];mount['Source']=str(release);changed+=1
    assert changed==1 and current['HostConfig']==host
    assert sha(Path(manifest).read_bytes())==value['newRecordSha256']==after['files'][manifest]
    record=json.loads(Path(manifest).read_text());assert record['files']==value['files'] and record['release']==str(release)
    stage=path.with_name('admission-stage.json');assert sha(stage.read_bytes())==value['stageReceiptSha256']
    staged=json.loads(stage.read_text());assert staged['passed'] and staged['stopped'] and staged['files']==value['files'] and staged['before']==before
    assert sha(path.with_name('admission-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']==staged['linuxTestLogSha256']
    assert value['syntheticHttpRequests']==400 and value['liveCanary']['freshDatabaseAndCohortRules'] and not value['fullCastleApprovalFor400']
    assert not ops['exists']('wvh-castle-admission-stage') and not ops['exists']('wvh-castle-admission-qa')
    assert not ops['run']('ss','-ltnH','sport = :13212').strip()
    return after,True

def homes_control_processes(ops,native):
    private=Path('/opt/wvh-castle-homes/private');expected=native['processes'];calls=json.loads((private/'calls-deployment.json').read_text());sha=ops['sha']
    previous=None
    for number in [1,2]:
        path=private/('control-renewal-rollback-'+str(number)+'.json')
        if not path.exists():break
        raw=path.read_bytes();value=json.loads(raw)
        assert path.resolve()==path and path.stat().st_mode&0o777==0o600 and value['passed'] and value['restored']
        assert value['baseline']==native['after'] and value['beforeProcesses']==expected
        assert value['unitSha256']==calls['unitAfterSha256'] and value['configSha256']==calls['configAfterSha256'] and value['oldRelease']==calls['release']
        assert all(item==value['afterProcesses'][name] for name,item in expected.items() if name!='wvh-castle-homes.service')
        if number==1:
            assert sha((private/'control-first-attempt.py').read_bytes())==value['failedHelperSha256']=='37c1ed19c8f2ba0261029a8048748c2de8a99e997731bf52f68b15a139968d9c'
            assert sha((private/'control-first-live.private.json').read_bytes())==value['publicMediaProofSha256']
        else:assert value['previousRollbackSha256']==previous
        expected=value['afterProcesses'];previous=sha(raw)
    return expected


def homes_control_transition(ops,calls,calls_raw):
    private=Path('/opt/wvh-castle-homes/private');path=private/'control-renewal-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    value=json.loads(path.read_text());assert value['passed'] and value['callsReceiptSha256']==sha(calls_raw)
    native_raw=(private/'native-entry-deployment.json').read_bytes();native=json.loads(native_raw)
    assert value['nativeEntryReceiptSha256']==sha(native_raw) and value['before']==value['after']==native['after']
    archive=value['archiveSha256'];assert archive=='1b28495f0e9dfb1e8b8d51cae702de8b767a6c83e2377236e6e83d9465231495'
    release=Path(value['release']);assert release==private.parent/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==71
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    additions={'ops/castle-homes/public/room-control.js','tests/castle-home-control.test.mjs'}
    changes={'ops/castle-homes/public/room-call.js','ops/castle-homes/game-adapter.cjs','ops/castle-homes/gateway.cjs','tests/castle-home-calls.test.cjs'}
    assert set(value['files'])==set(calls['files'])|additions and all(value['files'][name]==digest for name,digest in calls['files'].items() if name not in changes)
    backup=private/'before-control-renewal-2';unit=Path('/etc/systemd/system/wvh-castle-homes.service')
    assert value['unitBeforeFile']==str(backup/'service.snapshot') and backup.resolve()==backup and backup.stat().st_mode&0o777==0o700
    old=(backup/'service.snapshot').read_bytes();assert sha(old)==value['unitBeforeSha256']==calls['unitAfterSha256']
    assert unit.read_bytes()==old.replace(str(Path(calls['release'])/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert sha(unit.read_bytes())==value['unitAfterSha256'] and sha((private/'service.json').read_bytes())==value['configSha256']==calls['configAfterSha256']
    assert value['recoveryDatabaseFile']==str(backup/'pilot.sqlite') and sha((backup/'pilot.sqlite').read_bytes())==value['recoveryDatabaseSha256']
    helper=Path('/tmp/wvh-deploy-castle-homes-control.py');assert helper.resolve()==helper and sha(helper.read_bytes())=='60f004b6953efcd0322763184254cdc7fc6db1ba3305cfadb3b462de716fbb9f'
    check=runpy.run_path(str(helper))['proof']
    hashes={'proximity.js':value['files']['ops/castle-homes/public/room-call.js'],'castle-room-control.js':value['files']['ops/castle-homes/public/room-control.js']}
    for number,digest in enumerate(value['candidateProofs'],1):
        raw=(private/('control-candidate-'+str(number)+'.private.json')).read_bytes();assert sha(raw)==digest;candidate=json.loads(raw);check(candidate,True);assert candidate['candidateSources']==hashes
    assert len(value['candidateProofs'])==2
    raw=(private/'control-renewal-browser.private.json').read_bytes();assert sha(raw)==value['publicBrowserProofSha256'];browser=json.loads(raw);check(browser,False);assert browser['servedModuleSha256']==hashes
    assert sha((private/'control-renewal-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']
    assert value['rollbackReceiptSha256']==sha((private/'control-renewal-rollback-1.json').read_bytes()) and not (private/'control-renewal-rollback-2.json').exists()
    assert value['processesBefore']==homes_control_processes(ops,native) and all(item==value['processesAfter'][name] for name,item in value['processesBefore'].items() if name!='wvh-castle-homes.service')
    assert value['originalEngineFilesUnchanged'] and value['schoolKeysSubjectsAndSoleModeratorUnchanged'] and value['onlyRoomPilotRestarted'] and value['allOtherServicesAndMapsUnchanged'] and not value['loadApprovalFor400']
    return lambda name:old if Path(name)==unit else Path(name).read_bytes()


def homes_calls_transition(ops,owned,owned_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'calls-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    value=json.loads(path.read_text());assert value['passed'] and value['ownedReceiptSha256']==sha(owned_raw)
    effective=homes_control_transition(ops,value,path.read_bytes())
    assert value['before']==value['after']==owned['after']
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==root/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==69
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    stage_raw=(private/'calls-stage.json').read_bytes();stage=json.loads(stage_raw)
    accepted_raw=(private/'calls-stage-acceptance.json').read_bytes();accepted=json.loads(accepted_raw)
    assert sha(stage_raw)==value['stageReceiptSha256'] and sha(accepted_raw)==value['stageAcceptanceSha256']
    assert stage['passed'] and stage['before']==stage['after']==owned['after'] and len(stage['files'])==68
    assert accepted['passed'] and accepted['stopped'] and accepted['stageReceiptSha256']==sha(stage_raw) and accepted['stageCredentialRemoved']
    stage_release=Path(stage['release']);assert stage_release==root/'releases'/stage['archiveSha256'][:16] and stage_release.resolve()==stage_release
    assert all(sha((stage_release/name).read_bytes())==digest for name,digest in stage['files'].items())
    assert set(value['files'])==set(stage['files'])|{'ops/castle-homes/control.service'}
    assert all(value['files'][name]==digest for name,digest in stage['files'].items() if name!='tools/check-castle-homes-public.cjs')
    unit=Path('/etc/systemd/system/wvh-castle-homes.service');credential=private/'service.json';control=Path('/etc/systemd/system/wvh-castle-homes-control.service')
    backup=Path(value['unitBeforeFile']);config_backup=Path(value['configBeforeFile'])
    assert backup.resolve()==backup and backup.parent.parent==private and backup.parent.name.startswith('before-calls-') and backup.name=='service.snapshot'
    assert config_backup==backup.parent/'config.snapshot' and config_backup.resolve()==config_backup
    assert all(item.stat().st_uid==0 and item.stat().st_mode&0o777==0o600 for item in [backup,config_backup,credential])
    original=backup.read_bytes();original_config=config_backup.read_bytes()
    assert sha(original)==value['unitBeforeSha256']==owned['unitAfterSha256'] and sha(original_config)==value['configBeforeSha256']==owned['configAfterSha256']
    expected=original.replace(str(Path(owned['release'])/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    expected=expected.replace(b'[Unit]\n',b'[Unit]\nWants=wvh-castle-homes-control.service\nAfter=wvh-castle-homes-control.service\n')
    assert effective(unit)==expected and sha(expected)==value['unitAfterSha256']
    current_config=credential.read_bytes();assert sha(current_config)==value['configAfterSha256']
    config=json.loads(current_config);calls=config['calls']
    assert config=={**json.loads(original_config),'version':4,'calls':calls}
    assert set(calls)=={'url','apiURL','apiKey','apiSecret','namespace','roles','fixedGroups'}
    assert calls['url']=='wss://together.deine-schule.com' and calls['apiURL']=='http://127.0.0.1:13252' and calls['namespace']=='sterne-video-castle-homes'
    assert calls['roles']==['student','teacher'] and calls['fixedGroups'] is True and calls['apiKey'] and len(calls['apiSecret'])>=32
    template=(release/'ops/castle-homes/control.service').read_bytes();assert template.count(b'@RELEASE@')==1
    assert control.resolve()==control and str(control)==value['controlUnit'] and control.stat().st_uid==0 and control.stat().st_mode&0o777==0o644
    assert control.read_bytes()==template.replace(b'@RELEASE@',str(release).encode()) and sha(control.read_bytes())==value['controlUnitSha256'] and value['controlUnitPreviouslyAbsent']
    assert ops['run']('systemctl','is-active','wvh-castle-homes-control.service').strip()=='active'
    assert ops['run']('systemctl','is-enabled','wvh-castle-homes-control.service').strip()=='enabled'
    listener=ops['run']('ss','-ltnH','sport = :13252');assert len(listener.strip().splitlines())==1 and '127.0.0.1:13252' in listener
    assert not ops['run']('ss','-ltnH','sport = :13251').strip() and not Path('/run/wvh-homes-calls-stage').exists() and not Path(stage['credentialFile']).exists()
    database=Path(value['recoveryDatabaseFile']);assert database==backup.parent/'pilot.sqlite' and database.resolve()==database
    assert database.stat().st_mode&0o777==0o600 and sha(database.read_bytes())==value['recoveryDatabaseSha256']
    for name,key in [('calls-live-linux-tests.private.log','linuxTestLogSha256'),('calls-live-public.private.log','publicApiLogSha256')]:
        assert sha((private/name).read_bytes())==value[key]
    for name,key,live in [('calls-stage-browser.private.json','stageBrowserProofSha256',False),('calls-public-browser.private.json','publicBrowserProofSha256',True)]:
        raw=(private/name).read_bytes();assert sha(raw)==value[key];proof=json.loads(raw)
        assert proof['passed'] and proof['browserVersion'].startswith('157.') and proof['ordinaryMicrosoftStatesUsed'] and proof['syntheticPupilAccountsOnly']
        assert proof['realPublicSchoolContext'] and proof['realPublicSfu'] and proof['livePublicGateway']==live and proof['loopbackGatewayThroughPinnedSsh']!=live
        assert not proof['networkInterception'] and proof['browserFakeDevicesOnly'] and proof['noHumanMicrophoneOrCameraUsed']
        assert len(proof['decodedRemoteMicrophonesBoth'])==2 and all(row['rms']>.002 and row['remoteAudioTracks']==1 for row in proof['decodedRemoteMicrophonesBoth'])
        assert len(proof['decodedRemoteOptionalCamera'])==1 and all(row['width']>0 and row['height']>0 and row['decodedFrames']>0 for row in proof['decodedRemoteOptionalCamera'])
        assert proof['separateOwnerRoomsIsolated'] and proof['joinDoesNotCaptureDevices'] and proof['microphoneAndCameraRequireSeparateClicks'] and proof['roomChangeStopsCapture']
        assert proof['desktopAnd390And320Fit'] and proof['receivedContactReportSubmitted'] and proof['pupilModerationDenied'] and proof['ownerClosureStopsCaptureAndRemotes']
        assert not proof['errors'] and proof['unexpectedResourceFailures']==0 and not proof['nativeWorkAdventureTested'] and not proof['realAdministratorLoginTested']
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock'] and acceptance['voiceEnabled']
    assert not acceptance['networkInterception'] and not acceptance['actualVoiceMediaTested']
    assert value['voiceEnabled'] and value['voiceOptionalAndRoomBound'] and value['keysSubjectsAndSoleModeratorPreserved'] and value['existingServicesAndMapsUnchanged'] and value['onlyExistingRestartWasRoomPilot']
    assert not value['broadSchoolRoomAccess'] and not value['nativeMapEntryEnabled'] and not value['realAdministratorLoginTested'] and not value['loadApprovalFor400']
    assert not Path('/home/wilhelm/.cache/wvh-school-qa/homes-calls-live-proof.private.json').exists()
    return lambda name:original if Path(name)==unit else original_config if Path(name)==credential else Path(name).read_bytes()


def homes_owned_transition(ops,progressive,progressive_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'owned-runtime-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    owned_raw=path.read_bytes();value=json.loads(owned_raw);assert value['passed'] and value['progressiveReceiptSha256']==sha(progressive_raw)
    previous=homes_calls_transition(ops,value,owned_raw)
    assert value['before']==value['after']==progressive['after']
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==root/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==62
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    allowed={'ops/castle-homes/service.cjs','tests/castle-home-service.test.cjs','tools/check-castle-homes-public.cjs'}
    assert all(value['files'][name]==digest for name,digest in progressive['files'].items() if name not in allowed)
    unit=Path('/etc/systemd/system/wvh-castle-homes.service');credential=private/'service.json'
    backup=Path(value['unitBeforeFile']);config_backup=Path(value['configBeforeFile'])
    assert backup.resolve()==backup and backup.parent.parent==private and backup.parent.name.startswith('before-owned-') and backup.name=='service.snapshot'
    assert config_backup==backup.parent/'config.snapshot' and config_backup.resolve()==config_backup
    assert all(item.stat().st_uid==0 and item.stat().st_mode&0o777==0o600 for item in [backup,config_backup,credential])
    original=backup.read_bytes();original_config=config_backup.read_bytes()
    assert sha(original)==value['unitBeforeSha256']==progressive['unitAfterSha256'] and sha(original_config)==value['configBeforeSha256']
    manifest_raw=(release/'ops/castle-homes/game.manifest.json').read_bytes()
    assert sha(manifest_raw)==value['runtimeManifestSha256']=='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d'
    manifest=json.loads(manifest_raw);source=root/'game-releases'/value['runtimeManifestSha256'][:16]
    assert source.resolve()==source and str(source)==value['runtimeRoot'] and (source/'.castle-homes-runtime.json').read_bytes()==manifest_raw
    files={**manifest['sourceFiles'],**manifest['dependencyFiles'],'.castle-homes-runtime.json':value['runtimeManifestSha256']}
    assert len(files)==value['runtimeFileCount']==4869 and len(manifest['packages'])==30 and len(manifest['supplementalSharedCode'])==55
    assert not any(item.is_symlink() for item in source.rglob('*'))
    assert {item.relative_to(source).as_posix() for item in source.rglob('*') if item.is_file()}==set(files)
    assert all(item.stat().st_uid==0 and not item.stat().st_mode&0o022 for item in [source,*source.rglob('*')])
    assert all(sha((source/name).read_bytes())==digest for name,digest in files.items())
    old=Path('/opt/wvh-sterne-kollegium/releases/20261109T191624Z')
    expected=original.replace(str(Path(progressive['release'])/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    expected=expected.replace(str(old/'dorfplatz/node_modules').encode(),str(source/'dorfplatz/node_modules').encode())
    expected=expected.replace(b'[Service]\n',b'[Service]\nInaccessiblePaths=/opt/wvh-sterne-kollegium\n')
    assert previous(unit)==expected and sha(expected)==value['unitAfterSha256']
    assert sha(previous(credential))==value['configAfterSha256']
    assert json.loads(previous(credential))=={**json.loads(original_config),'version':3,'source':str(source)}
    stage_raw=(private/'owned-runtime-stage.json').read_bytes();stage=json.loads(stage_raw)
    assert sha(stage_raw)==value['stageReceiptSha256'] and stage['passed'] and not stage['credentialsAndDataCopied'] and stage['independentFileInodes']
    recovery=Path(stage['archive']);assert recovery==private/'runtime-backups'/(value['runtimeManifestSha256'][:16]+'.tar.gz') and recovery.resolve()==recovery
    assert recovery.stat().st_mode&0o777==0o600 and sha(recovery.read_bytes())==stage['archiveSha256']
    database=Path(value['recoveryDatabaseFile']);assert database==backup.parent/'pilot.sqlite' and database.resolve()==database
    assert database.stat().st_mode&0o777==0o600 and sha(database.read_bytes())==value['recoveryDatabaseSha256']
    for suffix,key in [('tests','linuxTestLogSha256'),('engine','canaryLogSha256'),('inventory','inventoryLogSha256'),('public','publicLogSha256')]:
        assert sha((private/('owned-runtime-'+suffix+'.private.log')).read_bytes())==value[key]
    assert value['canary']['passed'] and value['canary']['originalRuntimeInaccessible'] and value['canary']['twoSyntheticParticipants'] and value['canary']['onlyDisposableRuntimeDatabase']
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock'] and not acceptance['networkInterception']
    assert value['liveServiceOriginalRuntimeInaccessible'] and value['sourceAndExistingServicesUnchanged'] and value['privateKeysSubjectsAndModerationUnchanged'] and value['onlyRoomPilotRestarted']
    assert not value['broadSchoolRoomAccess'] and not value['voiceEnabled']
    recovery_path=private/'owned-runtime-recovery.json'
    if recovery_path.exists():
        assert recovery_path.resolve()==recovery_path and recovery_path.stat().st_mode&0o777==0o600
        proof=json.loads(recovery_path.read_text())
        assert proof['passed'] and proof['deploymentReceiptSha256']==sha(path.read_bytes()) and proof['runtimeManifestSha256']==value['runtimeManifestSha256']
        assert proof['runtimeArchiveSha256']==stage['archiveSha256'] and proof['restoredRegularFiles']==4869
        assert proof['runtimeRestoredFromArchive'] and proof['restoredTreeBoundReadOnly'] and proof['originalRuntimeInaccessible'] and proof['twoSyntheticParticipants']
        assert proof['offlineSqliteIntegrityAndExactContents'] and not proof['liveDatabaseReplaced'] and proof['productionAndColleagueProcessesUnchanged']
        assert proof['softwareExportOnly'] and not proof['offServerCopyVerified']
        assert proof['recoveredEngineCanary']['passed'] and proof['recoveredEngineCanary']['onlyDisposableRuntimeDatabase']
        for suffix,key in [('inventory','inventoryLogSha256'),('engine','engineLogSha256')]:
            assert sha((private/('owned-runtime-recovery-'+suffix+'.private.log')).read_bytes())==proof[key]
    pid=int(ops['run']('systemctl','show','wvh-castle-homes.service','--property=MainPID','--value').strip())
    hidden=subprocess.run(['nsenter','--target',str(pid),'--mount','--','runuser','-u','nobody','--','ls','/opt/wvh-sterne-kollegium'],stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=10)
    assert hidden.returncode!=0 and 'Permission denied' in hidden.stderr
    return lambda name:original if Path(name)==unit else original_config if Path(name)==credential else Path(name).read_bytes()


def homes_progressive_transition(ops,media_record,media_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'progressive-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    progressive_raw=path.read_bytes();value=json.loads(progressive_raw);assert value['passed'] and value['mediaReceiptSha256']==sha(media_raw)
    previous=homes_owned_transition(ops,value,progressive_raw)
    assert value['before']==value['after']==media_record['after']
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==root/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==58
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    allowed={'ops/castle-homes/game-adapter.cjs','ops/castle-homes/gateway.cjs','ops/castle-homes/public/room.css','tests/castle-home-gateway.test.cjs','tests/castle-home-media.test.cjs'}
    assert all(value['files'][name]==digest for name,digest in media_record['files'].items() if name not in allowed)
    backup=Path(value['unitBeforeFile']);assert backup.resolve()==backup and backup.parent.parent==private and backup.parent.name.startswith('before-progressive-') and backup.name=='service.snapshot'
    assert backup.stat().st_uid==0 and backup.stat().st_mode&0o777==0o600
    original=backup.read_bytes();unit=Path('/etc/systemd/system/wvh-castle-homes.service')
    assert sha(original)==value['unitBeforeSha256']==media_record['unitAfterSha256']
    expected=original.replace(str(Path(media_record['release'])/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert previous(unit)==expected and sha(expected)==value['unitAfterSha256']
    recovery=Path(value['recoveryDatabaseFile']);assert recovery==backup.parent/'pilot.sqlite' and recovery.resolve()==recovery
    assert recovery.stat().st_uid==0 and recovery.stat().st_mode&0o777==0o600 and sha(recovery.read_bytes())==value['recoveryDatabaseSha256']
    proof_raw=(release/'ops/castle-homes/progressive-browser-proof.json').read_bytes();assert sha(proof_raw)==value['browserProofSha256']
    proof=json.loads(proof_raw);assert proof['passed'] and proof['browserVersion'].startswith('157.') and not proof['errors']
    assert not proof['positiveNetworkInterception'] and proof['negativeImageFaultInjectionOnly']
    assert proof['syntheticDatabaseOnly'] and proof['syntheticPointsSeededOnlyInPrivateFixture'] and not proof['publicDeploymentTested'] and not proof['normalMicrosoftLoginTested'] and not proof['nativeWorkAdventureTested']
    assert len(proof['checks'])==2 and all(row['initialImageCount']==4 and row['noUnusedAtlasOrFloor'] and row['allCatalogAtlasesRendered']==13 and row['floorPreviewAndExactCancellation'] for row in proof['checks'])
    assert proof['realOpaqueAndTransparentHitTesting'] and proof['savedFloorAndFurnitureOnFreshDevice'] and proof['freshDeviceRequiredImages']==6
    assert proof['sharedVisitAndReceivedPhrase'] and proof['interruptedImageRetryAndSavedRoomRecovery']
    assert sha((private/'progressive-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock']
    assert not acceptance['networkInterception']
    assert value['privateAuthorityAndModerationUnchanged'] and value['originalRuntimeAndImagesUnchanged'] and value['existingServicesAndMapsUnchanged'] and value['onlyRoomPilotRestarted']
    assert not value['broadSchoolRoomAccess'] and not value['voiceEnabled']
    return lambda name:original if Path(name)==unit else previous(name)


def homes_media_transition(ops,moderation,moderation_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'media-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    media_raw=path.read_bytes();value=json.loads(media_raw);assert value['passed'] and value['moderationReceiptSha256']==sha(moderation_raw)
    previous=homes_progressive_transition(ops,value,media_raw)
    assert value['before']==value['after']==moderation['after']
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==root/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==54
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    backup=Path(value['unitBeforeFile']);assert backup.resolve()==backup and backup.parent.parent==private and backup.parent.name.startswith('before-media-') and backup.name=='service.snapshot'
    assert backup.stat().st_uid==0 and backup.stat().st_mode&0o777==0o600
    original=backup.read_bytes();unit=Path('/etc/systemd/system/wvh-castle-homes.service')
    assert sha(original)==value['unitBeforeSha256']==moderation['changedFiles'][str(unit)]
    expected=original.replace(str(Path(moderation['release'])/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert previous(unit)==expected and sha(expected)==value['unitAfterSha256']
    recovery=Path(value['recoveryDatabaseFile']);assert recovery==backup.parent/'pilot.sqlite' and recovery.resolve()==recovery
    assert recovery.stat().st_uid==0 and recovery.stat().st_mode&0o777==0o600 and sha(recovery.read_bytes())==value['recoveryDatabaseSha256']
    media=release/'ops/castle-homes/media';manifest_raw=(media/'manifest.json').read_bytes()
    assert sha(manifest_raw)==value['mediaManifestSha256']=='242a42c7c40827e681c92fea56fe1d2d9886cab9fe8cd6279107af981e676909'
    manifest=json.loads(manifest_raw);assert manifest['codec']=='lossless-mixed' and len(manifest['images'])==19 and not manifest['sourceImagesChanged']
    assert manifest['originalBytes']==value['originalImageBytes']==34169550 and manifest['bytes']==value['optimizedImageBytes']==30386384
    proof_raw=(media/'browser-fidelity.json').read_bytes();assert sha(proof_raw)==value['browserFidelityProofSha256']
    proof=json.loads(proof_raw);assert proof['passed'] and proof['manifestSha256']==value['mediaManifestSha256'] and len(proof['comparisons'])==19
    assert proof['browserVersion'].startswith('157.') and all(row['sameDimensions'] and row['alphaDifferences']==row['visibleRgbDifferences']==0 for row in proof['comparisons'])
    assert not proof['publicDeploymentTested'] and not proof['sourceImagesChanged']
    assert len(value['publicImages'])==19 and {row['sha256'] for row in value['publicImages']}=={row['sha256'] for row in manifest['images']}
    assert all(row['publicTlsHashAndCacheVerified'] for row in value['publicImages'])
    assert sha((private/'media-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock']
    assert not acceptance['networkInterception']
    assert value['onlyRoomPilotRestarted'] and value['privateAuthorityAndModerationUnchanged'] and value['sourceImagesUnchanged'] and value['existingServicesAndMapsUnchanged']
    assert not value['broadSchoolRoomAccess'] and not value['voiceEnabled']
    return lambda name:original if Path(name)==unit else previous(name)


def homes_moderation_transition(ops,initial,initial_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'moderation-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    moderation_raw=path.read_bytes();value=json.loads(moderation_raw);assert value['passed'] and value['version']==2 and value['initialReceiptSha256']==sha(initial_raw)
    previous=homes_media_transition(ops,value,moderation_raw)
    assert value['before']==value['after']==initial['after']
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==root/'releases'/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==31
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    unit=Path('/etc/systemd/system/wvh-castle-homes.service');credential=private/'service.json'
    context=Path('/var/www/vhosts/deine-schule.com/private/castle-homes');wrapper=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-homes.php')
    expected={str(unit),str(credential),str(context/'config.json'),str(wrapper)}
    assert set(value['backups'])==set(value['changedFiles'])==expected
    originals={}
    for name,backup in value['backups'].items():
        target=Path(backup['file']);assert target.resolve()==target and target.parent==private/'before-moderation'
        assert target.stat().st_uid==0 and target.stat().st_mode&0o777==0o600
        raw=target.read_bytes();assert sha(raw)==backup['sha256'];originals[name]=raw
        current=Path(name);assert current.resolve()==current and sha(previous(name))==value['changedFiles'][name]
        stat=current.stat();assert (stat.st_mode&0o777,stat.st_uid,stat.st_gid)==(backup['mode'],backup['uid'],backup['gid'])
    old_release=Path(initial['release'])
    assert previous(unit)==originals[str(unit)].replace(str(old_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    subjects=value['moderatorSubjects'];assert len(subjects)==1 and re.fullmatch('wvh:staff:[1-9][0-9]{0,15}',subjects[0])
    old_config=json.loads(originals[str(credential)]);config=json.loads(previous(credential))
    assert config=={**old_config,'version':2,'moderatorSubjects':subjects}
    old_context=json.loads(originals[str(context/'config.json')]);current_context=json.loads((context/'config.json').read_text())
    assert current_context=={**old_context,'moderators':subjects,'administratorModerators':subjects}
    old_context_release=context/initial['archiveSha256'][:16];context_release=context/archive[:16]
    assert wrapper.read_bytes()==originals[str(wrapper)].replace(str(old_context_release).encode(),str(context_release).encode())
    assert set(value['contextFiles'])=={str(context_release/name) for name in ['SchoolIdentity.php','ContextProtocol.php','context.php']}
    assert all(Path(name).resolve()==Path(name) and sha(Path(name).read_bytes())==digest==value['files']['ops/castle-homes/'+Path(name).name] for name,digest in value['contextFiles'].items())
    assert value['administratorExceptionApproved'] and value['globalRoleRowsUnchanged'] and value['signedPublicModeratorCanary']
    assert value['schoolCheck']['mysqlFixtureCases']==74 and value['schoolCheck']['protocolCases']>=20 and not value['schoolCheck']['schoolWrites']
    assert value['schoolCheck']['schoolTransactionReadOnly'] and value['schoolCheck']['normalRoleDoesNotGrantModeration']
    assert value['existingServicesAndMapsUnchanged'] and value['onlyRoomPilotRestarted']
    assert not value['normalStaffMicrosoftLoginTested'] and not value['voiceEnabled'] and not value['broadSchoolRoomAccess']
    assert sha((private/'moderation-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']
    assert sha((private/'before-moderation/pilot.sqlite').read_bytes())==value['recoveryDatabaseSha256']
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock']
    assert not acceptance['networkInterception']
    assert not Path('/home/wilhelm/.cache/wvh-school-qa/homes-moderator.private.json').exists()
    return lambda name:originals[str(name)] if str(name) in originals else Path(name).read_bytes()


def verify_homes_pilot(ops,expected):
    path=Path('/opt/wvh-castle-homes/private/pilot-deployment.json')
    if not path.exists():return expected,False
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    initial_raw=path.read_bytes();value=json.loads(initial_raw);assert value['passed'] and value['mode']=='pilot' and value['pilotSyntheticAccounts']==2 and value['before']==expected
    original=homes_moderation_transition(ops,value,initial_raw)
    before,after=value['before'],value['after'];nginx='/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf';sha=ops['sha']
    assert before['services']==after['services']
    assert {p:h for p,h in before['files'].items() if p!=nginx}=={p:h for p,h in after['files'].items() if p!=nginx}
    archive=value['archiveSha256'];assert re.fullmatch('[a-f0-9]{64}',archive)
    release=Path(value['release']);assert release==Path('/opt/wvh-castle-homes/releases')/archive[:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files']) and len(value['files'])==25
    assert all(sha((release/name).read_bytes())==digest for name,digest in value['files'].items())
    backup=path.with_name('nginx-before-pilot.conf');assert backup.resolve()==backup and backup.stat().st_mode&0o777==0o600
    old=backup.read_bytes();assert sha(old)==value['nginxBeforeSha256']==before['files'][nginx]
    route=('# BEGIN WVH CASTLE HOMES PILOT '+archive[:16]+'\nlocation ^~ /castle-homes/ {\n'
      '    proxy_pass http://127.0.0.1:3251;\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n'
      '    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header Upgrade $http_upgrade;\n'
      '    proxy_set_header Connection "upgrade";\n    proxy_buffering off;\n    proxy_read_timeout 65s;\n'
      '    client_max_body_size 16k;\n}\n# END WVH CASTLE HOMES PILOT '+archive[:16]+'\n')
    historical_nginx=ops.get('historical_nginx',lambda:Path(nginx).read_bytes())()
    assert value['route']==route and historical_nginx==old+b'\n'+route.encode()
    assert sha(historical_nginx)==value['nginxAfterSha256']==after['files'][nginx]
    assert sha(original('/etc/systemd/system/wvh-castle-homes.service'))==value['serviceUnitSha256']
    credential=path.with_name('service.json');assert credential.resolve()==credential and credential.stat().st_mode&0o777==0o600 and sha(original(credential))==value['privateCredentialSha256']
    config=json.loads(original(credential));assert config['version']==1 and config['mode']=='pilot' and config['origin']=='https://together.deine-schule.com' and config['port']==3251
    assert len(config['allowedSubjects'])==2 and len(set(config['allowedSubjects']))==2 and all(re.fullmatch('wvh:student:[1-9][0-9]{0,15}',item) for item in config['allowedSubjects'])
    context=Path('/var/www/vhosts/deine-schule.com/private/castle-homes');wrapper=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-homes.php')
    context_release=context/archive[:16]
    assert set(value['contextFiles'])=={str(wrapper),str(context/'config.json'),*(str(context_release/name) for name in ['SchoolIdentity.php','ContextProtocol.php','context.php'])}
    assert all(Path(name).resolve()==Path(name) and sha(original(name))==digest for name,digest in value['contextFiles'].items())
    context_config=json.loads(original(context/'config.json'));assert context_config['moderators']==[] and context_config['key']==config['contextKey'] and config['contextKey']!=config['bridgeKey']
    manifest_raw=(release/'castle-homes-runtime.manifest.json').read_bytes();assert sha(manifest_raw)==value['runtimeSourceManifestSha256']=='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6'
    runtime=json.loads(manifest_raw);source=Path(runtime['sourceRelease']);assert str(source)==config['source']=='/opt/wvh-sterne-kollegium/releases/20261109T191624Z'
    assert len(runtime['files'])==107 and all((source/name).resolve()==source/name and sha((source/name).read_bytes())==digest for name,digest in runtime['files'].items())
    acceptance=value['acceptance'];assert acceptance['passed'] and len(acceptance['checks'])==7 and acceptance['realPublicTls'] and acceptance['realPublicContextEndpoint'] and acceptance['realPublicWebSockets'] and acceptance['realLeaseClock']
    assert not acceptance['networkInterception'] and not acceptance['voiceEnabled'] and not value['broadSchoolRoomAccess'] and not value['moderationGranted']
    assert ops['run']('systemctl','is-active','wvh-castle-homes.service').strip()=='active'
    assert request('/castle-homes/health')[:2]==(200,b'{"ready":true}')
    assert not Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json').exists()
    return after,True


def verify_homes_native_entry(ops,expected):
    private=Path('/opt/wvh-castle-homes/private');path=private/'native-entry-deployment.json';sha=ops['sha']
    if not path.exists():return expected,False
    assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    value=json.loads(path.read_text());assert value['passed'] and not value['provisional'] and value['before']==expected
    assert value['nativeMapEntryEnabled'] and value['twoNormalMicrosoftParticipants'] and value['nativePrivateAudioSeparationVerified']
    assert value['allNativeVoiceAreasUnchanged'] and value['allOtherMapsAndServicesUnchanged'] and value['noServiceRestart']
    assert not value['oldCastleReplaced'] and not value['broadSchoolRoomAccess'] and not value['loadApprovalFor400']
    helper=Path('/tmp/wvh-deploy-castle-home-entry.py');assert helper.resolve()==helper
    assert sha(helper.read_bytes())=='7866c65e54385a0e789568e60f76bd9e69816345caede525467d60d5b5e4c8d1'
    functions=runpy.run_path(str(helper));target=functions['TARGET'];manifest=functions['MANIFEST'];backup=private/'before-native-entry'
    assert value['backup']==str(backup) and backup.resolve()==backup and backup.stat().st_mode&0o777==0o700
    for name,digest in [('obergeschoss.wam',value['oldWamSha256']),('manifest.json',value['manifestBeforeSha256']),('probe.private.json',value['probeProofSha256'])]:
        item=backup/name;assert item.resolve()==item and item.stat().st_mode&0o777==0o600 and sha(item.read_bytes())==digest
    original=json.loads((backup/'obergeschoss.wam').read_text());original['mapUrl']=functions['SOURCE']
    assert json.loads(target.read_text())==original and sha(target.read_bytes())==value['newWamSha256']
    original_manifest=json.loads((backup/'manifest.json').read_text());original_manifest['files']['obergeschoss.wam']=value['newWamSha256']
    manifest_raw=manifest.read_bytes()
    museum=Path('/opt/wvh-castle-content/private/museum-tour-deployment.json')
    if museum.exists():
        addition=json.loads(museum.read_text());assert addition['passed'] and addition['provisional'] is False
        previous=Path('/opt/wvh-castle-content/private/before-museum-tour/manifest.json');assert previous.resolve()==previous and previous.stat().st_mode&0o777==0o600
        archived=previous.read_bytes();assert sha(archived)==addition['manifestBeforeSha256'] and sha(manifest_raw)==addition['manifestAfterSha256']
        projected=json.loads(archived);projected['files']['museum.wam']=addition['newWamSha256']
        assert json.loads(manifest_raw)==projected
        # Verify the earlier gallery milestone against its exact retained manifest;
        # the separate museum verifier below checks the accepted current transition.
        manifest_raw=archived
    assert json.loads(manifest_raw)==original_manifest and sha(manifest_raw)==value['manifestAfterSha256']
    after=json.loads(json.dumps(expected));after['files'][str(target)]=value['newWamSha256'];after['files'][str(manifest)]=value['manifestAfterSha256']
    assert value['after']==after and value['previewMapsChanged']==['obergeschoss.wam']
    stage_raw=(private/'native-entry-stage.json').read_bytes();staged=json.loads(stage_raw)
    assert sha(stage_raw)==value['stageReceiptSha256'] and staged['provisional'] and staged['before']==expected and staged['after']==after
    assert all(value[key]==item for key,item in staged.items() if key!='provisional')
    probe_raw=(private/'native-probe.json').read_bytes();probe=json.loads(probe_raw)
    cleanup_raw=(private/'native-probe-cleanup.json').read_bytes();cleanup=json.loads(cleanup_raw)
    assert sha(probe_raw)==value['probeStageSha256'] and probe['original']==expected
    assert sha(cleanup_raw)==value['probeCleanupSha256'] and cleanup['stageReceiptSha256']==sha(probe_raw)
    assert cleanup['passed'] and cleanup['stopped'] and cleanup['probeRemoved'] and cleanup['existingMapsAndServicesUnchanged']
    assert not (functions['STORAGE']/'zimmerprobe.wam').exists()
    functions['proof'](json.loads((backup/'probe.private.json').read_text()))
    browser_raw=(private/'native-entry-browser.private.json').read_bytes();browser=json.loads(browser_raw)
    assert sha(browser_raw)==value['publicNativeBrowserProofSha256'];functions['proof'](browser,preview=True)
    assert browser['candidateMapSha256']==value['sourceSha256'] and browser['entryScriptSha256']==value['entryScriptSha256']
    files={**probe['sourcePublication']['files'],**value['publication']['files']}
    assert len(files)==6 and files['castle/obergeschoss-homes.tmj']==value['sourceSha256'] and files['castle/upper-gallery.bundle.js']==value['entryScriptSha256']
    for name,digest in files.items():
        with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/'+name+'?v=20261111-homes2',timeout=20) as response:assert sha(response.read(2000000))==digest
    control=private/'control-renewal-deployment.json'
    processes=json.loads(control.read_text())['processesAfter'] if control.exists() else homes_control_processes(ops,value)
    assert functions['processes']()==processes
    return after,True


def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');wam=runpy.run_path('/tmp/wvh-deploy-castle-piano-wam.py');sha=ops['sha'];private=ops['PRIVATE']
    actual_ops=ops;recovery_helper=Path('/tmp/wvh-castle-round-recovery-ops.py');assert recovery_helper.resolve()==recovery_helper
    assert sha(recovery_helper.read_bytes())=='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
    recovery_functions=runpy.run_path(str(recovery_helper));ops,recovery=recovery_functions['historical'](ops)
    deployment=json.loads((private/'deployment.json').read_text());wrapped=json.loads((private/'music-wrapper-deployment.json').read_text())
    ui=json.loads(Path('/opt/wvh-castle-school/private/round-ui-events-deployment.json').read_text())
    native_path=Path('/home/wilhelm/.cache/wvh-school-qa/piano-native-live-proof.private.json')
    assert native_path.resolve()==native_path and native_path.parent.stat().st_mode&0o777==0o700;native_path.chmod(0o600)
    native_raw=native_path.read_bytes();native=json.loads(native_raw);wam['proof'](native,live=True);assert native['routed']==[] and native['browserVersion'].startswith('157.')
    assert deployment['release']=='8a1f180e9b723ef1' and ui['release']=='b7020b16c96c065f'
    stage=json.loads(ops['RECORD'].read_text());assert stage['stopped'] and not ops['exists'](ops['NAME']) and not ops['run']('ss','-ltnH','sport = :13241').strip()
    current=ops['inspect']('wvh-castle-piano');assert current['Id']==deployment['containerId'] and current['Image']==deployment['image']
    assert current['State']['Health']['Status']=='healthy' and current['HostConfig']['ReadonlyRootfs'] and current['Config']['User']=='1000:1000'
    release=Path(deployment['release_path']);assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(deployment['files'])
    assert len(deployment['files'])==58 and all(sha((release/name).read_bytes())==digest for name,digest in deployment['files'].items())
    expected=json.loads(json.dumps(deployment['before']));nginx=str(ops['PROTECTED'][0]);expected['files'][nginx]=ui['nginx_after_sha256']
    for name in ['musikzimmer.wam']:
        path='/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview/'+name;expected['files'][path]=wrapped['newWamSha256']
    manifest='/opt/wvh-hall-audio/private/castle-wams.manifest.json';expected['files'][manifest]=wrapped['after']['files'][manifest]
    assert expected==wrapped['after'],'Historical piano acceptance differs'
    health_path=Path('/opt/wvh-hall-audio/private/health-maintenance.json');health_repair=False
    if health_path.exists():
        assert health_path.resolve()==health_path and health_path.stat().st_mode&0o777==0o600
        repair=json.loads(health_path.read_text());assert repair['passed'] and repair['before']==expected
        before,after=repair['before'],repair['after'];name='wvh-hall-audio'
        assert before['files']==after['files'] and {k:v for k,v in before['services'].items() if k!=name}=={k:v for k,v in after['services'].items() if k!=name}
        hall=ops['inspect'](name)
        assert hall['Id']==repair['gatewayAfterId']==after['services'][name]['id'] and hall['Image']==repair['image']
        assert hall['Config']['Healthcheck']==repair['healthConfig'] and hall['State']['Health']['Status']=='healthy'
        assert hashlib.sha256(json.dumps(hall['Config'],sort_keys=True).encode()).hexdigest()==repair['configAfterSha256']
        assert hashlib.sha256(json.dumps(hall['HostConfig'],sort_keys=True).encode()).hexdigest()==repair['hostConfigSha256']
        assert all(sha(Path(path).read_bytes())==digest for path,digest in {**repair['applicationFiles'],**repair['protectedFiles']}.items())
        assert ops['inspect'](repair['rollbackContainer'])['Id']==repair['gatewayBeforeId'] and not ops['inspect'](repair['rollbackContainer'])['State']['Running']
        expected=after;health_repair=True
    expected,school_admission=verify_school_admission(ops,expected)
    expected,homes_pilot=verify_homes_pilot(ops,expected)
    expected,homes_native=verify_homes_native_entry(ops,expected)
    museum=Path('/tmp/wvh-check-castle-museum-deployment.py');assert museum.resolve()==museum
    assert sha(museum.read_bytes())=='7ea09b480cfddae730ebdcc2b8638811cf904a52c81bd8a573346aef5f740203'
    expected,museum_tour=runpy.run_path(str(museum))['verify'](ops,expected)
    if recovery is not None:
        assert expected==recovery['before'];recovery_functions['verified'](actual_ops)
        expected=recovery['after'];ops=actual_ops
    assert ops['baseline']()==expected,'An unrelated protected file or existing service changed'
    assert ui['nginx_before_sha256']==deployment['nginx_after_sha256']
    for route,name in [('presence','presence.html'),('rounds','rounds.html'),('unowned-ui.js','unowned-ui.js')]:
        status,raw,headers=request('/castle-school/'+route);assert status==200 and sha(raw)==ui['files'][name]
        assert headers['Cache-Control']=='no-store' and "frame-ancestors 'self'" in headers['Content-Security-Policy']
    for route in ['','piano.js','audio.js','projection.js','keys.css','credits.html','vendor/tone.js']:
        status,raw,headers=request('/castle-piano/'+route);assert status==200 and raw==(release/('castle-piano/public/'+(route or 'index.html'))).read_bytes()
        assert headers['Cache-Control']=='no-store' and "worker-src 'none'" in headers['Content-Security-Policy']
    assert request('/castle-piano/session',{})[0]==401 and request('/castle-piano/server.cjs')[0]==404 and request('/castle-school/round-context')[0]==401
    for path in ['/castle-piano/health','/castle-school/health']:
        status,raw,_=request(path);assert status==200 and json.loads(raw)=={'ready':True}
    publication=json.loads(Path('/tmp/wvh-castle-runtime-publication.json').read_text());assert publication['passed'] and len(publication['files'])==29
    sources={item['file']:item['sha256'] for item in publication['files']};assert publication['head']==wrapped['sourceCommit']
    for name,digest in native['sourceFiles'].items():
        assert sources['castle/'+name]==digest
        with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/castle/'+name+'?v='+publication['head'][:12],timeout=20) as response:assert sha(response.read(2000000))==digest
    ops['atomic'](private/'accepted-native-live-proof.json',native)
    result={'passed':True,'release':deployment['release'],'helperRelease':ui['release'],'sourceCommit':publication['head'],
      'nativeLiveProofSha256':sha(native_raw),'normalMicrosoftPupils':2,'mouseAndMobileTouch':True,'parallelTableSpeechDecodedBoth':True,
      'onlyMusicPreviewWrapperChanged':not homes_native,'homesNativePreviewEntryVerified':homes_native,
      'onlyAcceptedPreviewWrapperTransitions':True,'existingContainersAndOtherMapsUnchanged':not health_repair and not school_admission and not homes_native,
      'allOtherServicesPreservedExceptVerifiedHallHealthRepair':not school_admission,
      'allOtherServicesPreservedExceptVerifiedMaintenance':True,'schoolAdmissionVerified':school_admission,'homesPilotVerified':homes_pilot,
      'hallHealthRepairVerified':health_repair,'historicalManifestsPreserved':True,
      'homesSoleAdministratorModerationVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/moderation-deployment.json').exists(),
      'homesLosslessCachedMediaVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/media-deployment.json').exists(),
      'homesProgressiveRoomMediaVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/progressive-deployment.json').exists(),
      'homesIndependentRuntimeVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/owned-runtime-deployment.json').exists(),
      'homesIsolatedRuntimeRecoveryVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/owned-runtime-recovery.json').exists(),
      'homesOptionalPrivateCallsVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/calls-deployment.json').exists(),
      'homesIndependentControlRenewalVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/control-renewal-deployment.json').exists(),
      'museumSharedSelectionVerified':museum_tour,
      'roundRecoveryBrowserModulesVerified':recovery is not None,
      'permissionsAndAuthenticationUnchanged':not Path('/opt/wvh-castle-homes/private/calls-deployment.json').exists(),
      'schoolPermissionsAndAuthenticationUnchanged':True,
      'mediaPermissionsChangedOnlyInRoomPilot':Path('/opt/wvh-castle-homes/private/calls-deployment.json').exists(),
      'stageStopped':True,'healthy':True,'loadApprovalFor400':False,
      'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    ops['atomic'](private/'published-acceptance.json',result);print(json.dumps(result,indent=2))
if __name__=='__main__':main()
