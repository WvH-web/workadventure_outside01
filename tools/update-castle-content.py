"""Atomically update only three gallery files behind the unchanged existing route."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import zipfile

os.umask(0o077)
base=Path('/opt/wvh-castle-content');current=base/'current';record=base/'private/deployment.json'
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
allowed={'collection.html','collection.css','collection.js','catalog.js','vendor/lucide.min.js','vendor/LICENSE',
    'npc-sprite.html','npc-sprite.css','npc-sprite.js','characters-data.js','passive-image.js','display.html','display.css','display.js'}
changed_allowed={'collection.html','collection.js','catalog.js'}
archive=Path('/tmp/wvh-castle-content.zip')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def inspect(name):return json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
def containers():
    ids=subprocess.check_output(['docker','ps','-q'],text=True).splitlines()
    return {value['Name']:(value['Id'],value['State']['StartedAt']) for value in map(inspect,ids)}
def check_url(name,digest):
    with urllib.request.urlopen('https://together.deine-schule.com/castle-content/'+name,timeout=20) as response:
        assert response.status==200 and sha(response.read())==digest
        assert response.headers.get('X-Frame-Options')=='SAMEORIGIN'
        assert response.headers.get('Cache-Control')=='no-store'
        assert response.headers.get('Permissions-Policy')=='camera=(), microphone=(), display-capture=()'
        assert response.headers.get('Content-Security-Policy')==(
            "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://deutsche-online-schule.com; "
            "connect-src https://deutsche-online-schule.com; frame-src https://deutsche-online-schule.com; "
            "frame-ancestors 'self'; base-uri 'none'; form-action 'none'")
def write_record(raw):
    temporary=record.with_name('deployment.static-staging.json');assert not temporary.exists()
    temporary.write_bytes(raw);temporary.chmod(0o600);temporary.replace(record)
def switch(target):
    temporary=base/'current.static-staging';assert not temporary.exists() and not temporary.is_symlink()
    temporary.symlink_to(target,target_is_directory=True);temporary.replace(current)

assert base.resolve()==base and record.resolve()==record and not nginx.is_symlink()
old_record_raw=record.read_bytes();old=json.loads(old_record_raw)
assert current.is_symlink();old_release=current.resolve()
assert str(old_release)==old['release'] and old_release.parent==base/'releases'
assert set(old['files'])==allowed
assert not any(path.is_symlink() for path in old_release.rglob('*'))
assert {path.relative_to(old_release).as_posix() for path in old_release.rglob('*') if path.is_file()}==allowed
assert all(sha((old_release/name).read_bytes())==digest for name,digest in old['files'].items())
with zipfile.ZipFile(archive) as bundle:
    assert len(bundle.infolist())==len(allowed) and set(bundle.namelist())==allowed
    assert sum(value.file_size for value in bundle.infolist())<4000000
    payload={name:bundle.read(name) for name in allowed}
files={name:sha(raw) for name,raw in payload.items()}
changed={name for name in allowed if files[name]!=old['files'][name]}
assert changed==changed_allowed,'This update is limited to exactly three reviewed gallery files'
web_before=nginx.read_bytes();before=containers()
assert inspect('workadventure-play-1')['State']['Health']['Status']=='healthy'
for name,digest in old['files'].items():check_url(name,digest)
release_hash=sha(archive.read_bytes());release=base/'releases'/release_hash[:16]
assert not release.is_symlink()
if release.exists():
    assert release!=old_release
    assert not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==allowed
    assert all(sha((release/name).read_bytes())==digest for name,digest in files.items())
else:release.mkdir(mode=0o755)
release.chmod(0o755)
for name,raw in payload.items():
    target=release/name;assert target.resolve().is_relative_to(release)
    target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
    target.parent.chmod(0o755)
    target.write_bytes(raw);target.chmod(0o644)
new={**old,'release':str(release),'archive_sha256':release_hash,'files':files,
    'previous_release':str(old_release),'static_updated_at_utc':datetime.now(timezone.utc).isoformat(),
    'changed_files':sorted(changed),'routing_modified':False,'observed_nginx_sha256':sha(web_before),
    'previous_record_sha256':sha(old_record_raw)}
new_raw=(json.dumps(new,indent=2)+'\n').encode()
switched=False;recorded=False;phase='before-switch'
try:
    assert record.read_bytes()==old_record_raw and current.resolve()==old_release and nginx.read_bytes()==web_before
    switch(release);switched=True
    for name,digest in files.items():
        phase='verify:'+name;check_url(name,digest)
    phase='unchanged-services'
    assert nginx.read_bytes()==web_before and containers()==before
    assert record.read_bytes()==old_record_raw
    write_record(new_raw);recorded=True
    result={'passed':True,'release':release.name,'changed_files':sorted(changed),
        'files_checked_before_and_after':len(files),'security_headers_unchanged':True,
        'nginx_byte_identical':True,'historic_nginx_hash_preserved':True,'all_running_containers_unchanged':True,
        'previous_release_retained':True,'loadApprovalFor400':False}
    (base/'private'/('static-update-'+release.name+'.json')).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
except Exception as error:
    if switched and current.is_symlink() and current.resolve()==release:switch(old_release)
    if recorded and record.read_bytes()==new_raw:write_record(old_record_raw)
    (base/'private'/('static-update-failure-'+release.name+'.json')).write_text(json.dumps({
        'phase':phase,'error_type':type(error).__name__,'previous_release_restored':current.resolve()==old_release},indent=2)+'\n')
    raise RuntimeError('Static gallery update failed; only the owned release was restored') from None
