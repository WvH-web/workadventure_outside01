"""Read only the native room-id contract and deployment network, never secrets."""
import json
from pathlib import Path
import subprocess

source = Path('/root/togetherWorkadventure/upgrades/20261107/source')
for rel in ['play/src/front/Api/IframeListener.ts', 'play/src/front/Connexion/Room.ts',
            'play/src/front/Connection/Room.ts', 'play/src/front/Api/iframe/room.ts']:
    p = source / rel
    if not p.exists():
        continue
    lines = p.read_text().splitlines()
    for index, line in enumerate(lines):
        if any(term in line for term in ['roomId:', 'get id(', 'getId(', 'roomId =', 'get id:']):
            print(rel, index + 1, '\n'.join(lines[max(0,index-2):index+5]))
net = json.loads(subprocess.check_output(['docker','network','inspect','workadventure_default'], text=True))[0]
print('NETWORK_IPAM', json.dumps(net['IPAM']['Config']))
p = Path('/opt/wvh-hall-audio/private/code.json')
print('PRIVATE_VERIFIER', p.exists(), oct(p.stat().st_mode & 0o777) if p.exists() else '')
