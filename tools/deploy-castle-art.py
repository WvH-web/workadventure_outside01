"""Publish only the isolated atelier from its verified, unused staging tree."""
import base64
import hashlib
import hmac
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import tarfile
import time
import traceback
import urllib.error
import urllib.request
import uuid
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-art');PRIVATE=BASE/'private';BOARD='wvh-castle-art-board';GATE='wvh-castle-art';CANDIDATE=GATE+'-candidate'
ARCHIVE=Path('/tmp/wvh-castle-art.zip');EXPECTED_ARCHIVE='bf7276dd326ee8d8283745db932fd21f7b51501dc59cbbe4e35fd2a26912ff1c'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf');EXPECTED_NGINX='5520e093aeec2f5f23eb9d17fde23c58c1c5845257c8b499711687393825aa98'
MANIFESTS={Path('/opt/wvh-castle-content/private/deployment.json'):'nginx_sha256',Path('/opt/wvh-castle-school/private/deployment.json'):'nginx_after_sha256',Path('/opt/wvh-castle-chess/private/deployment.json'):'nginx_after_sha256'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,raw,mode=0o600):
    target=path.with_name(path.name+'.art-staging');assert not target.exists() and not target.is_symlink()
    target.write_bytes(raw);target.chmod(mode);target.replace(path)

assert BASE.resolve()==BASE and BASE.is_dir() and not PRIVATE.is_symlink() and not (PRIVATE/'deployment.json').exists()
assert not list((BASE/'data').iterdir()) and all(not exists(name) for name in [BOARD,GATE,CANDIDATE])
assert all(not run('ss','-ltnH','sport = :'+str(port)).strip() for port in [3231,3232])
assert sha(ARCHIVE.read_bytes())==EXPECTED_ARCHIVE and sha(NGINX.read_bytes())==EXPECTED_NGINX and b'/castle-art/' not in NGINX.read_bytes()
old_files={path:path.read_bytes() for path in [NGINX,*MANIFESTS]};records={path:json.loads(old_files[path]) for path in MANIFESTS}
assert all(records[path][field]==EXPECTED_NGINX for path,field in MANIFESTS.items())
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio','wvh-castle-school','wvh-castle-chess']}
assert all(value['State']['Running'] for value in before.values())
school=before['wvh-castle-school'];image=school['Image'];assert image==before['workadventure-play-1']['Image'] and school['State']['Health']['Status']=='healthy'
env=dict(item.split('=',1) for item in school['Config']['Env'] if '=' in item)
assert env.get('SECRET_KEY') and env.get('CASTLE_SCHOOL_LOOKUP_KEY') and env.get('CASTLE_SCHOOL_TRUSTED_PROXY_IPS')
memory=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
assert int(memory['MemAvailable'].split()[0])>1200000 and os.statvfs(BASE).f_bavail*os.statvfs(BASE).f_frsize>2*1024**3
handoff=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
assert handoff.resolve()==handoff and handoff.parent.stat().st_mode&0o777==0o700
handoff.chmod(0o600);tokens=json.loads(handoff.read_text());assert set(tokens)=={'A','B'}
own={'castle-art/server.cjs','castle-art/sessions.cjs','castle-art/routes.cjs','castle-art/upstream-manifest.json',
 *['castle-art/public/'+name for name in ['index.html','art.js','art.css','credits.html','rules.html']],
 'hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school/lookup.cjs','castle-school/policy.cjs','castle-school/identity.cjs'}
with zipfile.ZipFile(ARCHIVE) as archive:
    manifest=json.loads(archive.read('castle-art/upstream-manifest.json'))
    allowed=own|{'castle-art/'+manifest['wbo']['archive'],'castle-art/upstream/WBO-LICENSE',*['castle-art/'+item['path'] for item in manifest['files']]}
    assert len(archive.infolist())==len(allowed)==18 and set(archive.namelist())==allowed and sum(info.file_size for info in archive.infolist())<1100000
    assert all(not name.startswith('/') and '\\' not in name and '..' not in name.split('/') for name in allowed)
    payload={name:archive.read(name) for name in allowed}
assert manifest['wbo']['commit']=='90ae10b5e46e8efeb9b0c8ad918524e336b3fedc' and manifest['proxy']['version']=='0.5.6'
for item in [*manifest['files'],{'path':manifest['wbo']['archive'],'sha256':manifest['wbo']['sha256']}]:assert sha(payload['castle-art/'+item['path']])==item['sha256']
school_record=records[Path('/opt/wvh-castle-school/private/deployment.json')]
for name in own&set(school_record['files']):assert sha(payload[name])==school_record['files'][name]
assert all(env['SECRET_KEY'].encode() not in payload[name] for name in own)
assert all(env['CASTLE_SCHOOL_LOOKUP_KEY'].encode() not in raw for raw in payload.values())

