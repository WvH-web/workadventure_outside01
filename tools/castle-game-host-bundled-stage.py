"""Restricted loopback-only native preflight; real school lookup, synthetic provider catalog."""
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import time
import urllib.error
import urllib.request

PRIVATE=Path('/opt/wvh-castle-school/private')
NAME='wvh-castle-game-host-stage';PORT=13213
SOURCE='8dc68e99c36dabfebc0714ec7124aaa7b19d935a130fcd3052fdf6a6229a6355'
LINUX=Path('/tmp/wvh-check-castle-game-host-bundled-linux.py')
LINUX_SHA='75458b18cdac57872303f7933e6bfdb463dec6e559377f9d57a58823f2a16271'
BOOTSTRAP=Path('/tmp/wvh-castle-game-host-stage.cjs')
BOOTSTRAP_SHA='25fc46774877a28e7cbf792f3d72a7999f1a1066ef8108ecaa09abe027ce8b7d'
IDENTIFIERS=Path('/home/wilhelm/.cache/wvh-school-qa/game-host-identifiers.private.json')
AUDIT=Path('/tmp/wvh-check-castle-piano-deployment.py')
AUDIT_SHA='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
RECOVERY=Path('/tmp/wvh-castle-round-recovery-ops.py')
RECOVERY_SHA='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
OPERATOR=Path('/tmp/wvh-castle-game-host-bundled-stage.py')
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def pinned(path,digest):
    assert path.resolve()==path and path.is_file() and sha(path.read_bytes())==digest
    return runpy.run_path(str(path))


def context():
    os.umask(0o077);assert PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o700
    return runpy.run_path('/tmp/wvh-castle-piano-ops.py'),pinned(RECOVERY,RECOVERY_SHA)


def paths(attempt):
    assert type(attempt) is int and 1<=attempt<=9
    folder=PRIVATE/('game-host-native-'+SOURCE[:16]+'-attempt-'+str(attempt))
    return folder,folder/'stage.json',folder/'stopped.json'


def same_scope(before,processes,ops,recovery):
    assert ops['baseline']()==before and recovery['processes'](ops)==processes


def request(route):
    try:response=urllib.request.urlopen('http://127.0.0.1:'+str(PORT)+'/castle-school/'+route,timeout=3)
    except urllib.error.HTTPError as error:response=error
    assert response.headers['X-Castle-Test-Catalog']=='synthetic-loopback-only'
    return response.status,json.loads(response.read(10000))


def ready():
    for _ in range(40):
        try:
            if request('health')==(200,{'ready':True}):
                assert request('round-context')==(401,{'error':'unauthorized'});return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Restricted native preflight readiness failed')


