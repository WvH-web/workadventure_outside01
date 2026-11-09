"""Install only the new school-context API and a private SELECT-only PHP lookup."""
import glob
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import stat
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

os.umask(0o077)
BASE=Path('/opt/wvh-castle-school')
SITE=Path('/var/www/vhosts/deine-schule.com')
LOOKUP=SITE/'httpdocs/workadventure-castle-context.php'
PROFILE=SITE/'private/castle-school'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
GALLERY=Path('/opt/wvh-castle-content/private/deployment.json')
ARCHIVE=Path('/tmp/wvh-castle-school.zip')
NAME='wvh-castle-school'
EXPECTED_NGINX='4bb91386c3b19a116b838adfa6a7c78df3e5cd1cf552bb4235a6e85d2b7e026a'
EXPECTED_ROLE='36012da02d1374bba908faf334ad45b0559bd55813725369761ef90000f39ad4'
ROLE=SITE/'httpdocs/workadventure-role-lookup.php'
ALLOWED={'castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
 'castle-school/server.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs','castle-school-profile.php'}
digest=lambda value:hashlib.sha256(value).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def request(url,method='GET',headers=None,body=None):
    data=None if body is None else json.dumps(body).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers or {},method=method),timeout=12) as response:
            raw=response.read(8192)
            try:value=json.loads(raw)
            except ValueError:value={'invalid_json':True}
            return response.status,dict(response.headers),value
    except urllib.error.HTTPError as error:
        raw=error.read(8192)
        try:value=json.loads(raw)
        except ValueError:value={'invalid_json':True}
        return error.code,dict(error.headers),value

assert BASE.resolve()==BASE and SITE.resolve()==SITE and not NGINX.is_symlink()
if any(p.exists() or p.is_symlink() for p in [BASE,LOOKUP,PROFILE]):raise RuntimeError('New component paths are already occupied; inspect before updating')
if run('docker','ps','-a','--filter','name=^/'+NAME+'$','--format','{{.Names}}').strip():raise RuntimeError('School service already exists')
if digest(NGINX.read_bytes())!=EXPECTED_NGINX or digest(ROLE.read_bytes())!=EXPECTED_ROLE:raise RuntimeError('Reviewed base changed')
gallery_raw=GALLERY.read_bytes();gallery=json.loads(gallery_raw)
if gallery['nginx_sha256']!=EXPECTED_NGINX:raise RuntimeError('Static-content routing needs review')
if b'/castle-school/' in NGINX.read_bytes():raise RuntimeError('School route is already occupied')
with socket.socket() as probe:probe.bind(('127.0.0.1',3211))
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']}
play=before['workadventure-play-1'];env=dict(item.split('=',1) for item in play['Config']['Env'] if '=' in item)
hall_env=dict(item.split('=',1) for item in before['wvh-hall-audio']['Config']['Env'] if '=' in item)
if not env.get('SECRET_KEY') or env['SECRET_KEY']!=hall_env.get('SECRET_KEY') or env.get('WVH_ROLE_LOOKUP_URL')!='https://www.deine-schule.com/workadventure-role-lookup.php':
    raise RuntimeError('Existing identity verifier was not confirmed')
network=json.loads(run('docker','network','inspect','workadventure_default'))[0]
gateways=[item['Gateway'] for item in network['IPAM']['Config'] if item.get('Gateway')]
payload={}
with zipfile.ZipFile(ARCHIVE) as bundle:
    if set(bundle.namelist())!=ALLOWED or len(bundle.infolist())!=len(ALLOWED) or sum(i.file_size for i in bundle.infolist())>200000:
        raise RuntimeError('Unexpected school API archive')
    payload={name:bundle.read(name) for name in ALLOWED}
base_mode=(SITE/'httpdocs').stat();owner=(base_mode.st_uid,base_mode.st_gid)
BASE.mkdir(mode=0o755);BASE.chmod(0o755);private=BASE/'private';private.mkdir(mode=0o700)
releases=BASE/'releases';releases.mkdir(mode=0o755);releases.chmod(0o755)
release=releases/digest(ARCHIVE.read_bytes())[:16];release.mkdir(mode=0o755);release.chmod(0o755)
for name,data in payload.items():
    target=release/name
    if not target.resolve().is_relative_to(release.resolve()):raise RuntimeError('Unsafe archive path')
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.parent.chmod(0o755)
    target.write_bytes(data);target.chmod(0o644)
php=sorted(glob.glob('/opt/plesk/php/*/bin/php'))[-1]
for relative in ['castle-school/profile.php','castle-school/lookup.php','castle-school-profile.php']:
    run(php,'-l',str(release/relative))
