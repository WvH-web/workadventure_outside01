"""Publish two immutable browser modules without restarting services or losing rounds."""
import hashlib
import json
import math
import os
from pathlib import Path
import runpy
import time
import urllib.error
import urllib.request
import zipfile

PRIVATE=Path('/opt/wvh-castle-school/private')
RECORD=PRIVATE/'round-recovery-deployment.json'
STAGE=PRIVATE/'round-recovery-stage.json'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
BASE=Path('/opt/wvh-castle-round-recovery')
ARCHIVE=Path('/tmp/wvh-castle-round-recovery.zip')
DESCRIPTOR=Path('/tmp/wvh-castle-round-recovery.json')
FILES={'presence.js':'656cf5299e54638e7783ba49ad2a0cabad99755bf79d8ef5f8ecef3a70076527',
       'round-client.js':'079ab731cff983d85ce105fec1fed84b16fef4515ea0eb517ba867ebc417b186'}
OLD_FILES={'presence.js':'404bc8f0ef490e5e9bca07b0daec53878693f9557b34733bc644c62e36156fe6',
           'round-client.js':'24d7d9c31a2e3959b0ea14c86e92d8064e1ae7c74cf096a09861a0f6a49d7668'}
FAILURES=['round-recovery-failure.json','round-recovery-failure-2.json','round-recovery-failure-3.json']
CSP="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src https:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"
HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN',
         'Permissions-Policy':'microphone=(), camera=(), display-capture=()','Content-Security-Policy':CSP}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def route(target):
    assert target.resolve()==target and target.parent==BASE and len(target.name)==16 and all(c in '0123456789abcdef' for c in target.name)
    block='\n# BEGIN WVH CASTLE ROUND RECOVERY '+target.name+'\n'
    for name in sorted(FILES):
        block+='location = /castle-school/'+name+' {\n    alias '+str(target/name)+';\n    types { }\n    default_type text/javascript;\n    charset utf-8;\n'
        block+='    if ($args != "") { return 404; }\n    if ($request_method != GET) { return 405; }\n'
        for key,value in HEADERS.items():block+='    add_header '+key+' "'+value+'" always;\n'
        block+='}\n'
    return (block+'# END WVH CASTLE ROUND RECOVERY '+target.name+'\n').encode()


def transition(before,after):
    assert set(before)==set(after)=={'services','files'} and before['services']==after['services']
    assert set(before['files'])==set(after['files']) and str(NGINX) in before['files']
    assert before['files'][str(NGINX)]!=after['files'][str(NGINX)]
    assert {p:h for p,h in before['files'].items() if p!=str(NGINX)}=={p:h for p,h in after['files'].items() if p!=str(NGINX)}


def audio(value):
    assert type(value) is dict and len(value['before'])==len(value['after'])==2
    assert type(value['connectionAndAudioWaitMilliseconds']) is int and 0<value['connectionAndAudioWaitMilliseconds']<=27000
    for before,after in zip(value['before'],value['after']):
        assert all(type(row['energy']) in [int,float] and math.isfinite(row['energy']) and row['energy']>=0 for row in [before,after])
        assert after['energy']>before['energy']
    assert any(room.endswith('area-lesekamin') and room in value['after'][1]['rooms'] for room in value['after'][0]['rooms'])


def proof(value,candidate):
    assert value['passed'] is True and value['errors']==[] and value['realNativeWorkAdventure'] is True and value['publishedPreview'] is True
    assert value['stageOnly'] is False and value['mapsModifiedOnlyInsideTestBrowsers'] is False and value['realClassOverrideOnlyInStage'] is False
    assert value['productionSchoolAndWebConfigChanged'] is False and value['loadApprovalFor400'] is False
    rows={row['case']:row for row in value['results']};assert len(value['results'])==len(rows)==3
    library=rows['native-library'];assert library['normalMicrosoftPupils']==2
    assert all(library[key] is True for key in ['oneMobileTouch','tableAudioDecodedBoth','directoryDoesNotMuteConversation','onePixelPrivateBridge','realGradeFiltering','stageClassOverrideNotPublished','creatorDepartureKeepsPeer','explicitReentryWorks','heartbeatWithoutOpenDirectory'])
    assert all(rows['native-travel'][key] is True for key in ['crossMapArrivalReauthorized','visitReleasesPreviousMembership','lastPhysicalDepartureRemovesAnnouncement','normalMovementAfterClosure','nonblankNativeCanvas','noSeatOrGameClaimed'])
    assert all(rows['bounded-recovery'][key] is True for key in ['oneExplicitPreAdmission503','sameLeaseRetained','noCachedDeadlineExtension','freshRealServerRenewal','noCreateOrJoinReplay'])
    assert rows['bounded-recovery']['noModuleInterception'] is (not candidate)
    recovery=value['recovery'];assert recovery['candidate'] is candidate and recovery['moduleInterception'] is candidate
    assert recovery['mapInterception'] is False and recovery['schoolDecisionInterception'] is False
    assert recovery['explicitFaultInjection']=={'route':'round-heartbeat','status':503,'count':1} and recovery['moduleSha256']==FILES
    assert recovery['observed']=={str(number)+':'+name:digest for number in [1,2] for name,digest in FILES.items()}
    audio(value['audio']);audio(recovery['audio'])


