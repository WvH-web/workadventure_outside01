"""Add only a private-account billiards pilot. Never restart existing services or edit maps."""
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import time
import traceback
import urllib.error
import urllib.request
import zipfile

BASE=Path('/opt/wvh-castle-billiards-pilot-r3');PRIVATE=BASE/'private';NAME='wvh-castle-billiards'
PREVIOUS_ATTEMPTS=[(Path('/opt/wvh-castle-billiards/private'),'e48f020d8e3d8edbb8398f58dbbc4c881410d85764686beb3eadd0ad07eec9cb'),
 (Path('/opt/wvh-castle-billiards-pilot-r2/private'),'988f57273a15bc68022baf63b8b9369c57cd77e07769ec956acd32d07bf09fba')]
PREDECESSOR=Path('/opt/wvh-castle-seat-ui-retry/private/deployment-ops.py')
PREDECESSOR_SHA='f77faf75b39108d8d5d25e018b9d5a1d2430f2d83c6246e125fe38e1fac9fa1a'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
ARCHIVE=Path('/tmp/wvh-castle-billiards.zip')
ACCOUNTS=Path('/home/wilhelm/.cache/wvh-school-qa/billiards-accounts.private.json')
ORIGIN='https://together.deine-schule.com';PORT=3261
BLOCK=b'''
# Isolated school billiards pilot; no changes to existing routes or maps.
location ^~ /castle-billiards/ {
    proxy_pass http://127.0.0.1:3261;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 30s;
    proxy_connect_timeout 3s;
    client_max_body_size 8k;
}
'''
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def run(*args):
    result=subprocess.run(args,text=True,capture_output=True,timeout=150)
    if result.returncode:raise RuntimeError('Isolated billiards operation failed; private details withheld')
    return result.stdout

def inspect(name):return json.loads(run('docker','inspect',name))[0]

def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())