sources=list(BASE.glob('releases/*/wbo'));assert len(sources)==1
source=sources[0];assert source.resolve()==source and not any(path.is_symlink() for path in source.rglob('*'))
with tarfile.open(fileobj=io.BytesIO(payload['castle-art/'+manifest['wbo']['archive']]),mode='r:gz') as archive:
    expected={}
    for member in archive.getmembers():
        assert member.isfile() or member.isdir()
        assert not member.name.startswith('/') and '\\' not in member.name and '..' not in member.name.split('/')
        if member.isfile():expected[source/member.name]=archive.extractfile(member).read()
assert {path for path in source.rglob('*') if path.is_file()}==set(expected)
assert all(path.read_bytes()==raw for path,raw in expected.items()) and not list((source/'node_modules').iterdir())
release_id=EXPECTED_ARCHIVE[:16];release=BASE/'releases'/release_id;modules=BASE/'node_modules';data=BASE/'data'
assert modules.resolve()==modules and data.resolve()==data
if release.exists():
    assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(payload)
    assert all((release/name).read_bytes()==raw for name,raw in payload.items())
release.mkdir(mode=0o755,exist_ok=True);release.chmod(0o755)
for name,raw in payload.items():
    target=release/name;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(raw);target.chmod(0o644)
for directory in release.rglob('*'):
    if directory.is_dir():directory.chmod(0o755)
assert modules.stat().st_uid==1000 and data.stat().st_uid==1000 and data.stat().st_mode&0o777==0o700
for index,(path,raw) in enumerate(old_files.items()):
    target=PRIVATE/('before-publish-'+release_id+'-'+str(index)+'-'+path.name)
    if target.exists():assert target.read_bytes()==raw
    else:atomic(target,raw)
run('docker','run','--rm','--network','workadventure_default','--user','1000:1000','--workdir','/srv/wbo','--read-only',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=128m','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','384m','--cpus','1','--env','HOME=/tmp',
 '--mount','type=bind,src='+str(source)+',dst=/srv/wbo,readonly','--mount','type=bind,src='+str(modules)+',dst=/srv/wbo/node_modules',
 '--entrypoint','npm',image,'ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund','--cache','/tmp/npm-cache')
tests=['board_capabilities','jwt_boardname_auth','board_registry_vulnerability','message_validation','stored_svg_item_codec','streaming_stored_svg_scan','svg_board_store','server_routes','socket_policy']
test_output=run('docker','run','--rm','--network','none','--user','1000:1000','--workdir','/srv/wbo','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=128m',
 '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','384m','--cpus','1','--env','WBO_SILENT=true','--env','OTEL_SDK_DISABLED=true',
 '--mount','type=bind,src='+str(source)+',dst=/srv/wbo,readonly','--mount','type=bind,src='+str(modules)+',dst=/srv/wbo/node_modules,readonly',
 '--entrypoint','node',image,'--test','--test-reporter=tap','--test-concurrency=1',*['test-node/'+name+'.test.js' for name in tests])
atomic(PRIVATE/('linux-tests-'+release_id+'.log'),test_output.encode());assert '# tests 113' in test_output and '# fail 0' in test_output
board_key=secrets.token_hex(32)
gateway_env={'SECRET_KEY':env['SECRET_KEY'],'CASTLE_SCHOOL_LOOKUP_KEY':env['CASTLE_SCHOOL_LOOKUP_KEY'],'CASTLE_ART_BOARD_SECRET':board_key,
 'CASTLE_ART_TRUSTED_PROXY_IPS':env['CASTLE_SCHOOL_TRUSTED_PROXY_IPS'],'NODE_PATH':'/usr/src/node_modules'}
board_env={'NODE_ENV':'production','PORT':'8080','AUTH_SECRET_KEY':board_key,'WBO_BASE_PATH':'/castle-art/wbo','WBO_HISTORY_DIR':'/srv/art-data',
 'WBO_SAVE_INTERVAL':'1000','WBO_MAX_SAVE_DELAY':'3000','WBO_MAX_ITEM_COUNT':'2048','WBO_MAX_CHILDREN':'500','WBO_MAX_BOARD_SIZE':'4096',
 'WBO_IP_SOURCE':'X-Forwarded-For','WBO_TRUST_PROXY_HOPS':'1','LOG_LEVEL':'error','OTEL_SDK_DISABLED':'true','WBO_SILENT':'true'}
