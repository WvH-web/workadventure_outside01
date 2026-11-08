"""Add a native avatar collection; keep existing avatars and persist the data mount without restarting services."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request
import yaml

os.umask(0o077)
digest=lambda raw:hashlib.sha256(raw).hexdigest()
base=Path('/opt/wvh-event-avatars')
override=Path('/root/togetherWorkadventure/workadventure/docker-compose.override.yaml')
project=override.parent
native='/usr/src/play/src/pusher/data/woka.json'
container='workadventure-play-1'
expected_override='0fc41b364362d2ade3ab0c0e8eb578e6e47f1d52343aeb3fe8e94cc60f730c09'
expected_native='ee4e293835271700a2cb77da909c1065729ae43574bd065f63ab0512c6df85c6'
files={'mira':'su1 Student fmale 03.png','noah':'su1 Student male 05.png','lea':'Female 11-2.png',
    'amir':'Male 11-4.png','elin':'Teacher fmale 03.png','farah':'Headmaster fmale.png','otto':'Headmaster male.png',
    'sam':'Male 06-3.png','rosa':'Female 20-2.png','val':'Female 14-4.png','kai':'Male 14-1.png','jan':'Teacher male 04.png'}
collection=json.loads(Path('/tmp/wvh-event-avatars.json').read_text())
assert set(collection)=={'name','position','textures'}
assert collection['name']=='Eventgaeste' and collection['position']==1 and len(collection['textures'])==12
assert sorted(t['position'] for t in collection['textures'])==list(range(12))
assert {t['id']:urllib.parse.unquote(t['url']) for t in collection['textures']}=={
    'wvh-event-'+id+'-v1':'resources/characters/pipoya/'+file for id,file in files.items()}
assert all(set(t)=={'id','name','url','position'} and isinstance(t['name'],str) and 0<len(t['name'])<30 for t in collection['textures'])
assert base.resolve()==base and not override.is_symlink()
record=base/'private/deployment.json'
old_manifest=json.loads(record.read_text()) if record.exists() else None
old_override=override.read_bytes()
old_native=subprocess.check_output(['docker','exec',container,'cat',native])
if old_manifest:
    assert digest(old_override)==old_manifest['override_sha256'] and digest(old_native)==old_manifest['native_sha256']
    assert collection==old_manifest['collection'] and digest((base/'woka.json').read_bytes())==old_manifest['native_sha256']
    print(json.dumps({'unchanged':True,'native_avatar_collection':'Eventgaeste'}))
    raise SystemExit
assert not base.exists(),'Unreviewed avatar directory exists'
assert digest(old_override)==expected_override,'Compose override changed since review'
assert digest(old_native)==expected_native,'Native avatars changed since review'
original=json.loads(old_native)
runtime=json.loads(subprocess.check_output(['docker','inspect',container],text=True))[0]
assert runtime['Config']['Cmd']==['npm','run','start']
start=subprocess.check_output(['docker','exec',container,'node','-p',"require('/usr/src/play/package.json').scripts.start"],text=True)
assert 'tsx ./src/server.ts' in start and 'watch' not in start and 'nodemon' not in start
assert len(original['woka']['collections'])==1 and original['woka']['collections'][0]['name']=='default'
updated=copy.deepcopy(original);updated['woka']['collections'].append(collection)
assert updated['woka']['collections'][:-1]==original['woka']['collections']
for key in original:
    if key!='woka':assert updated[key]==original[key]
new_native=(json.dumps(updated,ensure_ascii=False,indent=2)+'\n').encode()
config=yaml.safe_load(old_override)
next_config=copy.deepcopy(config)
volumes=next_config['services']['play'].setdefault('volumes',[])
assert len(volumes)==5
volumes.append(str(base/'woka.json')+':'+native+':ro')
new_override=yaml.safe_dump(next_config,sort_keys=False,allow_unicode=True).encode()
assert yaml.safe_load(new_override)==next_config
compose=['docker','compose','-f',str(project/'docker-compose.yaml'),'-f',str(override),'config','--format','json']
before_compose=json.loads(subprocess.check_output(compose,cwd=project,stderr=subprocess.DEVNULL))
names=['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']
def states():
    result={name:(value['Id'],value['State']['StartedAt']) for name in names
        for value in json.loads(subprocess.check_output(['docker','inspect',name],text=True))}
    result['play_node_processes']=[line for line in subprocess.check_output(['docker','top',container,'-eo','pid,comm'],text=True).splitlines() if line.strip().endswith('node')]
    return result
before=states()
base.mkdir(mode=0o755);base.chmod(0o755)
private=base/'private';private.mkdir(mode=0o700);private.chmod(0o700)
(private/'override-before.yaml').write_bytes(old_override)
(private/'woka-before.json').write_bytes(old_native)
(base/'woka.json').write_bytes(new_native);(base/'woka.json').chmod(0o644)
def replace_native(raw,expected):
    code='''const fs=require('fs'),crypto=require('crypto');const p=process.argv[1],expected=process.argv[2];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(hash(fs.readFileSync(p))!==expected)throw Error('Concurrent avatar data change');
const data=fs.readFileSync(0),s=fs.statSync(p),tmp=p+'.wvh-event-staging';
fs.writeFileSync(tmp,data,{flag:'wx',mode:s.mode&511});fs.chownSync(tmp,s.uid,s.gid);fs.renameSync(tmp,p);'''
    subprocess.run(['docker','exec','--user','0','-i',container,'node','-e',code,native,expected],input=raw,check=True,stdout=subprocess.DEVNULL)
changed_native=False;changed_override=False
try:
    assert digest(override.read_bytes())==expected_override
    metadata=override.stat();temporary=override.with_name(override.name+'.event-staging')
    assert not temporary.exists()
    temporary.write_bytes(new_override);temporary.chmod(metadata.st_mode&0o777);os.chown(temporary,metadata.st_uid,metadata.st_gid)
    temporary.replace(override);changed_override=True
    after_compose=json.loads(subprocess.check_output(compose,cwd=project,stderr=subprocess.DEVNULL))
    before_volumes=before_compose['services']['play'].get('volumes',[])
    after_volumes=after_compose['services']['play'].pop('volumes')
    before_compose['services']['play'].pop('volumes',None)
    assert after_compose==before_compose,'Compose changed beyond the avatar mount'
    assert [v for v in after_volumes if v['target']!=native]==before_volumes
    assert len([v for v in after_volumes if v['target']==native and v['source']==str(base/'woka.json') and v['read_only']])==1
    replace_native(new_native,expected_native);changed_native=True
    tokens=json.loads(Path('/tmp/wvh-hall-qa.private.json').read_text())
    query=urllib.parse.urlencode({'roomUrl':'https://together.deine-schule.com/~/castle-preview/grosse-halle.wam'})
    request=urllib.request.Request('https://together.deine-schule.com/woka/list?'+query,headers={'Authorization':tokens['1']})
    with urllib.request.urlopen(request,timeout=20) as response:
        assert response.status==200 and json.load(response)==updated
    assert states()==before,'An unrelated service restarted during the avatar update'
    record.write_text(json.dumps({'override_sha256':digest(new_override),'native_sha256':digest(new_native),'collection':collection},indent=2)+'\n')
    print(json.dumps({'added_avatars':12,'existing_complete_avatars':24,'all_original_parts_preserved':True,
        'native_list_verified':True,'persistent_after_next_recreate':True,'services_not_restarted':True},indent=2))
except Exception:
    if changed_native:
        replace_native(old_native,digest(new_native))
    if changed_override and digest(override.read_bytes())==digest(new_override):
        override.write_bytes(old_override)
    raise RuntimeError('Avatar deployment failed; owned native/config changes rolled back') from None
