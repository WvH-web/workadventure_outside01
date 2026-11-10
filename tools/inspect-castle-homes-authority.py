"""Read only schema capabilities needed by the existing personal-room school protocol."""
import json
from pathlib import Path
import runpy
import subprocess

ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
config=Path('/var/www/vhosts/deine-schule.com/private/castle-school/config.json')
assert config.resolve()==config and config.stat().st_mode&0o777==0o600
digest=ops['sha'](config.read_bytes())
code=r'''
$config=json_decode(file_get_contents($argv[1]),true,16,JSON_THROW_ON_ERROR);
$db=new PDO($config['db']['dsn'],$config['db']['user'],$config['db']['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$expected=[
 'students'=>['id','family_id','email','birthdate','is_active','enrollment_status','contract_end_date'],
 'families'=>['id','portal_email','is_active','portal_login_enabled'],
 'school_years'=>['id','is_active','starts_on','ends_on'],
 'classes'=>['id','is_active','grade_level'],
 'student_enrollments'=>['id','student_id','school_year_id','class_id','enrolled_on','left_on','teaching_model','ai_learning_level'],
 'users'=>['id','email','is_active','role_id'],
 'user_role_memberships'=>['user_id','role_id'],
 'settings'=>['key','value']];
$db->exec('SET TRANSACTION READ ONLY');$db->beginTransaction();$missing=[];
$q=$db->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
foreach($expected as $table=>$columns){$q->execute([$table]);$actual=$q->fetchAll(PDO::FETCH_COLUMN);$gap=array_values(array_diff($columns,$actual));if($gap)$missing[$table]=$gap;}
$db->rollBack();echo json_encode(['passed'=>!$missing,'requiredTables'=>count($expected),'missingColumns'=>$missing,'studentRowsRead'=>false,'schoolWrites'=>false],JSON_THROW_ON_ERROR);
'''
php=sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
result=subprocess.run([str(php),'-r',code,str(config)],capture_output=True,text=True,timeout=20)
if result.returncode:raise RuntimeError('Read-only schema check failed; private diagnostics withheld')
value=json.loads(result.stdout)
assert ops['baseline']()==before and ops['sha'](config.read_bytes())==digest
print(json.dumps(value))
