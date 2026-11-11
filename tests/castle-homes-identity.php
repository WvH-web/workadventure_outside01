<?php
declare(strict_types=1);
require_once __DIR__.'/../ops/castle-homes/SchoolIdentity.php';

/** Real SQL predicates over SELECT-only derived fixtures, never live school rows. */
final class CastleHomesFixtureStatement extends PDOStatement
{
    public function execute(?array $params = null): bool
    {
        if ($params === null) return parent::execute();
        foreach (array_values($params) as $index => $value) $this->bindValue($index+1,$value,is_int($value)?PDO::PARAM_INT:($value===null?PDO::PARAM_NULL:PDO::PARAM_STR));
        return parent::execute();
    }
}

final class CastleHomesFixturePDO extends PDO
{
    public function __construct(private PDO $database, private array $tables)
    {
        $database->setAttribute(PDO::ATTR_STATEMENT_CLASS,[CastleHomesFixtureStatement::class]);
    }
    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        if (!str_starts_with($query, 'SELECT ')) throw new RuntimeException('Only SELECT fixtures permitted');
        foreach ($this->tables as $table => $spec) {
            $parts = [];
            foreach ($spec['rows'] as $row) {
                $values = [];
                foreach ($spec['columns'] as $column) {
                    $value = $row[$column] ?? null;
                    $values[] = ($value === null ? 'NULL' : (is_int($value)?(string)$value:$this->database->quote((string)$value))).' AS `'.$column.'`';
                }
                $parts[] = 'SELECT '.implode(', ', $values);
            }
            if (!$parts) $parts[] = 'SELECT '.implode(', ', array_map(static fn($c) => 'NULL AS `'.$c.'`', $spec['columns'])).' WHERE 1=0';
            $derived = '('.implode(' UNION ALL ', $parts).')';
            $query = preg_replace_callback('/\b(FROM|JOIN) '.preg_quote($table, '/').'\b(?:\s+(s|se|c|exited|last_exit|continuing)\b)?/',
                static fn($match) => $match[1].' '.$derived.' AS '.($match[2] ?? $table), $query);
        }
        if (preg_match('/\b(?:FROM|JOIN)\s+(?:users|students|families|school_years|student_enrollments|classes|settings|user_role_memberships)\b/i', $query)) throw new RuntimeException('Real school tables must not be queried');
        return $this->database->prepare($query, $options);
    }
}

