"""One-shot, guarded installation of isolated school chess; never restarts existing services."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time
import traceback
import urllib.error
import urllib.request
import uuid
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-chess');PRIVATE=BASE/'private';NAME='wvh-castle-chess';CANDIDATE=NAME+'-candidate'
ARCHIVE=Path('/tmp/wvh-castle-chess.zip')
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
GALLERY=Path('/opt/wvh-castle-content/private/deployment.json')
SCHOOL=Path('/opt/wvh-castle-school/private/deployment.json')
ROLE=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php')
EXPECTED_NGINX='d96bb3955e3e735df331c6e485efa2709aeb8e242dfc701722009e38a15eb793'
EXPECTED_ARCHIVE='b15d76ad9a28ec6312abab27406dba91f8b8346faaeb7f54ca2b4ef36e45d5c1'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,raw,mode=0o600):
    temporary=path.with_name(path.name+'.chess-staging');assert not temporary.exists() and not temporary.is_symlink()
    temporary.write_bytes(raw);temporary.chmod(mode);temporary.replace(path)

assert BASE.resolve()==BASE and not BASE.is_symlink()
assert not exists(NAME) and not exists(CANDIDATE) and not run('ss','-ltnH','sport = :3221').strip()
assert sha(ARCHIVE.read_bytes())==EXPECTED_ARCHIVE
assert not NGINX.is_symlink() and sha(NGINX.read_bytes())==EXPECTED_NGINX and b'/castle-chess/' not in NGINX.read_bytes()
old_files={path:path.read_bytes() for path in [NGINX,GALLERY,SCHOOL,ROLE]}
gallery=json.loads(old_files[GALLERY]);school=json.loads(old_files[SCHOOL])
assert gallery['nginx_sha256']==EXPECTED_NGINX and school['nginx_after_sha256']==EXPECTED_NGINX
assert school['release']=='/opt/wvh-castle-school/releases/c7b216e24e8b23ec'
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio','wvh-castle-school']}
assert all(value['State']['Running'] for value in before.values())
old=before['wvh-castle-school'];env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
assert old['State'].get('Health',{}).get('Status')=='healthy' and old['Image']==before['workadventure-play-1']['Image']
assert all(env.get(key) for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY'])
secret=env['SECRET_KEY'].encode();lookup_key=env['CASTLE_SCHOOL_LOOKUP_KEY'].encode()
qa=Path('/tmp/wvh-castle-games-ui.private.json');assert not qa.is_symlink() and qa.stat().st_mode&0o777==0o600
staff=json.loads(qa.read_text())['staff']

own={'castle-chess/server.cjs','castle-chess/rooms.cjs','castle-chess/journal.cjs','castle-chess/vendor-manifest.json',
 'castle-chess/public/index.html','castle-chess/public/chess.css','castle-chess/public/chess.js','castle-chess/public/training.js','castle-chess/public/credits.html',
 'hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school/lookup.cjs','castle-school/policy.cjs'}
with zipfile.ZipFile(ARCHIVE) as bundle:
    assert len(bundle.infolist())==39 and sum(info.file_size for info in bundle.infolist())<1000000
    manifest=json.loads(bundle.read('castle-chess/vendor-manifest.json'))
    assert [(item['name'],item['version']) for item in manifest['packages']]==[('chess.js','1.4.0'),('cm-chessboard','8.15.4'),('eventsource-parser','4.1.3')]
    assert len(manifest['files'])==26
    allowed=own|{'castle-chess/'+file['path'] for file in manifest['files']}
    assert set(bundle.namelist())==allowed and len(allowed)==39
    assert all(not name.startswith('/') and '\\' not in name and '..' not in name.split('/') for name in allowed)
    payload={name:bundle.read(name) for name in allowed}
for file in manifest['files']:assert sha(payload['castle-chess/'+file['path']])==file['sha256']
# Upstream vendor bytes are verified by archive/integrity hashes, not substring heuristics.
assert all(secret not in payload[name] for name in own)
assert all(lookup_key not in data for data in payload.values())
for name in ['hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school/lookup.cjs','castle-school/policy.cjs']:
    assert sha(payload[name])==school['files'][name]

release_id=EXPECTED_ARCHIVE[:16];release=BASE/'releases'/release_id
runtime={'SECRET_KEY':env['SECRET_KEY'],'CASTLE_SCHOOL_LOOKUP_KEY':env['CASTLE_SCHOOL_LOOKUP_KEY'],
 'CASTLE_CHESS_TRUSTED_PROXY_IPS':env['CASTLE_SCHOOL_TRUSTED_PROXY_IPS'],'CASTLE_CHESS_DATA_DIR':'/srv/chess-data','NODE_PATH':'/usr/src/node_modules'}
assert all('\n' not in value and '\r' not in value for value in runtime.values())
runtime_raw=''.join(key+'='+value+'\n' for key,value in runtime.items()).encode()
if BASE.exists():
    # A failed pre-publication start can only resume this exact, empty, unmodified staging tree.
    staged={release/name:data for name,data in payload.items()}
    staged.update({PRIVATE/'runtime.env':runtime_raw,**{PRIVATE/('before-'+path.name):raw for path,raw in old_files.items()}})
    for path,raw in [(PRIVATE/'before-castle-content-deployment.json',old_files[GALLERY]),(PRIVATE/'before-castle-school-deployment.json',old_files[SCHOOL])]:
        if path.exists():staged[path]=raw
    probe=BASE/'candidate-data/state.json'
    if probe.exists():
        saved=json.loads(probe.read_text());assert set(saved)=={'version','tables'} and saved['version']==1 and len(saved['tables'])==3
        assert {table['id'] for table in saved['tables']}=={'tisch-1','tisch-2','tisch-3'}
        assert all(set(table)=={'id','moves','revision','result','changedAt'} and not table['moves'] and table['revision']==1 and table['result'] is None and isinstance(table['changedAt'],int) for table in saved['tables'])
        staged[probe]=probe.read_bytes()
    assert not any(path.is_symlink() for path in BASE.rglob('*'))
    assert {path for path in BASE.rglob('*') if path.is_file()}==set(staged)
    assert all(path.read_bytes()==raw for path,raw in staged.items())
    assert not list((BASE/'data').iterdir())
for target,mode in [(BASE,0o755),(PRIVATE,0o700),(BASE/'releases',0o755),(release,0o755)]:
    target.mkdir(mode=mode,exist_ok=True);target.chmod(mode)
for name,data in payload.items():
    target=release/name;assert target.resolve().is_relative_to(release)
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.parent.chmod(0o755);target.write_bytes(data);target.chmod(0o644)
for target in release.rglob('*'):
    if target.is_dir():target.chmod(0o755)
data_dir=BASE/'data';candidate_data=BASE/'candidate-data'
for target in [data_dir,candidate_data]:target.mkdir(mode=0o700,exist_ok=True);target.chmod(0o700);os.chown(target,1000,1000)
(PRIVATE/'runtime.env').write_bytes(runtime_raw);(PRIVATE/'runtime.env').chmod(0o600)
for path,raw in old_files.items():(PRIVATE/('before-'+path.name)).write_bytes(raw)
(PRIVATE/'before-castle-content-deployment.json').write_bytes(old_files[GALLERY])
(PRIVATE/'before-castle-school-deployment.json').write_bytes(old_files[SCHOOL])

def unknown_token():
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
    value=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':'castle-chess-'+uuid.uuid4().hex+'@invalid.local','tags':['teacher'],'exp':int(time.time())+180})
    return (value+b'.'+base64.urlsafe_b64encode(hmac.new(secret,value,hashlib.sha256).digest()).rstrip(b'=')).decode()

def request(base,path,token=None,body=None,session=None):
    headers={'Content-Type':'application/json','Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin'}
    if token:headers['Authorization']='Bearer '+token
    if session:headers['X-Chess-Session']=session
    request=urllib.request.Request(base+path,method='GET' if body is None else 'POST',headers=headers,data=None if body is None else json.dumps(body).encode())
    try:response=urllib.request.urlopen(request,timeout=10)
    except urllib.error.HTTPError as error:response=error
    if path=='events' and response.status==200:
        assert response.headers.get('X-Accel-Buffering') in [None,'no']
        while True:
            line=response.readline(32768)
            if line.startswith(b'data: '):raw=line[6:];break
            assert line
        response.close()
    else:raw=response.read(40000)
    assert secret not in raw and lookup_key not in raw and staff.encode() not in raw
    if response.headers.get('Content-Type','').startswith(('application/json','text/event-stream')):
        value=json.loads(raw);assert all(text not in raw for text in [b'identifier',b'classId',b'gradeLevel',b'checkedAt',b'"age"'])
    else:value=raw
    return response.status,value,response.headers

def audit(base):
    assert request(base,'health')[:2]==(200,{'ready':True})
    assert request(base,'session',body={})[0]==401
    assert request(base,'session',unknown_token(),{})[:2]==(403,{'error':'school_required'})
    assert request(base,'session',staff,{'age':99,'classId':17})[0]==400
    status,state,_=request(base,'session',staff,{})
    assert status==200 and state['self']['staff'] and len(state['tables'])==3
    assert all(table['players']==0 for table in state['tables'])
    session=state['sessionId']
    try:
        status,event,_=request(base,'events',staff,session=session);assert status==200 and event['board']['revision']==1
        assert request(base,'state',staff,session=session)[1]['self']['staff']
        assert request(base,'pgn',staff,session=session)[0]==200
    finally:assert request(base,'leave',staff,{},session)[0]==200
    for path in ['runtime.env','state.json','server.cjs','vendor-manifest.json','health?token=not-accepted']:
        assert request(base,path,staff)[0]==404
    status,page,headers=request(base,'');assert status==200 and b'Schloss-Schach' in page and headers.get('X-Frame-Options')=='SAMEORIGIN'
    assert "script-src 'self'" in headers.get('Content-Security-Policy','') and headers.get('Permissions-Policy')=='microphone=(), camera=(), display-capture=()'
    return {'freshStaffAccess':True,'unknownWithForgedTeacherTagsDenied':True,'noPupilAccountsCreatedOrImpersonated':True,
      'authorizedStaffWatcherOnly':True,'authenticatedSseWorks':True,'privateFilesNotServed':True,'threeEmptyTables':True}

def start(name,port,directory):
    health="node -e \"const r=require('http').get('http://127.0.0.1:3221/castle-chess/health',s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.setTimeout(2000,()=>process.exit(1));r.on('error',()=>process.exit(1))\""
    return run('docker','run','-d','--name',name,'--restart','unless-stopped','--network','workadventure_default',
      '--workdir','/srv/release','--user','1000:1000','-p',f'127.0.0.1:{port}:3221','--env-file',str(PRIVATE/'runtime.env'),
      '--label','wvh.component=castle-chess','--label','wvh.release='+release_id,
      '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(directory)+',dst=/srv/chess-data',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
      '--health-cmd',health,'--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3',
      '--entrypoint','node',old['Image'],'/srv/release/castle-chess/server.cjs').strip()

def ready(base):
    for _ in range(30):
        try:
            if request(base,'health')[:2]==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.25)
    raise RuntimeError('Private chess health check did not become ready')

def stop_owned(name,identifier):
    current=inspect(name);assert current['Id']==identifier and current['Config']['Labels']['wvh.release']==release_id
    run('docker','stop','-t','5',name);run('docker','rm',name)

candidate_id=start(CANDIDATE,3222,candidate_data)
try:
    ready('http://127.0.0.1:3222/castle-chess/');candidate_proof=audit('http://127.0.0.1:3222/castle-chess/')
finally:stop_owned(CANDIDATE,candidate_id)
# Isolated persistence probe writes no school identities and never touches the live data directory.
run('docker','run','--rm','--network','none','--read-only','--user','1000:1000','--workdir','/srv/release',
 '--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
 '--mount','type=bind,src='+str(candidate_data)+',dst=/srv/chess-data','--entrypoint','node',old['Image'],'-e',
 "const {ChessRooms}=require('./castle-chess/rooms.cjs'),{ChessJournal}=require('./castle-chess/journal.cjs');const j=new ChessJournal('/srv/chess-data/state.json');const r=new ChessRooms({journal:j});r.save();if(new ChessRooms({journal:j}).sessions.size!==0)throw Error('persist');")
assert all(path.read_bytes()==raw for path,raw in old_files.items()) and not list(data_dir.iterdir())
location='''
# Isolated first-party chess; WorkAdventure login, audio and older maps are unchanged.
location ^~ /castle-chess/ {
    proxy_pass http://127.0.0.1:3221;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_connect_timeout 3s;
    proxy_read_timeout 30s;
    client_max_body_size 8k;
}
'''
new_nginx=old_files[NGINX]+location.encode();installed_sha=sha(new_nginx);live_id=None;published=False
try:
    live_id=start(NAME,3221,data_dir);ready('http://127.0.0.1:3221/castle-chess/')
    assert all(path.read_bytes()==raw for path,raw in old_files.items())
    metadata=NGINX.stat();atomic(NGINX,new_nginx,metadata.st_mode&0o777);os.chown(NGINX,metadata.st_uid,metadata.st_gid);published=True
    run('nginx','-t');run('systemctl','reload','nginx')
    ready('https://together.deine-schule.com/castle-chess/');proof=audit('https://together.deine-schule.com/castle-chess/')
    for name,previous in before.items():
        current=inspect(name);assert current['Id']==previous['Id'] and current['State']['StartedAt']==previous['State']['StartedAt']
    assert sha(NGINX.read_bytes())==installed_sha and ROLE.read_bytes()==old_files[ROLE]
    assert GALLERY.read_bytes()==old_files[GALLERY] and SCHOOL.read_bytes()==old_files[SCHOOL]
    for _ in range(25):
        if inspect(NAME)['State'].get('Health',{}).get('Status')=='healthy':break
        time.sleep(1)
    else:raise RuntimeError('Dedicated chess health check did not pass')
    gallery['nginx_sha256']=installed_sha;school['nginx_after_sha256']=installed_sha
    atomic(GALLERY,(json.dumps(gallery,indent=2)+'\n').encode());atomic(SCHOOL,(json.dumps(school,indent=2)+'\n').encode())
    record={'release':str(release),'archive_sha256':EXPECTED_ARCHIVE,'files':{name:sha(data) for name,data in payload.items()},
      'nginx_before_sha256':EXPECTED_NGINX,'nginx_after_sha256':installed_sha,'data_directory':str(data_dir),'image':old['Image'],'container_id':live_id}
    atomic(PRIVATE/'deployment.json',(json.dumps(record,indent=2)+'\n').encode())
    evidence={**proof,'candidatePreflightPassed':True,'isolatedAtomicJournalProbePassed':True,'dedicatedDockerHealthCheckHealthy':True,
      'existingServicesNotRestarted':True,'existingNginxBytesPreservedBeforeNewPrefix':True,'roleLookupUnchanged':True,
      'realPupilMultiplayerTested':False,'loadApprovalFor400':False,'release':release_id}
    atomic(PRIVATE/'live-check.json',(json.dumps(evidence,indent=2)+'\n').encode());print(json.dumps(evidence,indent=2))
except Exception as error:
    print(json.dumps({'publicationFailureType':type(error).__name__,'sourceLines':[frame.lineno for frame in traceback.extract_tb(error.__traceback__) if frame.filename=='<stdin>']}))
    if published and sha(NGINX.read_bytes())==installed_sha:
        metadata=NGINX.stat();atomic(NGINX,old_files[NGINX],metadata.st_mode&0o777);os.chown(NGINX,metadata.st_uid,metadata.st_gid)
        run('nginx','-t');run('systemctl','reload','nginx')
    for path,updated in [(GALLERY,gallery),(SCHOOL,school)]:
        if path.read_bytes()==(json.dumps(updated,indent=2)+'\n').encode():atomic(path,old_files[path])
    if live_id and exists(NAME):stop_owned(NAME,live_id)
    raise RuntimeError('New chess publication failed; only its owned route/service were rolled back') from None
