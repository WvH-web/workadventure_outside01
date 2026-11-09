"""Update only reviewed Node code in the isolated permission service; retain rollback."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-school');PRIVATE=BASE/'private';RECORD=PRIVATE/'deployment.json'
ARCHIVE=Path('/tmp/wvh-castle-school.zip');NAME='wvh-castle-school';PREVIOUS=NAME+'-previous'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
GALLERY=Path('/opt/wvh-castle-content/private/deployment.json')
ROLE=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php')
PROFILE=Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php')
LOOKUP=Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php')
ALLOWED={'castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
 'castle-school/server.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school-profile.php'}
sha=lambda value:hashlib.sha256(value).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def health(url):
    try:
        with urllib.request.urlopen(url,timeout=2) as response:return response.status==200 and json.load(response)=={'ready':True}
    except Exception:return False
assert BASE.resolve()==BASE and not RECORD.is_symlink()
record_raw=RECORD.read_bytes();old_record=json.loads(record_raw);old_release=Path(old_record['release'])
assert old_release.resolve()==old_release and old_release.parent==BASE/'releases'
assert set(old_record['files'])==ALLOWED
assert all(sha((old_release/name).read_bytes())==value for name,value in old_record['files'].items())
assert {p.relative_to(old_release).as_posix() for p in old_release.rglob('*') if p.is_file()}==ALLOWED
assert not any(p.is_symlink() for p in old_release.rglob('*'))
assert sha(PROFILE.read_bytes())==old_record['profile_sha256'] and sha(LOOKUP.read_bytes())==old_record['lookup_sha256']
assert sha(NGINX.read_bytes())==old_record['nginx_after_sha256'] and json.loads(GALLERY.read_text())['nginx_sha256']==sha(NGINX.read_bytes())
before_files={path:sha(path.read_bytes()) for path in [NGINX,GALLERY,ROLE,PROFILE,LOOKUP,PRIVATE/'runtime.env',PRIVATE/'rules.json']}
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']}
old=inspect(NAME)
assert old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs'] is True
assert any(m['Source']==str(old_release) and not m['RW'] for m in old['Mounts'])
if run('docker','ps','-a','--filter','name=^/'+PREVIOUS+'$','--format','{{.Names}}').strip():raise RuntimeError('Previous rollback container must be reviewed first')
with zipfile.ZipFile(ARCHIVE) as bundle:
    if set(bundle.namelist())!=ALLOWED or len(bundle.infolist())!=len(ALLOWED) or sum(i.file_size for i in bundle.infolist())>200000:raise RuntimeError('Unexpected source archive')
    payload={name:bundle.read(name) for name in ALLOWED}
changed={name for name,value in payload.items() if sha(value)!=old_record['files'][name]}
if changed!={'castle-school/server.cjs'}:raise RuntimeError('This update permits only the reviewed rate-counter change')
release_id=sha(ARCHIVE.read_bytes())[:16];release=BASE/'releases'/release_id
if release.exists():raise RuntimeError('Release directory already exists; inspect before retry')
release.mkdir(mode=0o755);release.chmod(0o755)
for name,data in payload.items():
    target=release/name;assert target.resolve().is_relative_to(release)
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.parent.chmod(0o755)
    target.write_bytes(data);target.chmod(0o644)
run('docker','run','--rm','--network','none','--read-only','--user','1000:1000','--workdir','/srv/release',
 '--cap-drop','ALL','--security-opt','no-new-privileges:true','--env','NODE_PATH=/usr/src/node_modules',
 '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--entrypoint','node',old['Image'],
 '-e',"require('jose');require('/srv/release/castle-school/server.cjs')")
if any(sha(path.read_bytes())!=value for path,value in before_files.items()) or RECORD.read_bytes()!=record_raw:raise RuntimeError('Concurrent service configuration edit')
(PRIVATE/('deployment-before-'+release_id+'.json')).write_bytes(record_raw)
run('docker','stop','-t','10',NAME);run('docker','rename',NAME,PREVIOUS)
created=False
try:
    run('docker','run','-d','--name',NAME,'--restart','unless-stopped','--network','workadventure_default',
      '--workdir','/srv/release','--user','1000:1000','-p','127.0.0.1:3211:3211',
      '--label','wvh.component=castle-school','--label','wvh.release='+release_id,
      '--env-file',str(PRIVATE/'runtime.env'),'--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
      '--mount','type=bind,src='+str(PRIVATE/'rules.json')+',dst=/srv/rules.json,readonly',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL',
      '--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5',
      '--log-opt','max-size=2m','--log-opt','max-file=2','--entrypoint','node',old['Image'],'/srv/release/castle-school/server.cjs')
    created=True
    for _ in range(30):
        if health('http://127.0.0.1:3211/castle-school/health'):break
        time.sleep(.25)
    else:raise RuntimeError('Updated permission service did not start')
    if not health('https://together.deine-schule.com/castle-school/health'):raise RuntimeError('Public permission service is not ready')
    if any(sha(path.read_bytes())!=value for path,value in before_files.items()) or RECORD.read_bytes()!=record_raw:raise RuntimeError('Concurrent configuration edit detected')
    for name,previous in before.items():
        current=inspect(name);assert previous['Id']==current['Id'] and previous['State']['StartedAt']==current['State']['StartedAt']
    updated={**old_record,'release':str(release),'archive_sha256':sha(ARCHIVE.read_bytes()),
      'files':{name:sha(value) for name,value in payload.items()},'previous_release':str(old_release),
      'node_code_only_update':True,'rate_identifiers_process_salted_and_expiring':True}
    RECORD.write_text(json.dumps(updated,indent=2)+'\n');RECORD.chmod(0o600)
    print(json.dumps({'ready':True,'node_code_only_update':True,'nginx_and_lookup_unchanged':True,
      'existing_maps_and_audio_unchanged':True,'previous_container_retained':True,'new_release':release_id},indent=2))
except Exception:
    try:
        candidate=inspect(NAME)
        if candidate['Config'].get('Labels',{}).get('wvh.release')==release_id:
            subprocess.run(['docker','rm','-f',NAME],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    except Exception:pass
    run('docker','rename',PREVIOUS,NAME);run('docker','start',NAME)
    raise RuntimeError('Permission update failed; previous permission service was restored') from None
