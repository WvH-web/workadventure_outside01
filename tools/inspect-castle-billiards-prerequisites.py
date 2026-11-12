"""Read-only resource and port inventory for the isolated pilot."""
import json
import os
from pathlib import Path
import subprocess

def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
ports={str(port):not bool(run('ss','-ltnH','sport = :'+str(port)).strip()) for port in [3231,3251,3261,3271]}
ids=run('docker','ps','-q').split();owners=[]
for container in json.loads(run('docker','inspect',*ids)):
    matches={key:value for key,value in (container['HostConfig'].get('PortBindings') or {}).items() if any(item['HostPort'] in ports for item in value or [])}
    if matches:owners.append({'name':container['Name'].lstrip('/'),'ports':matches})
memory=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
disk=os.statvfs('/opt')
print(json.dumps({'freePorts':ports,'existingOwners':owners,'availableMemoryMiB':int(memory['MemAvailable'].split()[0])//1024,
 'freeDiskGiB':round(disk.f_bavail*disk.f_frsize/1024**3,1),'pilotDirectoryCreated':Path('/opt/wvh-castle-billiards').exists()}))
