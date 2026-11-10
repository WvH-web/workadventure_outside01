"""Read-only baseline for a scoped round-directory service update; no credentials printed."""
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request

sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
base=Path('/opt/wvh-castle-school')
record_path=base/'private/deployment.json';record=json.loads(record_path.read_text())
release=Path(record['release']);assert release.resolve()==release and release.parent==base/'releases'
assert all(sha((release/name).read_bytes())==digest for name,digest in record['files'].items())
assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(record['files'])
school=inspect('wvh-castle-school')
assert school['State']['Health']['Status']=='healthy'
assert any(mount['Source']==str(release) and not mount['RW'] for mount in school['Mounts'])
protected=[Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php'),
 Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php')]
states={}
for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio',
 'wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board']:
    value=inspect(name);assert value['State']['Running']
    states[name]={'id':value['Id'],'started':value['State']['StartedAt'],'image':value['Image'],
      'health':value['State'].get('Health',{}).get('Status')}
with urllib.request.urlopen('https://together.deine-schule.com/castle-school/health',timeout=15) as response:
    assert response.status==200 and json.load(response)=={'ready':True}
print(json.dumps({'passed':True,'release':str(release),'record_sha256':sha(record_path.read_bytes()),
 'files':record['files'],'historical_nginx_hash':record.get('nginx_after_sha256'),
 'protected_files':{str(path):sha(path.read_bytes()) for path in protected},'services':states,
 'stage_containers':run('docker','ps','-a','--filter','label=wvh.component=castle-rounds-stage','--format','{{.Names}}').split(),
 'local_stage_port_in_use':bool(run('ss','-ltnH','sport = :13212').strip()),
 'hall_inherited_healthcheck_uses_client_port':any('3000' in value for value in inspect('wvh-hall-audio')['Config']['Healthcheck']['Test']),
 'hall_real_health':json.load(urllib.request.urlopen('https://together.deine-schule.com/castle-audio/health',timeout=15)),
 'changes_made':False},indent=2))
