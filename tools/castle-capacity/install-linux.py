"""Install a checksummed official test tool privately, without changing system packages."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

URL='https://github.com/livekit/livekit-cli/releases/download/v2.19.2/lk_2.19.2_linux_amd64.tar.gz'
EXPECTED='a234a95b9cd54303330e59eaf32da953cbfd2b74dbdabd69acae7aa5ff377c8e'
root=Path('/opt/wvh-castle-capacity-tools/2.19.2')
assert root.resolve()==root and not root.is_symlink()
root.mkdir(mode=0o755,parents=True,exist_ok=True)
root.parent.chmod(0o755);root.chmod(0o755)
binary=root/'lk'
old=Path('/opt/wvh-castle-capacity/bin/2.19.2/lk')
if not binary.exists() and old.is_file() and not old.is_symlink():
    assert hashlib.sha256(old.read_bytes()).hexdigest()=='e6d87a4db012314d5195cdc614f49bf94d3b07ed430971b08afb91f0ae46f0f8'
    os.link(old,binary)
for name in ['LICENSE','README.md']:
    existing=old.parent/name
    if existing.is_file() and not existing.is_symlink() and existing.stat().st_size<100000:
        target=root/name;target.write_bytes(existing.read_bytes());target.chmod(0o644)
if not binary.exists():
    with urllib.request.urlopen(URL,timeout=90) as response:data=response.read(45000001)
    assert len(data)<45000000 and hashlib.sha256(data).hexdigest()==EXPECTED
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
        names=archive.getnames();assert names.count('lk')==1
        member=archive.getmember('lk');assert member.isfile() and member.size<200000000
        binary.write_bytes(archive.extractfile(member).read());binary.chmod(0o755)
        for name in ['LICENSE','README.md']:
            if name in names:
                info=archive.getmember(name);assert info.isfile() and info.size<100000
                target=root/name;target.write_bytes(archive.extractfile(info).read());target.chmod(0o644)
    (root/'archive-sha256.txt').write_text(EXPECTED+'\n')
assert hashlib.sha256(binary.read_bytes()).hexdigest()=='e6d87a4db012314d5195cdc614f49bf94d3b07ed430971b08afb91f0ae46f0f8'
version=subprocess.check_output([str(binary),'--version'],text=True,stderr=subprocess.PIPE,timeout=10).strip()
assert '2.19.2' in version
print(json.dumps({'installed':True,'version':version,'archiveSha256':EXPECTED,
                  'node':shutil.which('node'),'systemdRun':shutil.which('systemd-run'),'setpriv':shutil.which('setpriv'),
                  'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'systemPackagesChanged':False}))
