"""Publish the reviewed portal-backed game gate without restarting WorkAdventure or changing login material."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
import uuid
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-school');PRIVATE=BASE/'private';RECORD=PRIVATE/'deployment.json'
ARCHIVE=Path('/tmp/wvh-castle-school.zip');NAME='wvh-castle-school';PREVIOUS=NAME+'-previous';CANDIDATE=NAME+'-candidate'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
GALLERY=Path('/opt/wvh-castle-content/private/deployment.json')
ROLE=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php')
PROFILE=Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php')
LOOKUP=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php')
OLD={'castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
 'castle-school/server.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school-profile.php'}
ADDED={'castle-school/offers.cjs','castle-school/catalog.cjs','castle-school/public/games.html','castle-school/public/games.js','castle-school/public/games.css'}
ALLOWED=OLD|ADDED
sha=lambda value:hashlib.sha256(value).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
identifier=os.environ.get('CASTLE_SCHOOL_QA_IDENTIFIER','')
assert '@' in identifier and len(identifier)<=254,'Private authorized staff identity required'

assert BASE.resolve()==BASE and not RECORD.is_symlink()
record_raw=RECORD.read_bytes();old_record=json.loads(record_raw);old_release=Path(old_record['release'])
assert old_release.resolve()==old_release and old_release.parent==BASE/'releases'
assert set(old_record['files'])==OLD and all(sha((old_release/name).read_bytes())==value for name,value in old_record['files'].items())
assert {p.relative_to(old_release).as_posix() for p in old_release.rglob('*') if p.is_file()}==OLD
assert not any(p.is_symlink() for p in old_release.rglob('*'))
assert sha(PROFILE.read_bytes())==old_record['profile_sha256'] and sha(LOOKUP.read_bytes())==old_record['lookup_sha256']
assert sha(NGINX.read_bytes())==old_record['nginx_after_sha256'] and json.loads(GALLERY.read_text())['nginx_sha256']==sha(NGINX.read_bytes())
before_files={path:sha(path.read_bytes()) for path in [NGINX,GALLERY,ROLE,PROFILE,LOOKUP,PRIVATE/'runtime.env',PRIVATE/'rules.json']}
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']}
old=inspect(NAME);assert old['State']['Running'] and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs'] is True
assert old['Image']==before['workadventure-play-1']['Image']
assert any(m['Source']==str(old_release) and not m['RW'] for m in old['Mounts'])
assert not exists(CANDIDATE),'Inspect the existing candidate before retrying'
env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
secret=env['SECRET_KEY'].encode();key=env['CASTLE_SCHOOL_LOOKUP_KEY'].encode()
with zipfile.ZipFile(ARCHIVE) as bundle:
    assert set(bundle.namelist())==ALLOWED and len(bundle.infolist())==len(ALLOWED) and sum(i.file_size for i in bundle.infolist())<250000
    payload={name:bundle.read(name) for name in ALLOWED}
assert {name for name in OLD if sha(payload[name])!=old_record['files'][name]}=={'castle-school/server.cjs'}
assert all(secret not in value and key not in value for value in payload.values())
release_id=sha(ARCHIVE.read_bytes())[:16];release=BASE/'releases'/release_id
if release.exists():
    assert release.resolve()==release and not any(p.is_symlink() for p in release.rglob('*'))
    assert {p.relative_to(release).as_posix() for p in release.rglob('*') if p.is_file()}==ALLOWED
    assert all(sha((release/name).read_bytes())==sha(data) for name,data in payload.items())
    for container_id in run('docker','ps','-aq').split():
        assert not any(m['Source']==str(release) for m in inspect(container_id)['Mounts']),'Existing release is still mounted'
else:
    release.mkdir(mode=0o755);release.chmod(0o755)
    for name,data in payload.items():
        target=release/name;assert target.resolve().is_relative_to(release)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.parent.chmod(0o755);target.write_bytes(data);target.chmod(0o644)
run('docker','run','--rm','--network','none','--read-only','--user','1000:1000','--workdir','/srv/release',
 '--cap-drop','ALL','--security-opt','no-new-privileges:true','--env','NODE_PATH=/usr/src/node_modules',
 '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--entrypoint','node',old['Image'],
 '-e',"require('jose');require('/srv/release/castle-school/server.cjs')")

def token(identity,expired=False):
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
    value=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':identity,'username':'Private Castle Gate QA','tags':['teacher'],
      'exp':int(time.time())+(-5 if expired else 180)})
    return (value+b'.'+base64.urlsafe_b64encode(hmac.new(secret,value,hashlib.sha256).digest()).rstrip(b'=')).decode()

def request(base,path,auth=None,body=None,origin='https://together.deine-schule.com'):
    headers={'Origin':origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if auth:headers['Authorization']='Bearer '+auth
    req=urllib.request.Request(base+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    started=time.monotonic()
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(40000)
    assert response.headers.get('Cache-Control')=='no-store'
    assert identifier.encode() not in raw and secret not in raw and key not in raw and (not auth or auth.encode() not in raw)
    if path in ['games','games.js','games.css']:return response.status,raw,response.headers
    data=json.loads(raw)
    assert all(text not in raw for text in [b'gradeLevel',b'classId',b'birthdate',b'"age"',b'Private Castle Gate QA'])
    return response.status,data,round((time.monotonic()-started)*1000)

def audit(base):
    staff=token(identifier);unknown=token('castle-gate-'+uuid.uuid4().hex+'@invalid.local')
    assert request(base,'context')[0]==401 and request(base,'context','invalid')[0]==401
    assert request(base,'context',token(identifier,True))[0]==401
    assert request(base,'context',staff,origin='https://invalid.local')[0]==403
    assert request(base,'context?token=not-accepted',staff)[0]==404
    status,context,elapsed=request(base,'context',staff)
    assert status==200 and context['account']=={'kind':'staff','schoolAccount':True}
    assert len(context['offers'])==7 and len(context['decisions'])==7 and 'targetUrl' not in json.dumps(context)
    configured=[offer for offer in context['offers'] if offer['allowed']]
    assert len(configured)==5 and all(offer['mode']=='preview' for offer in configured)
    assert all(offer['status']=='not_configured' for offer in context['offers'] if not offer['allowed'])
    for offer in configured:
        status,grant,_=request(base,'launch',staff,{'resourceId':offer['id']})
        assert status==200 and grant['mode']=='preview' and grant['targetUrl'].startswith('https://') and grant['id']==offer['id']
    assert request(base,'launch',staff,{'resourceId':'gamesarea02'})[0]==403
    assert request(base,'launch',staff,{'resourceId':'gamesarea01','allowed':True,'age':99,'classId':17})[0]==400
    status,denied,_=request(base,'context',unknown)
    assert status==200 and not denied['account']['schoolAccount'] and all(not offer['allowed'] for offer in denied['offers'])
    for resource in ['gamesarea01','haxballarea01','stumbleguysgame']:
        assert request(base,'launch',unknown,{'resourceId':resource})[:2]==(403,{'error':'not_allowed'})
    assert request(base,'room-link',unknown,{'resourceId':'gamesarea01','targetUrl':'https://codenames.game/','pin':'000000000000'})[0]==403
    for filename in ['runtime.env','rules.json','config.json','public/games.html']:assert request(base,filename,staff)[0]==404
    page=request(base,'games');assert page[0]==200 and page[2].get('X-Frame-Options')=='SAMEORIGIN'
    assert "frame-ancestors 'self'" in page[2].get('Content-Security-Policy','') and 'microphone=(), camera=()' in page[2].get('Permissions-Policy','')
    assert request(base,'games.js')[0]==200 and request(base,'games.css')[0]==200
    return {'staffFreshlyRecognized':True,'configuredStaffPreviews':5,'missingTargetsRemainUnavailable':2,'actualLaunchesChecked':5,
      'unknownSignedTeacherTagsDenied':True,'directLaunchAndClientOverrideDenied':True,'metadataHasNoTargetsOrProfiles':True,
      'ownUiSameOriginOnly':True,'schoolRequestMilliseconds':elapsed,'productionRoomLinksWritten':False,'studentApprovalsCreated':False}

def start(name,port):
    health="node -e \"const r=require('http').get('http://127.0.0.1:3211/castle-school/health',s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.setTimeout(2000,()=>process.exit(1));r.on('error',()=>process.exit(1))\""
    return run('docker','run','-d','--name',name,'--restart','unless-stopped','--network','workadventure_default',
      '--workdir','/srv/release','--user','1000:1000','-p',f'127.0.0.1:{port}:3211',
      '--label','wvh.component=castle-school','--label','wvh.release='+release_id,
      '--env-file',str(PRIVATE/'runtime.env'),'--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
      '--mount','type=bind,src='+str(PRIVATE/'rules.json')+',dst=/srv/rules.json,readonly',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
      '--health-cmd',health,'--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3',
      '--entrypoint','node',old['Image'],'/srv/release/castle-school/server.cjs')

def ready(base):
    for _ in range(30):
        try:
            if request(base,'health')[:2]==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.25)
    raise RuntimeError('Reviewed permission service did not become ready')

candidate_id=start(CANDIDATE,3212)
try:
    ready('http://127.0.0.1:3212/castle-school/');candidate_proof=audit('http://127.0.0.1:3212/castle-school/')
    (PRIVATE/('candidate-'+release_id+'.json')).write_text(json.dumps(candidate_proof,indent=2)+'\n')
finally:
    candidate=inspect(CANDIDATE);assert candidate['Id']==candidate_id.strip() and candidate['Config']['Labels']['wvh.release']==release_id
    run('docker','stop','-t','5',CANDIDATE);run('docker','rm',CANDIDATE)
assert all(sha(path.read_bytes())==value for path,value in before_files.items()) and RECORD.read_bytes()==record_raw
retired=None
if exists(PREVIOUS):
    previous=inspect(PREVIOUS);previous_release=Path(old_record['previous_release'])
    assert previous_release.parent==BASE/'releases' and not previous['State']['Running'] and previous['Config']['User']=='1000:1000' and previous['HostConfig']['ReadonlyRootfs']
    previous_record=json.loads((PRIVATE/('deployment-before-'+old_release.name+'.json')).read_text())
    assert previous_record['release']==str(previous_release) and set(previous_record['files'])==OLD
    assert all(sha((previous_release/name).read_bytes())==value for name,value in previous_record['files'].items())
    assert previous['Image']==old['Image'] and previous['Config']['Entrypoint']==['node'] and previous['Config']['Cmd']==['/srv/release/castle-school/server.cjs']
    previous_env=dict(item.split('=',1) for item in previous['Config']['Env'] if '=' in item)
    assert all(previous_env.get(name)==env[name] for name in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY'])
    assert any(m['Source']==str(previous_release) and not m['RW'] for m in previous['Mounts'])
    retired=NAME+'-retired-'+previous_release.name;assert not exists(retired)
    run('docker','rename',PREVIOUS,retired)
    (PRIVATE/('retired-'+previous_release.name+'.json')).write_text(json.dumps({'name':retired,'id':previous['Id'],'release':str(previous_release),'running':False},indent=2)+'\n')
(PRIVATE/('deployment-before-'+release_id+'.json')).write_bytes(record_raw)
run('docker','stop','-t','10',NAME);run('docker','rename',NAME,PREVIOUS)
try:
    start(NAME,3211);ready('http://127.0.0.1:3211/castle-school/')
    proof=audit('https://together.deine-schule.com/castle-school/')
    for _ in range(25):
        if inspect(NAME)['State'].get('Health',{}).get('Status')=='healthy':break
        time.sleep(1)
    else:raise RuntimeError('Dedicated game service health check did not pass')
    assert all(sha(path.read_bytes())==value for path,value in before_files.items()) and RECORD.read_bytes()==record_raw
    for name,previous in before.items():
        current=inspect(name);assert previous['Id']==current['Id'] and previous['State']['StartedAt']==current['State']['StartedAt']
    updated={**old_record,'release':str(release),'archive_sha256':sha(ARCHIVE.read_bytes()),'files':{name:sha(value) for name,value in payload.items()},
      'previous_release':str(old_release),'portal_catalog_and_actual_launches':True,'node_code_only_update':True,'source_files':len(payload)}
    temporary=PRIVATE/('deployment-'+release_id+'.tmp');temporary.write_text(json.dumps(updated,indent=2)+'\n');temporary.chmod(0o600);temporary.replace(RECORD)
    evidence={**proof,'candidatePreflightPassed':True,'existingMapsAudioAuthAndNginxUnchanged':True,'release':release_id,
      'previousContainerRetained':True,'olderStoppedContainerRetainedUnderNewName':bool(retired),'dedicatedDockerHealthCheckHealthy':True,'realStudentUiTested':False,'loadApprovalFor400':False}
    (PRIVATE/'game-gate-live-check.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(json.dumps(evidence,indent=2))
except Exception:
    if exists(NAME):
        failed=inspect(NAME);assert failed['Config']['Labels']['wvh.release']==release_id
        run('docker','stop','-t','5',NAME);run('docker','rm',NAME)
    run('docker','rename',PREVIOUS,NAME);run('docker','start',NAME)
    if retired:run('docker','rename',retired,PREVIOUS)
    raise RuntimeError('Game-gate update failed; previous permission service restored') from None
