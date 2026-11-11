"""One scoped school-service transition, anchored in the accepted predecessor audit."""
import copy
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import runpy
import socket
import subprocess
import time
import urllib.error
import urllib.request

BASE=Path('/opt/wvh-castle-school');PRIVATE=BASE/'private'
NAME='wvh-castle-school'
SOURCE='8dc68e99c36dabfebc0714ec7124aaa7b19d935a130fcd3052fdf6a6229a6355'
RELEASE=BASE/'releases'/SOURCE[:16]
STAGE=PRIVATE/'game-host-publication-stage.json'
RECORD=PRIVATE/'game-host-deployment.json'
BACKUP=PRIVATE/('before-game-host-'+SOURCE[:16])
MANIFEST=PRIVATE/'deployment.json'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
AUDIT=Path('/tmp/wvh-check-castle-piano-deployment.py')
AUDIT_SHA='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
LIBRARY=Path('/tmp/wvh-check-castle-game-host-linux.py')
LIBRARY_SHA='afc370c1520a6d4ebe61a72258de586ec7e995d721f65fd4d6ec63d17a2c9b27'
BUNDLED=Path('/tmp/wvh-check-castle-game-host-bundled-linux.py')
BUNDLED_SHA='75458b18cdac57872303f7933e6bfdb463dec6e559377f9d57a58823f2a16271'
OLD_ALIAS=b'alias /opt/wvh-castle-round-ui/b7020b16c96c065f/rounds.html;'
NEW_ALIAS=('alias '+str(RELEASE/'castle-school/public/rounds.html')+';').encode()
ORIGIN='https://together.deine-schule.com'
CSP="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src https:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"
HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
         'X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'microphone=(), camera=(), display-capture=()',
         'Content-Security-Policy':CSP}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def encoded(value):return (json.dumps(value,indent=2)+'\n').encode()


def run(*args):
    result=subprocess.run(args,text=True,capture_output=True,timeout=45)
    if result.returncode:raise RuntimeError('Scoped school publication command failed; private details withheld')
    return result.stdout


def private(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    return path.read_bytes()


def load(path):return json.loads(private(path))


def write_new(path,raw):
    assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)


def checked(path,digest):
    assert path.resolve()==path and sha(path.read_bytes())==digest
    return runpy.run_path(str(path))


