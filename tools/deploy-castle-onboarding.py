"""Guarded frontend-only tutorial rollout, only when no game connection is active."""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import time
import urllib.parse
import urllib.request

os.umask(0o077)
ROOT=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
RUNTIME=Path('/root/togetherWorkadventure/workadventure')
OVERRIDE=RUNTIME/'docker-compose.override.yaml'
IMAGE='wvh-workadventure-play:1.34.5-school-v4-onboarding'
EXPECTED='sha256:ed2d18546b8f8dc5a2503edb98dddcb8e38efbac50c45b60b2124f9ad8f5f60b'
BASE='sha256:9ba04071c3153970743b39301192ee0ec6f3bd09e3b85f3b4c64f5a4d3e635f3'
ORIGIN='https://together.deine-schule.com'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args,cwd=None):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE,cwd=cwd)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def get(path):
    with urllib.request.urlopen(ORIGIN+path,timeout=20) as response:return response.status,response.read()
def config():return json.loads(run('docker','compose','config','--format','json',cwd=RUNTIME))
def atomically_replace(raw,metadata):
    path=OVERRIDE.with_name(OVERRIDE.name+'.onboarding-staging');assert not path.exists()
    path.write_bytes(raw);path.chmod(stat.S_IMODE(metadata.st_mode));os.chown(path,metadata.st_uid,metadata.st_gid);path.replace(OVERRIDE)
def restart_play(label):
    with (ROOT/label).open('w') as log:
        subprocess.run(['docker','compose','up','-d','--no-deps','--pull','never','--wait','--wait-timeout','120','play'],cwd=RUNTIME,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=150)

gate=json.loads(Path('/tmp/wvh-onboarding-browser-result.json').read_text())
assert gate.get('passed') is True and gate.get('stageOnly') is True and gate.get('errors')==[]
assert all(gate['firstEntry'][key] is True for key in ['firstOfferVisible','skipWorks','differentRoomDoesNotRepeat','reloadDoesNotRepeat'])
assert all(gate['manualReplay'][key] is True for key in ['nativeProfileMenuClicked','replayVisible','skipWorks'])
assert gate['independentFirstEntryBrowsers']==2 and gate['customAvatarSwapAndRestorePreserved'] is True
assert all(gate['mobile'][key] is True for key in ['touchContext','leavingBeforeSkipDoesNotRepeat','nativeRoomTravelUsed','controlsWorkAfterTravel'])
prepared=json.loads((ROOT/'prepared.json').read_text());built=json.loads((ROOT/'build-result.json').read_text())
stage=json.loads((ROOT/'browser-stage/ready.json').read_text())
assert prepared['passed'] and built['passed'] and stage['image_id']==EXPECTED
assert prepared['archive_sha256']==built['archive_sha256']==stage['source_archive']=='6e7d34bdd55cd8afd58b3dfe304f6af21467a2cbf6c2f7dc93a1881b6db008ec'
assert sha((ROOT/'browser-stage/compose.private.json').read_bytes())==stage['compose_sha256']
assert inspect('wvh-castle-client-20261109-play-1')['Image']==EXPECTED
assert not (ROOT/'live-deployment.json').exists(),'Review the existing deployment record before retrying'
assert OVERRIDE.resolve()==OVERRIDE and not OVERRIDE.is_symlink()
old_raw=OVERRIDE.read_bytes();metadata=OVERRIDE.stat();override=json.loads(old_raw)
assert override['services']['play']['image']=='wvh-workadventure-play:1.34.5-school-v3'
before_config=config();old=inspect('workadventure-play-1');assert old['Image']==BASE
candidate=json.loads(run('docker','image','inspect',IMAGE))[0]
base=json.loads(run('docker','image','inspect',BASE))[0]
assert candidate['Id']==EXPECTED and candidate['RootFS']['Layers'][:len(base['RootFS']['Layers'])]==base['RootFS']['Layers']
for key in ['Env','Cmd','Entrypoint','WorkingDir','User','ExposedPorts']:assert candidate['Config'].get(key)==base['Config'].get(key)
frozen={m['Source']:sha(Path(m['Source']).read_bytes()) for m in old['Mounts']}
assert len(frozen)==5 and all('/src/pusher/' in m['Destination'] for m in old['Mounts'])
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf');nginx_hash=sha(nginx.read_bytes())
others={}
for ident in run('docker','ps','-q').splitlines():
    value=inspect(ident)
    if value['Id']!=old['Id']:others[value['Name']]=(value['Id'],value['State']['StartedAt'])
