"""Remove only this client's isolated rehearsal services; preserve all evidence."""
import hashlib
import json
from pathlib import Path
import subprocess
ROOT=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui-r2')
STAGE=ROOT/'browser-stage';PROJECT='wvh-castle-seat-20261111-r2'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
ready=json.loads((STAGE/'ready.json').read_text())
assert STAGE.resolve()==STAGE and sha((STAGE/'compose.private.json').read_bytes())==ready['composeSha256']
with (STAGE/'stop.log').open('x') as log:
    subprocess.run(['docker','compose','-p',PROJECT,'-f',str(STAGE/'compose.private.json'),'down','--remove-orphans'],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=120)
ids=subprocess.check_output(['docker','ps','-q'],text=True).split()
actual={item['Name']:{'id':item['Id'],'started':item['State']['StartedAt'],'image':item['Image']}
    for item in json.loads(subprocess.check_output(['docker','inspect',*ids],text=True))}
assert actual==json.loads((ROOT/'prepared.json').read_text())['running']
path=STAGE/'stopped.json';assert not path.exists();path.write_text(json.dumps({'passed':True,'productionServicesUnchanged':True,'onlyOwnStageRemoved':True})+'\n');path.chmod(0o600)
print(json.dumps({'passed':True,'ownStageStopped':True,'productionUnchanged':True}))
