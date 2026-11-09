"""Complete distinct routing-manifest rollback copies after the initial isolated install."""
import hashlib
import json
import os
from pathlib import Path

os.umask(0o077)
base=Path('/opt/wvh-castle-chess/private');record=json.loads((base/'deployment.json').read_text())
assert record['release']=='/opt/wvh-castle-chess/releases/b15d76ad9a28ec63'
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
assert hashlib.sha256(nginx.read_bytes()).hexdigest()==record['nginx_after_sha256']
source=base/'before-deployment.json';school=json.loads(source.read_text())
assert school['release']=='/opt/wvh-castle-school/releases/c7b216e24e8b23ec' and school['nginx_after_sha256']==record['nginx_before_sha256']
gallery_path=Path('/opt/wvh-castle-content/private/deployment.json');gallery=json.loads(gallery_path.read_text())
assert gallery['nginx_sha256']==record['nginx_after_sha256']
previous_gallery={**gallery,'nginx_sha256':record['nginx_before_sha256']}
for target,raw in [(base/'before-castle-school-deployment.json',source.read_bytes()),(base/'before-castle-content-deployment.json',(json.dumps(previous_gallery,indent=2)+'\n').encode())]:
    assert not target.is_symlink()
    if target.exists():assert target.read_bytes()==raw
    else:
        with target.open('xb') as file:file.write(raw)
        target.chmod(0o600)
print(json.dumps({'distinctManifestRollbackCopiesPresent':True,'galleryPreviousNginxFieldReconstructed':True,'liveFilesUnchanged':True}))