for file,values in [('gateway.env',gateway_env),('board.env',board_env)]:
    assert all('\n' not in value and '\r' not in value for value in values.values())
    target=PRIVATE/file;assert not target.is_symlink();backup=PRIVATE/('before-publish-'+release_id+'-'+file)
    if not backup.exists():atomic(backup,target.read_bytes())
    atomic(target,''.join(key+'='+value+'\n' for key,value in values.items()).encode())
owned={};published=False;installed_sha=None;stage='start-board'
def stop(name):
    current=inspect(name);assert current['Id']==owned[name] and current['Config']['Labels']['wvh.release']==release_id
    run('docker','stop','-t','12',name);run('docker','rm',name)
def start(name,board=False,port=None):
    health_port=8080 if board else 3231;health_path='/favicon.svg' if board else '/castle-art/health'
    args=['docker','run','-d','--name',name,'--restart','unless-stopped','--network','workadventure_default','--user','1000:1000',
     '--workdir','/srv/wbo' if board else '/srv/release','--env-file',str(PRIVATE/('board.env' if board else 'gateway.env')),
     '--label','wvh.component=castle-art','--label','wvh.release='+release_id,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m',
     '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','384m' if board else '128m','--cpus','1' if board else '0.5',
     '--log-opt','max-size=2m','--log-opt','max-file=2','--health-cmd',f'node -e "const r=require(\'http\').get(\'http://127.0.0.1:{health_port}{health_path}\',s=>{{s.resume();process.exit(s.statusCode===200?0:1)}});r.setTimeout(2000,()=>process.exit(1));r.on(\'error\',()=>process.exit(1))"',
     '--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3']
    if board:args+=['--mount','type=bind,src='+str(source)+',dst=/srv/wbo,readonly','--mount','type=bind,src='+str(modules)+',dst=/srv/wbo/node_modules,readonly','--mount','type=bind,src='+str(data)+',dst=/srv/art-data']
    else:args+=['-p',f'127.0.0.1:{port}:3231','--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly']
    owned[name]=run(*args,'--entrypoint','node',image,'/srv/wbo/server/server.mjs' if board else '/srv/release/castle-art/server.cjs').strip()
