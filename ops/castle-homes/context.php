<?php
declare(strict_types=1);

require_once __DIR__.'/SchoolIdentity.php';
require_once __DIR__.'/ContextProtocol.php';

function castleHomesContextEndpoint(string $configPath): void
{
    ini_set('display_errors', '0');
    header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY'); header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    try {
        if ($_GET || ($_SERVER['QUERY_STRING'] ?? '') !== '') { http_response_code(404); throw new DomainException(); }
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); throw new DomainException(); }
        if (!preg_match('/^application\/json(?:;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) { http_response_code(415); throw new DomainException(); }
        $config = json_decode((string)file_get_contents($configPath), true, 16, JSON_THROW_ON_ERROR);
        if (($config['version'] ?? null) !== 1 || !is_array($config['moderators'] ?? null)) throw new RuntimeException();
        $headers = [];
        foreach (['timestamp', 'nonce', 'signature'] as $name) $headers[$name] = $_SERVER['HTTP_X_CASTLE_HOMES_'.strtoupper($name)] ?? '';
        $raw = file_get_contents('php://input', false, null, 0, 2049);
        if ($raw === false || strlen($raw) > 2048) { http_response_code(413); throw new DomainException(); }
        $now = (int)floor(microtime(true) * 1000);
        \CastleHomes\ContextProtocol::validateRequest($config['key'], $raw, $headers, $now);
        $protocol = new \CastleHomes\ContextProtocol($config['key'], new PDO('sqlite:'.$config['nonces']));
        $result = $protocol->handle($raw, $headers, $now, static function(string $identifier) use ($config): ?array {
            $db = new PDO($config['db']['dsn'], $config['db']['user'], $config['db']['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
            $db->exec('SET TRANSACTION READ ONLY'); $db->beginTransaction();
            try { $identity = (new \CastleHomes\SchoolIdentity($db, $config['moderators']))->resolve($identifier); $db->commit(); return $identity; }
            catch (Throwable $error) { $db->rollBack(); throw $error; }
        });
        header('X-Castle-Homes-Signature: '.$result['signature']); echo $result['body'];
    } catch (DomainException | JsonException) {
        if (http_response_code() < 400) http_response_code(401);
        echo '{"error":"invalid_request"}';
    } catch (Throwable) { http_response_code(503); echo '{"error":"unavailable"}'; }
}
