"""Remove only the verified stopped rollback container before retaining its successor."""
import json
import subprocess
name='wvh-hall-audio-previous'
data=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
assert data['Name']=='/'+name and data['State']['Running'] is False
assert data['Config']['Cmd']==['/srv/hall-audio/server.cjs']
assert data['Config']['Entrypoint']==['node']
assert any(m['Destination']=='/srv/hall-audio' and m['Source'].startswith('/opt/wvh-hall-audio/releases/') for m in data['Mounts'])
subprocess.run(['docker','rm',name],check=True,stdout=subprocess.DEVNULL)
print('Verified stopped hall rollback container retired; no image, volume, or running service removed.')