run('docker','run','--rm','--network','none','--read-only','--user','1000:1000','--workdir','/srv/release','--cap-drop','ALL','--security-opt','no-new-privileges:true',
 '--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
 '--entrypoint','node',play['Image'],'-e',
 "require('jose');require('/srv/release/castle-school/server.cjs');require('/srv/release/castle-school/policy.cjs').validateRules(JSON.parse(require('fs').readFileSync('/srv/release/castle-school/rules.json','utf8')))")

php_prepare=r'''
$text=file_get_contents($argv[1]);$db=[];
foreach(['dsn','dbUser','dbPass'] as $key){
 if(!preg_match('/\\$'.preg_quote($key,'/').'\\s*=\\s*([\'\"])(.*?)\\1/s',$text,$m))throw new RuntimeException('Configuration not recognized');
 $db[$key]=$m[2];
}
$pdo=new PDO($db['dsn'],$db['dbUser'],$db['dbPass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
require $argv[2].'/castle-school/profile.php';require $argv[2].'/castle-school-profile.php';
$proof=castleProfileFixtures($pdo);
echo json_encode(['db'=>['dsn'=>$db['dsn'],'user'=>$db['dbUser'],'password'=>$db['dbPass']],'fixtures'=>$proof]);
'''
prepared=subprocess.run([php,'-r',php_prepare,str(ROLE),str(release)],capture_output=True,text=True)
if prepared.returncode:raise RuntimeError('Read-only fixture verification failed; live lookup was not installed')
material=json.loads(prepared.stdout)
lookup_key=secrets.token_hex(32)
parent=PROFILE.parent
if not parent.exists():parent.mkdir(mode=0o755);os.chown(parent,*owner)
if parent.is_symlink() or not PROFILE.resolve().is_relative_to(SITE):raise RuntimeError('Unexpected private lookup path')
PROFILE.mkdir(mode=0o700);os.chown(PROFILE,*owner)
profile_bytes=payload['castle-school/profile.php'];lookup_bytes=payload['castle-school/lookup.php']
private_config=json.dumps({'version':1,'key':lookup_key,'db':material['db']},separators=(',',':')).encode()
for target,data in [(PROFILE/'profile.php',profile_bytes),(PROFILE/'config.json',private_config)]:
    target.write_bytes(data);target.chmod(0o600);os.chown(target,*owner)
rules=private/'rules.json';rules.write_bytes(payload['castle-school/rules.json']);rules.chmod(0o640);os.chown(rules,0,1000)
settings={'SECRET_KEY':env['SECRET_KEY'],'CASTLE_SCHOOL_LOOKUP_KEY':lookup_key,'NODE_PATH':'/usr/src/node_modules',
 'CASTLE_SCHOOL_ORIGIN':'https://together.deine-schule.com','CASTLE_SCHOOL_TRUSTED_PROXY_IPS':','.join(gateways),
 'CASTLE_SCHOOL_RULES_FILE':'/srv/rules.json'}
