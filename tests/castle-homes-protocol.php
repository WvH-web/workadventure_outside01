<?php
declare(strict_types=1);
require_once __DIR__.'/../ops/castle-homes/ContextProtocol.php';

function castleHomesProtocolFixtures(): array
{
    $key=str_repeat('a',64);$now=1794348000000;$calls=0;$checks=0;
    $db=new PDO('sqlite::memory:');$protocol=new \CastleHomes\ContextProtocol($key,$db);
    $identity=['sub'=>'wvh:student:7','role'=>'student','grade'=>3,'age'=>9,'moderator'=>false,'read_only'=>false];
    $resolve=static function(string $identifier) use (&$calls,$identity): ?array {$calls++;return $identifier==='pupil@invalid.local'?$identity:null;};
    $request=static function(string $raw,?int $time=null,?string $nonce=null) use ($key,$now): array {
        $timestamp=(string)intdiv($time??$now,1000);$nonce??=bin2hex(random_bytes(20));
        return ['timestamp'=>$timestamp,'nonce'=>$nonce,'signature'=>hash_hmac('sha256',$timestamp."\n".$nonce."\n".$raw,$key)];
    };
    $check=static function(bool $value) use (&$checks): void {if(!$value)throw new RuntimeException('Protocol fixture failed');$checks++;};
    $raw='{"identifier":"pupil@invalid.local"}';$headers=$request($raw);$reply=$protocol->handle($raw,$headers,$now,$resolve);
    $check(json_decode($reply['body'],true,8,JSON_THROW_ON_ERROR)===['version'=>1,'checkedAt'=>$now,'identity'=>$identity]);
    $check(hash_equals(hash_hmac('sha256',$headers['nonce']."\n".$reply['body'],$key),$reply['signature']));
    $check($calls===1);
    $reject=static function(string $body,array $signed,int $time) use ($protocol,$resolve,&$calls,$check): void {
        $before=$calls;$denied=false;try{$protocol->handle($body,$signed,$time,$resolve);}catch(DomainException|JsonException){$denied=true;}
        $check($denied&&$calls===$before);
    };
    $reject($raw,$headers,$now);
    $reject($raw,array_replace($request($raw),['signature'=>str_repeat('0',64)]),$now);
    $reject($raw,$request($raw,$now-31000),$now);$reject($raw,$request($raw,$now+31000),$now);
    $reject($raw,array_replace($request($raw),['nonce'=>str_repeat('A',40)]),$now);
    $reject($raw,array_replace($request($raw),['timestamp'=>'1e9']),$now);
    foreach (['{','[]','{"identifier":7}','{"identifier":"opaque"}','{"identifier":"pupil@invalid.local","role":"teacher"}','{"identifier":"pupil@invalid.local","age":99}',str_repeat('x',2049)] as $bad) $reject($bad,$request($bad),$now);
    $unknown='{"identifier":"unknown@invalid.local"}';$result=$protocol->handle($unknown,$request($unknown),$now,$resolve);
    $check(json_decode($result['body'],true)['identity']===null);
    $staleNonce=$request($raw,$now-30000);$protocol->handle($raw,$staleNonce,$now,$resolve);$check($calls===3);
    $later=$now+61000;$protocol->handle($raw,$request($raw,$later),$later,$resolve);
    $check((int)$db->query('SELECT COUNT(*) FROM nonces')->fetchColumn()===1);
    $db->exec('DELETE FROM nonces; BEGIN IMMEDIATE');$insert=$db->prepare('INSERT INTO nonces VALUES(?,?)');
    for($i=0;$i<4096;$i++)$insert->execute([str_pad((string)$i,40,'0',STR_PAD_LEFT),intdiv($now,1000)]);
    $db->exec('COMMIT');$before=$calls;$limited=false;
    try{$protocol->handle($raw,$request($raw),$now,$resolve);}catch(RuntimeException){$limited=true;}
    $check($limited&&$calls===$before);$check((int)$db->query('SELECT COUNT(*) FROM nonces')->fetchColumn()===4096);
    return ['passed'=>$checks,'schoolResolverNeverCalledForInvalidRequests'=>true,'nonceBudget'=>4096,'schoolWrites'=>false];
}

if (in_array($argv[1]??'',['--reply','--nonce'],true)) {
    $input=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR);
    $protocol=new \CastleHomes\ContextProtocol(str_repeat('a',64),new PDO('sqlite:'.(($argv[1]??'')==='--nonce'?$argv[2]:':memory:')));
    try {
        echo json_encode($protocol->handle($input['raw'],$input['headers'],$input['now'],static fn(string $identifier): array =>
            ['sub'=>'wvh:student:7','role'=>'student','grade'=>3,'age'=>9,'moderator'=>false,'read_only'=>false]),JSON_THROW_ON_ERROR)."\n";
    } catch (DomainException $error) {
        if (($argv[1]??'')!=='--nonce') throw $error;
        echo '{"rejected":true}'."\n";
    }
} elseif (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) echo json_encode(castleHomesProtocolFixtures(),JSON_THROW_ON_ERROR)."\n";
