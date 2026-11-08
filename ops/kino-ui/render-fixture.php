<?php
declare(strict_types=1);
set_error_handler(static function (int $severity, string $message, string $file, int $line): never {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
$source = (string)file_get_contents($argv[1]);
$mode = $argv[2] ?? 'idle';
$start = strpos(strtolower($source), '<!doctype html>');
if ($start === false) { throw new RuntimeException('Public template not found'); }
$template = substr($source, $start);
$allowed = ['kino_render_chat_panel', 'kino_render_age_gate_panel', 'kino_render_webcam_panel', 'kino_fmt', 'kino_fmt_day_time'];
$tokens = token_get_all($source);
foreach ($tokens as $index => $token) {
    if (!is_array($token) || $token[0] !== T_FUNCTION) { continue; }
    $next = $index + 1;
    while (isset($tokens[$next]) && is_array($tokens[$next]) && $tokens[$next][0] === T_WHITESPACE) { $next++; }
    if (!is_array($tokens[$next] ?? null) || !in_array($tokens[$next][1], $allowed, true)) { continue; }
    $body = ''; $depth = 0; $opened = false;
    for ($i = $index; $i < count($tokens); $i++) {
        $part = $tokens[$i];
        $body .= is_array($part) ? $part[1] : $part;
        if ($part === '{') { $depth++; $opened = true; }
        if ($part === '}') { $depth--; }
        if ($opened && $depth === 0) { break; }
    }
    eval($body);
}
define('KINO_TZ', 'Europe/Berlin');
foreach ($allowed as $name) { if (!function_exists($name)) { throw new RuntimeException('Missing presentation helper'); } }
$cfg = [];
$templateTokens = token_get_all('<?php ?>' . $template);
foreach ($templateTokens as $index => $token) {
    if (!is_array($token)) { continue; }
    if (in_array($token[0], [T_REQUIRE, T_REQUIRE_ONCE, T_INCLUDE, T_INCLUDE_ONCE], true)) { throw new RuntimeException('Template must not load application bootstrap'); }
    if ($token[0] === T_VARIABLE && $token[1] === '$cfg') {
        $i = $index + 1;
        while (isset($templateTokens[$i]) && is_array($templateTokens[$i]) && $templateTokens[$i][0] === T_WHITESPACE) { $i++; }
        if (($templateTokens[$i] ?? '') === '[' && is_array($templateTokens[$i + 1] ?? null) && $templateTokens[$i + 1][0] === T_CONSTANT_ENCAPSED_STRING) {
            $cfg[trim($templateTokens[$i + 1][1], "'\"")] = '';
        }
    }
    if ($token[0] === T_STRING && str_starts_with($token[1], 'kino_') && !in_array($token[1], $allowed, true)) {
        throw new RuntimeException('Unexpected application call in presentation template');
    }
}
$cfg['site_title'] = 'WvH Schlosskino';
$cfg['workadventure_iframe_api_url'] = '';
$cfg['waiting_room_webcams_title'] = 'Live-Webcams';
$now = 1794146400;
$next = ['title' => 'Nachts im Sternenturm', 'date_label' => 'Sonntag, 8. November', 'time_label' => '18:00 Uhr', 'provider' => 'Schulkino'];
$later = [['title' => 'Die fantastische Schulschlosserkundung mit einem sehr langen Filmtitel', 'date_label' => 'Mittwoch, 11. November', 'time_label' => '18:00 Uhr', 'provider' => 'Schulkino']];
$gate = ['required' => $mode === 'age', 'allowed' => $mode !== 'age', 'status' => 'auth_required', 'fsk_label' => 'FSK 12', 'viewer_name' => '', 'auth_window_open' => true];
$payload = ['mode' => in_array($mode, ['live', 'age', 'paused', 'ended', 'chat'], true) ? 'live' : ($mode === 'webcam' ? 'idle' : $mode),
    'title' => 'Nachts im Sternenturm', 'provider' => 'direct', 'video_ref' => '', 'offset_sec' => 0,
    'start_utc' => $now, 'end_utc' => $now + 5400, 'server_now_utc' => $now, 'sync_token' => 'synthetic-ui-fixture',
    'next_title' => $next['title'], 'next_start_utc' => $now + 900, 'next_poster_url' => '/poster.png',
    'fsk' => $gate, 'program' => ['next' => $next, 'later' => $later], 'upcoming' => $later,
    'override_active' => false, 'playback_paused' => $mode === 'paused'];
$chatSettings = ['allow_viewer_toggle' => true, 'max_length' => 280, 'enabled' => true];
$chatTitle = 'Publikumschat'; $chatHint = 'Gemeinsam im Schulkino';
$showChatPanel = true; $showWaitingWebcams = $mode === 'webcam';
$webcamItems = [['title' => 'Sternwarte am See', 'provider' => 'Lokale Testkamera', 'description' => 'Synthetischer Wartebereich ohne externen Kamerazugriff.', 'embed_url' => 'about:blank']];
$bgForCountdown = '/room.png'; $bgDay = '/room.png'; $bgNight = '/room.png'; $bgEvent = '/room.png'; $bgIdle = '/room.png';
$isNight = false;
eval('?>' . $template);
