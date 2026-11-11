"""Inspect only non-secret media prerequisites; do not alter any running service."""
import json
from pathlib import Path
import runpy
import subprocess

ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
before=ops['baseline']()
private=Path('/opt/wvh-castle-homes/private')
value=json.loads((private/'service.json').read_text())
assert value['version'] in [3,4]
code="""
const {loadConfig}=require('/srv/hall-audio/config.cjs');const c=loadConfig();
for(const raw of [c.livekit.browserUrl,c.livekit.apiUrl]){const u=new URL(raw);if(u.username||u.password||u.search||u.hash)throw Error('Unexpected endpoint');}
console.log(JSON.stringify({browserUrl:c.livekit.browserUrl,apiUrl:c.livekit.apiUrl,credentialsPresent:!!c.livekit.apiKey&&c.livekit.apiSecret.length>=32}));
"""
result=subprocess.run(['docker','exec','wvh-hall-audio','node','-e',code],stdin=subprocess.DEVNULL,capture_output=True,text=True,check=True,timeout=20)
media=json.loads(result.stdout)
assert ops['baseline']()==before
print(json.dumps(dict(readOnly=True,media=media,allowedPupilCount=len(value['allowedSubjects']),moderatorCount=len(value['moderatorSubjects']),
    currentOwnRuntime=value['source'].startswith('/opt/wvh-castle-homes/game-releases/'),roomCallsConfigured=value['version']==4 and bool(value.get('calls')),
    oldCastleAndOtherServicesUnchanged=True)))
