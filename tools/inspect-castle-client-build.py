"""Read-only client build inventory; never prints environment values or user sessions."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

source=Path('/root/togetherWorkadventure/upgrades/20261107/source')
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
live=json.loads(run('docker','inspect','workadventure-play-1'))[0]
names=['play/src/front/Stores/OnboardingStore.ts','play/src/front/Components/Onboarding/Onboarding.svelte']
package=json.loads((source/'play/package.json').read_text())
print(json.dumps({'head':run('git','-C',str(source),'rev-parse','HEAD').strip(),
 'files':{name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in names},'scripts':package['scripts'],
 'freeDiskGiB':round(shutil.disk_usage(source).free/1024**3,1),'liveImageId':live['Image'],'liveImageName':live['Config']['Image'],
 'sourceBuildMounts':[m['Destination'] for m in live['Mounts']]},indent=2))
script="""const fs=require('node:fs');for(const p of ['/usr/src/play/dist','/usr/src/play/dist/public','/usr/src/play/dist/front','/usr/src/play/dist/server']){console.log(JSON.stringify({path:p,files:fs.existsSync(p)?fs.readdirSync(p).slice(0,30):null}));}"""
print(run('docker','exec','workadventure-play-1','node','-e',script))
for name in ['play/vite.config.ts','play/src/pusher/App.ts']:
    file=source/name
    if file.exists():
        print('\nPUBLIC PATHS '+name)
        for line in file.read_text().splitlines():
            if any(word in line for word in ['public','dist','index.html','outDir','build']):print(line[:250])