if any('\n' in value or '\r' in value for value in settings.values()):raise RuntimeError('Invalid environment material')
runtime=private/'runtime.env';runtime.write_text(''.join(k+'='+v+'\n' for k,v in settings.items()));runtime.chmod(0o600)
nginx_raw=NGINX.read_bytes();nginx_metadata=NGINX.stat();(private/'nginx-before.conf').write_bytes(nginx_raw)
(private/'gallery-manifest-before.json').write_bytes(gallery_raw)
location='''
# Isolated school-context API. Existing login, map, gallery and audio routes are unchanged.
location ^~ /castle-school/ {
    proxy_pass http://127.0.0.1:3211;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_connect_timeout 3s;
    proxy_read_timeout 10s;
}
'''
installed_hash=None;created=False;lookup_written=False;gallery_written=None;phase='lookup-install'
try:
    if LOOKUP.exists() or LOOKUP.is_symlink():raise RuntimeError('Lookup target appeared during verification')
    staged=LOOKUP.with_name('.workadventure-castle-context.staging.php')
    if staged.exists() or staged.is_symlink():raise RuntimeError('Lookup staging path is already occupied')
    staged.write_bytes(lookup_bytes);staged.chmod(0o644);os.chown(staged,*owner);staged.replace(LOOKUP);lookup_written=True
    phase='lookup-http'
    status,headers,body=request('https://www.deine-schule.com/workadventure-castle-context.php','POST',{'Content-Type':'application/json','X-Castle-School-Key':lookup_key},{'identifier':'install-'+secrets.token_hex(12)+'@invalid.local'})
    if status!=200 or body.get('eligible') is not False or body.get('kind')!='unknown' or body.get('version')!=1:raise RuntimeError('Private lookup did not return a safe unknown-school identity')
    for name in ['age','gradeLevel','classId']:
        if body.get(name) is not None:raise RuntimeError('Unexpected child data in unknown lookup')
    phase='container-start'
    run('docker','run','-d','--name',NAME,'--restart','unless-stopped','--network','workadventure_default','--workdir','/srv/release',
      '-p','127.0.0.1:3211:3211','--user','1000:1000','--env-file',str(runtime),
      '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
      '--mount','type=bind,src='+str(rules)+',dst=/srv/rules.json,readonly',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL',
      '--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5',
      '--log-opt','max-size=2m','--log-opt','max-file=2','--entrypoint','node',play['Image'],'/srv/release/castle-school/server.cjs')
    created=True;healthy=False;phase='service-health'
    for _ in range(20):
        try:
            status,_,body=request('http://127.0.0.1:3211/castle-school/health')
            if status==200 and body.get('ready') is True:healthy=True;break
        except Exception:pass
        time.sleep(.5)
    if not healthy:raise RuntimeError('School API did not start')
    phase='route-install'
    if digest(NGINX.read_bytes())!=EXPECTED_NGINX or GALLERY.read_bytes()!=gallery_raw or digest(ROLE.read_bytes())!=EXPECTED_ROLE:
        raise RuntimeError('Concurrent configuration change detected')
    new_nginx=nginx_raw+location.encode();staged=NGINX.with_name(NGINX.name+'.school-staging')
    if staged.exists() or staged.is_symlink():raise RuntimeError('Nginx staging path is occupied')
    staged.write_bytes(new_nginx);staged.chmod(stat.S_IMODE(nginx_metadata.st_mode));os.chown(staged,nginx_metadata.st_uid,nginx_metadata.st_gid)
    staged.replace(NGINX);installed_hash=digest(new_nginx)
    run('nginx','-t');run('systemctl','reload','nginx')
    phase='public-health'
    probes=[];public_ready=False
    for _ in range(20):
        status,headers,body=request('https://together.deine-schule.com/castle-school/health',headers={'Cache-Control':'no-cache'})
        probes.append({'status':status,'content_type':headers.get('Content-Type'),'server':headers.get('Server'),
          'cache_status':headers.get('CF-Cache-Status'),'age':headers.get('Age')})
        if status==200 and body=={'ready':True}:public_ready=True;break
        time.sleep(.25)
    (private/'public-probe.json').write_text(json.dumps(probes,indent=2)+'\n')
    if not public_ready:raise RuntimeError('Public school API health check failed')
    phase='public-auth'
    status,_,body=request('https://together.deine-schule.com/castle-school/context')
    if status!=401 or body!={'error':'unauthorized'}:raise RuntimeError('School API is not protected')
    phase='unchanged-service-check'
    for name,old in before.items():
        current=inspect(name)
        if current['Id']!=old['Id'] or current['State']['StartedAt']!=old['State']['StartedAt']:raise RuntimeError('An existing service changed during deployment')
    if digest(ROLE.read_bytes())!=EXPECTED_ROLE:raise RuntimeError('Legacy role endpoint changed')
    phase='manifest-save'
    gallery['nginx_sha256']=installed_hash
    gallery_written=json.dumps(gallery,indent=2).encode()+b'\n'
    if GALLERY.read_bytes()!=gallery_raw:raise RuntimeError('Static-content manifest changed during verification')
    GALLERY.write_bytes(gallery_written);GALLERY.chmod(0o600)
    report={'release':str(release),'archive_sha256':digest(ARCHIVE.read_bytes()),'nginx_before_sha256':EXPECTED_NGINX,
      'nginx_after_sha256':installed_hash,'files':{name:digest(value) for name,value in payload.items()},
      'lookup_sha256':digest(lookup_bytes),'profile_sha256':digest(profile_bytes),'fixtures_passed':material['fixtures']['passed'],
      'service_ready':True,'unauthenticated_access_rejected':True,'workadventure_and_audio_not_restarted':True,
      'legacy_role_endpoint_unchanged':True,'gallery_rules_unchanged':True,'student_records_written':False,
      'map_integration_complete':False,'student_game_approvals_configured':False}
    (private/'deployment.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
except Exception as error:
    failure={'phase':phase,'type':type(error).__name__,'detail':str(error) if type(error) is RuntimeError else None}
    (private/'last-failure.json').write_text(json.dumps(failure,indent=2)+'\n')
    if installed_hash and digest(NGINX.read_bytes())==installed_hash:
        NGINX.write_bytes(nginx_raw)
        subprocess.run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(['systemctl','reload','nginx'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if gallery_written and GALLERY.read_bytes()==gallery_written:GALLERY.write_bytes(gallery_raw)
    if created:subprocess.run(['docker','rm','-f',NAME],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if lookup_written and LOOKUP.exists() and digest(LOOKUP.read_bytes())==digest(lookup_bytes):LOOKUP.unlink()
    for target,owned in [(PROFILE/'profile.php',profile_bytes),(PROFILE/'config.json',private_config)]:
        if target.exists() and target.read_bytes()==owned:target.unlink()
    raise RuntimeError('School API installation failed in '+phase+'; unchanged owned live writes were rolled back') from None
