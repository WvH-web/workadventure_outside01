"""Guarded chess-only table binding release; preserve boards, roles, WA and every other service."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-chess');PRIVATE=BASE/'private';NAME='wvh-castle-chess'
EXPECTED='796366ebce36add7c3c3b28f4b56fb701ee1e81ee12a4623b6ec8af25a11a64d'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,raw):
    temporary=path.with_name(path.name+'.tables-staging');assert not temporary.exists()
    temporary.write_bytes(raw);temporary.chmod(0o600);temporary.replace(path)

record_file=PRIVATE/'deployment.json';record_raw=record_file.read_bytes();record=json.loads(record_raw)
old_release=Path(record['release']);old=inspect(NAME)
assert old_release.parent==BASE/'releases' and old_release.resolve()==old_release
assert old['State']['Health']['Status']=='healthy' and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
assert all(sha((old_release/file).read_bytes())==digest for file,digest in record['files'].items())
archive_path=Path('/tmp/wvh-castle-chess.zip');assert sha(archive_path.read_bytes())==EXPECTED
with zipfile.ZipFile(archive_path) as archive:
    assert len(archive.infolist())==len(record['files'])==40 and set(archive.namelist())==set(record['files'])
    assert sum(info.file_size for info in archive.infolist())<1000000
    payload={file:archive.read(file) for file in archive.namelist()}
assert {file for file in payload if sha(payload[file])!=record['files'][file]}=={'castle-chess/rooms.cjs','castle-chess/server.cjs','castle-chess/public/chess.js'}
tokens_file=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
assert tokens_file.resolve()==tokens_file and tokens_file.stat().st_mode&0o777==0o600
tokens=json.loads(tokens_file.read_text());assert set(tokens)=={'A','B'}
env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
assert all(value.encode() not in payload[file] for value in [env['SECRET_KEY'],env['CASTLE_SCHOOL_LOOKUP_KEY'],*tokens.values()] for file in ['castle-chess/rooms.cjs','castle-chess/server.cjs','castle-chess/public/chess.js'])
protected_paths=[Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'),PRIVATE/'runtime.env']
unchanged={path:sha(path.read_bytes()) for path in protected_paths}
unaffected={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio','wvh-castle-school','wvh-castle-art','wvh-castle-art-board']}
release_id=EXPECTED[:16];release=BASE/'releases'/release_id;candidate=NAME+'-tables-candidate';previous=NAME+'-tables-before-'+release_id
assert not release.exists() and not exists(candidate) and not exists(previous)
assert not run('ss','-ltnH','sport = :3222').strip()
release.mkdir(mode=0o755);release.chmod(0o755)
for file,raw in payload.items():
    target=release/file;assert target.resolve().is_relative_to(release)
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(raw);target.chmod(0o644)
for path in release.rglob('*'):
    if path.is_dir():path.chmod(0o755)
candidate_data=PRIVATE/('tables-candidate-'+release_id);candidate_data.mkdir(mode=0o700);os.chown(candidate_data,1000,1000)
current=BASE/'data/state.json'
if current.exists():
    target=candidate_data/'state.json';target.write_bytes(current.read_bytes());target.chmod(0o600);os.chown(target,1000,1000)
created={};swapped=False;stage='candidate'
def start(name,port,testing=False):
    args=['docker','run','-d','--name',name,'--restart','unless-stopped','--network','workadventure_default','--user','1000:1000','--workdir','/srv/release',
          '-p',f'127.0.0.1:{port}:3221','--env-file',str(PRIVATE/'runtime.env'),'--label','wvh.component=castle-chess','--label','wvh.release='+release_id,
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(candidate_data if testing else BASE/'data')+',dst=/srv/chess-data',
          '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
          '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
          '--health-cmd',old['Config']['Healthcheck']['Test'][-1],'--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3']
    created[name]=run(*args,'--entrypoint','node',old['Image'],'/srv/release/castle-chess/server.cjs').strip()
def stop(name):
    assert inspect(name)['Id']==created[name]
    run('docker','stop','-t','10',name);run('docker','rm',name)
def request(base,path,token=None,body=None,session=None):
    headers={'Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    if session:headers['X-Chess-Session']=session
    req=urllib.request.Request(base+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(100000);assert all(value.encode() not in raw for value in [env['SECRET_KEY'],env['CASTLE_SCHOOL_LOOKUP_KEY'],*tokens.values()])
    return response.status,json.loads(raw) if response.headers.get('Content-Type','').startswith('application/json') else raw
def ready(base):
    for _ in range(40):
        try:
            if request(base,'health')==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('readiness')
def audit(base):
    assert request(base,'session',body={})[0]==401
    assert b'this.boundTable=' in request(base,'chess.js')[1]
    for account,table in [('A','tisch-2'),('B','tisch-3')]:
        status,value=request(base,'session',tokens[account],{'tableId':table})
        assert status==200 and value['board']['id']==table and value['self']['color'] is None and value['self']['staff'] is False
        assert request(base,'leave',tokens[account],{},value['sessionId'])[0]==200
try:
    start(candidate,3222,True);ready('http://127.0.0.1:3222/castle-chess/');audit('http://127.0.0.1:3222/castle-chess/');stop(candidate)
    # Refuse to interrupt an existing chess stream; the old service remains running on failure.
    stage='idle-guard'
    for _ in range(2):
        assert not run('ss','-Htn','state','established','sport = :3221').strip(),'Active chess connection'
        time.sleep(1)
    assert record_file.read_bytes()==record_raw and all(sha(path.read_bytes())==digest for path,digest in unchanged.items())
    atomic(PRIVATE/('deployment-before-tables-'+release_id+'.json'),record_raw)
    stage='swap';run('docker','stop','-t','10',NAME);run('docker','rename',NAME,previous);swapped=True
    start(NAME,3221);ready('http://127.0.0.1:3221/castle-chess/');stage='live-audit';audit('https://together.deine-schule.com/castle-chess/')
    for _ in range(25):
        if inspect(NAME)['State'].get('Health',{}).get('Status')=='healthy':break
        time.sleep(1)
    else:raise RuntimeError('Docker health')
    assert all(sha(path.read_bytes())==digest for path,digest in unchanged.items())
    assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in unaffected.items())
    updated={**record,'release':str(release),'archive_sha256':EXPECTED,'files':{file:sha(raw) for file,raw in payload.items()},'previous_release':str(old_release),'tables_previous_container':previous,'container_id':created[NAME]}
    atomic(record_file,(json.dumps(updated,indent=2)+'\n').encode())
    print(json.dumps({'passed':True,'release':release_id,'normalMicrosoftPupils':2,'physicalTableBinding':True,'noColorAutomaticallyClaimed':True,'oldBoardsPreserved':True,'onlyChessServiceChanged':True,'loadApprovalFor400':False}))
except Exception as error:
    print(json.dumps({'passed':False,'stage':stage,'errorType':type(error).__name__}))
    for name in [candidate,NAME]:
        if name in created and exists(name):stop(name)
    if swapped:run('docker','rename',previous,NAME);run('docker','start',NAME)
    raise RuntimeError('Scoped chess-table release stopped; previous service retained or restored') from None
