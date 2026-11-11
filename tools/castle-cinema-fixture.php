<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli' || getenv('CASTLE_CINEMA_FIXTURE') !== '1') {
    throw new RuntimeException('Disposable CLI cinema fixture required');
}
$root = realpath((string)($argv[1] ?? ''));
$database = (string)getenv('DB_NAME');
if (!$root || !is_file($root . '/.castle-cinema-fixture.json')
    || getenv('DB_HOST') !== '127.0.0.1' || !preg_match('/^castle_kino_[a-f0-9]{16}$/D', $database)
    || !ctype_digit((string)getenv('DB_PORT')) || (int)getenv('DB_PORT') < 1024) {
    throw new RuntimeException('Fixture database boundary rejected');
}
$marker = json_decode((string)file_get_contents($root . '/.castle-cinema-fixture.json'), true, 16, JSON_THROW_ON_ERROR);
if (($marker['owner'] ?? '') !== 'wvh-castle-cinema-fixture' || ($marker['database'] ?? '') !== $database
    || ($marker['port'] ?? 0) !== (int)getenv('DB_PORT')) {
    throw new RuntimeException('Fixture identity mismatch');
}
$action = (string)($argv[2] ?? '');
if ($action === 'initialize') {
    $pdo = new PDO('mysql:host=127.0.0.1;port=' . getenv('DB_PORT'), (string)getenv('DB_USER'), (string)getenv('DB_PASS'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('CREATE DATABASE `' . $database . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `' . $database . '`');
    $pdo->exec((string)file_get_contents(__DIR__ . '/../tests/fixtures/castle-cinema.sql'));
} else {
    require $root . '/lib/override.php';
    $pdo = kino_app_pdo(require $root . '/config.php');
    if ($action === 'start' || $action === 'fsk12') {
        $statement = $pdo->prepare('REPLACE INTO kino_screenings(id,title,provider,video_ref,start_utc,end_utc,poster_url,fsk_age) VALUES(1,?,\'url\',?,?,?,?,?)');
        $statement->execute(['Getrennte Schlosskino-Probe', 'https://deutsche-online-schule.com/kino/public/sync-test-film.webm', time()-12, time()+450, '', $action === 'fsk12' ? 12 : 0]);
        kino_override_activate($pdo, 1, 12);
    } elseif ($action === 'pause') {
        if (!kino_override_pause($pdo)) { throw new RuntimeException('Fixture pause rejected'); }
    } elseif ($action === 'resume') {
        if (!kino_override_resume($pdo)) { throw new RuntimeException('Fixture resume rejected'); }
    } elseif ($action === 'end') {
        kino_override_clear($pdo);
        $pdo->exec('UPDATE kino_screenings SET end_utc=' . (time()-1) . ' WHERE id=1');
    } elseif ($action !== 'status') {
        throw new RuntimeException('Unknown fixture control');
    }
}
echo json_encode(['ok' => true, 'action' => $action, 'syntheticDatabaseOnly' => true], JSON_THROW_ON_ERROR) . "\n";