def read(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();return raw,json.loads(raw)


def processes(ops):
    return {name:ops['run']('systemctl','show',name,'--property=MainPID,ExecMainStartTimestampMonotonic,ActiveState').strip()
            for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service','wvh-sterne-kollegium.service']}


def request(name,method='GET'):
    req=urllib.request.Request('https://together.deine-schule.com/castle-school/'+name,method=method)
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(100000),response.headers


class StaticCheckError(RuntimeError):
    def __init__(self,observed):super().__init__('Static route check failed');self.observed=observed


class PendingRoutes(StaticCheckError):pass


def public_files():
    for name,digest in FILES.items():
        status,raw,headers=request(name);observed={'file':name,'status':status,'sha256':sha(raw),'headers':{key:headers.get_all(key) for key in [*HEADERS,'Content-Type','Server','CF-Cache-Status','Age']}}
        if status!=200 or not all(headers[key]==value for key,value in HEADERS.items()) or headers.get_content_type()!='text/javascript':raise StaticCheckError(observed)
        if sha(raw)==OLD_FILES[name]:raise PendingRoutes(observed)
        if sha(raw)!=digest:raise StaticCheckError(observed)
        checks={'queryStatus':request(name+'?not-allowed=1')[0],'postStatus':request(name,'POST')[0]}
        if checks!={'queryStatus':404,'postStatus':405}:raise StaticCheckError({**observed,**checks})
    assert request('round-context')[0]==401 and request('context')[0]==401


def wait_public():
    until=time.monotonic()+20;samples=[]
    while True:
        try:public_files();return samples
        except PendingRoutes as error:
            samples.append(error.observed)
            if time.monotonic()>=until:raise
            time.sleep(.5)


def state(ops,value,fetch_public=True):
    assert value['passed'] is True and value['files']==FILES and value['noServiceRestart'] is True and value['noMapOrPolicyChange'] is True
    assert value['membershipsPreserved'] is True and value['loadApprovalFor400'] is False
    transition(value['before'],value['after']);assert ops['baseline']()==value['after'] and processes(ops)==value['processes']
    backup=Path(value['backup']);assert backup==PRIVATE/'nginx-before-round-recovery.private.conf'
    assert backup.resolve()==backup and backup.stat().st_uid==0 and backup.stat().st_mode&0o777==0o600
    old=backup.read_bytes();assert sha(old)==value['nginxBeforeSha256']==value['before']['files'][str(NGINX)]
    target=Path(value['directory']);assert target.resolve()==target and target.parent==BASE
    assert target.stat().st_uid==0 and target.stat().st_mode&0o777==0o755
    assert {path.name for path in target.iterdir()}==set(FILES) and all(path.is_file() and not path.is_symlink() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o644 and sha(path.read_bytes())==FILES[path.name] for path in target.iterdir())
    new=old+route(target);assert NGINX.read_bytes()==new and sha(new)==value['nginxAfterSha256']==value['after']['files'][str(NGINX)]
    candidate_raw,candidate=read(PRIVATE/'round-recovery-candidate.private.json');assert sha(candidate_raw)==value['candidateProofSha256'];proof(candidate,True)
    for name,digest in value['previousAttempts'].items():
        assert name in FAILURES;raw,previous=read(PRIVATE/name);assert sha(raw)==digest and previous['restored'] is True
    if fetch_public:public_files()
    return old


def verified(ops,fetch_public=True):
    if not RECORD.exists():return None
    raw,value=read(RECORD);assert value['provisional'] is False
    previous=PRIVATE/'audit-before-round-recovery.py'
    assert previous.resolve()==previous and previous.stat().st_uid==0 and previous.stat().st_mode&0o777==0o600
    assert sha(previous.read_bytes())=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c'
    staged_raw,staged=read(STAGE);assert staged['provisional'] is True and sha(staged_raw)==value['stageReceiptSha256']
    assert all(value[key]==item for key,item in staged.items() if key!='provisional')
    old=state(ops,value,fetch_public)
    published_raw,published=read(PRIVATE/'round-recovery-published.private.json');assert sha(published_raw)==value['publishedProofSha256'];proof(published,False)
    return value,old


def historical(ops):
    accepted=verified(ops,False)
    if accepted is None:return ops,None
    value,old=accepted
    def baseline():
        assert ops['baseline']()==value['after'];return json.loads(json.dumps(value['before']))
    def nginx():
        assert NGINX.read_bytes()==old+route(Path(value['directory']));return old
    return {**ops,'baseline':baseline,'historical_nginx':nginx},value


def reload(ops):
    ops['run']('nginx','-t');ops['run']('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');ops['run']('nginx','-t')


def deploy(ops):
    assert not RECORD.exists() and not STAGE.exists()
    before=ops['baseline']();pids=processes(ops);candidate_raw,candidate=read(PRIVATE/'round-recovery-candidate.private.json');proof(candidate,True)
    descriptor=json.loads(DESCRIPTOR.read_text());archive=ARCHIVE
    assert descriptor['version']==1 and descriptor['files']==FILES and descriptor['archiveSha256']==sha(archive.read_bytes())
    assert isinstance(descriptor['sourceCommit'],str) and len(descriptor['sourceCommit'])==40 and all(c in '0123456789abcdef' for c in descriptor['sourceCommit'])
    with zipfile.ZipFile(archive) as bundle:
        assert len(bundle.infolist())==2 and set(bundle.namelist())==set(FILES) and sum(item.file_size for item in bundle.infolist())<20000
        payload={name:bundle.read(name) for name in FILES};assert all(sha(raw)==FILES[name] for name,raw in payload.items())
    attempts={}
    for name in FAILURES:
        path=PRIVATE/name
        if not path.exists():failure_path=path;break
        raw,previous=read(path);assert previous['restored'] is True;attempts[name]=sha(raw)
    else:raise RuntimeError('Three retained failures require a new reviewed publication plan')
    target=BASE/sha(b''.join(name.encode()+payload[name] for name in sorted(payload)))[:16]
    assert BASE.resolve()==BASE and target.resolve()==target
    BASE.mkdir(mode=0o755,exist_ok=True);BASE.chmod(0o755)
    if target.exists():assert {path.name for path in target.iterdir()}==set(FILES) and all(path.is_file() and not path.is_symlink() and path.read_bytes()==payload[path.name] for path in target.iterdir())
    else:
        target.mkdir(mode=0o755);target.chmod(0o755)
        for name,raw in payload.items():(target/name).write_bytes(raw);(target/name).chmod(0o644)
    old=NGINX.read_bytes();assert b'WVH CASTLE ROUND RECOVERY' not in old
    assert all(('location = /castle-school/'+name+' {').encode() not in old for name in FILES)
    backup=PRIVATE/'nginx-before-round-recovery.private.conf';assert not backup.exists() or backup.read_bytes()==old
    backup.write_bytes(old);backup.chmod(0o600)
    new=old+route(target);changed=False
    try:
        assert ops['baseline']()==before and processes(ops)==pids;NGINX.write_bytes(new);changed=True;reload(ops)
        readiness=wait_public();after=ops['baseline']();transition(before,after);assert processes(ops)==pids
        value={'passed':True,'provisional':True,'before':before,'after':after,'processes':pids,'files':FILES,'directory':str(target),'backup':str(backup),
               'nginxBeforeSha256':sha(old),'nginxAfterSha256':sha(new),'candidateProofSha256':sha(candidate_raw),'archiveSha256':sha(archive.read_bytes()),
               'sourceCommit':descriptor['sourceCommit'],'previousAttempts':attempts,'routeReadiness':readiness,
               'noServiceRestart':True,'noMapOrPolicyChange':True,'membershipsPreserved':True,'loadApprovalFor400':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](STAGE,value);print(json.dumps({'passed':True,'provisional':True,'noServiceRestart':True,'membershipsPreserved':True}))
    except Exception as error:
        failure={'passed':False,'errorType':type(error).__name__,'restored':False}
        if isinstance(error,StaticCheckError):failure['observed']=error.observed
        ops['atomic'](failure_path,failure)
        if changed:
            assert NGINX.read_bytes()==new;NGINX.write_bytes(old);reload(ops)
        assert ops['baseline']()==before and processes(ops)==pids
        ops['atomic'](failure_path,{**failure,'restored':True})
        raise RuntimeError('Recovery publication failed; previous web configuration restored') from None


def accept(ops):
    assert not RECORD.exists();raw,value=read(STAGE);assert value['provisional'] is True;state(ops,value)
    public_raw,public=read(PRIVATE/'round-recovery-published.private.json');proof(public,False)
    value={**value,'provisional':False,'stageReceiptSha256':sha(raw),'publishedProofSha256':sha(public_raw)}
    ops['atomic'](RECORD,value);verified(ops);print(json.dumps({'passed':True,'provisional':False,'noServiceRestart':True,'nativeRecoveryAndAudioVerified':True}))


def rollback(ops):
    assert not RECORD.exists();_,value=read(STAGE);assert value['provisional'] is True
    old=state(ops,value,False);NGINX.write_bytes(old);reload(ops)
    assert ops['baseline']()==value['before'] and processes(ops)==value['processes']
    ops['atomic'](PRIVATE/'round-recovery-rollback.json',{'passed':True,'restored':True,'before':value['after'],'after':value['before']})
    print(json.dumps({'passed':True,'restored':True,'noServiceRestart':True}))


def main(action):
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    assert action in ['deploy','accept','rollback'];globals()[action](ops)
