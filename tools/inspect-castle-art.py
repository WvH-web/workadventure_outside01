"""Read-only checks for the separately hosted school art service; no private values are printed."""
import hashlib
import json
from pathlib import Path
import subprocess

def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
digest=hashlib.sha256(nginx.read_bytes()).hexdigest()
manifests=[('/opt/wvh-castle-content/private/deployment.json','nginx_sha256'),('/opt/wvh-castle-school/private/deployment.json','nginx_after_sha256'),('/opt/wvh-castle-chess/private/deployment.json','nginx_after_sha256')]
print(json.dumps({'nginxSha256':digest,'manifestsMatch':all(json.loads(Path(file).read_text())[field]==digest for file,field in manifests),
 'newPrefixPresent':b'/castle-art/' in nginx.read_bytes(),'newBaseExists':Path('/opt/wvh-castle-art').exists(),
 'portsInUse':{str(port):bool(run('ss','-ltnH','sport = :'+str(port)).strip()) for port in [3231,3232]},
 'existingRuntimeNode':run('docker','exec','workadventure-play-1','node','--version').strip(),
 'chessHealthy':inspect('wvh-castle-chess')['State'].get('Health',{}).get('Status')=='healthy',
 'schoolHealthy':inspect('wvh-castle-school')['State'].get('Health',{}).get('Status')=='healthy',
 'stagingPrivateFiles':[path.name for path in Path('/opt/wvh-castle-art/private').glob('*')],
 'stagingDataFiles':[{ 'name':path.name,'bytes':path.stat().st_size} for path in Path('/opt/wvh-castle-art/data').glob('*')],
 'linuxTestsTail':Path('/opt/wvh-castle-art/private/upstream-linux-tests.log').read_text()[-650:] if Path('/opt/wvh-castle-art/private/upstream-linux-tests.log').exists() else None},indent=2))
