"""Isolated school-piano staging. Existing services, public routes and maps are read-only."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
import zipfile

BASE=Path('/opt/wvh-castle-piano');PRIVATE=BASE/'private';RECORD=PRIVATE/'stage.json'
ARCHIVE=Path('/tmp/wvh-castle-piano.zip');NAME='wvh-castle-piano-stage';PORT=13241
EXPECTED_ARCHIVE='8a1f180e9b723ef1d3847c9fdfb5ca8c5e9de4d6f38625ff0659d1ea9f41172f'
SERVICES=['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio',
 'wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board']
PROTECTED=[Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php'),
 Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php'),
 *[Path('/opt/wvh-castle-'+service+'/private/deployment.json') for service in ['school','chess','art','content']],
 Path('/opt/wvh-castle-school/private/runtime.env'),Path('/opt/wvh-castle-school/private/rules.json'),
 Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')]
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def baseline():
    services={}
    for name in SERVICES:
        value=inspect(name);assert value['State']['Running'];services[name]={'id':value['Id'],'started':value['State']['StartedAt']}
    files={str(path):sha(path.read_bytes()) for path in PROTECTED}
    maps=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
    for path in maps.iterdir():
        assert path.is_file() and not path.is_symlink() and path.name.endswith('.wam');files[str(path)]=sha(path.read_bytes())
    return {'services':services,'files':files}
def unchanged(before):assert baseline()==before,'Existing platform or protected configuration changed'
def atomic(path,value):
    temporary=path.with_name(path.name+'.piano-staging');assert not temporary.exists();temporary.write_text(json.dumps(value,indent=2)+'\n');temporary.chmod(0o600);temporary.replace(path)
def ready():
    for _ in range(50):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/castle-piano/health',timeout=2) as response:
                if response.status==200 and json.load(response)=={'ready':True}:return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Piano staging readiness failed')
def stage():
    os.umask(0o077);before=baseline();assert not exists(NAME) and not exists('wvh-castle-piano')
    assert not run('ss','-ltnH','sport = :'+str(PORT)).strip()
    assert not BASE.is_symlink() and BASE.resolve()==BASE
    BASE.mkdir(mode=0o755,exist_ok=True);PRIVATE.mkdir(mode=0o700,exist_ok=True);PRIVATE.chmod(0o700)
    if RECORD.exists():assert json.loads(RECORD.read_text())['stopped'] is True
    raw=ARCHIVE.read_bytes();assert len(raw)<2500000 and sha(raw)==EXPECTED_ARCHIVE
    with zipfile.ZipFile(ARCHIVE) as archive:
        manifest=json.loads(archive.read('castle-piano/vendor-manifest.json'))
        own={'castle-piano/package.json','castle-piano/server.cjs','castle-piano/rooms.cjs','castle-piano/vendor-manifest.json',
          *['castle-piano/public/'+file for file in ['index.html','piano.js','piano.css','keys.css','audio.js','projection.js','credits.html']],
          *['castle-school/'+file for file in ['identity.cjs','lookup.cjs','policy.cjs']],'hall-audio/auth.cjs','hall-audio/errors.cjs'}
        allowed=own|{'castle-piano/'+file['path'] for file in manifest['files']}
        assert len(allowed)==len(archive.infolist())==58 and set(archive.namelist())==allowed
        assert sum(info.file_size for info in archive.infolist())<2000000
        assert all(not name.startswith('/') and '\\' not in name and '..' not in name.split('/') for name in allowed)
        payload={name:archive.read(name) for name in allowed}
    assert manifest['samples']['commit']=='869b6f8d9cddb47d966238c012041480b1ce517a'
    assert {(item['name'],item['version']) for item in manifest['packages']}=={('@babel/runtime','7.29.13'),('automation-events','7.1.19'),
      ('standardized-audio-context','25.3.77'),('tone','15.1.22'),('tslib','2.9.1'),('ws','8.22.0')}
    for item in manifest['files']:assert sha(payload['castle-piano/'+item['path']])==item['sha256']
    school=inspect('wvh-castle-school');school_record=json.loads(Path('/opt/wvh-castle-school/private/deployment.json').read_text())
    for name in own&set(school_record['files']):assert sha(payload[name])==school_record['files'][name]
    env=dict(item.split('=',1) for item in school['Config']['Env'] if '=' in item)
    assert all(env.get(key) for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY'])
    assert all(env[key].encode() not in content for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY'] for content in payload.values())
    memory=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
    assert int(memory['MemAvailable'].split()[0])>900000 and os.statvfs(BASE).f_bavail*os.statvfs(BASE).f_frsize>1024**3
    release_id=sha(raw)[:16];release=BASE/'releases'/release_id
    if release.exists():
        assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
        assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(payload)
        assert all((release/name).read_bytes()==content for name,content in payload.items())
    release.mkdir(mode=0o755,parents=True,exist_ok=True)
    for name,content in payload.items():
        target=release/name;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(content);target.chmod(0o644)
    for directory in [BASE/'releases',release,*[path for path in release.rglob('*') if path.is_dir()]]:directory.chmod(0o755)
    assert env.get('NODE_PATH')=='/usr/src/node_modules'
    environment=PRIVATE/'runtime.env';values={key:env[key] for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY','NODE_PATH']}
    assert all('\n' not in value and '\r' not in value for value in values.values())
    environment.write_text(''.join(key+'='+value+'\n' for key,value in values.items()));environment.chmod(0o600)
    created=None
    try:
        created=run('docker','run','-d','--name',NAME,'--network','workadventure_default','--workdir','/srv/release','--user','1000:1000',
          '-p',f'127.0.0.1:{PORT}:3241','--env-file',str(environment),'--label','wvh.component=castle-piano-stage','--label','wvh.release='+release_id,
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=8m',
          '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','192m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
          '--health-cmd',"node -e \"fetch('http://127.0.0.1:3241/castle-piano/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))\"",
          '--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3',
          '--entrypoint','node',school['Image'],'/srv/release/castle-piano/server.cjs').strip()
        ready();unchanged(before)
        value={'name':NAME,'id':created,'release_id':release_id,'release':str(release),'image':school['Image'],'before':before,
          'files':{name:sha(content) for name,content in payload.items()},'archive_sha256':sha(raw),'stopped':False,
          'publicRouteAdded':False,'realSchoolLookup':True,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        atomic(RECORD,value);print(json.dumps({'passed':True,'stageRunning':True,'release':release_id,'loopbackPort':PORT,
          'sourceFiles':len(payload),'existingPlatformUnchanged':True,'publicRouteAdded':False,'syntheticSchoolOverride':False},indent=2))
    except Exception:
        if exists(NAME):
            value=inspect(NAME);assert value['Config']['Labels'].get('wvh.component')=='castle-piano-stage' and value['Config']['Labels'].get('wvh.release')==release_id
            if created:assert value['Id']==created
            failure=PRIVATE/'stage-startup-failure.private.log';failure.write_text(run('docker','logs',NAME));failure.chmod(0o600)
            run('docker','stop','-t','6',NAME);run('docker','rm',NAME)
        unchanged(before);raise RuntimeError('Piano preflight failed; existing platform preserved') from None
def stop():
    value=json.loads(RECORD.read_text());assert value['name']==NAME
    if exists(NAME):
        current=inspect(NAME);assert current['Id']==value['id'] and current['Config']['Labels']['wvh.component']=='castle-piano-stage'
        run('docker','stop','-t','6',NAME);run('docker','rm',NAME)
    expected=value['before'];deployment=PRIVATE/'deployment.json'
    if deployment.exists():
        published=json.loads(deployment.read_text());assert published['release']==value['release_id'] and published['before']==expected
        actual=inspect('wvh-castle-piano');assert actual['Id']==published['containerId'] and actual['State']['Running']
        expected=json.loads(json.dumps(expected));nginx='/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'
        assert expected['files'][nginx]==published['nginx_before_sha256'];expected['files'][nginx]=published['nginx_after_sha256']
    unchanged(expected);value['stopped']=True;atomic(RECORD,value)
    print(json.dumps({'stopped':True,'existingPlatformUnchanged':True}))
if __name__=='__main__':stage()