def request(base,path,token=None,body=None,cookie=None):
    headers={'Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    if cookie:headers['Cookie']=cookie
    req=urllib.request.Request(base+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(1100000);assert all(value not in raw for value in [env['CASTLE_SCHOOL_LOOKUP_KEY'].encode(),board_key.encode(),*[token.encode() for token in tokens.values()]])
    return response.status,raw,response.headers
def ready(base):
    for _ in range(50):
        try:
            if request(base,'health')[:2]==(200,b'{"ready":true}'):return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Art readiness')
def audit(base):
    assert request(base,'session',body={'clientId':str(uuid.uuid4())})[0]==401
    assert request(base,'wbo/boards/schlossatelier-maltisch')[0]==401
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
    value=encode({'alg':'HS256'})+b'.'+encode({'identifier':'art-'+uuid.uuid4().hex+'@invalid.local','tags':['teacher'],'exp':int(time.time())+180})
    unknown=(value+b'.'+base64.urlsafe_b64encode(hmac.new(env['SECRET_KEY'].encode(),value,hashlib.sha256).digest()).rstrip(b'=')).decode()
    assert request(base,'session',unknown,{'clientId':str(uuid.uuid4())})[:2]==(403,b'{"error":"school_required"}')
    for token in tokens.values():
        client=str(uuid.uuid4());status,raw,headers=request(base,'session',token,{'clientId':client});state=json.loads(raw)
        assert status==200 and state['staff'] is False and len(state['boards'])==3
        assert not any(key.encode() in raw for key in ['identifier','gradeLevel','classId','checkedAt','token','userSecret'])
        cookie=headers['Set-Cookie'].split(';')[0]
        try:
            status,page,headers=request(base,'wbo/boards/schlossatelier-maltisch?lang=de',cookie=cookie)
            # The drawing SVG is fetched separately, not embedded in WBO's HTML shell.
            assert status==200 and b'id="boardStatusIndicator"' in page and b'token=' not in page and headers.get('Set-Cookie') is None
            assert request(base,'wbo/boards/schlossatelier-maltisch.svg',cookie=cookie)[0]==200
            for path,expected_status in [('server.cjs',404),('gateway.env',404),('wbo/boards/arbitrary',404),('wbo/server/server.mjs',404),('wbo/boards/schlossatelier-maltisch?token=evil',400)]:assert request(base,path,cookie=cookie)[0]==expected_status
        finally:assert request(base,'leave',token,{'clientId':client},cookie)[0]==200
    assert request(base,'source/wbo-2.18.33.tar.gz')[1]==payload['castle-art/'+manifest['wbo']['archive']]
try:
    start(BOARD,True);start(CANDIDATE,port=3232);ready('http://127.0.0.1:3232/castle-art/');stage='candidate-audit';audit('http://127.0.0.1:3232/castle-art/');stop(CANDIDATE)
    assert all(path.read_bytes()==raw for path,raw in old_files.items());stage='start-live-gateway';start(GATE,port=3231);ready('http://127.0.0.1:3231/castle-art/')
    location='''
# Isolated school atelier; no other map or service routes are changed.
location ^~ /castle-art/ {
    proxy_pass http://127.0.0.1:3231;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For "";
    proxy_buffering off;
    proxy_connect_timeout 3s;
    proxy_read_timeout 75s;
    client_max_body_size 1m;
    access_log off;
}
'''
    updated=old_files[NGINX]+location.encode();installed_sha=sha(updated);metadata=NGINX.stat();stage='publish-route'
    atomic(NGINX,updated,metadata.st_mode&0o777);os.chown(NGINX,metadata.st_uid,metadata.st_gid);published=True
    run('nginx','-t');run('systemctl','reload','nginx');ready('https://together.deine-schule.com/castle-art/');stage='public-audit';audit('https://together.deine-schule.com/castle-art/')
    for name,previous in before.items():
        current=inspect(name);assert current['Id']==previous['Id'] and current['State']['StartedAt']==previous['State']['StartedAt']
    for _ in range(30):
        if all(inspect(name)['State'].get('Health',{}).get('Status')=='healthy' for name in [BOARD,GATE]):break
        time.sleep(1)
    else:raise RuntimeError('Art container health')
    assert sha(NGINX.read_bytes())==installed_sha
    for path,field in MANIFESTS.items():
        assert path.read_bytes()==old_files[path];records[path][field]=installed_sha;atomic(path,(json.dumps(records[path],indent=2)+'\n').encode())
    record={'release':str(release),'archive_sha256':EXPECTED_ARCHIVE,'files':{name:sha(raw) for name,raw in payload.items()},'image':image,
     'nginx_before_sha256':EXPECTED_NGINX,'nginx_after_sha256':installed_sha,'source_directory':str(source),'data_directory':str(data),'containers':{name:owned[name] for name in [BOARD,GATE]}}
    atomic(PRIVATE/'deployment.json',(json.dumps(record,indent=2)+'\n').encode())
    proof={'passed':True,'normalMicrosoftPupilTokensAccepted':2,'pupilsHaveNoModeratorRole':True,'unknownTeacherTagsDenied':True,
     'anonymousBoardsDenied':True,'sourceAndLicensesAvailable':True,'upstreamLinuxTestsPassed':113,'existingServicesNotRestarted':True,
     'whiteboardDrawingTestedInThisProbe':False,'loadApprovalFor400':False,'release':release_id}
    atomic(PRIVATE/'live-check.json',(json.dumps(proof,indent=2)+'\n').encode());print(json.dumps(proof,indent=2))
except Exception as error:
    print(json.dumps({'stage':stage,'failureType':type(error).__name__,'sourceLines':[frame.lineno for frame in traceback.extract_tb(error.__traceback__) if frame.filename=='<stdin>']}))
    for name in [BOARD,GATE,CANDIDATE]:
        if name in owned and exists(name):atomic(PRIVATE/('failure-'+release_id+'-'+name+'.log'),run('docker','logs',name).encode())
    if published and sha(NGINX.read_bytes())==installed_sha:
        metadata=NGINX.stat();atomic(NGINX,old_files[NGINX],metadata.st_mode&0o777);os.chown(NGINX,metadata.st_uid,metadata.st_gid);run('nginx','-t');run('systemctl','reload','nginx')
    for path in MANIFESTS:
        if path.read_bytes()==(json.dumps(records[path],indent=2)+'\n').encode():atomic(path,old_files[path])
    for name in [CANDIDATE,GATE,BOARD]:
        if name in owned and exists(name):stop(name)
    raise RuntimeError('Atelier publication stopped; only its owned services and new route were rolled back. Private evidence retained.') from None
