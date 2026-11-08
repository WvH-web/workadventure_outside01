<?php
declare(strict_types=1);
if ($argc !== 3) { throw new RuntimeException('Expected before and candidate source'); }
function php_signature(string $file): string {
    $parts = [];
    foreach (token_get_all((string)file_get_contents($file)) as $token) {
        if (is_array($token)) {
            if ($token[0] === T_INLINE_HTML) { continue; }
            $parts[] = [$token[0], $token[1]];
        } else { $parts[] = $token; }
    }
    return hash('sha256', serialize($parts));
}
$before = php_signature($argv[1]);
$after = php_signature($argv[2]);
if (!hash_equals($before, $after)) { throw new RuntimeException('PHP logic changed; refusing UI deployment'); }
echo json_encode(['php_logic_unchanged' => true, 'php_token_hash' => $before], JSON_THROW_ON_ERROR), PHP_EOL;
