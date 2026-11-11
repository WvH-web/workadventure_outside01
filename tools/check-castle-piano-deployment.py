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

def homes_moderation_transition(ops,initial,initial_raw):
    root=Path('/opt/wvh-castle-homes');private=root/'private';path=private/'moderation-deployment.json';sha=ops['sha']
    if not path.exists():return lambda name:Path(name).read_bytes()
    assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    value=json.loads(path.read_text());assert value['passed'] and value['version']==2 and value['initialReceiptSha256']==sha(initial_raw)
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
        current=Path(name);assert current.resolve()==current and sha(current.read_bytes())==value['changedFiles'][name]
        stat=current.stat();assert (stat.st_mode&0o777,stat.st_uid,stat.st_gid)==(backup['mode'],backup['uid'],backup['gid'])
    old_release=Path(initial['release'])
    assert unit.read_bytes()==originals[str(unit)].replace(str(old_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    subjects=value['moderatorSubjects'];assert len(subjects)==1 and re.fullmatch('wvh:staff:[1-9][0-9]{0,15}',subjects[0])
    old_config=json.loads(originals[str(credential)]);config=json.loads(credential.read_text())
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
    assert value['route']==route and Path(nginx).read_bytes()==old+b'\n'+route.encode()
    assert sha(Path(nginx).read_bytes())==value['nginxAfterSha256']==after['files'][nginx]
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


def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');wam=runpy.run_path('/tmp/wvh-deploy-castle-piano-wam.py');sha=ops['sha'];private=ops['PRIVATE']
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
      'onlyMusicPreviewWrapperChanged':True,'existingContainersAndOtherMapsUnchanged':not health_repair and not school_admission,
      'allOtherServicesPreservedExceptVerifiedHallHealthRepair':not school_admission,
      'allOtherServicesPreservedExceptVerifiedMaintenance':True,'schoolAdmissionVerified':school_admission,'homesPilotVerified':homes_pilot,
      'hallHealthRepairVerified':health_repair,'historicalManifestsPreserved':True,
      'homesSoleAdministratorModerationVerified':homes_pilot and Path('/opt/wvh-castle-homes/private/moderation-deployment.json').exists(),
      'permissionsAndAuthenticationUnchanged':True,'stageStopped':True,'healthy':True,'loadApprovalFor400':False,
      'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    ops['atomic'](private/'published-acceptance.json',result);print(json.dumps(result,indent=2))
if __name__=='__main__':main()
