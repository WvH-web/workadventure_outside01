"""Inspect native avatar storage without returning configuration secrets or account data."""
import hashlib
import json
import subprocess
from pathlib import Path
import yaml

container='workadventure-play-1'
paths=subprocess.check_output(['docker','exec',container,'find','/usr/src/play','-path','*/node_modules','-prune','-o','-name','woka.json','-print'],text=True).splitlines()
files=[]
for path in paths:
    raw=subprocess.check_output(['docker','exec',container,'cat',path])
    data=json.loads(raw)
    files.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest(),
        'collections':[{'name':c['name'],'count':len(c['textures'])} for c in data.get('woka',{}).get('collections',[])]})
info=json.loads(subprocess.check_output(['docker','inspect',container],text=True))[0]
override=Path('/root/togetherWorkadventure/workadventure/docker-compose.override.yaml')
config=yaml.safe_load(override.read_text())
print(json.dumps({'files':files,'mount_targets':[m['Destination'] for m in info['Mounts']],
    'compose_files':info['Config']['Labels'].get('com.docker.compose.project.config_files'),
    'override_sha256':hashlib.sha256(override.read_bytes()).hexdigest(),
    'play_volume_count':len(config.get('services',{}).get('play',{}).get('volumes',[])),
    'native_data_folder':subprocess.check_output(['docker','exec',container,'ls','/usr/src/play/src/pusher/data'],text=True).splitlines(),
    'runtime_command':info['Config'].get('Cmd'),
    'runtime_start_script':subprocess.check_output(['docker','exec',container,'node','-p',"JSON.stringify(require('/usr/src/play/package.json').scripts.start)"],text=True).strip(),
    'avatar_directory_exists':Path('/opt/wvh-event-avatars').exists()},indent=2))
