"""Lint and exercise isolated PHP/MySQL fixtures without writing real school rows."""
import glob
import json
from pathlib import Path
import re
import subprocess
import tempfile
import os
import pwd
import zipfile

allowed={
 'src/WorkAdventure/CastleOfferRepository.php','tests/workadventure_castle_offers.php',
 'config/sql/PATCH_workadventure_castle_offers_v1.sql','admin/workadventure_castle.php',
 'admin/workadventure_museum.php','api/workadventure_museum_open.php','api/workadventure_castle_offers.php',
 'tests/workadventure_castle_render.php',
}
php=next(iter(glob.glob('/opt/plesk/php/8.1/bin/php')),sorted(glob.glob('/opt/plesk/php/*/bin/php'))[-1])
with tempfile.TemporaryDirectory(prefix='wvh-castle-offer-fixtures-') as directory:
    root=Path(directory)
    with zipfile.ZipFile('/tmp/wvh-castle-offers-test.zip') as archive:
        assert set(archive.namelist())==allowed and len(archive.infolist())==len(allowed)
        assert sum(info.file_size for info in archive.infolist())<400000
        for name in allowed:
            target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(name))
    for name in allowed:
        if not name.endswith('.php'):continue
        lint=subprocess.run([php,'-l',str(root/name)],capture_output=True,text=True)
        if lint.returncode:raise RuntimeError('PHP syntax check failed: '+name)
    code=r'''
    $text=file_get_contents('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php');$values=[];
    foreach(['dsn','dbUser','dbPass'] as $key){
      if(!preg_match('/\\$'.preg_quote($key,'/').'\\s*=\\s*([\'\"])(.*?)\\1/s',$text,$m))throw new RuntimeException('Configuration not recognized');
      $values[$key]=$m[2];
    }
    $pdo=new PDO($values['dsn'],$values['dbUser'],$values['dbPass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    require $argv[1];$results=castleOfferFixtures($pdo,true);
    require $argv[2];$views=castleOfferRenderFixtures($pdo);
    foreach($views as $id=>$html)file_put_contents(dirname($argv[1]).'/'.$id.'.html',$html);
    echo json_encode($results+['renderedViews'=>count($views),'csrfAndRoleFixtures'=>true],JSON_THROW_ON_ERROR);
    '''
    result=subprocess.run([php,'-r',code,str(root/'tests/workadventure_castle_offers.php'),str(root/'tests/workadventure_castle_render.php')],capture_output=True,text=True)
    if result.returncode:
        message=re.search(r'Fixture failed: [a-z0-9-]+',result.stderr)
        raise RuntimeError(message.group(0) if message else 'Isolated PHP fixture run failed; configuration is not printed')
    destination=Path('/tmp/wvh-castle-offer-render.zip')
    assert not destination.is_symlink()
    account=pwd.getpwnam('wilhelm')
    if destination.exists():
        assert destination.stat().st_uid==account.pw_uid and destination.stat().st_mode&0o777==0o600
        with zipfile.ZipFile(destination) as previous:assert set(previous.namelist())=={'normal.html','csrf.html','empty.html'}
    fd,temporary=tempfile.mkstemp(dir='/tmp',prefix='.wvh-castle-offer-render-');os.close(fd)
    try:
        with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as archive:
            for name in ['normal','csrf','empty']:archive.write(root/'tests'/f'{name}.html',f'{name}.html')
        os.chown(temporary,account.pw_uid,account.pw_gid);os.chmod(temporary,0o600);os.replace(temporary,destination)
    finally:
        if os.path.exists(temporary):os.unlink(temporary)
    print(json.dumps({'php':php,'syntaxFilesPassed':7,**json.loads(result.stdout)},indent=2))
