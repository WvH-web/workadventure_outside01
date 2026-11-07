"""Apply the reviewed staff-role query change without storing live credentials in Git."""
import datetime as dt
import glob
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

TARGET = Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php')
PATCH = Path('/tmp/wvh-teacher-access-20261107.patch')
OLD = "'teacher' => \"SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 AND role_id = 3 LIMIT 1\","
NEW = "// The staff-room access tag also includes active school administrators.\n        'teacher' => \"SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 AND role_id IN (1, 3) LIMIT 1\","

PHP_TEST = r'''
$text=file_get_contents($argv[1]);
$values=[];
foreach(['dsn','dbUser','dbPass'] as $key){
    if(!preg_match('/\\$'.preg_quote($key,'/').'\\s*=\\s*([\'\"])(.*?)\\1/s',$text,$match))throw new RuntimeException('Database configuration not found');
    $values[$key]=$match[2];
}
if(!preg_match('/\x27teacher\x27\s*=>\s*"([^"]+)"/',$text,$match))throw new RuntimeException('Staff query not found');
$sql=$match[1];
$fixtureSql=str_replace('FROM users WHERE','FROM (SELECT ? AS email, ? AS is_active, ? AS role_id) AS users WHERE',$sql);
if($fixtureSql===$sql)throw new RuntimeException('Unexpected staff query');
$pdo=new PDO($values['dsn'],$values['dbUser'],$values['dbPass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$results=[];
foreach([[1,1,true],[1,3,true],[1,2,false],[1,4,false],[1,99,false],[0,1,false],[0,3,false]] as [$active,$role,$expected]){
    $stmt=$pdo->prepare($fixtureSql);
    $stmt->execute(['fixture@invalid.local',$active,$role,'fixture@invalid.local']);
    $allowed=(bool)$stmt->fetchColumn();
    if($allowed!==$expected)throw new RuntimeException('Staff access regression');
    $results[]=['active'=>$active,'role'=>$role,'allowed'=>$allowed];
}
echo json_encode(['readOnly'=>true,'cases'=>$results]);
'''

def main():
    if TARGET.resolve() != TARGET or not TARGET.is_file():
        raise RuntimeError('Unexpected live target')
    original = TARGET.read_bytes()
    text = original.decode()
    if text.count(OLD) != 1:
        raise RuntimeError('Live base changed; inspect before deployment')
    expected = text.replace(OLD, NEW, 1).encode()
    php = sorted(glob.glob('/opt/plesk/php/*/bin/php'))[-1]
    with tempfile.TemporaryDirectory(prefix='wvh-staff-role-') as temporary:
        staged = Path(temporary) / TARGET.name
        staged.write_bytes(original)
        result = subprocess.run(['patch','--batch','--fuzz=0','-p0','-i',str(PATCH)], cwd=temporary, capture_output=True, text=True)
        if result.returncode or staged.read_bytes() != expected:
            raise RuntimeError('Reviewed patch did not apply exactly')
        subprocess.run([php, '-l', str(staged)], check=True, capture_output=True, text=True)
        result = subprocess.run([php, '-r', PHP_TEST, str(staged)], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError('Read-only SQL regression checks failed; live file unchanged')
        tests = json.loads(result.stdout)
        backup = Path('/var/backups/wvh-workadventure-role-lookup') / dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup.mkdir(parents=True, mode=0o700)
        saved = backup / TARGET.name
        saved.write_bytes(original)
        os.chmod(saved, 0o600)
        metadata = TARGET.stat()
        if TARGET.read_bytes() != original:
            raise RuntimeError('Live file changed during verification')
        fd, temporary_target = tempfile.mkstemp(prefix='.wvh-role-', suffix='.php', dir=TARGET.parent)
        try:
            with os.fdopen(fd, 'wb') as handle:
                handle.write(expected)
            os.chmod(temporary_target, stat.S_IMODE(metadata.st_mode))
            os.chown(temporary_target, metadata.st_uid, metadata.st_gid)
            os.replace(temporary_target, TARGET)
        finally:
            Path(temporary_target).unlink(missing_ok=True)
        proof = {'target':str(TARGET),'backup':str(backup),'changedQueryOnly':True,
            'beforeSha256':hashlib.sha256(original).hexdigest(),'afterSha256':hashlib.sha256(expected).hexdigest(),
            'sqlTests':tests,'databaseWrites':False,'workadventureRestartRequired':False}
        (backup/'proof.json').write_text(json.dumps(proof, indent=2)+'\n')
        print(json.dumps(proof, indent=2))

if __name__ == '__main__':
    main()