function castleHomesIdentityFixtures(PDO $database): array
{
    $tables = [
        'users' => ['columns' => ['id','email','is_active','role_id'], 'rows' => [['id'=>70,'email'=>'teacher@invalid.local','is_active'=>1,'role_id'=>3]]],
        'families' => ['columns' => ['id','portal_email','is_active','portal_login_enabled'], 'rows' => [['id'=>11,'portal_email'=>'family@invalid.local','is_active'=>1,'portal_login_enabled'=>1]]],
        'students' => ['columns' => ['id','family_id','email','birthdate','is_active','enrollment_status','contract_end_date'], 'rows' => [
            ['id'=>7,'family_id'=>11,'email'=>'pupil@invalid.local','birthdate'=>'2013-11-10','is_active'=>1,'enrollment_status'=>'active','contract_end_date'=>null]]],
        'school_years' => ['columns' => ['id','is_active','starts_on','ends_on'], 'rows' => [['id'=>26,'is_active'=>1,'starts_on'=>'2026-08-01','ends_on'=>'2027-07-31']]],
        'student_enrollments' => ['columns' => ['id','student_id','school_year_id','class_id','enrolled_on','left_on','teaching_model','ai_learning_level'], 'rows' => [
            ['id'=>101,'student_id'=>7,'school_year_id'=>26,'class_id'=>17,'enrolled_on'=>'2026-08-01','left_on'=>null,'teaching_model'=>'regular','ai_learning_level'=>null]]],
        'classes' => ['columns' => ['id','is_active','grade_level'], 'rows' => [['id'=>17,'is_active'=>1,'grade_level'=>7]]],
        'user_role_memberships' => ['columns' => ['user_id','role_id'], 'rows' => []],
        'settings' => ['columns' => ['key','value'], 'rows' => [['key'=>'emergency_lock_active','value'=>'0']]],
    ];
    $identity = static fn(string $sub, string $role, ?int $grade=null, ?int $age=null, bool $moderator=false): array =>
        ['sub'=>$sub,'role'=>$role,'grade'=>$grade,'age'=>$age,'moderator'=>$moderator,'read_only'=>false];
    $pupil = $identity('wvh:student:7','student',7,13); $family = $identity('wvh:family:11','parent'); $teacher = $identity('wvh:staff:70','teacher');
    $checks = [];
    $check = static function(string $name, array $set, string $email, ?array $expected, array $moderators=[], array $administratorModerators=[]) use ($database,&$checks): void {
        $source = new \CastleHomes\SchoolIdentity(new CastleHomesFixturePDO($database,$set),$moderators,'2026-11-10',$administratorModerators);
        $actual = $source->resolve($email);
        if ($actual !== $expected) throw new RuntimeException('Identity fixture failed: '.$name);
        $checks[] = $name;
    };
    $change = static function(string $table, array $patch) use ($tables): array { $copy=$tables; $copy[$table]['rows'][0]=array_replace($copy[$table]['rows'][0]??[],$patch); return $copy; };
    $check('canonical-student-owner',$tables,'pupil@invalid.local',$pupil);
    $check('canonical-family-not-child',$tables,'family@invalid.local',$family);
    $check('teacher-not-automatically-moderator',$tables,'teacher@invalid.local',$teacher);
    $check('explicit-fresh-teacher-moderation',$tables,'teacher@invalid.local',$identity('wvh:staff:70','teacher',null,null,true),['wvh:staff:70']);
    $check('case-insensitive-identifier',$tables,'PUPIL@invalid.local',$pupil);
    foreach (['unknown@invalid.local','opaque-subject',"pupil@invalid.local\n",str_repeat('a',256).'@invalid.local'] as $index=>$email) $check('invalid-or-unknown-'.$index,$tables,$email,null);
    foreach ([['is_active'=>0],['enrollment_status'=>'withdrawn'],['contract_end_date'=>'2026-11-09']] as $index=>$patch) $check('inactive-student-'.$index,$change('students',$patch),'pupil@invalid.local',null);
    foreach (['pending_setup','pending_teams'] as $status) $check('active-school-status-'.$status,$change('students',['enrollment_status'=>$status]),'pupil@invalid.local',$pupil);
    $check('contract-end-inclusive',$change('students',['contract_end_date'=>'2026-11-10']),'pupil@invalid.local',$pupil);
    $check('legacy-empty-contract-end',$change('students',['contract_end_date'=>'0000-00-00']),'pupil@invalid.local',$pupil);
    foreach ([null,'0000-00-00','2013-02-30','2027-01-01','1900-01-01'] as $index=>$date) $check('unknown-age-stays-unknown-'.$index,$change('students',['birthdate'=>$date]),'pupil@invalid.local',$identity('wvh:student:7','student',7));
    $check('birthday-tomorrow',$change('students',['birthdate'=>'2013-11-11']),'pupil@invalid.local',$identity('wvh:student:7','student',7,12));
    foreach ([['is_active'=>0],['starts_on'=>'2026-11-11'],['ends_on'=>'2026-11-09']] as $index=>$patch) $check('invalid-school-year-'.$index,$change('school_years',$patch),'pupil@invalid.local',null);
    $duplicate=$tables; $duplicate['school_years']['rows'][]=array_replace($tables['school_years']['rows'][0],['id'=>27]);
    $check('ambiguous-current-school-years',$duplicate,'pupil@invalid.local',null);
    foreach ([['enrolled_on'=>'2026-11-11'],['left_on'=>'2026-11-09'],['school_year_id'=>25],['student_id'=>8]] as $index=>$patch) $check('invalid-enrollment-'.$index,$change('student_enrollments',$patch),'pupil@invalid.local',null);
    $check('enrollment-start-inclusive',$change('student_enrollments',['enrolled_on'=>'2026-11-10']),'pupil@invalid.local',$pupil);
    $check('enrollment-end-inclusive',$change('student_enrollments',['left_on'=>'2026-11-10']),'pupil@invalid.local',$pupil);
    foreach ([['is_active'=>0],['grade_level'=>null],['grade_level'=>99]] as $index=>$patch) $check('invalid-current-class-'.$index,$change('classes',$patch),'pupil@invalid.local',null);
    $check('ai-learning-level-not-posted-grade',$change('student_enrollments',['teaching_model'=>'ai','ai_learning_level'=>3]),'pupil@invalid.local',$identity('wvh:student:7','student',3,13));
    $ai=$change('student_enrollments',['teaching_model'=>'ai','ai_learning_level'=>3,'class_id'=>null]);
    $check('ai-does-not-invent-class-membership',$ai,'pupil@invalid.local',$identity('wvh:student:7','student',3,13));
    foreach ([null,0,14] as $index=>$level) $check('invalid-ai-level-'.$index,$change('student_enrollments',['teaching_model'=>'ai','ai_learning_level'=>$level]),'pupil@invalid.local',null);
    $duplicate=$tables;$duplicate['student_enrollments']['rows'][]=array_replace($tables['student_enrollments']['rows'][0],['id'=>102]);
    $check('duplicate-same-class-keeps-owner',$duplicate,'pupil@invalid.local',$pupil);
    $duplicate['student_enrollments']['rows'][1]['class_id']=18;$duplicate['classes']['rows'][]=['id'=>18,'is_active'=>1,'grade_level'=>7];
    $check('conflicting-current-classes',$duplicate,'pupil@invalid.local',null);
    $duplicate=$tables;$duplicate['students']['rows'][]=array_replace($tables['students']['rows'][0],['id'=>8]);
    $check('duplicate-email-cannot-steal-room',$duplicate,'pupil@invalid.local',null);
    $check('family-student-email-conflict',$change('families',['portal_email'=>'pupil@invalid.local']),'pupil@invalid.local',null);
    $check('teacher-student-email-conflict',$change('users',['email'=>'pupil@invalid.local']),'pupil@invalid.local',null);
    foreach ([['is_active'=>0],['portal_login_enabled'=>0]] as $index=>$patch) $check('parent-withdrawal-'.$index,$change('families',$patch),'family@invalid.local',null);
    $check('parent-needs-active-child',$change('students',['is_active'=>0]),'family@invalid.local',null);
    $check('parent-needs-current-child-enrollment',$change('student_enrollments',['left_on'=>'2026-11-09']),'family@invalid.local',null);
    foreach ([1,2,4,99] as $role) $check('nonteacher-role-'.$role,$change('users',['role_id'=>$role]),'teacher@invalid.local',null);
    $check('teacher-account-withdrawal',$change('users',['is_active'=>0]),'teacher@invalid.local',null,['wvh:staff:70']);
    $additional=$change('users',['role_id'=>2]);$additional['user_role_memberships']['rows'][]=['user_id'=>70,'role_id'=>3];
    $check('additional-teacher-role-is-fresh',$additional,'teacher@invalid.local',$teacher);
    $additional['settings']['rows'][0]['value']='1';$check('emergency-lock-stops-privileged-teacher',$additional,'teacher@invalid.local',null);
    $additional['settings']['rows']=[];$check('missing-emergency-setting-fails-closed',$additional,'teacher@invalid.local',null);
    foreach ([1,2] as $role) $check('explicit-single-admin-exception-'.$role,$change('users',['role_id'=>$role]),'teacher@invalid.local',$identity('wvh:staff:70','teacher',null,null,true),['wvh:staff:70'],['wvh:staff:70']);
    $admin=$change('users',['role_id'=>1]);
    $check('admin-moderator-list-alone-is-insufficient',$admin,'teacher@invalid.local',null,['wvh:staff:70']);
    $check('another-allowlisted-admin-does-not-authorize-this-account',$admin,'teacher@invalid.local',null,['wvh:staff:71'],['wvh:staff:71']);
    $check('exception-needs-a-current-admin-or-teacher-role',$change('users',['role_id'=>4]),'teacher@invalid.local',null,['wvh:staff:70'],['wvh:staff:70']);
    $inactive=$admin;$inactive['users']['rows'][0]['is_active']=0;$check('exception-does-not-revive-inactive-staff',$inactive,'teacher@invalid.local',null,['wvh:staff:70'],['wvh:staff:70']);
    foreach (['1','false',null] as $index=>$lock){$locked=$admin;$locked['settings']['rows'][0]['value']=$lock;$check('admin-exception-respects-emergency-lock-'.$index,$locked,'teacher@invalid.local',null,['wvh:staff:70'],['wvh:staff:70']);}
    $missing=$admin;$missing['settings']['rows']=[];$check('missing-lock-setting-matches-portal-inactive-default',$missing,'teacher@invalid.local',$identity('wvh:staff:70','teacher',null,null,true),['wvh:staff:70'],['wvh:staff:70']);
    $check('missing-lock-setting-does-not-grant-other-admins',$missing,'teacher@invalid.local',null);
    $duplicate=$admin;$duplicate['settings']['rows'][]=$duplicate['settings']['rows'][0];$check('admin-exception-rejects-ambiguous-lock-setting',$duplicate,'teacher@invalid.local',null,['wvh:staff:70'],['wvh:staff:70']);
    $duplicate=$admin;$duplicate['users']['rows'][]=array_replace($duplicate['users']['rows'][0],['id'=>71]);$check('admin-exception-does-not-guess-duplicate-email',$duplicate,'teacher@invalid.local',null,['wvh:staff:70'],['wvh:staff:70']);
    foreach ([[[],['wvh:staff:70']],[['wvh:staff:70','wvh:staff:71'],['wvh:staff:70','wvh:staff:71']]] as $index=>[$mods,$exceptions]){
        $rejected=false;try{new \CastleHomes\SchoolIdentity(new CastleHomesFixturePDO($database,$tables),$mods,'2026-11-10',$exceptions);}catch(\InvalidArgumentException){$rejected=true;}
        if(!$rejected)throw new RuntimeException('Invalid administrator exception accepted');$checks[]='invalid-admin-exception-configuration-'.$index;
    }
    $source = new \CastleHomes\SchoolIdentity(new CastleHomesFixturePDO($database,$tables),[],'2026-11-10');
    foreach (['wvh:student:0','wvh:staff:070','wvh:family:11?role=teacher','wvh:teacher:70'] as $subject) {
        if ($source->lookup($subject)!==null) throw new RuntimeException('Invalid subject accepted');
    }
    if (\CastleHomes\SchoolIdentity::age('2012-02-29','2026-02-28')!==13 || \CastleHomes\SchoolIdentity::age('2012-02-29','2026-03-01')!==14) throw new RuntimeException('Leap day boundary');
    return ['passed'=>count($checks)+2,'realStudentRowsRead'=>false,'schoolWrites'=>false,'canonicalOwnershipPreserved'=>true];
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    echo json_encode(castleHomesIdentityFixtures(new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION])),JSON_THROW_ON_ERROR)."\n";
}
