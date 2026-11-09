<?php
declare(strict_types=1);

const CASTLE_STAFF_SQL = 'SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 AND role_id IN (1, 3) LIMIT 1';
const CASTLE_PARENT_SQL = 'SELECT 1 FROM guardians WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1';
const CASTLE_STUDENT_SQL = 'SELECT id, birthdate FROM students WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 2';
const CASTLE_YEAR_SQL = 'SELECT id FROM school_years WHERE is_active = 1 AND starts_on <= ? AND ends_on >= ? LIMIT 2';
const CASTLE_ENROLLMENT_SQL = 'SELECT DISTINCT c.id AS class_id, c.grade_level FROM student_enrollments se JOIN classes c ON c.id = se.class_id AND c.is_active = 1 WHERE se.student_id = ? AND se.school_year_id = ? AND se.enrolled_on <= ? AND (se.left_on IS NULL OR se.left_on >= ?) LIMIT 2';

function castleSchoolBlank(string $kind, int $checkedAt): array
{
    return ['version' => 1, 'kind' => $kind, 'eligible' => false, 'age' => null,
        'gradeLevel' => null, 'classId' => null, 'checkedAt' => $checkedAt];
}

function castleSchoolAge(?string $birthdate, DateTimeImmutable $today): ?int
{
    if ($birthdate === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $birthdate)) return null;
    $birth = DateTimeImmutable::createFromFormat('!Y-m-d', $birthdate, $today->getTimezone());
    if (!$birth || $birth->format('Y-m-d') !== $birthdate || $birth > $today) return null;
    $age = $birth->diff($today)->y;
    return $age <= 120 ? $age : null;
}

function castleSchoolProfile(PDO $db, string $identifier, DateTimeImmutable $today, int $checkedAt): array
{
    $out = castleSchoolBlank('unknown', $checkedAt);
    if (strlen($identifier) > 254 || !filter_var($identifier, FILTER_VALIDATE_EMAIL)) return $out;
    $today = $today->setTime(0, 0);
    $find = static function (string $sql, array $args) use ($db): array {
        $stmt = $db->prepare($sql); $stmt->execute($args);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    };
    // Preserve the established primary staff-role rule; outfits and JWT tags grant nothing here.
    if ($find(CASTLE_STAFF_SQL, [$identifier])) {
        $out['kind'] = 'staff'; $out['eligible'] = true; return $out;
    }
    $parent = (bool)$find(CASTLE_PARENT_SQL, [$identifier]);
    $students = $find(CASTLE_STUDENT_SQL, [$identifier]);
    if (count($students) > 1 || ($parent && $students)) return castleSchoolBlank('ambiguous', $checkedAt);
    if (!$students) {
        if ($parent) { $out['kind'] = 'parent'; $out['eligible'] = true; }
        return $out;
    }
    $out['kind'] = 'student';
    $day = $today->format('Y-m-d');
    $years = $find(CASTLE_YEAR_SQL, [$day, $day]);
    if (count($years) !== 1) return $out;
    $classes = $find(CASTLE_ENROLLMENT_SQL, [$students[0]['id'], $years[0]['id'], $day, $day]);
    if (count($classes) > 1) return castleSchoolBlank('ambiguous', $checkedAt);
    if (!$classes) return $out;
    $class = $classes[0];
    $out['eligible'] = true;
    $out['classId'] = (int)$class['class_id'];
    $grade = filter_var($class['grade_level'], FILTER_VALIDATE_INT);
    $out['gradeLevel'] = $grade !== false && $grade >= 1 && $grade <= 13 ? $grade : null;
    $out['age'] = castleSchoolAge($students[0]['birthdate'], $today);
    return $out;
}

function castleSchoolEndpoint(string $configPath): void
{
    ini_set('display_errors', '0');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY'); header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    $send = static function (int $status, array $body): void {
        http_response_code($status); echo json_encode($body, JSON_THROW_ON_ERROR);
    };
    try {
        if ($_GET || ($_SERVER['QUERY_STRING'] ?? '') !== '') { $send(404, ['error' => 'not_found']); return; }
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { $send(405, ['error' => 'method_not_allowed']); return; }
        $config = json_decode((string)file_get_contents($configPath), true, 16, JSON_THROW_ON_ERROR);
        $key = $_SERVER['HTTP_X_CASTLE_SCHOOL_KEY'] ?? '';
        if (!is_string($key) || !preg_match('/^[a-f0-9]{64}$/D', $key) || !hash_equals($config['key'], $key)) {
            $send(401, ['error' => 'unauthorized']); return;
        }
        if (!preg_match('/^application\/json(?:;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) {
            $send(415, ['error' => 'invalid_request']); return;
        }
        $raw = file_get_contents('php://input', false, null, 0, 2049);
        if ($raw === false || strlen($raw) > 2048) { $send(413, ['error' => 'invalid_request']); return; }
        try { $body = json_decode($raw, true, 8, JSON_THROW_ON_ERROR); }
        catch (JsonException) { $send(400, ['error' => 'invalid_request']); return; }
        if (!is_array($body) || array_keys($body) !== ['identifier'] || !is_string($body['identifier']) ||
            strlen($body['identifier']) > 254 || !filter_var($body['identifier'], FILTER_VALIDATE_EMAIL)) {
            $send(400, ['error' => 'invalid_request']); return;
        }
        $db = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['password'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
        $now = new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin'));
        $db->beginTransaction();
        $profile = castleSchoolProfile($db, $body['identifier'], $now, (int)floor(microtime(true) * 1000));
        $db->commit();
        $send(200, $profile);
    } catch (Throwable) { $send(503, ['error' => 'unavailable']); }
}
