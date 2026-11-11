"""Read only bounded stage diagnostics, never its credential file contents."""
import json
from pathlib import Path
import subprocess

unit='wvh-homes-calls-stage.service'
state=subprocess.run(['systemctl','show',unit,'--property=MainPID,ActiveState,SubState,LoadState'],capture_output=True,text=True,timeout=10)
log=subprocess.run(['journalctl','-u',unit,'-n','25','--no-pager','-o','cat'],capture_output=True,text=True,check=True,timeout=10)
safe=[]
for line in log.stdout.splitlines():
    if line.startswith('{"ready":'):
        value=json.loads(line)
        assert set(value)<={'ready','errorType','code','status','loopbackOnly','ordinarySchoolContext','onlyDisposableRoomData','voiceNamespaceAvailable'}
        safe.append(value)
tests=Path('/opt/wvh-castle-homes/private/calls-linux-tests.private.log').read_text()
port=subprocess.run(['ss','-ltnH','sport = :4319'],capture_output=True,text=True,check=True,timeout=10)
print(json.dumps(dict(state=state.stdout.strip(),startup=safe,linuxTests=[line for line in tests.splitlines() if line.startswith(('# tests ','# pass ','# fail ','# skipped '))],
    reverseLoopbackPortFree=not port.stdout.strip(),credentialFileExists=Path('/opt/wvh-castle-homes/private/calls-stage.service.json').exists())))
