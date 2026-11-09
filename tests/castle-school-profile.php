<?php
declare(strict_types=1);

if (!function_exists('castleSchoolProfile')) require_once __DIR__ . '/../ops/castle-school/profile.php';

// SELECT-only derived tables exercise the real PDO/MySQL query predicates without real pupils or DDL.
final class CastleSqlFixtures extends PDO
{
    public function __construct(private PDO $database, public array $tables) {}
    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        foreach ($this->tables as $table => $spec) {
            $parts = [];
            foreach ($spec['rows'] as $row) {
                $values = [];
                foreach ($spec['columns'] as $column) {
                    $value = $row[$column] ?? null;
                    $values[] = ($value === null ? 'NULL' : $this->database->quote((string)$value)) . ' AS `' . $column . '`';
                }
                $parts[] = 'SELECT ' . implode(', ', $values);
            }
            if (!$parts) $parts[] = 'SELECT ' . implode(', ', array_map(static fn($c) => 'NULL AS `' . $c . '`', $spec['columns'])) . ' WHERE 1=0';
            $derived = '(' . implode(' UNION ALL ', $parts) . ')';
            $query = preg_replace('/\b(FROM|JOIN) ' . preg_quote($table, '/') . '\b/', '$1 ' . $derived . ($table === 'student_enrollments' || $table === 'classes' ? '' : ' AS ' . $table), $query);
        }
        if (preg_match('/\b(?:FROM|JOIN)\s+(?:users|students|guardians|school_years|student_enrollments|classes)\b/i', $query)) throw new RuntimeException('Real tables must not be queried in fixtures');
        if (!str_starts_with($query, 'SELECT ')) throw new RuntimeException('Only SELECT fixtures permitted');
        return $this->database->prepare($query, $options);
    }
}

