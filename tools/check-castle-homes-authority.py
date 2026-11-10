"""Isolated SQL/context proof. No endpoint installation, game writes or service restart."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import time
import zipfile

ARCHIVE=Path('/tmp/wvh-castle-homes-context.zip')
EXPECTED='48741f8abebc9e98ce799453f3d209b2a82fed4110326a941a26a162ba715592'
FILES={'ops/castle-homes/SchoolIdentity.php','ops/castle-homes/ContextProtocol.php','ops/castle-homes/context.php',
       'tests/castle-homes-identity.php','tests/castle-homes-protocol.php'}
IDENTIFIERS=Path('/home/wilhelm/.cache/wvh-school-qa/admission-identifiers.private.json')

def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    raw=ARCHIVE.read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED and len(raw)<100000
    root=Path('/opt/wvh-castle-homes');private=root/'private';release=root/'preflight'/EXPECTED[:16]
    assert root.resolve()==root and not root.is_symlink()
    assert private.resolve()==private and release.resolve()==release
    root.mkdir(mode=0o755,exist_ok=True);private.mkdir(mode=0o700,exist_ok=True);private.chmod(0o700)
    release.mkdir(mode=0o700,parents=True,exist_ok=True)
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert len(archive.infolist())==len(FILES) and set(archive.namelist())==FILES and sum(row.file_size for row in archive.infolist())<100000
        for name in FILES:
            target=release/name;assert target.resolve().is_relative_to(release)
            target.parent.mkdir(mode=0o700,parents=True,exist_ok=True);content=archive.read(name)
            if target.exists():assert not target.is_symlink() and target.read_bytes()==content
            else:target.write_bytes(content);target.chmod(0o600)
    assert IDENTIFIERS.resolve()==IDENTIFIERS and IDENTIFIERS.parent.stat().st_mode&0o777==0o700
    IDENTIFIERS.chmod(0o600);value=json.loads(IDENTIFIERS.read_text());assert set(value)=={'identifiers'} and len(value['identifiers'])==2
    config=Path('/var/www/vhosts/deine-schule.com/private/castle-school/config.json');config_sha=ops['sha'](config.read_bytes())
    code=r'''
    $config=json_decode(file_get_contents($argv[1]),true,16,JSON_THROW_ON_ERROR);
    $input=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);$root=$argv[2];
    require $root.'/ops/castle-homes/SchoolIdentity.php';require $root.'/ops/castle-homes/ContextProtocol.php';
    require $root.'/tests/castle-homes-identity.php';require $root.'/tests/castle-homes-protocol.php';
    $db=new PDO($config['db']['dsn'],$config['db']['user'],$config['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $statement=$db->getAttribute(PDO::ATTR_STATEMENT_CLASS);$db->exec('SET TRANSACTION READ ONLY');$db->beginTransaction();
    try{
      $fixtures=castleHomesIdentityFixtures($db);$db->setAttribute(PDO::ATTR_STATEMENT_CLASS,$statement);$protocols=castleHomesProtocolFixtures();
      $key=bin2hex(random_bytes(32));$protocol=new \CastleHomes\ContextProtocol($key,new PDO('sqlite::memory:'));
      $source=new \CastleHomes\SchoolIdentity($db);$identities=[];
      foreach($input['identifiers'] as $index=>$identifier){
        $raw=json_encode(['identifier'=>$identifier],JSON_THROW_ON_ERROR);$timestamp=(string)time();$nonce=bin2hex(random_bytes(20));
        $reply=$protocol->handle($raw,['timestamp'=>$timestamp,'nonce'=>$nonce,'signature'=>hash_hmac('sha256',$timestamp."\n".$nonce."\n".$raw,$key)],(int)floor(microtime(true)*1000),[$source,'resolve']);
        if(!hash_equals(hash_hmac('sha256',$nonce."\n".$reply['body'],$key),$reply['signature']))throw new RuntimeException('Invalid reply signature');
        $identity=json_decode($reply['body'],true,8,JSON_THROW_ON_ERROR)['identity'];
        if(!$identity||$identity['role']!=='student'||$identity['grade']!==[3,7][$index]||$identity['age']!==[9,13][$index]||$identity['moderator']!==false||$identity['read_only']!==false)throw new RuntimeException('Synthetic cohort mismatch');
        $q=$db->prepare('SELECT id FROM students WHERE LOWER(email)=LOWER(?) AND is_active=1 LIMIT 2');$q->execute([$identifier]);$ids=$q->fetchAll(PDO::FETCH_COLUMN);
        if(count($ids)!==1||$identity['sub']!=='wvh:student:'.$ids[0])throw new RuntimeException('Canonical owner mismatch');
        if(str_contains($reply['body'],$identifier)||str_contains($reply['body'],'birthdate')||str_contains($reply['body'],'_credential'))throw new RuntimeException('Unexpected private context fields');
        $identities[]=$identity['sub'];
      }
      if(count(array_unique($identities))!==2)throw new RuntimeException('Different pupils require different room owners');
      echo json_encode(['passed'=>true,'mysqlFixtureCases'=>$fixtures['passed'],'protocolCases'=>$protocols['passed'],'authorizedSyntheticPupils'=>2,
        'canonicalDatabaseOwners'=>true,'freshSchoolCohortsAndAge'=>true,'defaultModeratorDenied'=>true,'privateResponseContainsNoEmailOrBirthday'=>true,
        'schoolTransactionReadOnly'=>true,'schoolWrites'=>false,'roomOrInventoryWrites'=>false,'normalMicrosoftLoginTested'=>false,'publicEndpointInstalled'=>false],JSON_THROW_ON_ERROR);
    }finally{$db->rollBack();}
    '''
    php=sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
    try:
        result=subprocess.run([str(php),'-r',code,str(config),str(release)],input=json.dumps(value),capture_output=True,text=True,timeout=45)
        if result.returncode:
            diagnostic=private/'authority-preflight-failure.private.log';diagnostic.write_text(result.stderr);diagnostic.chmod(0o600)
            raise RuntimeError('Home identity preflight failed; private diagnostics retained')
        proof=json.loads(result.stdout);assert proof['passed'] and proof['schoolWrites'] is False and proof['roomOrInventoryWrites'] is False
        assert ops['baseline']()==before and ops['sha'](config.read_bytes())==config_sha
        record={**proof,'archiveSha256':EXPECTED,'files':{name:ops['sha']((release/name).read_bytes()) for name in FILES},'existingServicesAndMapsUnchanged':True,
                'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](private/'authority-preflight.json',record);print(json.dumps(proof))
    finally:IDENTIFIERS.unlink(missing_ok=True)

if __name__=='__main__':main()
