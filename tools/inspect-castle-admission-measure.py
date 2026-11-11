"""Compare public synthetic test bytes only; do not read profiles, tokens or production configuration."""
import hashlib
import json
from pathlib import Path
import zipfile

private=Path('/opt/wvh-castle-school/private')
stage=json.loads((private/'admission-stage.json').read_text())
original=private/('admission-tests-'+stage['qaArchiveSha256'][:16])
with zipfile.ZipFile('/tmp/wvh-castle-admission-measure.zip') as archive:
    rows=[]
    for name in ['castle-admission.test.cjs','castle-admission-http.test.cjs','fixtures/castle-offers.cjs']:
        previous=(original/name).read_bytes();current=archive.read(name)
        rows.append(dict(file=name,bytesEqual=previous==current,lineEndingNormalizedEqual=previous.replace(b'\r\n',b'\n')==current.replace(b'\r\n',b'\n'),
            archivedBytes=len(previous),localBytes=len(current),archivedSha256=hashlib.sha256(previous).hexdigest(),localSha256=hashlib.sha256(current).hexdigest()))
print(json.dumps(rows))
folder=private/'admission-measure-20261111'
if folder.exists():
    print(json.dumps(dict(stderr=(folder/'run-1.stderr').read_text()[:2500],structuredOutput=(folder/'run-1.jsonl').read_text()[:2500])))
