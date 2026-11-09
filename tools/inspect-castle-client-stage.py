"""Read-only inventory before creating a loopback-only tutorial browser stage."""
import json
from pathlib import Path
import subprocess

def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
file=Path('/root/togetherWorkadventure/upgrades/20261107/stage.compose.json')
config=json.loads(file.read_text()) if file.exists() else None
names=run('docker','ps','-a','--filter','label=com.docker.compose.project=wvh-wa-stage-20261107','--format','{{.Names}} {{.State}}').splitlines()
print(json.dumps({'stageTemplateExists':config is not None,'templateServices':list(config['services']) if config else [],
 'oldStageContainers':names,'port13300Occupied':bool(run('ss','-ltnH','sport = :13300').strip()),
 'newStageExists':Path('/root/togetherWorkadventure/upgrades/20261109-onboarding/browser-stage').exists()},indent=2))
