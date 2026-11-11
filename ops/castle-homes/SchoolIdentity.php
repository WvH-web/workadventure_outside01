<?php
declare(strict_types=1);
namespace CastleHomes;

use DateTimeImmutable;
use DateTimeZone;
use PDO;

/** Canonical Sternenhueter ownership identities, read from current school records only. */
final class SchoolIdentity
{
    public function __construct(private PDO $db, private array $moderators = [], private ?string $date = null, private array $administratorModerators = [])
    {
        foreach ($moderators as $subject) {
            if (!is_string($subject) || !preg_match('/^wvh:staff:[1-9][0-9]{0,15}$/D', $subject)) throw new \InvalidArgumentException('Invalid moderator configuration');
        }
        if (count($administratorModerators) > 1) throw new \InvalidArgumentException('Only one explicitly approved administrator exception is supported');
        foreach ($administratorModerators as $subject) {
            if (!is_string($subject) || !in_array($subject, $moderators, true)) throw new \InvalidArgumentException('Administrator exception must also be an explicit moderator');
        }
        if ($date !== null && !self::validDate($date)) throw new \InvalidArgumentException('Invalid school date');
    }

    private static function validDate(string $value): bool
    {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('Europe/Berlin'));
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function today(): string
    {
        return $this->date ?? (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('Y-m-d');
    }

    public static function age(?string $birthdate, string $today): ?int
    {
        if (!$birthdate || !self::validDate($birthdate) || !self::validDate($today) || $birthdate > $today) return null;
        $zone = new DateTimeZone('Europe/Berlin');
        $age = (new DateTimeImmutable($birthdate, $zone))->diff(new DateTimeImmutable($today, $zone))->y;
        return $age <= 120 ? $age : null;
    }

    private function rows(string $sql, array $args): array
    {
        $query = $this->db->prepare($sql); $query->execute($args);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function resolve(string $identifier): ?array
    {
        if (strlen($identifier) > 254 || !filter_var($identifier, FILTER_VALIDATE_EMAIL)) return null;
        $candidates = [];
        foreach ([['staff', 'users', 'email'], ['student', 'students', 'email'], ['family', 'families', 'portal_email']] as [$kind, $table, $column]) {
            foreach ($this->rows("SELECT id FROM $table WHERE LOWER($column)=LOWER(?) AND is_active=1 LIMIT 2", [$identifier]) as $row) {
                $candidates[] = 'wvh:'.$kind.':'.$row['id'];
            }
        }
        // Never guess between an adult account, a child or a duplicate email.
        return count($candidates) === 1 ? $this->lookup($candidates[0]) : null;
    }

    public function lookup(string $subject): ?array
    {
        if (!preg_match('/^wvh:(student|family|staff):([1-9][0-9]{0,15})$/D', $subject, $match)) return null;
        $id = (int)$match[2];
        if ($match[1] === 'student') {
            $student = $this->student($id);
            return $student ? $this->result($subject, 'student', $student['grade'], self::age($student['birthdate'], $this->today())) : null;
        }
        if ($match[1] === 'family') {
            if (!$this->rows("SELECT id FROM families WHERE id=? AND is_active=1 AND portal_login_enabled=1 AND TRIM(COALESCE(portal_email,''))<>''", [$id])) return null;
            foreach ($this->rows('SELECT id FROM students WHERE family_id=? AND is_active=1', [$id]) as $child) {
                if ($this->student((int)$child['id'])) return $this->result($subject, 'parent');
            }
            return null;
        }
        $staff = $this->rows('SELECT id,role_id FROM users WHERE id=? AND is_active=1', [$id]);
        if (count($staff) !== 1) return null;
        $roles = [(int)$staff[0]['role_id']];
        foreach ($this->rows('SELECT role_id FROM user_role_memberships WHERE user_id=?', [$id]) as $row) $roles[] = (int)$row['role_id'];
        $administratorException = in_array($subject, $this->administratorModerators, true) && (bool)array_intersect($roles, [1, 2]);
        if (!in_array(3, $roles, true) && !$administratorException) return null;
        if (array_intersect($roles, [1, 2])) {
            $lock = $this->rows("SELECT value FROM settings WHERE `key`='emergency_lock_active'", []);
            // Only the approved exception uses Auth's inactive default before the first saved setting.
            if (count($lock) > 1 || (!$lock && !$administratorException) || ($lock && (string)$lock[0]['value'] !== '0')) return null;
        }
        return $this->result($subject, 'teacher', null, null, in_array($subject, $this->moderators, true));
    }

    private function student(int $id): ?array
    {
        $day = $this->today();
        $years = $this->rows('SELECT id FROM school_years WHERE is_active=1 AND starts_on<=? AND ends_on>=? LIMIT 2', [$day, $day]);
        if (count($years) !== 1) return null;
        $rows = $this->rows("SELECT DISTINCT s.birthdate,se.teaching_model,se.ai_learning_level,se.class_id,c.grade_level,c.is_active AS class_active
            FROM students s JOIN student_enrollments se ON se.student_id=s.id
            LEFT JOIN classes c ON c.id=se.class_id
            WHERE s.id=? AND s.is_active=1 AND se.school_year_id=?
              AND s.enrollment_status IN ('active','pending_setup','pending_teams')
              AND (s.contract_end_date IS NULL OR CAST(s.contract_end_date AS CHAR)='0000-00-00' OR s.contract_end_date>=?)
              AND se.enrolled_on<=? AND (se.left_on IS NULL OR se.left_on>=?)
              AND NOT EXISTS (
                SELECT 1 FROM student_enrollments exited WHERE exited.student_id=s.id AND exited.left_on<?
                  AND exited.left_on=(SELECT MAX(last_exit.left_on) FROM student_enrollments last_exit WHERE last_exit.student_id=s.id)
                  AND NOT EXISTS (SELECT 1 FROM student_enrollments continuing WHERE continuing.student_id=s.id
                    AND continuing.enrolled_on<=? AND (continuing.left_on IS NULL OR continuing.left_on>=?)
                    AND (continuing.enrolled_on>exited.left_on OR continuing.id>exited.id))) LIMIT 17",
            [$id, $years[0]['id'], $day, $day, $day, $day, $day, $day]);
        if (!$rows || count($rows) >= 17) return null;
        $ai = array_values(array_filter($rows, static fn(array $row): bool => $row['teaching_model'] === 'ai'));
        if ($ai) $rows = $ai;
        $choices = [];
        foreach ($rows as $row) {
            $isAi = $row['teaching_model'] === 'ai';
            $grade = filter_var($isAi ? $row['ai_learning_level'] : $row['grade_level'], FILTER_VALIDATE_INT);
            if ($grade === false || $grade < 1 || $grade > 13 || (!$isAi && (int)$row['class_active'] !== 1)) return null;
            $choices[($isAi ? 'ai' : (string)$row['class_id']).':'.$grade] = ['grade' => $grade, 'birthdate' => $row['birthdate']];
        }
        return count($choices) === 1 ? array_values($choices)[0] : null;
    }

    private function result(string $subject, string $role, ?int $grade = null, ?int $age = null, bool $moderator = false): array
    {
        return ['sub' => $subject, 'role' => $role, 'grade' => $grade, 'age' => $age, 'moderator' => $moderator, 'read_only' => false];
    }
}
