"""Verify the downloaded generic software backup without extracting or reading pupil data."""
import hashlib
import json
from pathlib import Path
import tarfile

root=Path(__file__).resolve().parent.parent
archive=root.parent/'output/castle-homes/backups/8a7b5a2e1bf03405.tar.gz'
manifest_raw=(root/'ops/castle-homes/game.manifest.json').read_bytes()
manifest_sha='8a7b5a2e1bf034051d529c8ea4012930132bf057858c048b365e84589d879a1d'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
assert sha(manifest_raw)==manifest_sha
assert archive.resolve()==archive and archive.is_file() and archive.stat().st_size==84095464
archive_sha='a3b7e21e359445f6fb42dc692ffc1f90fb27b5bb0260101166730891fc27d0b5'
assert sha(archive.read_bytes())==archive_sha
manifest=json.loads(manifest_raw)
files={**manifest['sourceFiles'],**manifest['dependencyFiles'],'.castle-homes-runtime.json':manifest_sha}
assert len(files)==4869
with tarfile.open(archive,'r:gz') as reader:
    members=reader.getmembers()
    assert len(members)==len(files) and {item.name for item in members}==set(files)
    for member in members:
        assert member.isfile() and member.name in files
        assert sha(reader.extractfile(member).read())==files[member.name]
print(json.dumps(dict(passed=True,offServerCopyVerified=True,runtimeManifestSha256=manifest_sha,
    archiveSha256=archive_sha,archiveBytes=archive.stat().st_size,verifiedRegularFiles=len(files),
    programAndDependenciesOnly=True,privateSchoolDatabaseOrKeysIncluded=False)))
