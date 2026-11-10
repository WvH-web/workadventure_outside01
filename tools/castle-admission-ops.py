"""Stage and publish only bounded School API admission; preserve every other service and map."""
import copy
import hashlib
import http.client
import json
import os
from pathlib import Path
import runpy
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile

BASE=Path('/opt/wvh-castle-school');PRIVATE=BASE/'private';DEPLOYMENT=PRIVATE/'deployment.json'
RECEIPT=PRIVATE/'admission-deployment.json';STAGE=PRIVATE/'admission-stage.json'
ARCHIVE=Path('/tmp/wvh-castle-school.zip');QA_ARCHIVE=Path('/tmp/wvh-castle-admission-tests.zip')
IDENTIFIERS=Path('/home/wilhelm/.cache/wvh-school-qa/admission-identifiers.private.json')
NAME='wvh-castle-school';STAGE_NAME='wvh-castle-admission-stage';QA_NAME='wvh-castle-admission-qa';PORT=13212
EXPECTED_OLD_ID='6d74a41f4111588134de2b35ba60125980fbaa7459a9d052f658c278d563c226'
EXPECTED_ARCHIVE='da25574fd7da851294d4e2a9fb6c4b4fb749cd3371f8aadf164d6f433aee6c61'
EXPECTED_QA='4de2cd794746075973d68d6e7afd0cfdae3bdd3be46db5ca020243c96fd57e50'
QA_FILES={'castle-admission.test.cjs','castle-admission-http.test.cjs','fixtures/castle-offers.cjs'}
ADDED={'castle-school/admission.cjs','castle-school/public/unowned-ui.js'}
CHANGED={'castle-school/server.cjs','castle-school/identity.cjs','castle-school/public/presence.html','castle-school/public/rounds.html'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def run(*args,input=None,timeout=35):
    value=subprocess.run(args,input=input,text=True,capture_output=True,timeout=timeout)
    if value.returncode:raise RuntimeError('Scoped admission operation failed; private diagnostics withheld')
    return value.stdout

def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-aq','--filter','name=^/'+name+'$').strip())

def running():
    ids=run('docker','ps','-q').split()
    return {item['Name'].lstrip('/'):{'id':item['Id'],'started':item['State']['StartedAt'],'image':item['Image'],'restarts':item['RestartCount']}
            for item in json.loads(run('docker','inspect',*ids))}

def preserved(before,after):
    assert {key:value for key,value in before['services'].items() if key!=NAME}=={key:value for key,value in after['services'].items() if key!=NAME}
    assert {key:value for key,value in before['files'].items() if key!=str(DEPLOYMENT)}=={key:value for key,value in after['files'].items() if key!=str(DEPLOYMENT)}

def release_files(release,files):
    assert release.resolve()==release and release.parent==BASE/'releases' and not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(files)
    assert all(sha((release/name).read_bytes())==digest for name,digest in files.items())

def read_archive(path,digest,allowed=None):
    raw=path.read_bytes();assert len(raw)<2000000 and sha(raw)==digest
    with zipfile.ZipFile(path) as archive:
        names=archive.namelist();assert len(names)==len(set(names)) and sum(item.file_size for item in archive.infolist())<2500000
        assert all(not name.startswith('/') and '\\' not in name and '..' not in name.split('/') for name in names)
        if allowed is not None:assert set(names)==allowed
        return {name:archive.read(name) for name in names}

def request(base,route,token=None,body=None):
    headers={'Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+route,headers=headers,data=None if body is None else json.dumps(body).encode())
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(100000);assert not token or token.encode() not in raw
    assert all(value not in raw for value in [b'identifier',b'classId',b'gradeLevel',b'birthdate',b'accessToken',b'userPrincipalName'])
    return response.status,json.loads(raw)

def ready(base):
    for _ in range(50):
        try:
            if request(base,'health')==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Scoped admission readiness failed')

def synthetic_tokens():
    assert IDENTIFIERS.resolve()==IDENTIFIERS and IDENTIFIERS.parent.stat().st_mode&0o777==0o700
    IDENTIFIERS.chmod(0o600);value=json.loads(IDENTIFIERS.read_text())
    assert set(value)=={'identifiers'} and len(value['identifiers'])==2 and len(set(value['identifiers']))==2
    assert all(isinstance(item,str) and 0<len(item)<255 for item in value['identifiers'])
    # Only the two explicitly authorized synthetic pupils. No Microsoft-login claim is made.
    code=r'''const fs=require('fs'),{SignJWT}=require('jose');(async()=>{const input=JSON.parse(fs.readFileSync(0,'utf8')),tokens={};
    for(const [index,identifier] of input.identifiers.entries())tokens[['A','B'][index]]=await new SignJWT({identifier,tags:['teacher']})
    .setProtectedHeader({alg:'HS256'}).setExpirationTime('10m').sign(new TextEncoder().encode(process.env.SECRET_KEY));
    console.log(JSON.stringify(tokens));})().catch(()=>process.exitCode=1);'''
    return json.loads(run('docker','exec','-i',NAME,'node','-e',code,input=json.dumps(value)))

def canary(base,tokens):
    assert request(base,'round-context')[0]==401 and request(base,'round-context','forged')[0]==401
    for key,own,other in [('A','grundschule','mittelstufe'),('B','mittelstufe','grundschule')]:
        status,value=request(base,'round-context',tokens[key]);assert status==200 and value['account']=={'kind':'student','schoolAccount':True}
        assert any(target['mapId']==own for target in value['targets']) and not any(target['mapId']==other for target in value['targets'])
        assert request(base,'round-create',tokens[key],{'targetId':other+'-'+('spieltisch' if other=='mittelstufe' else 'lesekamin'),'kind':'talk','capacity':2})[0]==403
        status,value=request(base,'context',tokens[key]);assert status==200 and value['account']=={'kind':'student','schoolAccount':True} and len(value['offers'])==7
    return {'passed':True,'authorizedSyntheticPupils':2,'freshDatabaseAndCohortRules':True,'forgedTeacherTagsIgnored':True,
            'normalMicrosoftLoginTested':False,'roundRegistrationsCreated':False,'portalRoomLinksWritten':False}

BOOTSTRAP=r'''const {createSchoolServer}=require('/srv/release/castle-school/server.cjs');
const {createLookup}=require('/srv/release/castle-school/lookup.cjs'),{createOfferLookup}=require('/srv/release/castle-school/catalog.cjs');
const {GatewayError}=require('/srv/release/hall-audio/errors.cjs');
const key=process.env.CASTLE_SCHOOL_LOOKUP_KEY,server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret:process.env.SECRET_KEY,trustedProxyIps:[]},
lookup:createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key}),getOffers:createOfferLookup({key}),
updateRoomLink:async()=>{throw new GatewayError(503,'staging_read_only');}});
server.listen(3211,'0.0.0.0');for(const event of ['SIGINT','SIGTERM'])process.once(event,()=>{server.closeAdmissions();server.close();server.closeIdleConnections();});'''

def remove_owned(name,container_id):
    current=inspect(name);assert current['Id']==container_id and current['Config'].get('Labels',{}).get('wvh.component')=='castle-admission-test'
    run('docker','stop','-t','10',name);run('docker','rm',name)

def stage(ops):
    before=ops['baseline']();all_before=running();record_raw=DEPLOYMENT.read_bytes();old_record=json.loads(record_raw);old=inspect(NAME)
    assert old['Id']==EXPECTED_OLD_ID and old['State']['Health']['Status']=='healthy' and not RECEIPT.exists()
    assert not exists(STAGE_NAME) and not exists(QA_NAME) and not run('ss','-ltnH','sport = :'+str(PORT)).strip()
    if STAGE.exists():assert json.loads(STAGE.read_text())['stopped']
    release_files(Path(old_record['release']),old_record['files']);assert len(old_record['files'])==40
    payload=read_archive(ARCHIVE,EXPECTED_ARCHIVE,set(old_record['files'])|ADDED)
    assert {name for name in old_record['files'] if sha(payload[name])!=old_record['files'][name]}==CHANGED
    ui=json.loads((PRIVATE/'round-ui-events-deployment.json').read_text())
    for name in ['presence.html','rounds.html','unowned-ui.js']:assert sha(payload['castle-school/public/'+name])==ui['files'][name]
    assert all(value.split('=',1)[1].encode() not in content for value in old['Config']['Env'] if value.startswith(('SECRET_KEY=','CASTLE_SCHOOL_LOOKUP_KEY=')) for content in payload.values())
    release=BASE/'releases'/EXPECTED_ARCHIVE[:16];files={name:sha(content) for name,content in payload.items()}
    if release.exists():release_files(release,files)
    else:
        release.mkdir(mode=0o755)
        for name,content in payload.items():
            path=release/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content);path.chmod(0o644)
        for path in [release,*[item for item in release.rglob('*') if item.is_dir()]]:path.chmod(0o755)
    qa=read_archive(QA_ARCHIVE,EXPECTED_QA,QA_FILES);qa_dir=PRIVATE/('admission-tests-'+EXPECTED_QA[:16]);qa_dir.mkdir(mode=0o755,exist_ok=True);qa_dir.chmod(0o755)
    for name,content in qa.items():
        path=qa_dir/name;path.parent.mkdir(mode=0o755,parents=True,exist_ok=True);path.write_bytes(content);path.chmod(0o644)
    for path in qa_dir.rglob('*'):
        if path.is_dir():path.chmod(0o755)
    created=None
    try:
        result=subprocess.run(['docker','run','--rm','--name',QA_NAME,'--network','none','--read-only','--user','1000:1000',
            '--workdir','/qa','--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(release)+',dst=/qa/ops,readonly',
            '--mount','type=bind,src='+str(qa_dir)+',dst=/qa/tests,readonly','--label','wvh.component=castle-admission-test',
            '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5','--pids-limit','128',
            '--entrypoint','node',old['Image'],'--max-old-space-size=128','--test','--test-concurrency=1',
            'tests/castle-admission.test.cjs','tests/castle-admission-http.test.cjs'],text=True,capture_output=True,timeout=35)
        log=PRIVATE/'admission-linux-tests.private.log';log.write_text(result.stdout+result.stderr);log.chmod(0o600)
        assert result.returncode==0 and '"successful":400' in result.stdout and '"transportPreconnected":false' in result.stdout
        assert not exists(QA_NAME) and running()==all_before and ops['baseline']()==before
        created=run('docker','run','-d','--name',STAGE_NAME,'--network','workadventure_default','--workdir','/srv/release','--user','1000:1000',
            '-p',f'127.0.0.1:{PORT}:3211','--env-file',str(PRIVATE/'runtime.env'),'--label','wvh.component=castle-admission-test',
            '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(PRIVATE/'rules.json')+',dst=/srv/rules.json,readonly',
            '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=8m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
            '--memory','256m','--cpus','0.5','--pids-limit','128','--log-opt','max-size=2m','--log-opt','max-file=2',
            '--entrypoint','node',old['Image'],'-e',BOOTSTRAP).strip()
        base=f'http://127.0.0.1:{PORT}/castle-school/';ready(base);proof=canary(base,synthetic_tokens())
    finally:
        if created:remove_owned(STAGE_NAME,created)
        if exists(QA_NAME):
            value=inspect(QA_NAME);remove_owned(QA_NAME,value['Id'])
        assert running()==all_before and ops['baseline']()==before and DEPLOYMENT.read_bytes()==record_raw
    value={'passed':True,'stopped':True,'release':str(release),'releaseId':EXPECTED_ARCHIVE[:16],'archiveSha256':EXPECTED_ARCHIVE,
        'qaArchiveSha256':EXPECTED_QA,'linuxTestLogSha256':sha(log.read_bytes()),'before':before,'runningBefore':all_before,
        'oldRecordSha256':sha(record_raw),'image':old['Image'],'files':files,'canary':proof,'syntheticHttpRequests':400,
        'normalMicrosoftLoginLoadTested':False,'fullCastleApprovalFor400':False}
    ops['atomic'](STAGE,value);print(json.dumps({key:value[key] for key in ['passed','stopped','releaseId','syntheticHttpRequests','normalMicrosoftLoginLoadTested','fullCastleApprovalFor400']}))

class DockerConnection(http.client.HTTPConnection):
    def __init__(self):super().__init__('localhost',timeout=10)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(10);self.sock.connect('/var/run/docker.sock')

def clone_spec(old,release,release_id):
    assert old['Id']==EXPECTED_OLD_ID and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
    assert set(old['NetworkSettings']['Networks'])=={'workadventure_default'}
    config=copy.deepcopy(old['Config']);config['Image']=old['Image'];config['Labels']['wvh.release']=release_id
    host=copy.deepcopy(old['HostConfig']);replaced=0
    assert not host.get('Binds')
    for mount in host['Mounts']:
        if mount['Target']=='/srv/release':
            assert mount['Type']=='bind' and mount['ReadOnly'];mount['Source']=str(release);replaced+=1
    assert replaced==1
    endpoint=old['NetworkSettings']['Networks']['workadventure_default']
    assert not endpoint.get('IPAMConfig') and not endpoint.get('Links') and not endpoint.get('DriverOpts')
    return {**config,'HostConfig':host,'NetworkingConfig':{'EndpointsConfig':{'workadventure_default':{'Aliases':endpoint.get('Aliases') or []}}}}

def create(spec):
    client=DockerConnection()
    try:
        client.request('GET','/version');response=client.getresponse();version=json.loads(response.read())['ApiVersion'];assert response.status==200 and version.startswith('1.')
        client.request('POST','/v'+version+'/containers/create?name='+NAME,body=json.dumps(spec).encode(),headers={'Content-Type':'application/json'})
        response=client.getresponse();body=response.read(65536);assert response.status==201
        return json.loads(body)['Id']
    finally:client.close()

def rollback(backup,release,release_id,created=None):
    if exists(backup):
        previous=inspect(backup);assert previous['Id']==EXPECTED_OLD_ID
        if exists(NAME):
            current=inspect(NAME)
            assert current['Id']!=EXPECTED_OLD_ID and (created is None or current['Id']==created)
            assert current['Config'].get('Labels',{}).get('wvh.release')==release_id
            assert any(mount['Source']==str(release) and mount['Destination']=='/srv/release' and not mount['RW'] for mount in current['Mounts'])
            run('docker','stop','-t','10',NAME);run('docker','rm',NAME)
        run('docker','rename',backup,NAME);run('docker','start',NAME)
    else:
        current=inspect(NAME);assert current['Id']==EXPECTED_OLD_ID
        if not current['State']['Running']:run('docker','start',NAME)

def publish(ops):
    value=json.loads(STAGE.read_text());assert value['passed'] and value['stopped'] and not RECEIPT.exists()
    assert value['archiveSha256']==EXPECTED_ARCHIVE and value['qaArchiveSha256']==EXPECTED_QA and value['syntheticHttpRequests']==400
    assert sha((PRIVATE/'admission-linux-tests.private.log').read_bytes())==value['linuxTestLogSha256']
    assert not exists(STAGE_NAME) and not exists(QA_NAME) and not run('ss','-ltnH','sport = :'+str(PORT)).strip()
    assert value['before']==ops['baseline']() and value['runningBefore']==running()
    record_raw=DEPLOYMENT.read_bytes();assert sha(record_raw)==value['oldRecordSha256'];old_record=json.loads(record_raw)
    release=Path(value['release']);release_files(release,value['files']);old=inspect(NAME);spec=clone_spec(old,release,value['releaseId'])
    tokens=synthetic_tokens();base='https://together.deine-schule.com/castle-school/';canary(base,tokens)
    backup=NAME+'-before-admission-'+old['Id'][:12];assert not exists(backup)
    backup_record=PRIVATE/('deployment-before-admission-'+value['releaseId']+'.json');assert not backup_record.exists()
    backup_record.write_bytes(record_raw);backup_record.chmod(0o600)
    assert ops['baseline']()==value['before'] and running()==value['runningBefore']
    created=None;updated_raw=None
    try:
        run('docker','stop','-t','15',NAME);run('docker','rename',NAME,backup)
        created=create(spec);run('docker','start',NAME);ready('http://127.0.0.1:3211/castle-school/');proof=canary(base,tokens)
        for _ in range(50):
            current=inspect(NAME)
            if current['State']['Health']['Status']=='healthy':break
            time.sleep(.5)
        else:raise RuntimeError('Dedicated admission healthcheck failed')
        assert current['Id']==created and current['Config']=={key:spec[key] for key in old['Config']} and current['HostConfig']==spec['HostConfig']
        assert DEPLOYMENT.read_bytes()==record_raw;preserved(value['before'],ops['baseline']())
        assert {key:item for key,item in running().items() if key!=NAME}=={key:item for key,item in value['runningBefore'].items() if key!=NAME}
        updated={**old_record,'release':str(release),'archive_sha256':EXPECTED_ARCHIVE,'files':value['files'],'source_files':42,
                 'previous_release':old_record['release'],'previous_admission_container':backup,'bounded_admission_live':True}
        updated_raw=(json.dumps(updated,indent=2)+'\n').encode();ops['atomic'](DEPLOYMENT,updated);assert DEPLOYMENT.read_bytes()==updated_raw
        after=ops['baseline']();preserved(value['before'],after)
        receipt={**value,'after':after,'runningAfter':running(),'containerId':created,'rollbackContainer':backup,
                 'oldRecordPath':str(backup_record),'oldRelease':old_record['release'],'stageReceiptSha256':sha(STAGE.read_bytes()),
                 'configBeforeSha256':sha(json.dumps(old['Config'],sort_keys=True).encode()),
                 'newRecordSha256':sha(updated_raw),'configSha256':sha(json.dumps(current['Config'],sort_keys=True).encode()),
                 'hostConfigSha256':sha(json.dumps(current['HostConfig'],sort_keys=True).encode()),'liveCanary':proof,
                 'onlySchoolServiceReplaced':True,'historicalManifestsPreserved':True,'healthy':True,
                 'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](RECEIPT,receipt)
        print(json.dumps({key:receipt[key] for key in ['passed','releaseId','onlySchoolServiceReplaced','historicalManifestsPreserved','healthy','fullCastleApprovalFor400','checkedAt']}))
    except BaseException:
        rollback(backup,release,value['releaseId'],created)
        if updated_raw is not None:
            assert DEPLOYMENT.read_bytes() in [record_raw,updated_raw];DEPLOYMENT.write_bytes(record_raw);DEPLOYMENT.chmod(0o600)
        ready('http://127.0.0.1:3211/castle-school/');assert ops['baseline']()['files']==value['before']['files']
        raise RuntimeError('Admission publication failed; original School service restored') from None

def main():
    os.umask(0o077);assert PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    try:
        if sys.argv[1:]==['stage']:stage(ops)
        elif sys.argv[1:]==['publish']:publish(ops)
        else:raise RuntimeError('Expected stage or publish')
    finally:IDENTIFIERS.unlink(missing_ok=True)

if __name__=='__main__':main()
