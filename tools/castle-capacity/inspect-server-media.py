"""Read aggregate test results and the owned generator's final diagnostics; no credentials or school identities."""
import json
from pathlib import Path
import re
import runpy
import subprocess

root=Path('/opt/wvh-castle-capacity/private')
result=json.loads((root/'server-media-result.private.json').read_text())
room=result['cleanup']['room'];assert re.fullmatch(r'castle-capacity-[a-f0-9]{24}',room)
prefix=room.removeprefix('castle-capacity-');failed=[count for count in [25,100,200,400] if (root/room/('media-'+str(count)+'.stderr.private.log')).exists()]
last=failed[-1];unit='wvh-castlecap-'+prefix+'-'+str(last)+'.scope'
diagnostics=(root/room/('media-'+str(last)+'.stderr.private.log')).read_text()[-5000:]
journal=subprocess.run(['journalctl','-u',unit,'--no-pager','-n','12','-o','cat'],capture_output=True,text=True,timeout=8)
summary={key:result[key] for key in ['passed','scope','stages','cleanup','checkedAt']}
if result.get('error'):summary['error']=result['error']
samples=result['samples']
lease=json.loads((root/'media-lease.json').read_text())
assert lease['room']==room
ops=runpy.run_path('/tmp/wvh-castle-capacity-ops.py')
assert lease['state']=='closed' and ops['baseline']()==lease['after']
live=ops['media']('status',room,lease['prefix'])
assert live['ownRooms']==0 and live['ownParticipants']==0 and not ops['HANDOFF'].exists()
for count in [25,100,200,400]:
    value=subprocess.run(['systemctl','show','wvh-castlecap-'+prefix+'-'+str(count)+'.scope','--property=ActiveState','--value'],capture_output=True,text=True,timeout=5)
    assert value.stdout.strip() not in ['active','activating','deactivating']
parser=Path('/tmp/wvh-castle-capacity-report.cjs').read_text()
program=parser+"\nconst rows=JSON.parse(require('node:fs').readFileSync(0,'utf8'));console.log(JSON.stringify(rows.map(row=>parseReport(row.text,row.expected))));"
reports=[{'expected':stage['subscribers'],'text':(root/room/('media-'+str(stage['subscribers'])+'.stdout.private.log')).read_text()} for stage in result['stages']]
checked=subprocess.run(['docker','exec','-i','wvh-hall-audio','node','-e',program],input=json.dumps(reports),capture_output=True,text=True,timeout=10)
assert checked.returncode==0
parsed=json.loads(checked.stdout)
assert len(parsed)==len(result['stages']) and all(all(row[key]==stage[key] for key in row) for row,stage in zip(parsed,result['stages']))
summary.update(minAvailableMiB=min([value['resources']['availableMiB'] for value in samples],default=0),
               maxCpuBusyPercent=max([value['resources']['cpuBusyPercent'] for value in samples],default=0),
               maximumObservedParticipants=max([value['media']['ownParticipants'] for value in samples],default=0),
               lastObservation=lease['samples'][-1] if lease['samples'] else None,
               actualOwnRoomAndScopesStopped=True,completedStagesRecheckedWithCurrentParser=[row['subscribers'] for row in parsed],
               generatorStderr=diagnostics,generatorJournal=journal.stdout[-5000:])
print(json.dumps(summary,indent=2))
