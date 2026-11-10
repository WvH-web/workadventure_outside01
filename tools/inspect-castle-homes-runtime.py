"""Read-only inventory of the immutable colleague-game runtime; no environment values."""
import hashlib
import json
from pathlib import Path
import runpy
import subprocess


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


ops = runpy.run_path('/tmp/wvh-castle-piano-ops.py')
before = ops['baseline']()
root = Path('/opt/wvh-sterne-kollegium')
current = root / 'current'
release = current.resolve(strict=True)
assert current.is_symlink() and release.is_relative_to(root) and release != root
deployment = root / 'deployment.json'
deployment_hash = digest(deployment)
metadata = json.loads(deployment.read_text())
files = [
    'dorfplatz/server/index.mjs', 'dorfplatz/server/accounts.mjs',
    'dorfplatz/server/bedrooms.mjs', 'dorfplatz/server/visits.mjs',
    'dorfplatz/server/proximity.mjs', 'dorfplatz/public/room-social.js',
    'dorfplatz/package.json', 'dorfplatz/package-lock.json',
]
hashes = {}
for name in files:
    candidate = release / name
    hashes[name] = digest(candidate) if candidate.is_file() else None

tops = sorted(p.name for p in release.iterdir())
package = release / 'dorfplatz/package.json'
dependencies = {}
if package.is_file():
    manifest = json.loads(package.read_text())
    dependencies = manifest.get('dependencies', {})

service = subprocess.run(
    ['systemctl', 'show', 'wvh-sterne-kollegium.service',
     '--property=ActiveState,SubState,MainPID,User,Group,WorkingDirectory'],
    check=True, capture_output=True, text=True, timeout=15,
).stdout
node = Path('/opt/plesk/node/24/bin/node')
version = subprocess.run([str(node), '--version'], check=True,
                         capture_output=True, text=True, timeout=10).stdout.strip()
runtime = subprocess.run([
    str(node), '-e',
    "const fs=require('fs');const out={};for(const name of ['jose','ws','moment-timezone','sharp']){"
    "const file=require.resolve(name);out[name]={resolved:file};}console.log(JSON.stringify(out));",
], cwd=release/'dorfplatz', check=True, capture_output=True, text=True, timeout=15)
assert ops['baseline']() == before and digest(deployment) == deployment_hash
assert current.resolve(strict=True) == release
print(json.dumps({
    'readOnly': True, 'release': str(release), 'topLevel': tops,
    'deploymentKeys': sorted(metadata), 'deploymentSha256': deployment_hash,
    'sourceSha256': hashes, 'dependencies': dependencies,
    'nodeVersion': version, 'moduleResolution': json.loads(runtime.stdout),
    'releaseMode': oct(release.stat().st_mode & 0o777), 'releaseOwner': release.stat().st_uid,
    'service': dict(
        line.split('=', 1) for line in service.splitlines() if '=' in line),
    'protectedBaselineUnchanged': True,
}))
