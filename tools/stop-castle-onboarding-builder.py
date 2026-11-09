"""Stop only this completed isolated compiler; keep its images, evidence and live services."""
import json
from pathlib import Path
import subprocess

stage=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
record=json.loads((stage/'build-process.json').read_text());result=json.loads((stage/'build-result.json').read_text())
assert result['passed'] is True and result['image']==record['image']=='wvh-workadventure-checks:1.34.5-onboarding-v1'
file=Path('/proc/'+str(record['pid'])+'/cmdline')
assert not file.exists() or b'wvh-castle-onboarding' not in file.read_bytes().split(b'\0')
subprocess.run(['docker','buildx','stop','wvh-castle-onboarding'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
print('Completed isolated compiler stopped; runtime services, build images and evidence retained.')
