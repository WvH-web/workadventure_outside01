"""Upgrade the isolated room pilot for one explicitly approved administrator only."""
import grp
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import runpy
import secrets
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

EXPECTED = 'ab1272f9dd94c61e493a44905253f0784e88bbc99065321c5a56b02db9d4fe5d'
ARCHIVE = Path('/tmp/wvh-castle-homes-moderation.zip')
ROOT = Path('/opt/wvh-castle-homes')
PRIVATE = ROOT/'private'
WEB = Path('/var/www/vhosts/deine-schule.com')
CONTEXT = WEB/'private/castle-homes'
WRAPPER = WEB/'httpdocs/workadventure-castle-homes.php'
UNIT = Path('/etc/systemd/system/wvh-castle-homes.service')
SERVICE = 'wvh-castle-homes.service'
RECEIPT = PRIVATE/'moderation-deployment.json'
INPUT = Path('/home/wilhelm/.cache/wvh-school-qa/homes-moderator.private.json')
ACCOUNTS = INPUT.with_name('homes-accounts.private.json')
FILES = {
    *('ops/castle-homes/'+name for name in ['authority.cjs','gateway.cjs','game-adapter.cjs',
      'identity-lookup.cjs','service.cjs','SchoolIdentity.php','ContextProtocol.php','context.php']),
    *('ops/castle-homes/public/'+name for name in ['index.html','entry.js','entry.css','room.html',
      'room.css','exit.html','exit.js','moderation.html','moderation.js','moderation.css']),
    'ops/castle-school/identity.cjs','ops/castle-school/admission.cjs','ops/hall-audio/auth.cjs',
    'ops/hall-audio/errors.cjs','ops/hall-audio/public/vendor/lucide.min.js',
    'ops/hall-audio/public/vendor/lucide.LICENSE','tests/castle-home-service.test.cjs',
    'tests/castle-home-gateway.test.cjs','tests/castle-homes-identity.php',
    'tests/castle-homes-protocol.php','tools/check-castle-homes-public.cjs',
    'tools/castle-home-test-client.cjs','castle-homes-runtime.manifest.json',
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run(*args, timeout=35):
    result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('Scoped room moderation operation failed; private diagnostics withheld')
    return result.stdout


def atomic(path, raw, mode=0o600, uid=0, gid=0):
    assert path.resolve() == path
    temp = path.with_name('.'+path.name+'.'+secrets.token_hex(6))
    fd = os.open(temp, os.O_WRONLY|os.O_CREAT|os.O_EXCL, mode)
    try:
        os.fchmod(fd,mode)
        os.fchown(fd,uid,gid)
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp,path)
    finally:
        temp.unlink(missing_ok=True)


def request(url, body=None, headers=None):
    try:
        response = urllib.request.urlopen(urllib.request.Request(url,data=body,headers=headers or {}),timeout=12)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status,response.read(100000),response.headers


def running():
    ids = run('docker','ps','-q').split()
    return {row['Name']:[row['Id'],row['State']['StartedAt'],row['RestartCount']]
            for row in json.loads(run('docker','inspect',*ids))}