def load(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    return json.loads(path.read_text())

def write(path,value):
    assert path.resolve()==path and not path.exists()
    with path.open('x') as handle:json.dump(value,handle,indent=2);handle.write('\n')
    path.chmod(0o600)

def predecessor():
    assert PREDECESSOR.resolve()==PREDECESSOR and sha(PREDECESSOR.read_bytes())==PREDECESSOR_SHA
    scope={'__name__':'billiards_predecessor','__file__':str(PREDECESSOR)}
    exec(compile(PREDECESSOR.read_bytes(),str(PREDECESSOR),'exec'),scope);return scope

def dependencies(seat):return seat['common'](seat['load'](seat['PRIVATE']/'stage.json'))

def inventory(seat,helper):
    files=seat['inventory'](helper)
    for path in PREDECESSOR.parent.iterdir():
        if path.is_file() and path.suffix in ['.py','.json','.yaml']:
            assert path.resolve()==path and path.stat().st_size<8000000;files[str(path)]=sha(path.read_bytes())
    for directory,digest in PREVIOUS_ATTEMPTS:
        assert sha((directory/'deployment-ops.py').read_bytes())==digest
        assert load(directory/'rollback.json')['previousPlatformPreserved'] is True
        assert load(directory/'linux-smoke.json')['passed'] is True
        assert not (directory/'deployment.json').exists()
        for path in directory.iterdir():
            assert path.is_file() and path.resolve()==path and path.stat().st_size<8000000;files[str(path)]=sha(path.read_bytes())
    return files

def validate_files(files):
    for name,digest in files.items():
        target=Path(name);assert target.resolve()==target and target.is_file() and sha(target.read_bytes())==digest

def preserve(before,after,nginx_sha):
    expected=copy.deepcopy(before);expected['files'][str(NGINX)]=nginx_sha;assert after==expected

def payload(digest):
    assert ARCHIVE.resolve()==ARCHIVE and ARCHIVE.is_file() and ARCHIVE.stat().st_size<4000000
    raw=ARCHIVE.read_bytes();assert sha(raw)==digest
    own={'castle-billiards/'+file for file in ['admission.cjs','server.cjs','model.cjs','rooms.cjs','physics-pool.cjs','physics-worker.cjs',
      'linux-smoke.cjs','core-entry.ts','headless-signals.ts','README.md','vendor-manifest.json',
      *['public/'+file for file in ['index.html','billiards.css','billiards.js','renderer.js','credits.html']]]}
    shared={*['castle-school/'+file for file in ['identity.cjs','lookup.cjs','policy.cjs']],'hall-audio/auth.cjs','hall-audio/errors.cjs',
      'hall-audio/public/vendor/lucide.min.js','hall-audio/public/vendor/lucide.LICENSE','castle-chess/journal.cjs',
      *['castle-chess/public/vendor/eventsource-parser/dist/'+file for file in ['index.js','parse.js','types.js','errors.js']],
      'castle-chess/public/vendor/eventsource-parser/LICENSE'}
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert len(archive.infolist())<100 and sum(file.file_size for file in archive.infolist())<6000000
        manifest=json.loads(archive.read('castle-billiards/vendor-manifest.json'))
        assert manifest['commit']=='fda4e90e251ce59ad878dbb996af372f4028a325' and manifest['physicsAndRuleSourceUnmodified'] is True
        assert manifest['coreSha256']=='79a1d4df67d90390bdb76c324d78937800a8eb2188b3e0e79c06fb189c07bf7b'
        assert manifest['renderer']['version']=='0.187.0' and manifest['externalRuntimeImports']==0
        allowed=own|shared|{'castle-billiards/'+file['path'] for file in manifest['files']}
        assert len(allowed)==len(archive.infolist())==80 and set(archive.namelist())==allowed
        assert all(not name.startswith('/') and '\\' not in name and all(part not in ['', '.', '..'] for part in name.split('/')) for name in allowed)
        data={name:archive.read(name) for name in allowed}
    for item in manifest['files']:assert sha(data['castle-billiards/'+item['path']])==item['sha256']
    return data,shared

def request(route,body=None):
    req=urllib.request.Request(ORIGIN+'/castle-billiards/'+route,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(4000001),response.headers

def ready():
    for _ in range(45):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3261/castle-billiards/health',timeout=2) as response:
                if response.status==200 and json.load(response)=={'ready':True}:return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Dedicated billiards readiness failed')

def write_policy(policy,identities):
    policy.mkdir(mode=0o750);policy.chmod(0o750);os.chown(policy,0,1000)
    target=policy/'admission.json';target.write_text(json.dumps({'version':1,'mode':'pilot','accounts':identities})+'\n')
    target.chmod(0o640);os.chown(target,0,1000)
    assert stat.S_IMODE(policy.stat().st_mode)==0o750 and stat.S_IMODE(target.stat().st_mode)==0o640
    return target

def ready_public():
    for _ in range(35):
        try:
            status,body,_=request('health')
            if status==200 and json.loads(body)=={'ready':True}:return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Public billiards readiness failed')

def verify_public(release):
    status,body,_=request('health');assert status==200 and json.loads(body)=={'ready':True}
    for name in ['index.html','billiards.js','renderer.js','billiards.css','credits.html','vendor/three/LICENSE','vendor/three/build/three.module.js','vendor/three/build/three.core.js']:
        status,body,headers=request(name);assert status==200 and body==(release/'castle-billiards/public'/name).read_bytes()
        assert headers['Cache-Control']=='no-store' and "frame-ancestors 'self'" in headers['Content-Security-Policy']
    assert request('session',{})[0]==401
    for name in ['server.cjs','vendor/core.cjs','state.json','vendor-manifest.json','policy/admission.json']:
        assert request(name)[0] in [401,403,404]

def start(digest):
    os.umask(0o077);assert len(digest)==64 and all(char in '0123456789abcdef' for char in digest)
    seat=predecessor();seat['verify']();helper,ops=dependencies(seat)
    assert not BASE.exists() and not exists(NAME) and not exists(NAME+'-preflight')
    assert not run('ss','-ltnH','sport = :3261').strip()
    before=ops['baseline']();running=helper['running']();processes=helper['processes']();frozen=inventory(seat,helper)
    old=NGINX.read_bytes();assert b'/castle-billiards/' not in old and b'127.0.0.1:3261' not in old;new=old+BLOCK
    data,shared=payload(digest)
    # Reuse only bytes from the already accepted, read-only school/audio/chess releases.
    sources={}
    for name in ['wvh-castle-school','wvh-castle-chess','wvh-hall-audio']:
        for mount in inspect(name)['Mounts']:
            if not mount['RW'] and mount['Type']=='bind':
                directory=Path(mount['Source'])
                if directory.is_dir():
                    for file in shared:
                        candidate=directory/file
                        if candidate.is_file() and candidate.resolve()==candidate and candidate.read_bytes()==data[file]:sources[file]=str(candidate)
                        # The hall-audio release mounts the component directory directly.
                        if file.startswith('hall-audio/'):
                            candidate=directory/file.removeprefix('hall-audio/')
                            if candidate.is_file() and candidate.resolve()==candidate and candidate.read_bytes()==data[file]:sources[file]=str(candidate)
    assert set(sources)==shared,'Shared release bytes must match accepted sources'
    school=inspect('wvh-castle-school');assert school['State']['Health']['Status']=='healthy'
    env=dict(item.split('=',1) for item in school['Config']['Env'] if '=' in item)
    assert env['NODE_PATH']=='/usr/src/node_modules' and all(env.get(key) for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY','CASTLE_SCHOOL_TRUSTED_PROXY_IPS'])
    for secret in [env['SECRET_KEY'],env['CASTLE_SCHOOL_LOOKUP_KEY']]:assert all(secret.encode() not in value for value in data.values())
    import ipaddress
    assert all(ipaddress.ip_address(value) for value in env['CASTLE_SCHOOL_TRUSTED_PROXY_IPS'].split(','))
    memory=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
    assert int(memory['MemAvailable'].split()[0])>1200000 and os.statvfs('/opt').f_bavail*os.statvfs('/opt').f_frsize>2*1024**3
    assert ACCOUNTS.resolve()==ACCOUNTS and ACCOUNTS.is_file() and stat.S_IMODE(ACCOUNTS.parent.stat().st_mode)==0o700
    ACCOUNTS.chmod(0o600)
    accounts=json.loads(ACCOUNTS.read_text());assert accounts['version']==1 and [item['key'] for item in accounts['accounts']]==['A','B']
    identities=[item['identifier'].lower() for item in accounts['accounts']];assert len(set(identities))==2 and all('@' in value and '\n' not in value for value in identities)
    BASE.mkdir(mode=0o755);PRIVATE.mkdir(mode=0o700)
    release=BASE/'releases'/digest[:16];release.mkdir(parents=True,mode=0o755)
    for name,value in data.items():
        target=release/name;target.parent.mkdir(parents=True,exist_ok=True,mode=0o755);target.write_bytes(value);target.chmod(0o644)
    for target in [BASE/'releases',release,*[item for item in release.rglob('*') if item.is_dir()]]:target.chmod(0o755)
    write(PRIVATE/'before.json',{'version':1,'before':before,'running':running,'processes':processes,'inventory':frozen,
      'archiveSha256':digest,'files':{name:sha(value) for name,value in data.items()},'sharedSources':sources,'image':school['Image']})
    backup=PRIVATE/'nginx-before.private.conf';backup.write_bytes(old);backup.chmod(0o600)
    created=None;changed=False;phase='linux-preflight'
    try:
        output=run('docker','run','--rm','--name',NAME+'-preflight','--network','none','--user','1000:1000','--read-only',
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--cap-drop','ALL','--security-opt','no-new-privileges:true',
          '--memory','512m','--cpus','1','--entrypoint','node',school['Image'],'/srv/release/castle-billiards/linux-smoke.cjs')
        proof=json.loads(output);assert proof['passed'] and proof['linux'] and proof['actualWorkerJobs']==2 and not proof['accountDataUsed']
        write(PRIVATE/'linux-smoke.json',proof)
        assert helper['running']()==running and helper['processes']()==processes and ops['baseline']()==before;validate_files(frozen)
        phase='service-start';policy=BASE/'policy';policyfile=write_policy(policy,identities)
        state=BASE/'data';state.mkdir(mode=0o700);os.chown(state,1000,1000)
        values={key:env[key] for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY','NODE_PATH']}
        values.update(CASTLE_BILLIARDS_TRUSTED_PROXY_IPS=env['CASTLE_SCHOOL_TRUSTED_PROXY_IPS'],CASTLE_BILLIARDS_DATA_DIR='/srv/billiards-data',CASTLE_BILLIARDS_POLICY_DIR='/srv/billiards-policy')
        assert all('\n' not in value and '\r' not in value for value in values.values())
        runtime=PRIVATE/'runtime.env';runtime.write_text(''.join(key+'='+value+'\n' for key,value in values.items()));runtime.chmod(0o600)
        created=run('docker','run','-d','--name',NAME,'--restart','unless-stopped','--network','workadventure_default','--workdir','/srv/release',
          '--user','1000:1000','-p','127.0.0.1:3261:3231','--env-file',str(runtime),'--label','wvh.component=castle-billiards','--label','wvh.release='+digest[:16],
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(policy)+',dst=/srv/billiards-policy,readonly',
          '--mount','type=bind,src='+str(state)+',dst=/srv/billiards-data','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=8m',
          '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1','--log-opt','max-size=2m','--log-opt','max-file=2',
          '--health-cmd',"node -e \"fetch('http://127.0.0.1:3231/castle-billiards/health').then(async r=>process.exit(r.ok&&(await r.json()).ready?0:1)).catch(()=>process.exit(1))\"",
          '--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3','--entrypoint','node',school['Image'],'/srv/release/castle-billiards/server.cjs').strip()
        ready();phase='public-route';assert NGINX.read_bytes()==old
        NGINX.write_bytes(new);changed=True;run('nginx','-t');run('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');run('nginx','-t')
        ready_public();phase='public-byte-check';verify_public(release)
        phase='container-health'
        for _ in range(35):
            current=inspect(NAME);assert current['Id']==created and current['State']['Running']
            if current['State']['Health']['Status']=='healthy':break
            time.sleep(1)
        else:raise RuntimeError('Dedicated billiards healthcheck failed')
        phase='preservation';after=helper['running']();assert {key:value for key,value in after.items() if key!=NAME}==running
        assert helper['processes']()==processes;preserve(before,ops['baseline'](),sha(new));validate_files(frozen)
        write(PRIVATE/'deployment.json',{'version':1,'passed':True,'containerId':created,'release':str(release),'archiveSha256':digest,
          'beforeSha256':sha((PRIVATE/'before.json').read_bytes()),'running':after,'nginxAfterSha256':sha(new),
          'policySha256':sha(policyfile.read_bytes()),'runtimeSha256':sha(runtime.read_bytes()),
          'onlyNewBilliardsServiceAdded':True,'oldCastleReplaced':False,'mapsChanged':False,'normalMicrosoftAcceptancePending':True,'nativeCastleIntegrationPending':True,'fullCastleApprovalFor400':False})
    except Exception as error:
        if changed:
            assert NGINX.read_bytes() in [old,new]
            if NGINX.read_bytes()==new:
                NGINX.write_bytes(old);run('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');run('nginx','-t')
        for name in [NAME,NAME+'-preflight']:
            if exists(name):
                current=inspect(name)
                if name==NAME:
                    assert current['Config']['Labels'].get('wvh.component')=='castle-billiards' and current['Config']['Labels'].get('wvh.release')==digest[:16]
                    if created:assert current['Id']==created
                    output=subprocess.run(['docker','logs',name],text=True,capture_output=True,timeout=10)
                    log=PRIVATE/'failure.private.log';log.write_text(output.stdout+output.stderr);log.chmod(0o600)
                run('docker','stop','-t','6',name);run('docker','rm',name)
        assert helper['running']()==running and ops['baseline']()==before and helper['processes']()==processes;validate_files(frozen)
        locations=[{'function':frame.name,'line':frame.lineno} for frame in traceback.extract_tb(error.__traceback__)][-3:]
        write(PRIVATE/'rollback.json',{'previousPlatformPreserved':True,'errorType':type(error).__name__,'phase':phase,'locations':locations})
        print(json.dumps({'pilotStopped':True,'phase':phase,'locations':locations,'previousPlatformPreserved':True}))
        raise RuntimeError('Billiards pilot stopped; existing maps and services retained') from None
    verify()

def verify():
    record=load(PRIVATE/'deployment.json');before=load(PRIVATE/'before.json');seat=predecessor();helper,ops=dependencies(seat)
    assert record['passed'] and not (PRIVATE/'rollback.json').exists() and sha((PRIVATE/'before.json').read_bytes())==record['beforeSha256']
    validate_files(before['inventory']);assert helper['running']()==record['running'] and helper['processes']()==before['processes']
    old=(PRIVATE/'nginx-before.private.conf').read_bytes();assert NGINX.read_bytes()==old+BLOCK and sha(NGINX.read_bytes())==record['nginxAfterSha256']
    preserve(before['before'],ops['baseline'](),record['nginxAfterSha256'])
    release=Path(record['release']);assert release==BASE/'releases'/record['archiveSha256'][:16] and release.resolve()==release
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(before['files'])
    validate_files({str(release/name):digest for name,digest in before['files'].items()})
    assert sha((BASE/'policy/admission.json').read_bytes())==record['policySha256'] and sha((PRIVATE/'runtime.env').read_bytes())==record['runtimeSha256']
    for name,source in before['sharedSources'].items():assert sha(Path(source).read_bytes())==before['files'][name]
    current=inspect(NAME);assert current['Id']==record['containerId'] and current['Image']==before['image'] and current['State']['Health']['Status']=='healthy'
    verify_public(release)
    print(json.dumps({'passed':True,'onlyNewBilliardsServiceAdded':True,'allPreviousContainersAndMapsUnchanged':True,'pilotOnly':True,
      'normalMicrosoftAcceptancePending':not (PRIVATE/'acceptance.json').exists(),'nativeCastleIntegrationPending':True,'oldCastleReplaced':False,'fullCastleApprovalFor400':False}))

if __name__=='__main__':verify()
