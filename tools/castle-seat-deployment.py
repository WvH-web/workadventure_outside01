"""One client-only transition anchored in the accepted astronomy deployment."""
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import time
import urllib.request
import yaml

PRIVATE=Path('/opt/wvh-castle-seat-ui-retry/private')
ROLLED_BACK=Path('/opt/wvh-castle-seat-ui/private/deployment-ops.py')
ROLLED_BACK_SHA='c302bd9cffb4bd773bb643656b12f2633471e16f4cb436aadd904a63df5b1916'
BUILD=Path('/root/togetherWorkadventure/upgrades/20261111-seat-ui-r2')
RUNTIME=Path('/root/togetherWorkadventure/workadventure')
OVERRIDE=RUNTIME/'docker-compose.override.yaml'
NAME='workadventure-play-1'
BASE='sha256:ed2d18546b8f8dc5a2503edb98dddcb8e38efbac50c45b60b2124f9ad8f5f60b'
BASE_TAG='wvh-workadventure-play:1.34.5-school-v4-onboarding'
IMAGE='wvh-workadventure-play:1.34.5-school-v5-seat-ui-r2'
PREDECESSOR=Path('/opt/wvh-castle-stars/private/publication-ops.py')
PREDECESSOR_SHA='4a77f6f24b9e69afd60d5e9796e03c90262cba1b67c59fbebb97d8602c7dd1a2'
HELPER=Path('/opt/wvh-castle-school/private/game-host-publication-ops.py')
HELPER_SHA='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
OPS=Path('/tmp/wvh-castle-piano-ops.py')
OPS_SHA='4c67a5cc74678992fa8cf0f82c613075ba4eab07c76139bfd1882e9e36415fa3'
ORIGIN='https://together.deine-schule.com'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def encoded(value):return (json.dumps(value,indent=2)+'\n').encode()
def raw(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    return path.read_bytes()
def load(path):return json.loads(raw(path))
def write(path,value):
    assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(encoded(value))
    path.chmod(0o600)
def checked(path,digest):
    data=path.read_bytes();assert path.resolve()==path and sha(data)==digest
    scope={'__name__':'castle_seat_dependency','__file__':str(path)};exec(compile(data,str(path),'exec'),scope);return scope
def run(*args):
    result=subprocess.run(args,text=True,capture_output=True,timeout=150)
    if result.returncode:raise RuntimeError('Client deployment command failed; private details withheld')
    return result.stdout
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def image(name):return json.loads(run('docker','image','inspect',name))[0]
def config():return json.loads(subprocess.check_output(['docker','compose','config','--format','json'],cwd=RUNTIME,text=True))
def public(path):
    with urllib.request.urlopen(ORIGIN+path,timeout=25) as response:
        assert response.status==200;return response.read(4000001)
def image_override(data,before,after):
    text=data.decode();parsed=yaml.safe_load(text);assert parsed['services']['play']['image']==before
    node=yaml.compose(text,Loader=yaml.SafeLoader)
    for key in ['services','play','image']:
        assert isinstance(node,yaml.nodes.MappingNode)
        matches=[value for name,value in node.value if name.value==key];assert len(matches)==1;node=matches[0]
    assert isinstance(node,yaml.nodes.ScalarNode) and node.value==before
    updated=text[:node.start_mark.index]+json.dumps(after)+text[node.end_mark.index:]
    expected=copy.deepcopy(parsed);expected['services']['play']['image']=after;assert yaml.safe_load(updated)==expected
    return updated.encode()
def unchanged_except_play(before,after):
    assert set(before)==set(after) and NAME in before
    assert {k:v for k,v in before.items() if k!=NAME}=={k:v for k,v in after.items() if k!=NAME}
def baseline_projection(before,play):
    result=copy.deepcopy(before);assert NAME in result['services'];result['services'][NAME]=play;return result
def normalized_container(value):
    result=copy.deepcopy(value['Config'])
    for key in ['Hostname','Image']:result.pop(key,None)
    if 'Env' in result:result['Env']=sorted(result['Env'])
    for key in ['com.docker.compose.config-hash','com.docker.compose.image','wvh.seat-ui.source']:result.get('Labels',{}).pop(key,None)
    return result
def normalized_host(value):
    result=copy.deepcopy(value)
    if isinstance(result.get('Mounts'),list):result['Mounts']=sorted(result['Mounts'],key=lambda item:json.dumps(item,sort_keys=True))
    return result
def verify_restored_predecessor():
    previous=checked(ROLLED_BACK,ROLLED_BACK_SHA);directory=ROLLED_BACK.parent
    value=previous['load'](directory/'stage.json');rollback=previous['load'](directory/'rollback.json')
    assert sha(raw(directory/'stage.json'))=='74ff0ff6403fbcd1ad4ef6f67c1c20ddc124d0092a32de5bb9219e848cd78bd5'
    assert rollback['previousImageRestored'] is True and rollback['stageSha256']==sha(raw(directory/'stage.json'))
    assert not (directory/'deployment.json').exists()
    helper,ops=previous['common'](value)
    now=ops['baseline']();assert now==baseline_projection(value['before'],now['services'][NAME])
    unchanged_except_play(value['running'],helper['running']());assert helper['processes']()==value['processes']
    current=inspect(NAME);before=previous['load'](directory/'container-before.private.json')
    assert current['Image']==BASE and current['State']['Health']['Status']=='healthy'
    assert normalized_container(current)==normalized_container(before) and normalized_host(current['HostConfig'])==normalized_host(before['HostConfig'])
    assert OVERRIDE.read_bytes()==previous['raw'](directory/'override-before.private.yaml')
    print(json.dumps({'passed':True,'previousClientRestored':True,'allMapBytesAndOtherServicesPreserved':True,'onlyConfigurationOrderDiffers':True}))
def gate(proof,expected):
    assert proof['passed'] is True and proof['stageOnly'] is True and proof['imageId']==expected and proof['errors']==[]
    assert not proof['certificateChecksBypassed'] and not proof['networkResponsesSubstituted'] and not proof['realStudentAccountsUsed']
    assert len(proof['rows'])==2 and {row['mobile'] for row in proof['rows']}=={False,True}
    for row in proof['rows']:
        assert all(row[key] is True for key in ['nativeSpace','heldSpaceOnce','focusedSpaceOnce','focusedEnterOnce','pointerOrTouch',
            'nativeSidePanel','nativeRoomTravel','noTutorialRepeat','movementAfterTravel','temporaryAvatarPreserved'])
        assert row['button']['width']<=148 and row['button']['height']==44 and row['legacyPopupHeight']>=80
def inventory(helper):
    result=helper['evidence_inventory']()
    for directory in [HELPER.parent,PREDECESSOR.parent,ROLLED_BACK.parent]:
        for path in directory.iterdir():
            if path.is_file() and path.suffix in ['.json','.py','.yaml']:
                assert path.resolve()==path and path.stat().st_size<8000000;result[str(path)]=sha(path.read_bytes())
    for path in [HELPER,PREDECESSOR,OPS]:result[str(path)]=sha(path.read_bytes())
    return result
def validate_inventory(files):
    for name,digest in files.items():
        path=Path(name);assert path.resolve()==path and path.is_file() and sha(path.read_bytes())==digest
def replace_override(data):
    metadata=OVERRIDE.stat();target=OVERRIDE.with_name(OVERRIDE.name+'.seat-ui-staging');assert not target.exists()
    with target.open('xb') as handle:handle.write(data)
    target.chmod(stat.S_IMODE(metadata.st_mode));os.chown(target,metadata.st_uid,metadata.st_gid);target.replace(OVERRIDE)
def restart(label):
    with (PRIVATE/label).open('x') as log:
        subprocess.run(['docker','compose','up','-d','--no-deps','--pull','never','--wait','--wait-timeout','120','play'],
            cwd=RUNTIME,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=150)
def stage():
    os.umask(0o077);assert not PRIVATE.exists()
    verify_restored_predecessor()
    helper=checked(HELPER,HELPER_SHA);ops=checked(OPS,OPS_SHA)
    built=json.loads((BUILD/'build-result.json').read_text());assert built['passed'] and built['base_image_id']==BASE and built['image']==IMAGE
    assert json.loads((BUILD/'browser-stage/stopped.json').read_text())['passed']
    proof=json.loads(Path('/tmp/wvh-seat-stage-result.json').read_text());gate(proof,built['image_id'])
    assert inspect(NAME)['Image']==BASE and image(BASE_TAG)['Id']==BASE and image(IMAGE)['Id']==built['image_id']
    candidate=image(IMAGE);base=image(BASE)
    assert candidate['RootFS']['Layers'][:len(base['RootFS']['Layers'])]==base['RootFS']['Layers']
    for key in ['Env','Cmd','Entrypoint','WorkingDir','User','ExposedPorts']:assert candidate['Config'].get(key)==base['Config'].get(key)
    old=OVERRIDE.read_bytes();new=image_override(old,BASE_TAG,IMAGE)
    before=ops['baseline']();running=helper['running']();processes=helper['processes']();files=inventory(helper)
    assert before==ops['baseline']() and running==helper['running']() and processes==helper['processes']()
    PRIVATE.parent.mkdir(mode=0o755);PRIVATE.mkdir(mode=0o700)
    (PRIVATE/'override-before.private.yaml').write_bytes(old);(PRIVATE/'override-before.private.yaml').chmod(0o600)
    write(PRIVATE/'container-before.private.json',inspect(NAME));write(PRIVATE/'compose-before.private.json',config())
    write(PRIVATE/'browser-stage-proof.json',proof)
    frozen={item['Source']:sha(Path(item['Source']).read_bytes()) for item in inspect(NAME)['Mounts']}
    assert len(frozen)==6 and all(not item['RW'] for item in inspect(NAME)['Mounts'])
    write(PRIVATE/'stage.json',{'version':1,'before':before,'running':running,'processes':processes,'inventory':files,'mounts':frozen,
        'build':built,'overrideBeforeSha256':sha(old),'overrideAfterSha256':sha(new),'browserStageProofSha256':sha(raw(PRIVATE/'browser-stage-proof.json')),
        'sourceFiles':{**json.loads((BUILD/'prepared.json').read_text())['preserved'],**json.loads((BUILD/'prepared.json').read_text())['files']},
        'avatarSha256':sha(public('/resources/wvh/go-cart-avatar.png')),
        'predecessorAccepted':True,'createdAt':int(time.time())})
    print(json.dumps({'passed':True,'staged':True,'nativeBrowserStagePassed':True,'protectedEvidenceFiles':len(files),'liveServicesChanged':False}))
def common(value):
    helper=checked(HELPER,HELPER_SHA);ops=checked(OPS,OPS_SHA)
    validate_inventory(value['inventory'])
    assert helper['processes']()==value['processes']
    assert all(sha(Path(name).read_bytes())==digest for name,digest in value['mounts'].items())
    source=Path('/root/togetherWorkadventure/upgrades/20261107/source')
    assert all(sha((source/name).read_bytes())==digest for name,digest in value['sourceFiles'].items())
    assert sha(raw(PRIVATE/'override-before.private.yaml'))==value['overrideBeforeSha256']
    gate(load(PRIVATE/'browser-stage-proof.json'),value['build']['image_id'])
    assert sha(raw(PRIVATE/'browser-stage-proof.json'))==value['browserStageProofSha256']
    school=helper['load'](helper['STAGE']);helper['release_files'](helper['RELEASE'],school['files'])
    return helper,ops
def publish():
    value=load(PRIVATE/'stage.json');helper,ops=common(value)
    assert not (PRIVATE/'deployment.json').exists() and not (PRIVATE/'maintenance-used.json').exists()
    assert ops['baseline']()==value['before'] and helper['running']()==value['running'] and image(IMAGE)['Id']==value['build']['image_id']
    old=raw(PRIVATE/'override-before.private.yaml');assert OVERRIDE.read_bytes()==old
    assert config()==load(PRIVATE/'compose-before.private.json')
    approval=load(PRIVATE/'maintenance-approval.json');now=int(time.time())
    assert approval['approvedBy']=='current-user' and approval['scope']=='play-only-compact-castle-seating'
    assert approval['allowActiveSessions'] is True and approval['baseImageId']==BASE and approval['imageId']==value['build']['image_id']
    assert approval['overrideSha256']==sha(old) and type(approval['approvedAt']) is int and type(approval['expiresAt']) is int
    assert 0<approval['expiresAt']-approval['approvedAt']<=1800 and approval['approvedAt']<=now<approval['expiresAt']
    (PRIVATE/'maintenance-approval.json').replace(PRIVATE/'maintenance-used.json')
    swapped=False
    try:
        replace_override(image_override(old,BASE_TAG,IMAGE));swapped=True;restart('client-start.log')
        current=inspect(NAME);assert current['Image']==value['build']['image_id'] and current['State']['Health']['Status']=='healthy'
        before_container=load(PRIVATE/'container-before.private.json')
        assert normalized_container(current)==normalized_container(before_container) and normalized_host(current['HostConfig'])==normalized_host(before_container['HostConfig'])
        expected=config();before_config=load(PRIVATE/'compose-before.private.json');before_config['services']['play']['image']=IMAGE;assert expected==before_config
        after=ops['baseline']();assert after==baseline_projection(value['before'],after['services'][NAME])
        running=helper['running']();unchanged_except_play(value['running'],running);assert helper['processes']()==value['processes']
        validate_inventory(value['inventory']);assert sha(public('/resources/wvh/go-cart-avatar.png'))==value['avatarSha256']
        api=public('/iframe_api.js');assert b'setTemporaryWoka' in api and b'restoreWoka' in api;assert public('/ping')
        write(PRIVATE/'deployment.json',{'version':1,'passed':True,'after':after,'running':running,'imageId':value['build']['image_id'],
            'stageSha256':sha(raw(PRIVATE/'stage.json')),'overrideSha256':sha(OVERRIDE.read_bytes()),'onlyPlayServiceRestarted':True,
            'authenticationAndPusherPatchesPreserved':True,'oldCastleReplaced':False,'fullCastleApprovalFor400':False})
    except Exception as error:
        write(PRIVATE/'failed-candidate.private.json',inspect(NAME))
        if swapped:replace_override(old);restart('rollback-start.log')
        write(PRIVATE/'rollback.json',{'previousImageRestored':inspect(NAME)['Image']==BASE,'stageSha256':sha(raw(PRIVATE/'stage.json')),'errorType':type(error).__name__})
        raise RuntimeError('Client rollout stopped; previous client configuration retained or restored') from None
    verify()
def verify():
    value=load(PRIVATE/'stage.json');record=load(PRIVATE/'deployment.json');helper,ops=common(value)
    assert not (PRIVATE/'rollback.json').exists() and record['passed'] and record['stageSha256']==sha(raw(PRIVATE/'stage.json'))
    assert record['after']==baseline_projection(value['before'],record['after']['services'][NAME]) and ops['baseline']()==record['after']
    unchanged_except_play(value['running'],record['running']);assert helper['running']()==record['running']
    assert OVERRIDE.read_bytes()==image_override(raw(PRIVATE/'override-before.private.yaml'),BASE_TAG,IMAGE)
    assert sha(OVERRIDE.read_bytes())==record['overrideSha256'] and inspect(NAME)['Image']==record['imageId']==value['build']['image_id']
    assert inspect(NAME)['State']['Health']['Status']=='healthy' and sha(public('/resources/wvh/go-cart-avatar.png'))==value['avatarSha256']
    school=helper['load'](helper['STAGE']);helper['public_files'](school['files'])
    pending=not (PRIVATE/'acceptance.json').exists()
    if not pending:
        acceptance=load(PRIVATE/'acceptance.json');assert acceptance['proofSha256']==sha(raw(PRIVATE/'native-proof.json'))
        assert acceptance['deploymentSha256']==sha(raw(PRIVATE/'deployment.json'));validate_native(load(PRIVATE/'native-proof.json'),record['imageId'])
    print(json.dumps({'passed':True,'onlyPlayClientChanged':True,'allMapsAndOtherServicesUnchanged':True,'oldCastleReplaced':False,
        'nativeClientAcceptancePending':pending,'fullCastleApprovalFor400':False}))
    return value,record
def validate_native(proof,image_id):
    assert proof['passed'] and proof['normalMicrosoftPupils']==2 and proof['syntheticApprovedAccountsOnly'] is True
    assert proof['imageId']==image_id and proof['normalPublishedPreview'] is True and proof['networkResponsesSubstituted'] is False and proof['errors']==[]
    assert proof['oldCastleReplaced'] is False and proof['loadApprovalFor400'] is False
    assert len(proof['rows'])==2 and {row['mobile'] for row in proof['rows']}=={False,True}
    for row in proof['rows']:
        assert all(row[key] is True for key in ['nativeSpace','focusedSpaceOnce','focusedEnterOnce','pointerOrTouch','nativeSidePanel',
            'nativeRoomTravel','noTutorialRepeat','movementAfterTravel'])
        assert row['button']['width']<=148 and row['button']['height']==44
    assert proof['nativeAudioDecodedBothWays'] is True
    for before,after in zip(proof['nativeAudio']['before'],proof['nativeAudio']['after']):
        assert after['inbound']>before['inbound'] and after['energy']>before['energy']
def accept():
    value,record=verify();assert not (PRIVATE/'acceptance.json').exists()
    proof=json.loads(Path('/tmp/wvh-seat-client-native.json').read_text());validate_native(proof,record['imageId'])
    write(PRIVATE/'native-proof.json',proof);write(PRIVATE/'acceptance.json',{'version':1,'passed':True,
        'proofSha256':sha(raw(PRIVATE/'native-proof.json')),'deploymentSha256':sha(raw(PRIVATE/'deployment.json')),
        'normalMicrosoftPupils':2,'oldCastleReplaced':False,'fullCastleApprovalFor400':False})
    verify()
def main(action):
    assert action in ['stage','publish','verify','accept'];globals()[action]()
if __name__=='__main__':main('stage')
