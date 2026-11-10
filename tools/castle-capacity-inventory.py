"""Read-only, aggregate inventory; never return credentials or participant identities."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=20)


names = ['workadventure-play-1', 'workadventure-back-1', 'workadventure-livekit-1',
         'workadventure-map-storage-1', 'wvh-hall-audio', 'wvh-castle-school',
         'wvh-castle-chess', 'wvh-castle-art', 'wvh-castle-piano']
containers = []
for name in names:
    try:
        item = json.loads(run('docker', 'inspect', name))[0]
    except subprocess.CalledProcessError:
        containers.append({'name': name, 'present': False})
        continue
    test = item['Config'].get('Healthcheck', {}).get('Test', [])
    containers.append({'name': name, 'present': True, 'id': item['Id'], 'image': item['Image'],
                       'startedAt': item['State']['StartedAt'], 'status': item['State']['Status'],
                       'health': item['State'].get('Health', {}).get('Status'),
                       'healthCommandSha256': hashlib.sha256(json.dumps(test).encode()).hexdigest(),
                       'checksHallRoute': '/castle-audio/health' in str(test),
                       'checksPort3000': '3000' in str(test),
                       'memoryLimitMiB': item['HostConfig']['Memory'] // 1048576,
                       'cpuLimit': item['HostConfig'].get('NanoCpus', 0) / 1000000000,
                       'restartCount': item.get('RestartCount', 0)})
endpoints = []
for route in ['/castle-audio/health', '/castle-school/health', '/castle-piano/health',
              '/castle-chess/health', '/castle-art/health']:
    try:
        with urllib.request.urlopen('https://together.deine-schule.com' + route, timeout=8) as response:
            endpoints.append({'route': route, 'http': response.status,
                              'ready': json.loads(response.read(1024)).get('ready') is True})
    except Exception:
        endpoints.append({'route': route, 'ready': False})

media_script = r'''
const {loadConfig}=require('/srv/hall-audio/config.cjs');
const {RoomServiceClient}=require('livekit-server-sdk');
const config=loadConfig(),c=new RoomServiceClient(config.livekit.apiUrl,config.livekit.apiKey,config.livekit.apiSecret);
c.listRooms().then(rooms=>{const own=rooms.filter(r=>/^castle-audio-[a-f0-9]{32}$/.test(r.name));
console.log(JSON.stringify({hallRooms:own.length,hallParticipants:own.reduce((n,r)=>n+r.numParticipants,0)}));
}).catch(()=>{console.error('Media inventory unavailable');process.exitCode=1;});
'''
media = json.loads(run('docker', 'exec', 'wvh-hall-audio', 'node', '-e', media_script))
memory = {}
for line in Path('/proc/meminfo').read_text().splitlines():
    key, value = line.split(':', 1)
    if key in ['MemTotal', 'MemAvailable', 'SwapTotal', 'SwapFree']:
        memory[key + 'MiB'] = int(value.split()[0]) // 1024
disk = os.statvfs('/opt')
print(json.dumps({'containers': containers, 'endpoints': endpoints, 'media': media,
                  'memory': memory, 'loadAverage': os.getloadavg(),
                  'diskAvailableGiB': round(disk.f_bavail * disk.f_frsize / 1073741824, 2)}, indent=2))
