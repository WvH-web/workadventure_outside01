"""Legacy read-only check: disposal now belongs to the creating build process."""
import json
from pathlib import Path
import subprocess

stage=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
record=json.loads((stage/'build-process.json').read_text())
builder=record.get('builder','wvh-castle-onboarding')
file=Path('/proc/'+str(record['pid'])+'/cmdline')
assert not file.exists() or builder.encode() not in file.read_bytes().split(b'\0'),'Build client still running'
result=subprocess.run(['docker','buildx','inspect',builder],capture_output=True)
print(json.dumps({'builder':builder,'exists':result.returncode==0,'changed':False,
 'note':'Only the creating run may delete its builder. No foreign or legacy instance is stopped here.'}))