def main():
    os.umask(0o077)
    ops = runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before = ops['baseline'](),running()
    colleague = run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and PRIVATE.resolve() == PRIVATE and PRIVATE.stat().st_mode&0o777 == 0o700
    initial_raw = (PRIVATE/'pilot-deployment.json').read_bytes()
    initial = json.loads(initial_raw)
    assert initial['passed'] and initial['after'] == before and not initial['moderationGranted']
    old_release = Path(initial['release'])
    assert old_release == ROOT/'releases'/initial['archiveSha256'][:16]
    assert all(sha((old_release/name).read_bytes()) == digest for name,digest in initial['files'].items())
    original_hashes = {str(UNIT):initial['serviceUnitSha256'],str(PRIVATE/'service.json'):initial['privateCredentialSha256'],
                       **{name:digest for name,digest in initial['contextFiles'].items() if name in [str(WRAPPER),str(CONTEXT/'config.json')]}}
    assert len(original_hashes) == 4
    snapshots = {}
    for name,digest in original_hashes.items():
        path = Path(name)
        assert path.resolve() == path and sha(path.read_bytes()) == digest
        stat = path.stat()
        snapshots[path] = (path.read_bytes(),stat.st_mode&0o777,stat.st_uid,stat.st_gid)
    old_config = json.loads(snapshots[PRIVATE/'service.json'][0])
    old_context = json.loads(snapshots[CONTEXT/'config.json'][0])
    assert old_config['version'] == 1 and old_context['moderators'] == [] and 'administratorModerators' not in old_context
    raw = ARCHIVE.read_bytes()
    assert sha(raw) == EXPECTED and len(raw) < 500000
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert set(archive.namelist()) == FILES and len(archive.infolist()) == len(FILES) == 31
        assert sum(row.file_size for row in archive.infolist()) < 1000000
        payload = {name:archive.read(name) for name in FILES}
    assert sha(payload['castle-homes-runtime.manifest.json']) == initial['runtimeSourceManifestSha256']
    runtime = json.loads(payload['castle-homes-runtime.manifest.json'])
    source = Path(old_config['source'])
    assert source == Path(runtime['sourceRelease']) and len(runtime['files']) == 107
    assert all((source/name).resolve() == source/name and sha((source/name).read_bytes()) == digest for name,digest in runtime['files'].items())
    for input_path in [INPUT,ACCOUNTS]:
        assert input_path.resolve() == input_path and input_path.parent.stat().st_mode&0o777 == 0o700
        input_path.chmod(0o600)
    consent = json.loads(INPUT.read_text())
    assert set(consent) == {'version','moderatorIdentifier','administratorExceptionApproved'}
    assert consent['version'] == 2 and consent['administratorExceptionApproved'] is True
    assert isinstance(consent['moderatorIdentifier'],str) and 3 < len(consent['moderatorIdentifier']) < 255
    accounts = json.loads(ACCOUNTS.read_text())
    assert set(accounts) == {'version','accounts'} and accounts['version'] == 1 and [a['key'] for a in accounts['accounts']] == ['A','B']
    release = ROOT/'releases'/EXPECTED[:16]
    assert release.resolve() == release and release != old_release
    release.mkdir(mode=0o755,exist_ok=True)
    release.chmod(0o755)
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
    php = sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
    code = r'''
    require $argv[2].'/ops/castle-homes/SchoolIdentity.php';
    require $argv[2].'/tests/castle-homes-identity.php';require $argv[2].'/tests/castle-homes-protocol.php';
    $config=json_decode(file_get_contents($argv[1]),true,16,JSON_THROW_ON_ERROR);
    $input=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);
    $db=new PDO($config['db']['dsn'],$config['db']['user'],$config['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $statement=$db->getAttribute(PDO::ATTR_STATEMENT_CLASS);$db->exec('SET TRANSACTION READ ONLY');$db->beginTransaction();
    try{
      $fixtures=castleHomesIdentityFixtures($db);$db->setAttribute(PDO::ATTR_STATEMENT_CLASS,$statement);$protocol=castleHomesProtocolFixtures();
      $q=$db->prepare('SELECT id,role_id FROM users WHERE LOWER(email)=LOWER(?) AND is_active=1 LIMIT 2');$q->execute([$input['moderatorIdentifier']]);$users=$q->fetchAll(PDO::FETCH_ASSOC);
      if(count($users)!==1)throw new RuntimeException();$subject='wvh:staff:'.$users[0]['id'];$roles=[(int)$users[0]['role_id']];
      $q=$db->prepare('SELECT role_id FROM user_role_memberships WHERE user_id=?');$q->execute([$users[0]['id']]);foreach($q->fetchAll(PDO::FETCH_COLUMN) as $role)$roles[]=(int)$role;
      sort($roles);if(!array_intersect([1,2],$roles))throw new RuntimeException();
      $base=(new \CastleHomes\SchoolIdentity($db))->resolve($input['moderatorIdentifier']);
      if($base&&$base['moderator'])throw new RuntimeException();
      $approved=(new \CastleHomes\SchoolIdentity($db,[$subject],null,[$subject]))->resolve($input['moderatorIdentifier']);
      if(!$approved||$approved['sub']!==$subject||$approved['role']!=='teacher'||!$approved['moderator']||$approved['read_only']){
        $matches=[];foreach([['users','email'],['students','email'],['families','portal_email']] as [$table,$column]){
          $q=$db->prepare("SELECT id FROM $table WHERE LOWER($column)=LOWER(?) AND is_active=1 LIMIT 2");$q->execute([$input['moderatorIdentifier']]);$matches[$table]=count($q->fetchAll(PDO::FETCH_COLUMN));}
        $q=$db->query("SELECT value FROM settings WHERE `key`='emergency_lock_active'");$lock=$q->fetchAll(PDO::FETCH_COLUMN);
        fwrite(STDERR,json_encode(['identityMatches'=>$matches,'emergencySettingCount'=>count($lock),'explicitlyUnlocked'=>count($lock)===1&&(string)$lock[0]==='0',
          'freshTeacherRole'=>in_array(3,$roles,true),'directLookupEligible'=>(new \CastleHomes\SchoolIdentity($db,[$subject],null,[$subject]))->lookup($subject)!==null]));throw new RuntimeException();}
      echo json_encode(['passed'=>true,'subject'=>$subject,'roleDigest'=>hash('sha256',json_encode($roles)),
        'mysqlFixtureCases'=>$fixtures['passed'],'protocolCases'=>$protocol['passed'],'currentAdministratorVerified'=>true,
        'normalRoleDoesNotGrantModeration'=>true,'schoolTransactionReadOnly'=>true,'schoolWrites'=>false],JSON_THROW_ON_ERROR);
    }finally{$db->rollBack();}
    '''
    def school_check():
        result = subprocess.run([str(php),'-r',code,str(CONTEXT/'config.json'),str(release)],
            input=json.dumps(consent),capture_output=True,text=True,timeout=45)
        atomic(PRIVATE/'moderation-school-check.private.log',result.stderr.encode())
        assert result.returncode == 0, 'Private administrator and fixture check failed'
        value = json.loads(result.stdout)
        assert value['passed'] and value['mysqlFixtureCases'] == 74 and value['protocolCases'] >= 20
        assert re.fullmatch('wvh:staff:[1-9][0-9]{0,15}',value['subject']) and not value['schoolWrites']
        return value
    decision = school_check()
    subjects = [decision['subject']]
    node = '/opt/plesk/node/24/bin/node'
    node_path = str(source/'dorfplatz/node_modules')
    test = subprocess.run(['systemd-run','--quiet','--wait','--pipe','--collect','--unit=wvh-homes-mod-test-'+EXPECTED[:12],
        '--property=DynamicUser=yes','--property=PrivateTmp=yes','--property=ProtectSystem=strict',
        '--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=256M',
        '--property=CPUQuota=100%','--property=RuntimeMaxSec=60s','--setenv=NODE_PATH='+node_path,
        node,'--test',str(release/'tests/castle-home-service.test.cjs'),str(release/'tests/castle-home-gateway.test.cjs')],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
    atomic(PRIVATE/'moderation-linux-tests.private.log',(test.stdout+'\n'+test.stderr).encode())
    assert test.returncode == 0, 'Isolated moderation Linux tests failed'
    backup = PRIVATE/'before-moderation'
    assert backup.resolve() == backup and not backup.exists()
    backup.mkdir(mode=0o700)
    backups = {}
    for index,(path,(content,mode,uid,gid)) in enumerate(snapshots.items()):
        target = backup/(str(index)+'.snapshot')
        atomic(target,content)
        backups[str(path)] = dict(file=str(target),sha256=sha(content),mode=mode,uid=uid,gid=gid)
    # SQLite's backup API gives a consistent recovery copy without writing the running pilot.
    database = Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
    assert database == Path('/var/lib/private/wvh-castle-homes/pilot.sqlite') and database.is_file()
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader, sqlite3.connect(backup/'pilot.sqlite') as writer:
        reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    pool = php.parent.parent/'etc/php-fpm.d/deine-schule.com.conf'
    group = re.findall(r'^\s*group\s*=\s*([A-Za-z0-9_.-]+)\s*$',pool.read_text(),re.M)
    assert len(group) == 1
    gid = grp.getgrnam(group[0]).gr_gid
    context_release = CONTEXT/EXPECTED[:16]
    assert context_release.resolve() == context_release
    context_release.mkdir(mode=0o750,exist_ok=True)
    context_release.chmod(0o750)
    os.chown(context_release,0,gid)
    for name in ['SchoolIdentity.php','ContextProtocol.php','context.php']:
        atomic(context_release/name,payload['ops/castle-homes/'+name],0o640,0,gid)
        run(str(php),'-l',str(context_release/name))
    config = {**old_config,'version':2,'moderatorSubjects':subjects}
    context_config = {**old_context,'moderators':subjects,'administratorModerators':subjects}
    wrapper = snapshots[WRAPPER][0].replace(str(CONTEXT/initial['archiveSha256'][:16]).encode(),str(context_release).encode())
    unit = snapshots[UNIT][0].replace(str(old_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert wrapper != snapshots[WRAPPER][0] and unit != snapshots[UNIT][0]
    changes = {CONTEXT/'config.json':json.dumps(context_config).encode(),WRAPPER:wrapper,
               PRIVATE/'service.json':json.dumps(config).encode(),UNIT:unit}
    for private_value in [old_config['platformSecret'],old_config['contextKey'],old_config['bridgeKey'],old_context['db']['password'],
                          consent['moderatorIdentifier'],*(row['token'] for row in accounts['accounts'])]:
        assert private_value and all(private_value.encode() not in content for content in payload.values())
    changed = []
    committed = False
    try:
        for path,content in changes.items():
            original,mode,uid,old_gid = snapshots[path]
            assert path.read_bytes() == original
            atomic(path,content,mode,uid,old_gid)
            changed.append(path)
        run('systemctl','daemon-reload')
        run('systemctl','restart',SERVICE)
        context_url = 'https://www.deine-schule.com/workadventure-castle-homes.php'
        canary = False
        for _ in range(30):
            try:
                status,body,_headers = request('https://together.deine-schule.com/castle-homes/health',headers={'Cache-Control':'no-cache'})
                assert status == 200 and json.loads(body) == {'ready':True}
                timestamp,nonce = str(int(time.time())),secrets.token_hex(20)
                raw = json.dumps({'identifier':consent['moderatorIdentifier']},separators=(',',':')).encode()
                signature = hmac.new(old_config['contextKey'].encode(),timestamp.encode()+b'\n'+nonce.encode()+b'\n'+raw,hashlib.sha256).hexdigest()
                status,body,headers = request(context_url,raw,{'Content-Type':'application/json',
                    'X-Castle-Homes-Timestamp':timestamp,'X-Castle-Homes-Nonce':nonce,'X-Castle-Homes-Signature':signature})
                expected_signature = hmac.new(old_config['contextKey'].encode(),nonce.encode()+b'\n'+body,hashlib.sha256).hexdigest()
                assert status == 200 and hmac.compare_digest(headers.get('X-Castle-Homes-Signature',''),expected_signature)
                value = json.loads(body)
                assert abs(value['checkedAt']-int(time.time()*1000)) < 10000
                assert value['identity'] == dict(sub=subjects[0],role='teacher',grade=None,age=None,moderator=True,read_only=False)
                canary = True
                break
            except Exception:
                time.sleep(.4)
        assert canary, 'Signed public moderator canary did not become ready'
        assert request(context_url)[0] == 405 and request(context_url,b'{}',{'Content-Type':'application/json'})[0] == 401
        qa = subprocess.run(['systemd-run','--quiet','--wait','--pipe','--collect','--unit=wvh-homes-mod-public-'+EXPECTED[:12],
            '--property=DynamicUser=yes','--property=PrivateTmp=yes','--property=ProtectSystem=strict',
            '--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=256M',
            '--property=CPUQuota=100%','--property=RuntimeMaxSec=125s',
            '--property=LoadCredential=accounts.json:'+str(ACCOUNTS),'--setenv=NODE_PATH='+node_path,
            node,str(release/'tools/check-castle-homes-public.cjs')],stdin=subprocess.DEVNULL,
            capture_output=True,text=True,timeout=140)
        atomic(PRIVATE/'moderation-public-probe.private.log',(qa.stdout+'\n'+qa.stderr).encode())
        assert qa.returncode == 0, 'Public pupil regression failed'
        acceptance = json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks']) == 7
        after_decision = school_check()
        assert after_decision == decision
        assert ops['baseline']() == before and running() == docker_before
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState') == colleague
        assert all(path.read_bytes() == content for path,content in changes.items())
        assert all(sha(Path(name).read_bytes()) == digest for name,digest in initial['contextFiles'].items() if name not in [str(WRAPPER),str(CONTEXT/'config.json')])
        assert run('systemctl','is-active',SERVICE).strip() == 'active'
        record = dict(passed=True,version=2,archiveSha256=EXPECTED,release=str(release),
            initialReceiptSha256=sha(initial_raw),before=before,after=before,backups=backups,
            changedFiles={str(path):sha(content) for path,content in changes.items()},
            files={name:sha(content) for name,content in payload.items()},
            contextFiles={str(context_release/name):sha(payload['ops/castle-homes/'+name]) for name in ['SchoolIdentity.php','ContextProtocol.php','context.php']},
            moderatorSubjects=subjects,administratorExceptionApproved=True,schoolCheck={key:value for key,value in decision.items() if key not in ['subject','roleDigest']},
            globalRoleRowsUnchanged=True,signedPublicModeratorCanary=True,normalStaffMicrosoftLoginTested=False,
            linuxTestLogSha256=sha((PRIVATE/'moderation-linux-tests.private.log').read_bytes()),acceptance=acceptance,
            recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),
            existingServicesAndMapsUnchanged=True,onlyRoomPilotRestarted=True,voiceEnabled=False,
            broadSchoolRoomAccess=False,checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        committed = True
        print(json.dumps({key:record[key] for key in ['passed','version','archiveSha256','administratorExceptionApproved',
            'globalRoleRowsUnchanged','signedPublicModeratorCanary','normalStaffMicrosoftLoginTested',
            'existingServicesAndMapsUnchanged','onlyRoomPilotRestarted','broadSchoolRoomAccess','voiceEnabled','checkedAt']}))
    finally:
        if not committed and changed:
            for path in reversed(changed):
                assert path.read_bytes() == changes[path], 'Concurrent live change; refuse rollback overwrite'
                content,mode,uid,old_gid = snapshots[path]
                atomic(path,content,mode,uid,old_gid)
            run('systemctl','daemon-reload')
            run('systemctl','restart',SERVICE)


if __name__ == '__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
        ACCOUNTS.unlink(missing_ok=True)