def processes():
    return {name:run('systemctl','show',name,'--property=MainPID,ExecMainStartTimestampMonotonic,ActiveState').strip()
            for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service','wvh-sterne-kollegium.service']}


def running():
    ids=run('docker','ps','-q').split();assert ids
    return {item['Name'].lstrip('/'):{'id':item['Id'],'started':item['State']['StartedAt'],'image':item['Image'],
        'restarts':item['RestartCount'],'configSha256':sha(json.dumps(item['Config'],sort_keys=True).encode()),
        'hostConfigSha256':sha(json.dumps(item['HostConfig'],sort_keys=True).encode())}
        for item in json.loads(run('docker','inspect',*ids))}


def alias(raw):
    assert raw.count(OLD_ALIAS)==1 and NEW_ALIAS not in raw
    assert raw.count(b'location = /castle-school/rounds {')==1
    return raw.replace(OLD_ALIAS,NEW_ALIAS)


def preserved(before,after,old_nginx,new_nginx,rollback=False):
    assert set(before)==set(after)=={'services','files'}
    assert set(before['services'])==set(after['services']) and NAME in before['services']
    assert {k:v for k,v in before['services'].items() if k!=NAME}=={k:v for k,v in after['services'].items() if k!=NAME}
    assert set(before['files'])==set(after['files'])
    changed={str(NGINX),str(MANIFEST)}
    assert {k:v for k,v in before['files'].items() if k not in changed}=={k:v for k,v in after['files'].items() if k not in changed}
    assert before['files'][str(NGINX)]==sha(old_nginx)
    if rollback:
        assert after['files']==before['files'] and after['services'][NAME]['id']==before['services'][NAME]['id']
    else:
        assert new_nginx==alias(old_nginx) and after['files'][str(NGINX)]==sha(new_nginx)
        assert after['services'][NAME]['id']!=before['services'][NAME]['id']
        assert after['files'][str(MANIFEST)]!=before['files'][str(MANIFEST)]


def preserved_running(before,after):
    assert set(before)==set(after) and NAME in before
    assert {k:v for k,v in before.items() if k!=NAME}=={k:v for k,v in after.items() if k!=NAME}


def release_files(path,files):
    assert path.resolve()==path and path.parent==BASE/'releases'
    entries=list(path.rglob('*'));assert not any(item.is_symlink() for item in entries)
    assert path.stat().st_uid==0 and path.stat().st_mode&0o777==0o755
    assert {item.relative_to(path).as_posix() for item in entries if item.is_file()}==set(files)
    for item in entries:
        assert item.stat().st_uid==0 and item.stat().st_mode&0o777==(0o755 if item.is_dir() else 0o644)
        if item.is_file():assert sha(item.read_bytes())==files[item.relative_to(path).as_posix()]


def evidence_inventory():
    # Frozen receipts are checkpointed, not rewritten to impersonate a new acceptance.
    result={}
    roots=[Path('/opt/wvh-castle-'+name+'/private') for name in ['school','piano','chess','art','content','homes']]
    roots.append(Path('/opt/wvh-hall-audio/private'))
    for root in roots:
        assert root.resolve()==root and root.is_dir()
        for path in root.iterdir():
            if not path.is_file() or path.suffix not in ['.json','.py','.conf']:continue
            if path==MANIFEST or root==PRIVATE and path.name.startswith('game-host-'):continue
            assert path.resolve()==path and not path.is_symlink() and path.stat().st_size<8000000
            result[str(path)]=sha(path.read_bytes())
    assert len(result)>=20
    return result


def verify_inventory(files):
    assert type(files) is dict and len(files)>=20
    for name,digest in files.items():
        path=Path(name);assert path.is_absolute() and path.resolve()==path
        assert path.parent.name=='private' and path.parent.parent.parent==Path('/opt')
        assert re.fullmatch(r'wvh-(?:castle-(?:school|piano|chess|art|content|homes)|hall-audio)',path.parent.parent.name)
        assert path.is_file() and path.stat().st_size<8000000 and sha(path.read_bytes())==digest


def preflight(ops):
    bundled=checked(BUNDLED,BUNDLED_SHA);library=checked(LIBRARY,LIBRARY_SHA)
    source,payload=library['archive'](bundled['SOURCE'],SOURCE,bundled['SOURCE_DESCRIPTOR'],bundled['SOURCE_DESCRIPTOR_SHA'])
    old=load(MANIFEST)
    assert len(payload)==42 and set(payload)==set(old['files'])
    assert {name for name in payload if sha(payload[name])!=old['files'][name]}==library['CHANGED']
    linux=PRIVATE/('game-host-linux-'+SOURCE[:16]+'-attempt-1.json');linux_value=load(linux)
    assert linux_value['passed'] and linux_value['tests']==41 and linux_value['archiveSha256']==SOURCE
    assert linux_value['before']==linux_value['after']==ops['baseline']() and linux_value['files']==source['files']
    assert sha(private(linux.with_suffix('.private.log')))==linux_value['testLogSha256']
    native=PRIVATE/('game-host-native-acceptance-'+SOURCE[:16]+'.json');value=load(native)
    assert value['passed'] and not value['published'] and value['sourceArchiveSha256']==SOURCE
    assert value['normalMicrosoftPupils']==2 and value['realDecodedTableAudioBothAtFourPoints']
    assert value['syntheticProviderCatalogOnlyInStage'] and not value['realProviderTested'] and not value['loadApprovalFor400']
    assert value['temporaryStageAndIdentifierEnvironmentGone'] and value['before']==value['after']==ops['baseline']()
    folder=PRIVATE/('game-host-native-'+SOURCE[:16]+'-attempt-1')
    for name,key in [('stage.json','stageReceiptSha256'),('stopped.json','stoppedReceiptSha256')]:assert sha(private(folder/name))==value[key]
    assert sha(private(PRIVATE/('game-host-native-proof-'+SOURCE[:16]+'.json')))==value['nativeProofSha256']
    assert not (folder/'identifiers.env').exists() and not ops['exists']('wvh-castle-game-host-stage')
    for name in ['wvh-castle-game-host-qa','wvh-castle-admission-stage','wvh-castle-admission-qa']:assert not ops['exists'](name)
    assert not run('ss','-ltnH','sport = :13213').strip()
    recovery=load(PRIVATE/'round-recovery-deployment.json');assert recovery['passed'] and not recovery['provisional']
    for name,digest in recovery['files'].items():assert source['files']['castle-school/public/'+name]==digest
    return source,payload,{'linuxReceiptSha256':sha(private(linux)),'nativeReceiptSha256':sha(private(native))}


def stage(ops):
    assert not STAGE.exists() and not RECORD.exists() and not BACKUP.exists()
    checked(AUDIT,AUDIT_SHA)['main']()
    before=ops['baseline']();all_before=running();pids=processes();old=ops['inspect'](NAME)
    assert old['State']['Running'] and old['State']['Health']['Status']=='healthy'
    source,payload,proofs=preflight(ops);old_record=private(MANIFEST);old_nginx=NGINX.read_bytes();new_nginx=alias(old_nginx)
    files={name:sha(raw) for name,raw in payload.items()}
    assert RELEASE.resolve()==RELEASE
    if not RELEASE.exists():
        RELEASE.mkdir(mode=0o755);RELEASE.chmod(0o755)
        for name,raw in payload.items():
            path=RELEASE/name;path.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
            with path.open('xb') as handle:handle.write(raw)
            path.chmod(0o644)
        for path in RELEASE.rglob('*'):
            if path.is_dir():path.chmod(0o755)
    release_files(RELEASE,files)
    backup_name=NAME+'-before-game-host-'+old['Id'][:12];assert not ops['exists'](backup_name)
    prior_report=Path('/opt/wvh-castle-piano/private/published-acceptance.json');report=load(prior_report)
    assert report['passed'] and report['roundRecoveryBrowserModulesVerified'] and report['schoolAdmissionVerified']
    inventory=evidence_inventory()
    BACKUP.mkdir(mode=0o700)
    for name,raw in [('deployment.json',old_record),('nginx.conf',old_nginx),('container.private.json',encoded(old)),
                     ('audit.py',AUDIT.read_bytes()),('audit-result.json',private(prior_report))]:write_new(BACKUP/name,raw)
    assert ops['baseline']()==before and running()==all_before and processes()==pids
    value={'version':1,'passed':True,'published':False,'sourceArchiveSha256':SOURCE,'sourceCommit':source['sourceCommit'],
        'files':files,'release':str(RELEASE),'before':before,'runningBefore':all_before,'processes':pids,'rollbackContainer':backup_name,
        'predecessorAuditSha256':AUDIT_SHA,'predecessorAuditResultSha256':sha(private(prior_report)),
        'oldManifestSha256':sha(old_record),'oldNginxSha256':sha(old_nginx),'newNginxSha256':sha(new_nginx),
        'oldContainerSnapshotSha256':sha(private(BACKUP/'container.private.json')),'preservedEvidence':inventory,**proofs,
        'oldCastleReplaced':False,'providerRulesChanged':False,'fullCastleApprovalFor400':False,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    write_new(STAGE,encoded(value))
    print(json.dumps({'passed':True,'publicationStaged':True,'liveServiceChanged':False,'protectedEvidenceFiles':len(inventory)}))


def clone_spec(old):
    assert old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
    assert set(old['NetworkSettings']['Networks'])=={'workadventure_default'} and not old['HostConfig'].get('Binds')
    config=copy.deepcopy(old['Config']);config['Image']=old['Image'];config['Labels']['wvh.release']=SOURCE[:16]
    host=copy.deepcopy(old['HostConfig']);changed=0
    for mount in host['Mounts']:
        if mount['Target']=='/srv/release':
            assert mount['Type']=='bind' and mount['ReadOnly'];mount['Source']=str(RELEASE);changed+=1
    assert changed==1
    endpoint=old['NetworkSettings']['Networks']['workadventure_default']
    assert not endpoint.get('IPAMConfig') and not endpoint.get('Links') and not endpoint.get('DriverOpts')
    return {**config,'HostConfig':host,'NetworkingConfig':{'EndpointsConfig':{
        'workadventure_default':{'Aliases':endpoint.get('Aliases') or []}}}}


class DockerConnection(http.client.HTTPConnection):
    def __init__(self):super().__init__('localhost',timeout=12)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(12);self.sock.connect('/var/run/docker.sock')


def create(spec):
    connection=DockerConnection()
    try:
        connection.request('GET','/version');response=connection.getresponse();value=json.loads(response.read());assert response.status==200
        version=value['ApiVersion'];assert re.fullmatch(r'1\.\d+',version)
        connection.request('POST','/v'+version+'/containers/create?name='+NAME,body=json.dumps(spec).encode(),headers={'Content-Type':'application/json'})
        response=connection.getresponse();value=json.loads(response.read(65536));assert response.status==201
        assert re.fullmatch('[a-f0-9]{64}',value['Id']);return value['Id']
    finally:connection.close()


def request(route,method='GET'):
    req=urllib.request.Request(ORIGIN+'/castle-school/'+route,method=method)
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(2000000),response.headers


def public_files(files):
    names={name.removeprefix('castle-school/public/'):digest for name,digest in files.items() if name.startswith('castle-school/public/')}
    assert len(names)>=25
    for name,digest in names.items():
        route=name[:-5] if name in ['games.html','rounds.html','presence.html'] else name
        status,raw,headers=request(route);assert status==200 and sha(raw)==digest
        assert all(headers[key]==value for key,value in HEADERS.items())
        expected='text/html' if name.endswith('.html') else 'text/javascript' if name.endswith('.js') else 'text/css' if name.endswith('.css') else 'image/webp'
        assert headers.get_content_type()==expected
    for route in ['context','round-context']:
        status,raw,_=request(route);assert status==401 and json.loads(raw)=={'error':'unauthorized'}
    for route in ['round-game-confirm','round-game-end','round-game-launch']:
        status,raw,_=request(route,'POST');assert status==401 and json.loads(raw)=={'error':'unauthorized'}
    for route in ['games?not-allowed=1','rounds?not-allowed=1','presence.js?not-allowed=1','round-client.js?not-allowed=1']:
        assert request(route)[0]==404
    for route in ['rounds','presence.js','round-client.js']:assert request(route,'POST')[0]==405
    for route in ['runtime.env','rules.json','server.cjs','profile.php']:assert request(route)[0]==404
    status,raw,_=request('health');assert status==200 and json.loads(raw)=={'ready':True}


def ready(ops):
    until=time.monotonic()+35
    while time.monotonic()<until:
        current=ops['inspect'](NAME)
        if current['State']['Running'] and current['State'].get('Health',{}).get('Status')=='healthy':return current
        time.sleep(.5)
    raise RuntimeError('Scoped school healthcheck did not become ready')


def reload():
    run('nginx','-t');run('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');run('nginx','-t')


def stage_state(ops,value):
    assert value['version']==1 and value['passed'] and not value['published'] and value['sourceArchiveSha256']==SOURCE
    assert value['release']==str(RELEASE) and not value['oldCastleReplaced'] and not value['providerRulesChanged']
    assert value['predecessorAuditSha256']==AUDIT_SHA and sha(private(BACKUP/'audit.py'))==AUDIT_SHA
    assert sha(private(BACKUP/'audit-result.json'))==value['predecessorAuditResultSha256']
    assert load(BACKUP/'audit-result.json')['passed'] is True
    assert sha(private(BACKUP/'deployment.json'))==value['oldManifestSha256']
    assert sha(private(BACKUP/'nginx.conf'))==value['oldNginxSha256']
    assert sha(private(BACKUP/'container.private.json'))==value['oldContainerSnapshotSha256']
    assert sha(alias(private(BACKUP/'nginx.conf')))==value['newNginxSha256']
    release_files(RELEASE,value['files']);verify_inventory(value['preservedEvidence'])
    assert processes()==value['processes']
    for path,key in [(PRIVATE/('game-host-linux-'+SOURCE[:16]+'-attempt-1.json'),'linuxReceiptSha256'),
                     (PRIVATE/('game-host-native-acceptance-'+SOURCE[:16]+'.json'),'nativeReceiptSha256')]:assert sha(private(path))==value[key]


def rollback(ops,value,created,updated):
    old=load(BACKUP/'container.private.json');old_nginx=private(BACKUP/'nginx.conf');old_record=private(BACKUP/'deployment.json')
    assert NGINX.read_bytes() in [old_nginx,alias(old_nginx)]
    if NGINX.read_bytes()!=old_nginx:NGINX.write_bytes(old_nginx);reload()
    assert private(MANIFEST) in [old_record,updated]
    if private(MANIFEST)!=old_record:MANIFEST.write_bytes(old_record);MANIFEST.chmod(0o600)
    if ops['exists'](value['rollbackContainer']):
        backup=ops['inspect'](value['rollbackContainer']);assert backup['Id']==old['Id'] and backup['Config']==old['Config']
        if ops['exists'](NAME):
            current=ops['inspect'](NAME);spec=clone_spec(old)
            assert current['Id']!=old['Id'] and (created is None or current['Id']==created)
            assert current['Config']=={key:spec[key] for key in old['Config']} and current['HostConfig']==spec['HostConfig']
            run('docker','stop','-t','10',NAME);run('docker','rm',NAME)
        run('docker','rename',value['rollbackContainer'],NAME)
    assert ops['inspect'](NAME)['Id']==old['Id']
    if not ops['inspect'](NAME)['State']['Running']:run('docker','start',NAME)
    ready(ops);after=ops['baseline']();preserved(value['before'],after,old_nginx,old_nginx,True)
    preserved_running(value['runningBefore'],running());assert processes()==value['processes']
    receipt=PRIVATE/'game-host-publication-rollback.json';assert not receipt.exists()
    write_new(receipt,encoded({'passed':True,'restored':True,'before':value['before'],'after':after,
        'runningAfter':running(),'oldContainerIdPreserved':True,'schoolStartedAtMayChange':True,'otherServicesUnchanged':True}))


def verify_rollback(ops):
    assert not RECORD.exists();value=load(STAGE);stage_state(ops,value)
    receipt=load(PRIVATE/'game-host-publication-rollback.json')
    assert receipt['passed'] and receipt['restored'] and receipt['before']==value['before']
    assert ops['baseline']()==receipt['after'] and running()==receipt['runningAfter']
    old=load(BACKUP/'container.private.json');current=ops['inspect'](NAME)
    assert current['Id']==old['Id'] and current['Config']==old['Config'] and current['HostConfig']==old['HostConfig']
    assert current['State']['Running'] and current['State']['Health']['Status']=='healthy'
    assert private(MANIFEST)==private(BACKUP/'deployment.json') and NGINX.read_bytes()==private(BACKUP/'nginx.conf')
    preserved(value['before'],receipt['after'],NGINX.read_bytes(),NGINX.read_bytes(),True)
    preserved_running(value['runningBefore'],receipt['runningAfter'])
    status,raw,_=request('health');assert status==200 and json.loads(raw)=={'ready':True}
    assert request('context')[0]==401 and request('round-context')[0]==401
    print(json.dumps({'passed':True,'priorServiceRestored':True,'schoolRestartRecorded':True,'otherServicesAndMapsUnchanged':True}))


def verify(ops,fetch_public=True):
    value=load(STAGE);stage_state(ops,value);record=load(RECORD)
    assert record['version']==1 and record['passed'] and record['published'] and record['stageReceiptSha256']==sha(private(STAGE))
    assert record['sourceArchiveSha256']==SOURCE and record['before']==value['before']
    old=load(BACKUP/'container.private.json');previous=ops['inspect'](value['rollbackContainer']);current=ops['inspect'](NAME)
    assert previous['Id']==old['Id'] and not previous['State']['Running'] and previous['Config']==old['Config'] and previous['HostConfig']==old['HostConfig']
    assert current['Id']==record['containerId'] and current['Image']==old['Image'] and current['State']['Health']['Status']=='healthy'
    spec=clone_spec(old);assert current['Config']=={key:spec[key] for key in old['Config']} and current['HostConfig']==spec['HostConfig']
    assert set(current['NetworkSettings']['Networks'])=={'workadventure_default'}
    assert NGINX.read_bytes()==alias(private(BACKUP/'nginx.conf'))
    assert sha(private(MANIFEST))==record['newManifestSha256']
    manifest=load(MANIFEST);assert manifest['files']==value['files'] and manifest['release']==str(RELEASE) and manifest['archive_sha256']==SOURCE
    assert ops['baseline']()==record['after'] and running()==record['runningAfter']
    preserved(value['before'],record['after'],private(BACKUP/'nginx.conf'),NGINX.read_bytes())
    preserved_running(value['runningBefore'],record['runningAfter'])
    release_files(Path(load(BACKUP/'deployment.json')['release']),load(BACKUP/'deployment.json')['files'])
    if fetch_public:public_files(value['files'])
    assert ops['baseline']()==record['after'] and running()==record['runningAfter'] and processes()==value['processes']
    return record


def publish(ops):
    assert not RECORD.exists() and not (PRIVATE/'game-host-publication-rollback.json').exists()
    value=load(STAGE);stage_state(ops,value)
    assert ops['baseline']()==value['before'] and running()==value['runningBefore']
    old=ops['inspect'](NAME);saved=load(BACKUP/'container.private.json')
    assert old['Id']==saved['Id'] and old['Config']==saved['Config'] and old['HostConfig']==saved['HostConfig']
    assert old['State']['Running'] and old['State']['Health']['Status']=='healthy'
    assert not ops['exists'](value['rollbackContainer'])
    old_record=private(BACKUP/'deployment.json');old_nginx=private(BACKUP/'nginx.conf')
    assert private(MANIFEST)==old_record and NGINX.read_bytes()==old_nginx
    spec=clone_spec(old);created=None;updated=old_record;phase='school-restart'
    try:
        run('docker','stop','-t','15',NAME);run('docker','rename',NAME,value['rollbackContainer'])
        created=create(spec);run('docker','start',NAME);current=ready(ops)
        assert current['Id']==created and current['Config']=={key:spec[key] for key in old['Config']} and current['HostConfig']==spec['HostConfig']
        phase='rounds-html-alias';assert NGINX.read_bytes()==old_nginx;NGINX.write_bytes(alias(old_nginx));reload()
        phase='published-static-and-auth';public_files(value['files'])
        phase='unchanged-platform';preserved_running(value['runningBefore'],running());assert processes()==value['processes']
        verify_inventory(value['preservedEvidence'])
        manifest={**json.loads(old_record),'release':str(RELEASE),'archive_sha256':SOURCE,'files':value['files'],'source_files':42,
            'previous_release':json.loads(old_record)['release'],'previous_game_host_container':value['rollbackContainer'],
            'game_host_live':True,'game_host_source_commit':value['sourceCommit']}
        updated=encoded(manifest);assert private(MANIFEST)==old_record;MANIFEST.write_bytes(updated);MANIFEST.chmod(0o600)
        after=ops['baseline']();preserved(value['before'],after,old_nginx,NGINX.read_bytes())
        record={'version':1,'passed':True,'published':True,'sourceArchiveSha256':SOURCE,'sourceCommit':value['sourceCommit'],
            'stageReceiptSha256':sha(private(STAGE)),'containerId':created,'newManifestSha256':sha(updated),
            'before':value['before'],'after':after,'runningAfter':running(),'onlySchoolServiceReplaced':True,
            'onlyRoundsHtmlAliasChanged':True,'recoveryAliasesPreserved':True,'oldCastleReplaced':False,
            'providerRulesChanged':False,'voluntaryRoundRegistrationsReset':True,'nativePublishedAcceptancePending':True,
            'fullCastleApprovalFor400':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        write_new(RECORD,encoded(record));verify(ops)
        print(json.dumps({key:record[key] for key in ['passed','published','onlySchoolServiceReplaced','onlyRoundsHtmlAliasChanged',
            'oldCastleReplaced','providerRulesChanged','voluntaryRoundRegistrationsReset','nativePublishedAcceptancePending']}))
    except BaseException as error:
        failure=PRIVATE/'game-host-publication-failure.json'
        if not failure.exists():write_new(failure,encoded({'passed':False,'phase':phase,'errorType':type(error).__name__}))
        if RECORD.exists():
            assert load(RECORD)['containerId']==created
            RECORD.rename(PRIVATE/'game-host-publication-failed-record.json')
        rollback(ops,value,created,updated)
        raise RuntimeError('Scoped publication failed; prior service and routing restored with a retained restart receipt') from None


def main(action):
    os.umask(0o077);assert PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o700
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    assert action in ['stage','publish','verify','verify_rollback']
    if action=='verify':
        value=verify(ops);print(json.dumps({'passed':True,'gameHostPublicationVerified':True,'predecessorCheckpointVerified':True,
            'onlySchoolServiceReplaced':True,'otherServicesAndMapsUnchanged':True,'realProviderStudentApproval':False,
            'nativePublishedAcceptancePending':value['nativePublishedAcceptancePending'],'fullCastleApprovalFor400':False}))
    else:globals()[action](ops)