def start(attempt=1):
    ops,recovery=context();pinned(AUDIT,AUDIT_SHA)['main']();before=ops['baseline']();processes=recovery['processes'](ops)
    folder,record,stopped=paths(attempt)
    assert folder.resolve()==folder and not folder.exists() and not ops['exists'](NAME)
    assert not ops['run']('ss','-ltnH','sport = :'+str(PORT)).strip()
    linux=pinned(LINUX,LINUX_SHA);proof_path=PRIVATE/('game-host-linux-'+SOURCE[:16]+'-attempt-1.json')
    assert proof_path.resolve()==proof_path and proof_path.stat().st_mode&0o777==0o600
    proof_raw=proof_path.read_bytes();proof=json.loads(proof_raw)
    assert proof['passed'] and proof['tests']==41 and proof['networkDisabled'] and not proof['published'] and proof['archiveSha256']==SOURCE
    assert proof['before']==proof['after']==before and not proof['schoolKeysMounted'] and proof['temporaryContainerRemoved']
    library=pinned(linux['LIBRARY'],linux['LIBRARY_SHA'])
    source,payload=library['archive'](linux['SOURCE'],SOURCE,linux['SOURCE_DESCRIPTOR'],linux['SOURCE_DESCRIPTOR_SHA'])
    assert source['files']==proof['files']
    release=PRIVATE/('game-host-linux-'+SOURCE[:16])/'ops'
    assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(payload)
    assert all((release/name).read_bytes()==raw for name,raw in payload.items())
    assert BOOTSTRAP.resolve()==BOOTSTRAP and sha(BOOTSTRAP.read_bytes())==BOOTSTRAP_SHA
    assert OPERATOR.resolve()==OPERATOR and OPERATOR.is_file()
    assert IDENTIFIERS.resolve()==IDENTIFIERS and IDENTIFIERS.parent.stat().st_mode&0o777==0o700
    raw=IDENTIFIERS.read_bytes();data=json.loads(raw)
    assert set(data)=={'identifiers'} and len(data['identifiers'])==len(set(data['identifiers']))==2
    assert all(isinstance(id,str) and id==id.lower() and len(id)<255 and re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',id) for id in data['identifiers'])
    old=ops['inspect']('wvh-castle-school');assert old['State']['Health']['Status']=='healthy' and old['Image']==proof['image']
    all_before=ops['run']('docker','ps','-q').split()
    memory=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
    disk=os.statvfs(PRIVATE);assert int(memory['MemAvailable'].split()[0])>750000 and disk.f_bavail*disk.f_frsize>512*1024**2
    folder.mkdir(mode=0o700);bootstrap=folder/'bootstrap.cjs';bootstrap.write_bytes(BOOTSTRAP.read_bytes());bootstrap.chmod(0o644)
    operator=folder/'operator.py';operator.write_bytes(OPERATOR.read_bytes());operator.chmod(0o600)
    environment=folder/'identifiers.env';env_raw=('CASTLE_TEST_IDENTIFIERS='+json.dumps(data['identifiers'],separators=(',',':'))+'\n').encode()
    environment.write_bytes(env_raw);environment.chmod(0o600);IDENTIFIERS.unlink()
    created=None
    try:
        created=ops['run']('docker','run','-d','--name',NAME,'--network','workadventure_default','--workdir','/srv/release','--user','1000:1000',
            '-p','127.0.0.1:'+str(PORT)+':3211','--env-file',str(PRIVATE/'runtime.env'),'--env-file',str(environment),
            '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
            '--mount','type=bind,src='+str(bootstrap)+',dst=/srv/host-stage.cjs,readonly',
            '--label','wvh.component=castle-game-host-native','--label','wvh.release='+SOURCE[:16],
            '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
            '--memory','256m','--cpus','0.5','--pids-limit','128','--log-opt','max-size=2m','--log-opt','max-file=2',
            '--entrypoint','node',old['Image'],'/srv/host-stage.cjs').strip()
        ready();same_scope(before,processes,ops,recovery)
        assert set(ops['run']('docker','ps','-q').split())==set(all_before)|{created[:12]}
        value={'passed':True,'name':NAME,'containerId':created,'attempt':attempt,'release':str(release),'archiveSha256':SOURCE,
            'files':source['files'],'linuxReceiptSha256':sha(proof_raw),'operatorSha256':sha(operator.read_bytes()),'bootstrapSha256':BOOTSTRAP_SHA,
            'identifierHandoffSha256':sha(raw),'environmentSha256':sha(env_raw),'before':before,'processes':processes,'runningBefore':all_before,
            'image':old['Image'],'port':PORT,'normalSchoolAuthenticationAndLookup':True,'syntheticCatalogOnlyInLoopbackStage':True,
            'approvedSyntheticAccounts':2,'realProviderTested':False,'published':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](record,value)
        print(json.dumps({'passed':True,'stageRunning':True,'loopbackPort':PORT,'approvedSyntheticAccounts':2,'realSchoolLookup':True,
            'syntheticCatalogOnlyInLoopbackStage':True,'existingPlatformUnchanged':True,'published':False}))
    except BaseException:
        if created and ops['exists'](NAME):
            current=ops['inspect'](NAME);assert current['Id']==created
            log=folder/'startup-failure.private.log';log.write_text(ops['run']('docker','logs',NAME));log.chmod(0o600)
            ops['run']('docker','stop','-t','8',NAME);ops['run']('docker','rm',NAME)
        assert environment.read_bytes()==env_raw;environment.unlink();same_scope(before,processes,ops,recovery);raise


def stop(attempt=1):
    ops,recovery=context();folder,record,stopped=paths(attempt)
    assert record.resolve()==record and record.stat().st_uid==0 and record.stat().st_mode&0o777==0o600 and not stopped.exists()
    value=json.loads(record.read_bytes());assert value['passed'] and value['name']==NAME and value['archiveSha256']==SOURCE
    if ops['exists'](NAME):
        current=ops['inspect'](NAME)
        assert current['Id']==value['containerId'] and current['Image']==value['image']
        assert current['Config']['Labels']['wvh.component']=='castle-game-host-native' and current['Config']['Labels']['wvh.release']==SOURCE[:16]
        ops['run']('docker','stop','-t','8',NAME);ops['run']('docker','rm',NAME)
    assert not ops['run']('ss','-ltnH','sport = :'+str(PORT)).strip()
    environment=folder/'identifiers.env';assert environment.resolve()==environment and sha(environment.read_bytes())==value['environmentSha256'];environment.unlink()
    same_scope(value['before'],value['processes'],ops,recovery);assert set(ops['run']('docker','ps','-q').split())==set(value['runningBefore'])
    pinned(AUDIT,AUDIT_SHA)['main']()
    ops['atomic'](stopped,{'passed':True,'stopped':True,'stageReceiptSha256':sha(record.read_bytes()),'temporaryIdentifierEnvironmentRemoved':True,
        'before':value['before'],'after':ops['baseline'](),'processes':value['processes'],'published':False})
    print(json.dumps({'passed':True,'stopped':True,'temporaryIdentifierEnvironmentRemoved':True,'existingPlatformAndMapsUnchanged':True}))
