"""Publish only a two-synthetic-account room pilot; preserve old maps and services."""
import hashlib
import json
import os
import grp
import pwd
from pathlib import Path
import re
import runpy
import secrets
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

EXPECTED = '54b79c1e4440db78d03d3737a071838eadc8b3475b9eac0dfe4c1a19dc6d9afb'
ARCHIVE = Path('/tmp/wvh-castle-homes.zip')
INPUT = Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
ROOT = Path('/opt/wvh-castle-homes')
PRIVATE = ROOT/'private'
NGINX = Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
NGINX_BEFORE = 'e80f6e046c26419f0787c2c2ee155848b7cf83b30816c94e5bc24eb122eb022f'
WEB = Path('/var/www/vhosts/deine-schule.com')
CONTEXT = WEB/'private/castle-homes'
WRAPPER = WEB/'httpdocs/workadventure-castle-homes.php'
UNIT = Path('/etc/systemd/system/wvh-castle-homes.service')
SERVICE = 'wvh-castle-homes.service'
RECEIPT = PRIVATE/'pilot-deployment.json'
FILES = {
    *('ops/castle-homes/'+name for name in ['authority.cjs','gateway.cjs','game-adapter.cjs',
      'identity-lookup.cjs','service.cjs','SchoolIdentity.php','ContextProtocol.php','context.php']),
    *('ops/castle-homes/public/'+name for name in ['index.html','entry.js','entry.css','room.html','room.css','exit.html','exit.js']),
    'ops/castle-school/identity.cjs','ops/castle-school/admission.cjs','ops/hall-audio/auth.cjs','ops/hall-audio/errors.cjs',
    'ops/hall-audio/public/vendor/lucide.min.js','ops/hall-audio/public/vendor/lucide.LICENSE',
    'tests/castle-home-service.test.cjs','tools/check-castle-homes-public.cjs','tools/castle-home-test-client.cjs',
    'castle-homes-runtime.manifest.json',
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run(*args, timeout=35):
    value = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=timeout)
    if value.returncode:
        raise RuntimeError('Scoped room pilot operation failed; private diagnostics withheld')
    return value.stdout


def running():
    ids = run('docker','ps','-q').split()
    return {row['Name']: [row['Id'],row['State']['StartedAt'],row['RestartCount']]
            for row in json.loads(run('docker','inspect',*ids))}


def atomic(path, raw, mode=0o600, uid=0, gid=0):
    assert path.resolve() == path
    temp = path.with_name('.'+path.name+'.'+secrets.token_hex(6))
    fd = os.open(temp, os.O_WRONLY|os.O_CREAT|os.O_EXCL, mode)
    try:
        os.fchmod(fd, mode)
        os.fchown(fd, uid, gid)
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp,path)
    finally:
        temp.unlink(missing_ok=True)


def request(url, body=None, headers=None):
    req = urllib.request.Request(url, data=body, headers=headers or {})
    try:
        response = urllib.request.urlopen(req, timeout=12)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, response.read(100000)


