"""Stop only the owned loopback tutorial stage; keep builds and evidence for resume."""
import hashlib
import json
from pathlib import Path
import subprocess

root=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding/browser-stage')
assert root.resolve()==root and not root.is_symlink()
record=json.loads((root/'ready.json').read_text());project='wvh-castle-client-20261109'
assert record['project']==project and record['loopback_only'] is True
config=root/'compose.private.json';assert hashlib.sha256(config.read_bytes()).hexdigest()==record['compose_sha256']
names=subprocess.check_output(['docker','ps','-a','--filter','label=com.docker.compose.project='+project,'--format','{{.Names}}'],text=True).splitlines()
for name in names:
    container=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
    assert container['Config']['Labels']['com.docker.compose.project']==project
subprocess.run(['docker','compose','-p',project,'-f',str(config),'down','--timeout','10'],check=True,capture_output=True)
token=Path('/tmp/wvh-onboarding-browser.private.json')
if token.exists():
    assert token.resolve()==token and json.loads(token.read_text())['stageOnly'] is True
    token.unlink()
print('Owned tutorial test instance stopped; live services, images and evidence retained.')
