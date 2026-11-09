"""Serve the reviewed public gallery on the WorkAdventure origin without weakening portal CSP."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import zipfile

os.umask(0o077)
base=Path('/opt/wvh-castle-content')
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
archive=Path('/tmp/wvh-castle-content.zip')
original_allowed={'collection.html','collection.css','collection.js','catalog.js','vendor/lucide.min.js','vendor/LICENSE'}
allowed=original_allowed|{'npc-sprite.html','npc-sprite.css','npc-sprite.js','characters-data.js','passive-image.js','display.html','display.css','display.js'}
reviewed_nginx='719fa6f23bc53151dcc93b09fc7d273c9991a989035c1e288c84e777a66fa292'
digest=lambda data:hashlib.sha256(data).hexdigest()
def inspect(name):
    return json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
names=['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']
before={name:inspect(name) for name in names}
assert base.resolve()==base and not nginx.is_symlink()
record=base/'private/deployment.json'
old_record=json.loads(record.read_text()) if record.exists() else None
if base.exists() and not old_record:
    raise RuntimeError('Unreviewed castle-content directory; refusing to modify it')
old_nginx=nginx.read_bytes()
expected=old_record['nginx_sha256'] if old_record else reviewed_nginx
if digest(old_nginx)!=expected:
    raise RuntimeError('Nginx routing changed since review; refusing to overwrite it')
if not old_record and b'/castle-content/' in old_nginx:
    raise RuntimeError('An unrelated castle-content route already exists')
payload={}
with zipfile.ZipFile(archive) as bundle:
    if set(bundle.namelist())!=allowed or len(bundle.infolist())!=len(allowed) or sum(i.file_size for i in bundle.infolist())>4000000:
        raise RuntimeError('Unexpected static gallery archive')
    payload={name:bundle.read(name) for name in allowed}
archive_hash=digest(archive.read_bytes())
current=base/'current'
if old_record:
    if not current.is_symlink() or str(current.resolve())!=old_record['release']:
        raise RuntimeError('Static gallery symlink changed since deployment')
    if any(digest((current/name).read_bytes())!=value for name,value in old_record['files'].items()):
        raise RuntimeError('A deployed gallery file has unreviewed changes')
    if set(old_record['files']) not in [original_allowed,allowed]:
        raise RuntimeError('Unknown static-content manifest; review before extending it')
    existing={p.relative_to(current).as_posix() for p in current.rglob('*') if p.is_file()}
    if existing!=set(old_record['files']) or any(p.is_symlink() for p in current.rglob('*')):
        raise RuntimeError('Unreviewed files or links in the static-content release')
if old_record and old_record['archive_sha256']==archive_hash:
    print(json.dumps({'unchanged':True,'source':'reviewed static gallery','workadventure_not_restarted':True}))
else:
    old_current=current.resolve() if current.exists() else None
    releases=base/'releases'
    release=releases/archive_hash[:16]
    if release.exists():
        raise RuntimeError('Release directory already exists; review before retry')
    base.mkdir(mode=0o755,exist_ok=True);base.chmod(0o755)
    releases.mkdir(mode=0o755,exist_ok=True);releases.chmod(0o755)
    private=base/'private';private.mkdir(mode=0o700,exist_ok=True);private.chmod(0o700)
    release.mkdir(mode=0o755);release.chmod(0o755)
    for name,data in payload.items():
        target=release/name
        assert target.resolve().is_relative_to(release.resolve())
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        target.parent.chmod(0o755)
        target.write_bytes(data);target.chmod(0o644)
    location='''
# Isolated public castle gallery; no authentication, map or audio route is changed.
location ^~ /castle-content/ {
    alias /opt/wvh-castle-content/current/;
    autoindex off;
    limit_except GET HEAD { deny all; }
    add_header Cache-Control "no-store" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), display-capture=()" always;
    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://deutsche-online-schule.com; connect-src https://deutsche-online-schule.com; frame-src https://deutsche-online-schule.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'" always;
}
'''
    backup=private/('nginx-before-'+archive_hash[:16]+'.conf')
    backup.write_bytes(old_nginx);backup.chmod(0o600)
    installed_hash=None;switched=False
    try:
        staged=base/'current.staging'
        if staged.exists() or staged.is_symlink():
            raise RuntimeError('Unreviewed staging link exists')
        staged.symlink_to(release,target_is_directory=True);staged.replace(current);switched=True
        if not old_record:
            if digest(nginx.read_bytes())!=expected:
                raise RuntimeError('Concurrent Nginx edit detected')
            metadata=nginx.stat();temporary=nginx.with_name(nginx.name+'.castle-staging')
            if temporary.exists():
                raise RuntimeError('Unreviewed Nginx staging file exists')
            data=old_nginx+location.encode();temporary.write_bytes(data)
            temporary.chmod(metadata.st_mode&0o777);os.chown(temporary,metadata.st_uid,metadata.st_gid)
            temporary.replace(nginx);installed_hash=digest(data)
            subprocess.check_output(['nginx','-t'],stderr=subprocess.STDOUT)
            subprocess.check_output(['systemctl','reload','nginx'],stderr=subprocess.STDOUT)
        files={name:digest(data) for name,data in payload.items()}
        for name,value in files.items():
            with urllib.request.urlopen('https://together.deine-schule.com/castle-content/'+name,timeout=20) as response:
                assert response.status==200 and digest(response.read())==value
                assert response.headers.get('X-Frame-Options')=='SAMEORIGIN'
        for name,previous in before.items():
            now=inspect(name)
            assert now['Id']==previous['Id'] and now['State']['StartedAt']==previous['State']['StartedAt']
        record.write_text(json.dumps({'release':str(release),'archive_sha256':archive_hash,'files':files,'nginx_sha256':digest(nginx.read_bytes())},indent=2)+'\n')
        record.chmod(0o600)
        print(json.dumps({'files_checked':len(files),'gallery_origin':'https://together.deine-schule.com','portal_csp_unchanged':True,
            'existing_routes_unchanged':True,'workadventure_and_audio_not_restarted':True},indent=2))
    except Exception:
        if installed_hash and digest(nginx.read_bytes())==installed_hash:
            nginx.write_bytes(old_nginx)
            subprocess.run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            subprocess.run(['systemctl','reload','nginx'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if switched and current.is_symlink() and current.resolve()==release:
            if old_current:
                temporary=base/'rollback.staging';temporary.symlink_to(old_current,target_is_directory=True);temporary.replace(current)
            else:
                current.unlink()
        raise RuntimeError('Static gallery deployment failed; owned changes were rolled back') from None
