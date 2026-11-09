"""Read-only preflight for a separate school chess service; never outputs private configuration."""
import hashlib
import json
from pathlib import Path
import subprocess

def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
digest=hashlib.sha256(nginx.read_bytes()).hexdigest()
gallery=json.loads(Path('/opt/wvh-castle-content/private/deployment.json').read_text())
school=json.loads(Path('/opt/wvh-castle-school/private/deployment.json').read_text())
base=Path('/opt/wvh-castle-chess')
old=inspect('wvh-castle-school')
env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
print(json.dumps({'nginxSha256':digest,'galleryManifestMatches':gallery['nginx_sha256']==digest,
 'schoolManifestMatches':school['nginx_after_sha256']==digest,'schoolRelease':Path(school['release']).name,
 'chessBaseExists':base.exists(),'chessContainers':run('docker','ps','-a','--filter','name=wvh-castle-chess','--format','{{.Names}}').split(),
 'port3221InUse':bool(run('ss','-ltnH','sport = :3221').strip()),'newRouteAlreadyPresent':b'/castle-chess/' in nginx.read_bytes(),
 'schoolHealthy':old['State'].get('Health',{}).get('Status')=='healthy','schoolUid':old['Config']['User'],
 'requiredPrivateKeysPresent':all(env.get(key) for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY']),
 'trustedProxyIps':env.get('CASTLE_SCHOOL_TRUSTED_PROXY_IPS',''),'nodeImageMatchesWorkAdventure':old['Image']==inspect('workadventure-play-1')['Image']},indent=2))
if base.exists():
    print(json.dumps({'releaseDirectoryModes':{str(path.relative_to(base)):oct(path.stat().st_mode&0o777) for path in (base/'releases').rglob('*') if path.is_dir() and path.stat().st_mode&0o777!=0o755},
      'liveDataFileCount':len(list((base/'data').iterdir())),'candidateDataFileCount':len(list((base/'candidate-data').iterdir()))},indent=2))
