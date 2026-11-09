"""Read only the isolated tutorial compiler's process and public build progress."""
import json
from pathlib import Path
import shutil
import subprocess

stage=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
record=json.loads((stage/'build-process.json').read_text())
command=Path('/proc/'+str(record['pid'])+'/cmdline')
args=command.read_bytes().split(b'\0') if command.exists() else []
builder=record.get('builder','wvh-castle-onboarding')
running=b'buildx' in args and builder.encode() in args and record['image'].encode() in args
lines=(stage/'build.log').read_text().splitlines()
print(json.dumps({'compilerProcessLive':running,'freeDiskGiB':round(shutil.disk_usage(stage).free/1024**3,1),
 'recentBuildLines':lines[-8:],'result':json.loads((stage/'build-result.json').read_text()) if (stage/'build-result.json').exists() else None},indent=2))
