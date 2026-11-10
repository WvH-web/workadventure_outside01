<?php
declare(strict_types=1);
namespace CastleHomes;

use PDO;

/** Private server-to-server protocol. No browser roles, school ids or session cookies are accepted. */
final class ContextProtocol
{
    public function __construct(private string $key, private PDO $nonces)
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $key)) throw new \InvalidArgumentException('Invalid context key');
        $nonces->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $nonces->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS nonces(nonce TEXT PRIMARY KEY,created INTEGER NOT NULL)');
    }

    public static function validateRequest(string $key, string $raw, array $headers, int $nowMs): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $key)) throw new \InvalidArgumentException('Invalid context key');
        $timestamp = $headers['timestamp'] ?? ''; $nonce = $headers['nonce'] ?? ''; $signature = $headers['signature'] ?? '';
        $now = intdiv($nowMs, 1000);
        if (strlen($raw) > 2048 || !is_string($timestamp) || !preg_match('/^[1-9][0-9]{9,11}$/D', $timestamp) || abs($now - (int)$timestamp) > 30 ||
            !is_string($nonce) || !preg_match('/^[a-f0-9]{40}$/D', $nonce) || !is_string($signature) || !preg_match('/^[a-f0-9]{64}$/D', $signature) ||
            !hash_equals(hash_hmac('sha256', $timestamp."\n".$nonce."\n".$raw, $key), $signature)) throw new \DomainException('Invalid signed request');
        $input = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        if (!is_array($input) || array_keys($input) !== ['identifier'] || !is_string($input['identifier']) || strlen($input['identifier']) > 254 ||
            !filter_var($input['identifier'], FILTER_VALIDATE_EMAIL)) throw new \DomainException('Invalid context request');
        return $input;
    }

    public function handle(string $raw, array $headers, int $nowMs, callable $resolve): array
    {
        $input = self::validateRequest($this->key, $raw, $headers, $nowMs);
        $nonce = $headers['nonce']; $now = intdiv($nowMs, 1000);
        $this->nonces->exec('BEGIN IMMEDIATE');
        try {
            $this->nonces->prepare('DELETE FROM nonces WHERE created<?')->execute([$now - 60]);
            if ((int)$this->nonces->query('SELECT COUNT(*) FROM nonces')->fetchColumn() >= 4096) throw new \RuntimeException('Context request budget exhausted');
            $query = $this->nonces->prepare('INSERT OR IGNORE INTO nonces VALUES(?,?)'); $query->execute([$nonce, $now]);
            if ($query->rowCount() !== 1) throw new \DomainException('Repeated signed request');
            $this->nonces->exec('COMMIT');
        } catch (\Throwable $error) { $this->nonces->exec('ROLLBACK'); throw $error; }
        $identity = $resolve($input['identifier']);
        $body = json_encode(['version' => 1, 'checkedAt' => $nowMs, 'identity' => $identity], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        return ['body' => $body, 'signature' => hash_hmac('sha256', $nonce."\n".$body, $this->key)];
    }
}