def main():
    os.umask(0o077)
    ops = runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before, docker_before = ops['baseline'](), running()
    colleague = run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and not UNIT.exists() and not CONTEXT.exists() and not WRAPPER.exists()
    assert ROOT.resolve() == ROOT and PRIVATE.resolve() == PRIVATE and PRIVATE.stat().st_mode & 0o777 == 0o700
    assert not run('ss','-ltnH','sport = :3251').strip()
    old_nginx = NGINX.read_bytes()
    assert sha(old_nginx) == NGINX_BEFORE and b'/castle-homes/' not in old_nginx
    raw = ARCHIVE.read_bytes()
    assert len(raw) < 500000 and sha(raw) == EXPECTED
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert set(archive.namelist()) == FILES and len(archive.infolist()) == len(FILES)
        assert sum(row.file_size for row in archive.infolist()) < 900000
        payload = {name:archive.read(name) for name in FILES}
    release = ROOT/'releases'/EXPECTED[:16]
    assert release.resolve() == release
    release.mkdir(mode=0o755, parents=True, exist_ok=True)
    release.chmod(0o755)
    release.parent.chmod(0o755)
    for name,content in payload.items():
        target = release/name
        assert target.resolve() == target and target.is_relative_to(release)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():
            assert target.read_bytes() == content
        else:
            atomic(target,content,0o644)
    for path in release.rglob('*'):
        if path.is_dir():
            path.chmod(0o755)
    assert INPUT.resolve() == INPUT and INPUT.parent.stat().st_mode & 0o777 == 0o700
    INPUT.chmod(0o600)
    accounts = json.loads(INPUT.read_text())
    assert set(accounts) == {'version','accounts'} and accounts['version'] == 1
    assert [a['key'] for a in accounts['accounts']] == ['A','B']
    assert len({a['identifier'].lower() for a in accounts['accounts']}) == 2
    source = '/opt/wvh-sterne-kollegium/releases/20261109T191624Z'
    node = '/opt/plesk/node/24/bin/node'
    node_path = source+'/dorfplatz/node_modules'
    test_unit = 'wvh-castle-homes-bootstrap-'+EXPECTED[:12]
    test = subprocess.run(['systemd-run','--quiet','--wait','--pipe','--collect','--unit='+test_unit,
        '--property=DynamicUser=yes','--property=PrivateTmp=yes','--property=ProtectSystem=strict',
        '--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=256M',
        '--property=CPUQuota=100%','--property=RuntimeMaxSec=35s','--setenv=NODE_PATH='+node_path,
        node,'--test',str(release/'tests/castle-home-service.test.cjs')],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=45)
    atomic(PRIVATE/'bootstrap-tests.private.log',(test.stdout+'\n'+test.stderr).encode())
    assert test.returncode == 0
    school_config = WEB/'private/castle-school/config.json'
    school_raw = school_config.read_bytes()
    database = json.loads(school_raw)['db']
    php = str(sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1])
    code = r'''
    require $argv[2].'/ops/castle-homes/SchoolIdentity.php';
    $config=json_decode(file_get_contents($argv[1]),true,16,JSON_THROW_ON_ERROR);
    $input=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
    $db=new PDO($config['db']['dsn'],$config['db']['user'],$config['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $db->exec('SET TRANSACTION READ ONLY');$db->beginTransaction();
    try{$resolver=new \CastleHomes\SchoolIdentity($db);$ids=[];
    foreach($input['accounts'] as $index=>$a){$id=$resolver->resolve($a['identifier']);
      if(!$id||$id['role']!=='student'||$id['grade']!==[3,7][$index]||$id['age']!==[9,13][$index]||$id['moderator'])throw new RuntimeException();$ids[]=$id['sub'];}
    if(count(array_unique($ids))!==2)throw new RuntimeException();echo json_encode($ids,JSON_THROW_ON_ERROR);
    }finally{$db->rollBack();}
    '''
    result = subprocess.run([php,'-r',code,str(school_config),str(release)],input=json.dumps(accounts),
                            capture_output=True,text=True,timeout=25)
    if result.returncode:
        raise RuntimeError('Canonical pilot school accounts could not be verified')
    subjects = json.loads(result.stdout)
    environment = json.loads(run('docker','inspect','wvh-castle-school'))[0]['Config']['Env']
    platform = [line.split('=',1)[1] for line in environment if line.startswith('SECRET_KEY=')]
    assert len(platform) == 1 and platform[0]
    context_key, bridge_key = secrets.token_hex(32), secrets.token_hex(32)
    for private_value in [platform[0],database['password'],context_key,bridge_key,
                          *(a['token'] for a in accounts['accounts'])]:
        assert private_value and all(private_value.encode() not in content for content in payload.values())
    credential = PRIVATE/'service.json'
    assert not credential.exists()
    service_config = dict(version=1,mode='pilot',origin='https://together.deine-schule.com',port=3251,
        source=source,platformSecret=platform[0],contextKey=context_key,bridgeKey=bridge_key,allowedSubjects=subjects)
    route = ('# BEGIN WVH CASTLE HOMES PILOT '+EXPECTED[:16]+'\n'
        'location ^~ /castle-homes/ {\n'
        '    proxy_pass http://127.0.0.1:3251;\n'
        '    proxy_http_version 1.1;\n'
        '    proxy_set_header Host $host;\n'
        '    proxy_set_header X-Real-IP $remote_addr;\n'
        '    proxy_set_header Upgrade $http_upgrade;\n'
        '    proxy_set_header Connection "upgrade";\n'
        '    proxy_buffering off;\n'
        '    proxy_read_timeout 65s;\n'
        '    client_max_body_size 16k;\n'
        '}\n# END WVH CASTLE HOMES PILOT '+EXPECTED[:16]+'\n').encode()
    new_nginx = old_nginx+b'\n'+route
    wrapper = ("<?php\ndeclare(strict_types=1);\nrequire '"+str(CONTEXT/EXPECTED[:16]/'context.php')+"';\n"
        "castleHomesContextEndpoint('"+str(CONTEXT/'config.json')+"');\n").encode()
    unit = ('[Unit]\nDescription=Isolated school castle homes pilot\nAfter=network-online.target\nWants=network-online.target\n\n'
        '[Service]\nType=exec\nDynamicUser=yes\nStateDirectory=wvh-castle-homes\nStateDirectoryMode=0700\n'
        'LoadCredential=service.json:'+str(credential)+'\nEnvironment=NODE_PATH='+node_path+'\n'
        'ExecStart='+node+' --max-old-space-size=256 '+str(release/'ops/castle-homes/service.cjs')+'\n'
        'Restart=on-failure\nRestartSec=3\nTimeoutStopSec=15\nUMask=0077\nProtectSystem=strict\nProtectHome=yes\n'
        'PrivateTmp=yes\nNoNewPrivileges=yes\nProtectKernelTunables=yes\nProtectKernelModules=yes\n'
        'ProtectControlGroups=yes\nRestrictSUIDSGID=yes\nLockPersonality=yes\nCapabilityBoundingSet=\n'
        'MemoryMax=512M\nCPUQuota=100%\nTasksMax=64\n\n[Install]\nWantedBy=multi-user.target\n').encode()
    changed_nginx = False
    installed = False
    try:
        pool = Path(php).parent.parent/'etc/php-fpm.d/deine-schule.com.conf'
        pool_text = pool.read_text()
        user = re.findall(r'^\s*user\s*=\s*([A-Za-z0-9_.-]+)\s*$',pool_text,re.M)
        group = re.findall(r'^\s*group\s*=\s*([A-Za-z0-9_.-]+)\s*$',pool_text,re.M)
        assert len(user) == len(group) == 1
        uid,gid = pwd.getpwnam(user[0]).pw_uid,grp.getgrnam(group[0]).gr_gid
        assert uid == (WEB/'httpdocs').stat().st_uid
        CONTEXT.mkdir(mode=0o750)
        CONTEXT.chmod(0o750)
        os.chown(CONTEXT,0,gid)
        context_release = CONTEXT/EXPECTED[:16]
        context_release.mkdir(mode=0o750)
        context_release.chmod(0o750)
        os.chown(context_release,0,gid)
        nonce_dir = CONTEXT/'nonces'
        nonce_dir.mkdir(mode=0o700)
        os.chown(nonce_dir,uid,gid)
        for name in ['SchoolIdentity.php','ContextProtocol.php','context.php']:
            atomic(context_release/name,payload['ops/castle-homes/'+name],0o640,0,gid)
        context_config = dict(version=1,key=context_key,moderators=[],nonces=str(nonce_dir/'requests.sqlite'),db=database)
        atomic(CONTEXT/'config.json',json.dumps(context_config).encode(),0o640,0,gid)
        atomic(WRAPPER,wrapper,0o644,0,gid)
        run(php,'-l',str(WRAPPER))
        context_url = 'https://www.deine-schule.com/workadventure-castle-homes.php'
        get_status,_ = request(context_url)
        post_status,_ = request(context_url,b'{}',{'Content-Type':'application/json'})
        atomic(PRIVATE/'context-smoke.private.json',json.dumps({'getStatus':get_status,'unsignedPostStatus':post_status}).encode())
        assert get_status == 405 and post_status == 401
        atomic(credential,json.dumps(service_config).encode())
        atomic(UNIT,unit,0o644)
        installed = True
        run('systemctl','daemon-reload')
        run('systemctl','start',SERVICE)
        ready = False
        for _ in range(30):
            try:
                status,body = request('http://127.0.0.1:3251/castle-homes/health',headers={'Host':'together.deine-schule.com'})
                if status == 200 and json.loads(body) == {'ready':True}:
                    ready = True
                    break
            except Exception:
                pass
            time.sleep(.4)
        assert ready, 'Isolated pilot did not become ready'
        assert NGINX.read_bytes() == old_nginx
        atomic(PRIVATE/'nginx-before-pilot.conf',old_nginx)
        stat = NGINX.stat()
        atomic(NGINX,new_nginx,stat.st_mode&0o777,stat.st_uid,stat.st_gid)
        changed_nginx = True
        run('nginx','-t')
        run('systemctl','reload','nginx')
        public_ready = False
        for _ in range(30):
            public_status,public_body = request('https://together.deine-schule.com/castle-homes/health',headers={'Cache-Control':'no-cache'})
            if (public_status,public_body) == (200,b'{"ready":true}'):
                public_ready = True
                break
            time.sleep(.4)
        atomic(PRIVATE/'public-health-smoke.private.json',json.dumps({'status':public_status,
            'bodySha256':sha(public_body),'bytes':len(public_body),'ready':public_ready}).encode())
        assert public_ready, 'Public room route did not become ready'
        qa_unit = 'wvh-castle-homes-public-'+EXPECTED[:12]
        qa = subprocess.run(['systemd-run','--quiet','--wait','--pipe','--collect','--unit='+qa_unit,
            '--property=DynamicUser=yes','--property=PrivateTmp=yes','--property=ProtectSystem=strict',
            '--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=256M',
            '--property=CPUQuota=100%','--property=RuntimeMaxSec=125s',
            '--property=LoadCredential=accounts.json:'+str(INPUT),'--setenv=NODE_PATH='+node_path,
            node,str(release/'tools/check-castle-homes-public.cjs')],stdin=subprocess.DEVNULL,
            capture_output=True,text=True,timeout=140)
        atomic(PRIVATE/'public-probe.private.log',(qa.stdout+'\n'+qa.stderr).encode())
        assert qa.returncode == 0, 'Public pilot acceptance failed; private diagnostic retained'
        acceptance = json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks']) == 7
        after = ops['baseline']()
        assert before['services'] == after['services']
        assert {p:h for p,h in before['files'].items() if p != str(NGINX)} == {p:h for p,h in after['files'].items() if p != str(NGINX)}
        assert running() == docker_before and school_config.read_bytes() == school_raw
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState') == colleague
        assert NGINX.read_bytes() == new_nginx and WRAPPER.read_bytes() == wrapper and UNIT.read_bytes() == unit
        assert run('systemctl','is-active',SERVICE).strip() == 'active'
        run('systemctl','enable',SERVICE)
        files = {name:sha(content) for name,content in payload.items()}
        context_files = {str(path):sha(path.read_bytes()) for path in [WRAPPER,CONTEXT/'config.json',*(context_release/name for name in ['SchoolIdentity.php','ContextProtocol.php','context.php'])]}
        record = dict(passed=True,mode='pilot',pilotSyntheticAccounts=2,before=before,after=after,release=str(release),archiveSha256=EXPECTED,
            files=files,serviceUnitSha256=sha(unit),privateCredentialSha256=sha(credential.read_bytes()),contextFiles=context_files,
            nginxBeforeSha256=sha(old_nginx),nginxAfterSha256=sha(new_nginx),route=route.decode(),acceptance=acceptance,
            runtimeSourceManifestSha256=sha(payload['castle-homes-runtime.manifest.json']),
            existingDockerAndColleagueServiceUnchanged=True,existingMapsAndWamsUnchanged=True,
            broadSchoolRoomAccess=False,nativeWorkAdventureTested=False,voiceEnabled=False,moderationGranted=False,
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        print(json.dumps({key:record[key] for key in ['passed','mode','pilotSyntheticAccounts','archiveSha256','acceptance',
            'existingDockerAndColleagueServiceUnchanged','existingMapsAndWamsUnchanged','broadSchoolRoomAccess','nativeWorkAdventureTested','voiceEnabled','moderationGranted','checkedAt']}))
    except Exception:
        if changed_nginx:
            assert NGINX.read_bytes() == new_nginx, 'Concurrent route change; do not overwrite'
            stat = NGINX.stat()
            atomic(NGINX,old_nginx,stat.st_mode&0o777,stat.st_uid,stat.st_gid)
            run('nginx','-t')
            run('systemctl','reload','nginx')
        if installed:
            run('systemctl','stop',SERVICE)
            assert UNIT.read_bytes() == unit
            UNIT.unlink()
            run('systemctl','daemon-reload')
        credential.unlink(missing_ok=True)
        if WRAPPER.exists():
            assert WRAPPER.read_bytes() == wrapper
            WRAPPER.unlink()
        if CONTEXT.exists():
            assert CONTEXT.resolve() == CONTEXT and CONTEXT.parent == WEB/'private'
            shutil.rmtree(CONTEXT)
        raise


if __name__ == '__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
