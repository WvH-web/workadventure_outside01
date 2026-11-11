"""Resolve the user's sole approved moderator privately; do not widen the pupil-only pilot."""
import json
import os
from pathlib import Path
import runpy
import subprocess
import time

INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-moderator.private.json')
PRIVATE=Path('/opt/wvh-castle-homes/private')


def main():
    os.umask(0o077)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600);value=json.loads(INPUT.read_text())
    assert set(value)=={'version','moderatorIdentifier'} and value['version']==1
    assert isinstance(value['moderatorIdentifier'],str) and 3<len(value['moderatorIdentifier'])<255
    deployment=json.loads((PRIVATE/'pilot-deployment.json').read_text())
    release=Path(deployment['release']);assert release.resolve()==release and release.parent==PRIVATE.parent/'releases'
    context=Path('/var/www/vhosts/deine-schule.com/private/castle-homes/config.json')
    original=context.read_bytes();assert json.loads(original)['moderators']==[]
    php=sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
    code=r'''
    require $argv[2].'/ops/castle-homes/SchoolIdentity.php';
    $config=json_decode(file_get_contents($argv[1]),true,16,JSON_THROW_ON_ERROR);
    $input=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);
    $db=new PDO($config['db']['dsn'],$config['db']['user'],$config['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $db->exec('SET TRANSACTION READ ONLY');$db->beginTransaction();
    try{
      $q=$db->prepare('SELECT id,role_id FROM users WHERE LOWER(email)=LOWER(?) AND is_active=1 LIMIT 2');$q->execute([$input['moderatorIdentifier']]);$users=$q->fetchAll(PDO::FETCH_ASSOC);
      $subject=null;$roles=[];
      if(count($users)===1){$subject='wvh:staff:'.$users[0]['id'];$roles[]=(int)$users[0]['role_id'];
        $q=$db->prepare('SELECT role_id FROM user_role_memberships WHERE user_id=?');$q->execute([$users[0]['id']]);foreach($q->fetchAll(PDO::FETCH_COLUMN) as $role)$roles[]=(int)$role;}
      $base=(new \CastleHomes\SchoolIdentity($db))->resolve($input['moderatorIdentifier']);
      $approved=$subject?(new \CastleHomes\SchoolIdentity($db,[$subject]))->resolve($input['moderatorIdentifier']):null;
      echo json_encode(['oneActiveStaffMatch'=>count($users)===1,'freshTeacherRole'=>in_array(3,$roles,true),
        'privilegedStaffRole'=>count(array_intersect([1,2],$roles))>0,'canonicalTeacherRecognized'=>$base&&$base['role']==='teacher',
        'eligible'=>$approved&&$approved['role']==='teacher'&&$approved['moderator']===true,
        'subject'=>$subject],JSON_THROW_ON_ERROR);
    }finally{$db->rollBack();}
    '''
    result=subprocess.run([str(php),'-r',code,str(context),str(release)],input=json.dumps(value),capture_output=True,text=True,timeout=25)
    if result.returncode:raise RuntimeError('Private moderator role lookup failed; diagnostics withheld')
    decision=json.loads(result.stdout)
    assert context.read_bytes()==original and ops['baseline']()==before
    record=dict(version=1,subjects=[decision['subject']] if decision['eligible'] else [],
        eligible=decision['eligible'],oneActiveStaffMatch=decision['oneActiveStaffMatch'],
        freshTeacherRole=decision['freshTeacherRole'],privilegedStaffRole=decision['privilegedStaffRole'],
        canonicalTeacherRecognized=decision['canonicalTeacherRecognized'],freshTeacherRequired=True,
        liveModeratorAccess=False,reason='User approved exactly one named staff account; pupil-only pilot unchanged',
        checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
    target=PRIVATE/'moderation-approval.json'
    if target.exists():
        old=json.loads(target.read_text());assert old.get('subjects')==record['subjects'] and not old.get('liveModeratorAccess')
    ops['atomic'](target,record)
    print(json.dumps({key:record[key] for key in ['eligible','oneActiveStaffMatch','freshTeacherRole',
        'privilegedStaffRole','canonicalTeacherRecognized','liveModeratorAccess','checkedAt']}))


if __name__=='__main__':
    try:main()
    finally:INPUT.unlink(missing_ok=True)
