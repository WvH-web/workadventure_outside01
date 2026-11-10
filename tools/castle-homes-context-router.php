<?php
declare(strict_types=1);
if (($_SERVER['REQUEST_URI'] ?? '') !== '/workadventure-castle-homes.php') {
    http_response_code(404); exit;
}
require __DIR__.'/../ops/castle-homes/context.php';
castleHomesContextEndpoint((string)getenv('CASTLE_HOMES_QA_CONTEXT_CONFIG'));