function castleProfileFixtures(PDO $database): array
{
    $email = 'fixture@invalid.local'; $now = 1794196800000;
    $today = new DateTimeImmutable('2026-11-09 00:00:00', new DateTimeZone('Europe/Berlin'));
    $tables = [
        'users' => ['columns' => ['email', 'is_active', 'role_id'], 'rows' => []],
        'guardians' => ['columns' => ['email', 'is_active'], 'rows' => []],
        'students' => ['columns' => ['id', 'email', 'is_active', 'birthdate'], 'rows' => [
            ['id' => 7, 'email' => $email, 'is_active' => 1, 'birthdate' => '2010-11-09']]],
        'school_years' => ['columns' => ['id', 'is_active', 'starts_on', 'ends_on'], 'rows' => [
            ['id' => 26, 'is_active' => 1, 'starts_on' => '2026-08-01', 'ends_on' => '2027-07-31']]],
        'student_enrollments' => ['columns' => ['student_id', 'class_id', 'school_year_id', 'enrolled_on', 'left_on'], 'rows' => [
            ['student_id' => 7, 'class_id' => 17, 'school_year_id' => 26, 'enrolled_on' => '2026-08-01', 'left_on' => null]]],
        'classes' => ['columns' => ['id', 'is_active', 'grade_level'], 'rows' => [
            ['id' => 17, 'is_active' => 1, 'grade_level' => 10]]],
    ];
    $results = [];
    $check = static function (string $name, array $set, string $kind, bool $eligible, ?int $age = null, ?int $grade = null, ?int $class = null) use ($database, $email, $now, $today, &$results): void {
        $profile = castleSchoolProfile(new CastleSqlFixtures($database, $set), $email, $today, $now);
        $expected = ['version' => 1, 'kind' => $kind, 'eligible' => $eligible, 'age' => $age, 'gradeLevel' => $grade, 'classId' => $class, 'checkedAt' => $now];
        if ($profile !== $expected) throw new RuntimeException('Fixture failed: ' . $name);
        $results[] = $name;
    };
    $change = static function (string $table, array $patch) use ($tables): array {
        $copy = $tables; $copy[$table]['rows'][0] = array_replace($copy[$table]['rows'][0] ?? [], $patch); return $copy;
    };
    $check('active-student-birthday', $tables, 'student', true, 16, 10, 17);
    $check('birthday-tomorrow', $change('students', ['birthdate' => '2010-11-10']), 'student', true, 15, 10, 17);
    $check('missing-birthday', $change('students', ['birthdate' => null]), 'student', true, null, 10, 17);
    $check('future-birthday', $change('students', ['birthdate' => '2027-11-09']), 'student', true, null, 10, 17);
    $check('inactive-student', $change('students', ['is_active' => 0]), 'unknown', false);
    $check('unrelated-email', $change('students', ['email' => 'other@invalid.local']), 'unknown', false);
    $check('case-insensitive-email', $change('students', ['email' => 'FIXTURE@invalid.local']), 'student', true, 16, 10, 17);
    foreach ([1, 3] as $staffRole) {
        $check('active-staff-' . $staffRole, $change('users', ['email' => $email, 'is_active' => 1, 'role_id' => $staffRole]), 'staff', true);
        $check('inactive-staff-' . $staffRole, $change('users', ['email' => $email, 'is_active' => 0, 'role_id' => $staffRole]), 'student', true, 16, 10, 17);
    }
    foreach ([2, 4, 99] as $otherRole) $check('non-staff-primary-role-' . $otherRole, $change('users', ['email' => $email, 'is_active' => 1, 'role_id' => $otherRole]), 'student', true, 16, 10, 17);
    $check('parent-student-email-conflict', $change('guardians', ['email' => $email, 'is_active' => 1]), 'ambiguous', false);
    $parent = $change('guardians', ['email' => $email, 'is_active' => 1]); $parent['students']['rows'] = [];
    $check('parent-no-child-substitution', $parent, 'parent', true);
    $parent['guardians']['rows'][0]['is_active'] = 0; $check('inactive-parent', $parent, 'unknown', false);
    $duplicate = $tables; $duplicate['students']['rows'][] = array_replace($tables['students']['rows'][0], ['id' => 8]);
    $check('duplicate-student-email', $duplicate, 'ambiguous', false);
    $check('no-current-year', $change('school_years', ['is_active' => 0]), 'student', false);
    $check('year-not-started', $change('school_years', ['starts_on' => '2026-11-10']), 'student', false);
    $check('year-ended', $change('school_years', ['ends_on' => '2026-11-08']), 'student', false);
    $check('year-start-inclusive', $change('school_years', ['starts_on' => '2026-11-09']), 'student', true, 16, 10, 17);
    $check('year-end-inclusive', $change('school_years', ['ends_on' => '2026-11-09']), 'student', true, 16, 10, 17);
    $duplicate = $tables; $duplicate['school_years']['rows'][] = array_replace($tables['school_years']['rows'][0], ['id' => 27]);
    $check('ambiguous-current-years', $duplicate, 'student', false);
    $check('enrollment-not-started', $change('student_enrollments', ['enrolled_on' => '2026-11-10']), 'student', false);
    $check('enrollment-start-inclusive', $change('student_enrollments', ['enrolled_on' => '2026-11-09']), 'student', true, 16, 10, 17);
    $check('enrollment-ended', $change('student_enrollments', ['left_on' => '2026-11-08']), 'student', false);
    $check('enrollment-end-inclusive', $change('student_enrollments', ['left_on' => '2026-11-09']), 'student', true, 16, 10, 17);
    $check('wrong-enrollment-year', $change('student_enrollments', ['school_year_id' => 25]), 'student', false);
    $check('wrong-enrollment-student', $change('student_enrollments', ['student_id' => 8]), 'student', false);
    $check('inactive-class', $change('classes', ['is_active' => 0]), 'student', false);
    $check('missing-grade', $change('classes', ['grade_level' => null]), 'student', true, 16, null, 17);
    $check('invalid-grade', $change('classes', ['grade_level' => 99]), 'student', true, 16, null, 17);
    $duplicate = $tables; $duplicate['student_enrollments']['rows'][] = $tables['student_enrollments']['rows'][0];
    $check('duplicate-same-class-is-not-another-class', $duplicate, 'student', true, 16, 10, 17);
    $duplicate['student_enrollments']['rows'][1]['class_id'] = 18;
    $duplicate['classes']['rows'][] = ['id' => 18, 'is_active' => 1, 'grade_level' => 11];
    $check('conflicting-current-classes', $duplicate, 'ambiguous', false);
    foreach (['2010-02-30', '0000-00-00', 'not-a-date', '1900-01-01'] as $invalid) {
        if (castleSchoolAge($invalid, $today) !== null) throw new RuntimeException('Invalid birthdate accepted');
    }
    $february = new DateTimeImmutable('2026-02-28', new DateTimeZone('Europe/Berlin'));
    if (castleSchoolAge('2012-02-29', $february) !== 13 || castleSchoolAge('2012-02-29', $february->modify('+1 day')) !== 14) throw new RuntimeException('Leap-day age boundary');
    $results[] = 'invalid-and-leap-day-dates';
    return ['passed' => count($results), 'cases' => $results, 'realStudentRowsRead' => false, 'databaseWrites' => false];
}
