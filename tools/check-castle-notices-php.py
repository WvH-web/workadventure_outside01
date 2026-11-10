"""Run only synthetic PHP/MySQL fixtures; never change portal/VPS application tables."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

archive = Path('/tmp/wvh-castle-notices-qa.zip')
result_path = Path('/tmp/wvh-castle-notices-qa-result.json')
php = Path('/opt/plesk/php/8.3/bin/php')
if not php.is_file():
    raise RuntimeError('Expected PHP 8.3 runtime unavailable')
if not archive.is_file() or archive.is_symlink() or archive.stat().st_size > 200000:
    raise RuntimeError('Unexpected synthetic QA archive')
root = Path(tempfile.mkdtemp(prefix='castle-notice-qa-'))
allowed = {'src/WorkAdventure/CastleNoticeRepository.php', 'api/workadventure_castle_notices.php',
           'admin/workadventure_castle_notices.php', 'assets/css/workadventure_castle_notices.css',
           'config/sql/PATCH_workadventure_castle_notices_v1.sql', 'tests/workadventure_castle_notices.php',
           'tests/workadventure_castle_notices_render.php'}
try:
    with zipfile.ZipFile(archive) as zipped:
        if set(zipped.namelist()) != allowed or len(zipped.namelist()) != len(allowed):
            raise RuntimeError('Unexpected fixture contents')
        for name in allowed:
            if zipped.getinfo(name).file_size > 64000:
                raise RuntimeError('Oversized fixture')
            data = zipped.read(name)
            if len(data) > 64000:
                raise RuntimeError('Oversized fixture')
            destination = root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
    for name in sorted(allowed):
        if name.endswith('.php'):
            checked = subprocess.run([str(php), '-l', str(root / name)], capture_output=True, text=True)
            if checked.returncode:
                raise RuntimeError('PHP syntax check failed: ' + name)
    harness = r'''<?php
ini_set('display_errors','0');
$created=false;$db=null;$connection=null;$result=null;$failure=false;
try{
 $name='castle_notice_qa_'.bin2hex(random_bytes(8));
 if(!preg_match('/^castle_notice_qa_[a-f0-9]{16}$/D',$name))throw new RuntimeException('Identifier');
 $connection=new PDO('mysql:host=localhost;charset=utf8mb4','admin',trim(file_get_contents('/etc/psa/.psa.shadow')),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
 $connection->exec('CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4');$created=true;
 $connection->exec('USE `'.$name.'`');$db=$connection;
 require __DIR__.'/tests/workadventure_castle_notices.php';$fixtures=castleNoticeFixtures($db,true);
 require __DIR__.'/tests/workadventure_castle_notices_render.php';$renders=castleNoticeRenderFixtures($db);
 $result=['php'=>PHP_VERSION,'fixtures'=>$fixtures,'renders'=>$renders,'sessionStarted'=>session_status()===PHP_SESSION_ACTIVE];
}catch(Throwable $error){$failure=true;$message=$error instanceof RuntimeException?$error->getMessage():'Protected fixture failed';$result=['error'=>preg_match('/^Fixture failed: [a-z0-9-]+$/D',$message)?$message:'Protected fixture failed'];
}finally{if($created){try{$connection->exec('DROP DATABASE `'.$name.'`');}catch(Throwable){$failure=true;$result=['error'=>'Synthetic database cleanup failed'];}}}
echo json_encode($result,JSON_THROW_ON_ERROR);exit($failure?1:0);
'''
    (root / 'run.php').write_text(harness)
    process = subprocess.run([str(php), str(root / 'run.php')], capture_output=True, text=True, timeout=45)
    try:
        result = json.loads(process.stdout)
    except Exception:
        raise RuntimeError('Fixture worker returned an invalid result') from None
    if process.returncode or 'error' in result:
        raise RuntimeError(result.get('error', 'Protected fixture failed'))
    result['sourceFiles'] = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in sorted(allowed)}
    result['isolatedDatabaseRemoved'] = True
    staged_result = root / 'result.json'
    staged_result.write_text(json.dumps(result, ensure_ascii=True))
    staged_result.chmod(0o644)  # Only synthetic renders; no credentials, sessions or school records.
    os.replace(staged_result, result_path)
    print(json.dumps({key: value for key, value in result.items() if key not in ('renders', 'sourceFiles')}))
finally:
    shutil.rmtree(root)
    archive.unlink(missing_ok=True)
