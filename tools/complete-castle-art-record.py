"""Remove only the stopped candidate reference from this verified atelier deployment record."""
import json
from pathlib import Path
import subprocess
path=Path('/opt/wvh-castle-art/private/deployment.json')
raw=path.read_bytes();value=json.loads(raw);assert value['archive_sha256'].startswith('bf7276dd326ee8d8')
candidate='wvh-castle-art-candidate';assert not subprocess.check_output(['docker','ps','-aq','--filter','name=^/'+candidate+'$'],text=True).strip()
assert set(value['containers']) in [{'wvh-castle-art','wvh-castle-art-board'},{'wvh-castle-art','wvh-castle-art-board',candidate}]
for name in ['wvh-castle-art','wvh-castle-art-board']:
    current=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
    assert current['Id']==value['containers'][name] and current['Config']['Labels']['wvh.release']=='bf7276dd326ee8d8' and current['State']['Health']['Status']=='healthy'
if candidate in value['containers']:
    value['containers'].pop(candidate);assert path.read_bytes()==raw
    temporary=path.with_name('deployment.complete-staging');assert not temporary.exists()
    temporary.write_text(json.dumps(value,indent=2)+'\n');temporary.chmod(0o600);temporary.replace(path)
print('Atelier record references only its two verified healthy running containers.')
