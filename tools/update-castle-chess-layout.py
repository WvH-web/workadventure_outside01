"""Guarded chess UI-only release; preserve rules, journal, roles and other services."""
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
EXPECTED='745b263bbd6c4af488d56a078570756216ec408fb76694fb4e3669da78e9e14c'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,raw):
    temporary=path.with_name(path.name+'.layout-staging');assert not temporary.exists()
    temporary.write_bytes(raw);temporary.chmod(0o600);temporary.replace(path)

record_file=PRIVATE/'deployment.json';record_raw=record_file.read_bytes();record=json.loads(record_raw)
old_release=Path(record['release']);old=inspect(NAME)
assert old_release.parent==BASE/'releases' and old_release.resolve()==old_release
assert old_release.name=='796366ebce36add7' and old['State']['Health']['Status']=='healthy'
assert all(sha((old_release/file).read_bytes())==digest for file,digest in record['files'].items())
archive=Path('/tmp/wvh-castle-chess.zip');assert sha(archive.read_bytes())==EXPECTED
with zipfile.ZipFile(archive) as bundle:
    assert len(bundle.infolist())==40 and set(bundle.namelist())==set(record['files'])
    assert sum(info.file_size for info in bundle.infolist())<1000000
    payload={file:bundle.read(file) for file in bundle.namelist()}
changed={'castle-chess/public/chess.js','castle-chess/public/chess.css'}
assert {file for file in payload if sha(payload[file])!=record['files'][file]}==changed
token_file=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
assert token_file.resolve()==token_file and token_file.parent.stat().st_mode&0o777==0o700
token_file.chmod(0o600);assert token_file.stat().st_mode&0o777==0o600
tokens=json.loads(token_file.read_text());assert set(tokens)=={'A','B'}
env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
assert all(value.encode() not in payload[file] for value in [env['SECRET_KEY'],env['CASTLE_SCHOOL_LOOKUP_KEY'],*tokens.values()] for file in changed)
protected=[Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'),PRIVATE/'runtime.env']
unchanged={file:sha(file.read_bytes()) for file in protected}
services={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio','wvh-castle-school','wvh-castle-art','wvh-castle-art-board']}
release_id=EXPECTED[:16];release=BASE/'releases'/release_id;candidate=NAME+'-layout-candidate';previous=NAME+'-layout-before-'+release_id
assert not release.exists() and not exists(candidate) and not exists(previous)
assert not run('ss','-ltnH','sport = :3222').strip()
release.mkdir(mode=0o755);release.chmod(0o755)
for file,raw in payload.items():
    target=release/file;assert target.resolve().is_relative_to(release)
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(raw);target.chmod(0o644)
for path in release.rglob('*'):
    if path.is_dir():path.chmod(0o755)
candidate_data=PRIVATE/('layout-candidate-'+release_id);candidate_data.mkdir(mode=0o700);os.chown(candidate_data,1000,1000)
current=BASE/'data/state.json';journal=current.read_bytes() if current.exists() else None
if journal is not None:
    target=candidate_data/'state.json';target.write_bytes(journal);target.chmod(0o600);os.chown(target,1000,1000)
created={};swapped=False;stage='candidate'
def start(name,port,testing=False):
    args=['docker','run','-d','--name',name,'--restart','unless-stopped','--network','workadventure_default','--user','1000:1000','--workdir','/srv/release',
      '-p',f'127.0.0.1:{port}:3221','--env-file',str(PRIVATE/'runtime.env'),'--label','wvh.component=castle-chess','--label','wvh.release='+release_id,
      '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(candidate_data if testing else BASE/'data')+',dst=/srv/chess-data',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5',
      '--log-opt','max-size=2m','--log-opt','max-file=2','--health-cmd',old['Config']['Healthcheck']['Test'][-1],
      '--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3']
    created[name]=run(*args,'--entrypoint','node',old['Image'],'/srv/release/castle-chess/server.cjs').strip()
def stop(name):
    assert inspect(name)['Id']==created[name];run('docker','stop','-t','10',name);run('docker','rm',name)
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
    for file in changed:
        status,raw=request(base,file.rsplit('/',1)[1]);assert status==200 and sha(raw)==sha(payload[file])
    for account in ['A','B']:
        status,value=request(base,'session',tokens[account],{'tableId':'tisch-1'})
        assert status==200 and value['self']['color'] is None and value['self']['staff'] is False
        assert request(base,'leave',tokens[account],{},value['sessionId'])[0]==200
try:
    start(candidate,3222,True);ready('http://127.0.0.1:3222/castle-chess/');audit('http://127.0.0.1:3222/castle-chess/');stop(candidate)
    stage='idle-guard'
    for _ in range(2):
        assert not run('ss','-Htn','state','established','sport = :3221').strip(),'Active chess connection'
        time.sleep(1)
    assert record_file.read_bytes()==record_raw and all(sha(file.read_bytes())==digest for file,digest in unchanged.items())
    atomic(PRIVATE/('deployment-before-layout-'+release_id+'.json'),record_raw)
    stage='swap';run('docker','stop','-t','10',NAME);run('docker','rename',NAME,previous);swapped=True
    start(NAME,3221);ready('http://127.0.0.1:3221/castle-chess/');audit('https://together.deine-schule.com/castle-chess/')
    for _ in range(25):
        if inspect(NAME)['State'].get('Health',{}).get('Status')=='healthy':break
        time.sleep(1)
    else:raise RuntimeError('Docker health')
    assert all(sha(file.read_bytes())==digest for file,digest in unchanged.items())
    assert all(inspect(name)['Id']==value['Id'] and inspect(name)['State']['StartedAt']==value['State']['StartedAt'] for name,value in services.items())
    assert journal is None or current.read_bytes()==journal,'UI release must not change the game journal'
    updated={**record,'release':str(release),'archive_sha256':EXPECTED,'files':{file:sha(raw) for file,raw in payload.items()},'previous_release':str(old_release),'layout_previous_container':previous,'container_id':created[NAME]}
    atomic(record_file,(json.dumps(updated,indent=2)+'\n').encode());print(json.dumps({'passed':True,'release':release_id,'onlyTwoUiFilesChanged':True,'journalUnchanged':True,'realPupilAccessPreserved':True,'onlyChessServiceChanged':True}))
except Exception as error:
    print(json.dumps({'passed':False,'stage':stage,'errorType':type(error).__name__}))
    for name in [candidate,NAME]:
        if name in created and exists(name):stop(name)
    if swapped:run('docker','rename',previous,NAME);run('docker','start',NAME)
    raise RuntimeError('Chess layout release stopped; previous service retained or restored') from None
