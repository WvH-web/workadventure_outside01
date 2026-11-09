"""Scoped school/chess identity repair using normal Microsoft-login test tokens; no auth setting changes."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request
import uuid
import zipfile

os.umask(0o077)
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,raw):
    temporary=path.with_name(path.name+'.identity-staging');assert not temporary.exists();temporary.write_bytes(raw);temporary.chmod(0o600);temporary.replace(path)
token_file=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
assert token_file.resolve()==token_file and token_file.parent.stat().st_mode&0o777==0o700
token_file.chmod(0o600);tokens=json.loads(token_file.read_text())
assert set(tokens)=={'A','B'} and all(isinstance(token,str) and len(token)<32768 for token in tokens.values())
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
unchanged={path:sha(path.read_bytes()) for path in [NGINX,Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php'),Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php')]}
unaffected={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']}
plans=[('school',3211,'153d7b604a9cbc7eb1c39ea909535fdc17690f528e049cddd9b6b085f3f0b499'),
 ('chess',3221,'01f7409926faf07974d5fb491badc440dd914fbe2613fb6226f9dd871cdcfc17')]
refine=not sys.argv[1:] or sys.argv[1:]==['--refine'];assert refine or sys.argv[1:]==['--initial']
if refine:plans=[('school',3211,'2f5b9d8b0c668074836c528aab035a0f2a98ec5da8ebf3fde15e02e250c13eff'),
 ('chess',3221,'a2c820f0e4b0ce488d2b69ae8d7b2681676bd690e9a5f97eca3dea4296f62f1f')]
proofs=[]
for kind,port,expected in plans:
    name='wvh-castle-'+kind;base=Path('/opt/'+name);private=base/'private';record_file=private/'deployment.json'
    record_raw=record_file.read_bytes();record=json.loads(record_raw);old_release=Path(record['release']);old=inspect(name)
    assert old['State']['Health']['Status']=='healthy' and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
    assert old_release.resolve()==old_release and old_release.parent==base/'releases'
    assert all(sha((old_release/file).read_bytes())==digest for file,digest in record['files'].items())
    archive_path=Path('/tmp/wvh-castle-'+kind+'.zip');assert sha(archive_path.read_bytes())==expected
    added=set() if refine else {'castle-school/identity.cjs'}
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==len(record['files'])+len(added) and sum(info.file_size for info in archive.infolist())<1000000
        assert set(archive.namelist())==set(record['files'])|added
        payload={file:archive.read(file) for file in archive.namelist()}
    changed={file for file in record['files'] if sha(payload[file])!=record['files'][file]}
    expected_changes=({'castle-school/identity.cjs'}|({'castle-chess/rooms.cjs'} if kind=='chess' else set())) if refine else {'castle-'+kind+'/server.cjs'}
    assert changed==expected_changes
    assert all(not file.startswith('/') and '\\' not in file and '..' not in file.split('/') for file in payload)
    env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item);secret=env['SECRET_KEY'].encode();key=env['CASTLE_SCHOOL_LOOKUP_KEY'].encode()
    assert all(secret not in raw for file,raw in payload.items() if '/vendor/' not in file and '/public/vendor/' not in file and '/public/assets/' not in file)
    assert all(key not in raw for raw in payload.values())
    release_id=expected[:16];release=base/'releases'/release_id;candidate=name+'-identity-candidate';previous=name+'-identity-before-'+release_id
    assert not exists(candidate) and not exists(previous) and not release.exists()
    release.mkdir(mode=0o755);release.chmod(0o755)
    for file,raw in payload.items():
        target=release/file;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(raw);target.chmod(0o644)
    for directory in release.rglob('*'):
        if directory.is_dir():directory.chmod(0o755)
    candidate_data=private/('identity-candidate-'+release_id)
    if kind=='chess':
        candidate_data.mkdir(mode=0o700);os.chown(candidate_data,1000,1000)
        current=base/'data/state.json'
        if current.exists():
            target=candidate_data/'state.json';target.write_bytes(current.read_bytes());target.chmod(0o600);os.chown(target,1000,1000)
    runtime_hash=sha((private/'runtime.env').read_bytes());created={};stage='candidate-start';swapped=False
    def start(container,bind_port,testing=False):
        args=['docker','run','-d','--name',container,'--restart','unless-stopped','--network','workadventure_default','--user','1000:1000',
         '--workdir','/srv/release','-p',f'127.0.0.1:{bind_port}:{port}','--env-file',str(private/'runtime.env'),
         '--label','wvh.component=castle-'+kind,'--label','wvh.release='+release_id,
         '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
         '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
         '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
         '--health-cmd',old['Config']['Healthcheck']['Test'][-1],'--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3']
        if kind=='school':args+=['--mount','type=bind,src='+str(private/'rules.json')+',dst=/srv/rules.json,readonly']
        else:args+=['--mount','type=bind,src='+str(candidate_data if testing else base/'data')+',dst=/srv/chess-data']
        created[container]=run(*args,'--entrypoint','node',old['Image'],'/srv/release/castle-'+kind+'/server.cjs').strip()
    def stop(container):
        current=inspect(container);assert current['Id']==created[container] and current['Config']['Labels']['wvh.release']==release_id
        run('docker','stop','-t','10',container);run('docker','rm',container)
    def request(url,path,token=None,session=None,body=None):
        headers={'Content-Type':'application/json','Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin'}
        if token:headers['Authorization']='Bearer '+token
        if session:headers['X-Chess-Session']=session
        req=urllib.request.Request(url+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
        try:response=urllib.request.urlopen(req,timeout=12)
        except urllib.error.HTTPError as error:response=error
        raw=response.read(50000);assert all(value not in raw for value in [secret,key,*[token.encode() for token in tokens.values()]])
        value=json.loads(raw);assert all(key.encode() not in raw for key in ['identifier','classId','gradeLevel','birthdate','userPrincipalName','accessToken'])
        return response.status,value
    def ready(url):
        for _ in range(40):
            try:
                if request(url,'health')==(200,{'ready':True}):return
            except Exception:pass
            time.sleep(.3)
        raise RuntimeError('identity readiness')
    def audit(url):
        results=[]
        for account,token in tokens.items():
            if kind=='school':
                status,value=request(url,'context',token);assert status==200 and value['account']=={'kind':'student','schoolAccount':True}
                assert len(value['offers'])==7 and all(not offer['allowed'] for offer in value['offers'])
                assert request(url,'launch',token,body={'resourceId':'gamesarea01'})==(403,{'error':'not_allowed'})
            else:
                status,value=request(url,'session',token,body={});assert status==200 and value['self']['staff'] is False and len(value['tables'])==3
                assert request(url,'leave',token,value['sessionId'],{})[0]==200
            results.append({'account':account,'normalMicrosoftTokenAccepted':True,'freshPupilRole':True,'staffPrivileges':False})
        encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
        unsigned=encode({'alg':'HS256'})+b'.'+encode({'identifier':'unknown-'+uuid.uuid4().hex+'@invalid.local','tags':['teacher'],'exp':int(time.time())+180})
        unknown=(unsigned+b'.'+base64.urlsafe_b64encode(hmac.new(secret,unsigned,hashlib.sha256).digest()).rstrip(b'=')).decode()
        if kind=='school':
            status,value=request(url,'context',unknown);assert status==200 and not value['account']['schoolAccount']
        else:assert request(url,'session',unknown,body={})==(403,{'error':'school_required'})
        return results
    try:
        start(candidate,port+1,True);url=f'http://127.0.0.1:{port+1}/castle-{kind}/';ready(url);stage='candidate-audit';audit(url);stop(candidate)
        assert record_file.read_bytes()==record_raw and sha((private/'runtime.env').read_bytes())==runtime_hash
        atomic(private/('deployment-before-identity-'+release_id+'.json'),record_raw)
        stage='swap';run('docker','stop','-t','10',name);run('docker','rename',name,previous);swapped=True
        start(name,port);ready(f'http://127.0.0.1:{port}/castle-{kind}/');stage='live-audit';results=audit(f'https://together.deine-schule.com/castle-{kind}/')
        for _ in range(25):
            if inspect(name)['State'].get('Health',{}).get('Status')=='healthy':break
            time.sleep(1)
        else:raise RuntimeError('identity Docker health')
        assert all(sha(path.read_bytes())==value for path,value in unchanged.items())
        assert all(inspect(service)['Id']==value['Id'] and inspect(service)['State']['StartedAt']==value['State']['StartedAt'] for service,value in unaffected.items())
        updated={**record,'release':str(release),'archive_sha256':expected,'files':{file:sha(raw) for file,raw in payload.items()},
          'previous_release':str(old_release),'identity_previous_container':previous,'identity_resolver':'microsoft-graph-me-v1','container_id':created[name]}
        atomic(record_file,(json.dumps(updated,indent=2)+'\n').encode())
        proof={'service':kind,'passed':True,'results':results,'unknownTeacherTagsDenied':True,'existingAccessRulesUnchanged':True,
         'waLoginMapsAudioAndNginxUnchanged':True,'release':release_id,'previousContainerRetained':True}
        atomic(private/'school-sso-live-check.json',(json.dumps(proof,indent=2)+'\n').encode());proofs.append(proof)
    except Exception as error:
        print(json.dumps({'service':kind,'stage':stage,'failureType':type(error).__name__,'sourceLines':[frame.lineno for frame in traceback.extract_tb(error.__traceback__) if frame.filename=='<stdin>']}))
        for container in [candidate,name]:
            if container in created and exists(container):
                atomic(private/('identity-failure-'+release_id+'-'+container+'.log'),run('docker','logs',container).encode());stop(container)
        if swapped:run('docker','rename',previous,name);run('docker','start',name)
        raise RuntimeError('Scoped identity repair stopped; its previous running service was restored') from None
print(json.dumps({'passed':True,'services':proofs,'pupilTableMovesWritten':False,'loadApprovalFor400':False},indent=2))