asset_status,asset=get('/resources/wvh/go-cart-avatar.png');assert asset_status==200
avatar_hash=sha(asset)
def map_details(path):
    status,raw=get('/map?'+urllib.parse.urlencode({'playUri':ORIGIN+path}));assert status==200
    return json.loads(raw)
paths=['/_/global/wvh-web.github.io/workadventure_outside01/village/wa-headquarters.tmj','/_/global/wvh-web.github.io/workadventure_outside01/nature-office/map.json']
maps={path:map_details(path) for path in paths}
connections=r"""const fs=require('node:fs');let n=0;for(const f of ['/proc/net/tcp','/proc/net/tcp6'])for(const line of fs.readFileSync(f,'utf8').trim().split('\n').slice(1)){const p=line.trim().split(/\s+/);if(p[1]?.endsWith(':0BB9')&&p[3]==='01')n++;}console.log(n);"""
for _ in range(2):
    active=int(run('docker','exec','workadventure-play-1','node','-e',connections).strip())
    if active:raise RuntimeError('Active game connections found; rollout deferred without changing live services')
    time.sleep(1)
assert OVERRIDE.read_bytes()==old_raw
(ROOT/'override-before-onboarding.private.json').write_bytes(old_raw)
(ROOT/'browser-gate.json').write_text(json.dumps(gate,indent=2)+'\n')
override['services']['play']['image']=IMAGE;new_raw=(json.dumps(override,indent=2)+'\n').encode()
swapped=False
try:
    atomically_replace(new_raw,metadata);swapped=True;restart_play('live-start.log')
    current=inspect('workadventure-play-1');assert current['Image']==EXPECTED and current['State']['Health']['Status']=='healthy'
    assert get('/ping')[0]==200
    status,api=get('/iframe_api.js');assert status==200 and b'setTemporaryWoka' in api and b'restoreWoka' in api
    status,avatar=get('/resources/wvh/go-cart-avatar.png');assert status==200 and sha(avatar)==avatar_hash
    for path,before in maps.items():
        after=map_details(path)
        for key in ['authenticationMandatory','mapUrl','wamUrl','editable','allowedIframeApiOrigins']:assert after.get(key)==before.get(key)
    after_config=config();expected_config=json.loads(json.dumps(before_config));expected_config['services']['play']['image']=IMAGE
    assert after_config==expected_config,'Only the play image may change in Compose configuration'
    assert all((inspect(name)['Id'],inspect(name)['State']['StartedAt'])==value for name,value in others.items())
    assert all(sha(Path(path).read_bytes())==digest for path,digest in frozen.items()) and sha(nginx.read_bytes())==nginx_hash
    proof={'passed':True,'image':IMAGE,'image_id':EXPECTED,'base_image_id':BASE,'active_game_connections_before':0,
      'only_play_service_replaced':True,'authentication_environment_unchanged':True,'frozen_school_patches_unchanged':True,
      'other_running_containers_unchanged':True,'custom_avatar_hash_verified':True,'existing_map_routing_and_auth_preserved':True,
      'nginx_unchanged':True,'rollback_image_and_override_retained':True,'browser_stage_passed':True,'loadApprovalFor400':False}
    (ROOT/'live-deployment.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof,indent=2))
except Exception as error:
    if swapped:atomically_replace(old_raw,metadata);restart_play('rollback-start.log')
    (ROOT/'live-failure.json').write_text(json.dumps({'errorType':type(error).__name__,'previous_image_restored':swapped},indent=2)+'\n')
    raise RuntimeError('Tutorial rollout stopped; previous play configuration retained or restored') from None
