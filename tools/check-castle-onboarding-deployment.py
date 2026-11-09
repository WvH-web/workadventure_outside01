"""Read-only post-rollout evidence: exact client configuration and preserved maps."""
import ast
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import yaml

os.umask(0o077)
root=Path('/root/togetherWorkadventure/upgrades/20261109-onboarding')
runtime=Path('/root/togetherWorkadventure/workadventure')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
proof=json.loads((root/'live-deployment.json').read_text())
assert proof['passed'] and proof['only_play_service_replaced'] and proof['existing_map_routing_and_auth_preserved']
client=inspect('workadventure-play-1')
assert client['Image']==proof['image_id'] and client['State']['Health']['Status']=='healthy'
source=ast.parse(Path('/tmp/wvh-onboarding-deploy-source.py').read_text())
editor=next(node for node in source.body if isinstance(node,ast.FunctionDef) and node.name=='image_override')
scope={'copy':copy,'json':json,'yaml':yaml}
exec(compile(ast.Module(body=[editor],type_ignores=[]),'checked-override-editor','exec'),scope)
before=(root/'override-before-onboarding.private.json').read_bytes()
current=(runtime/'docker-compose.override.yaml').read_bytes()
assert current==scope['image_override'](before,'wvh-workadventure-play:1.34.5-school-v3',proof['image'])
grant=json.loads((root/'maintenance-window-used.private.json').read_text())
assert grant['override_sha256']==sha(before) and grant['image_id']==client['Image']
assert not (root/'maintenance-window.private.json').exists()
assert all(inspect(name)['State']['Running'] for name in [
    'workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio',
    'wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board'])
assert not run('docker','ps','-q','--filter','label=com.docker.compose.project=wvh-castle-client-20261109').strip()
maps=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
manifest=json.loads(Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json').read_text())['files']
assert len(manifest)==16 and set(p.name for p in maps.iterdir())==set(manifest)
assert all(sha((maps/name).read_bytes())==digest for name,digest in manifest.items())
nginx=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
nginx_hash=sha(nginx.read_bytes())
manifest_matches=[]
for filename,key in [('/opt/wvh-castle-content/private/deployment.json','nginx_sha256'),
    ('/opt/wvh-castle-school/private/deployment.json','nginx_after_sha256'),
    ('/opt/wvh-castle-chess/private/deployment.json','nginx_after_sha256'),
    ('/opt/wvh-castle-art/private/deployment.json','nginx_after_sha256')]:
    manifest_matches.append(json.loads(Path(filename).read_text())[key]==nginx_hash)
started=datetime.fromisoformat(client['State']['StartedAt'].replace('Z','+00:00')).timestamp()
if 'nginx_sha256' in proof:
    assert proof['nginx_sha256']==nginx_hash
else:
    # Earlier rollout evidence asserted a byte-identical before/after hash without recording it.
    assert proof['nginx_unchanged'] and nginx.stat().st_mtime<started
with urllib.request.urlopen('https://together.deine-schule.com/ping',timeout=20) as response:assert response.status==200
browser_raw=Path('/tmp/wvh-onboarding-live-result.json').read_bytes();browser=json.loads(browser_raw)
assert browser['passed'] and browser['productionClient'] and browser['syntheticSchoolTestAccountsOnly'] and browser['errors']==[]
assert len(browser['results'])==2 and {value['account'] for value in browser['results']}=={'A','B'}
assert all(all(value[key] is True for key in ['normalMicrosoftLogin','offeredAtEntry','rememberedOrMigrated',
    'manualReplayVisible','leavingDuringTutorialDoesNotRepeat','reloadDoesNotRepeat','movementWorks',
    'temporaryAvatarSwapAndRestoreWorks','freshProtectedPupilAccess']) for value in browser['results'])
assert any(value['mobileTouchContext'] and value['explicitMobileCompletionWorks'] for value in browser['results'])
assert any(not value['mobileTouchContext'] and value['explicitDesktopSkipWorks'] for value in browser['results'])
tables_raw=Path('/tmp/wvh-native-tables-result.json').read_bytes();tables=json.loads(tables_raw)
assert tables['passed'] and tables['errors']==[] and tables['chess']['normalMicrosoftPupils']==2
assert tables['chess']['automaticOnSitting'] and tables['chess']['entireMobileBoardAndSeatActionsVisible']
assert tables['choice']['syntheticParticipants']==3 and tables['choice']['lastStandingResetsChoice']
(root/'live-browser-result.json').write_bytes(browser_raw)
(root/'live-table-result.json').write_bytes(tables_raw)
result={'passed':True,'checked_at_utc':datetime.now(timezone.utc).isoformat(),'image_id':client['Image'],
    'client_started_at_utc':client['State']['StartedAt'],'client_healthy':True,
    'only_approved_image_scalar_changed':True,'maintenance_approval_consumed':True,
    'all_16_preview_map_files_unchanged':True,'existing_support_services_running':True,
    'rollout_preserved_web_configuration':True,'nginx_matches_historic_manifests':all(manifest_matches),
    'web_config_modified_before_client_restart':nginx.stat().st_mtime<started,'nginx_sha256':nginx_hash,
    'warnings':[] if all(manifest_matches) else ['pre-existing-web-manifest-drift-no-config-or-manifest-edits'],
    'normal_microsoft_pupils_tested':2,'desktop_and_mobile_tutorial_passed':True,
    'native_shared_table_and_complete_mobile_board_passed':True,
    'live_browser_evidence_sha256':sha(browser_raw),'live_table_evidence_sha256':sha(tables_raw),
    'temporary_stage_stopped':True,'loadApprovalFor400':False}
(root/'post-rollout-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
