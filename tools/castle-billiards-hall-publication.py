"""Promote only the accepted new-castle game hall and its fresh school policy."""
import copy
import hashlib
import json
import os
from pathlib import Path

BASE=Path('/opt/wvh-castle-billiards-hall');PRIVATE=BASE/'private'
TABLE=Path('/opt/wvh-castle-billiards-table-r2/private')
PILOT=Path('/opt/wvh-castle-billiards-pilot-r3/private');UI=Path('/opt/wvh-castle-billiards-ui/private')
TARGET=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview/spielesaal.wam')
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
POLICY=PILOT.parent/'policy/admission.json'
CANONICAL='https://wvh-web.github.io/workadventure_outside01/castle/spielesaal.tmj'
CANDIDATE='https://wvh-web.github.io/workadventure_outside01/castle/spielesaal-billard2-preview.tmj'
ORIGIN='https://together.deine-schule.com'
PINS={UI/'publication-ops.py':'04cb4fe7cc43d44979ddd3d30d8d2e6977250674fc85355acaefed1e98d3653e',
 PILOT/'deployment-ops.py':'2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d',
 Path('/opt/wvh-castle-school/private/game-host-publication-ops.py'):'54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3',
 Path('/tmp/wvh-castle-piano-ops.py'):'4c67a5cc74678992fa8cf0f82c613075ba4eab07c76139bfd1882e9e36415fa3',
 TABLE/'acceptance-ops.py':'6fa4eebd4eafc2c4bc45ec0772edcf11f9da1ca5681f92e8bbfd8c2283f2b0a2'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
encoded=lambda value:(json.dumps(value,indent=2)+'\n').encode()


def checked(path):
    owner,mode=(1000,0o664) if path==Path('/tmp/wvh-castle-piano-ops.py') else (0,0o600)
    assert path.resolve()==path and path.stat().st_uid==owner and path.stat().st_mode&0o777==mode
    raw=path.read_bytes();assert sha(raw)==PINS[path]
    scope={'__name__':'billiards_hall_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope


def dependencies():return tuple(checked(path) for path in list(PINS)[:4])


def raw_private(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    return path.read_bytes()


def load(path):return json.loads(raw_private(path))


def write(name,raw):
    path=PRIVATE/name;assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)


def projection(before,wam_digest,manifest_digest):
    result=copy.deepcopy(before)
    assert str(TARGET) in result['files'] and str(MANIFEST) in result['files']
    result['files'][str(TARGET)]=wam_digest;result['files'][str(MANIFEST)]=manifest_digest;return result


def guarded_manifest(before,after,digest):
    assert len(before['files'])==16 and set(before['files'])==set(after['files'])
    expected=copy.deepcopy(before);expected['files']['spielesaal.wam']=digest;assert after==expected


def guarded_wrapper(before,after):
    assert before['mapUrl'].startswith(CANONICAL+'?v=')
    assert after['mapUrl']==CANONICAL+'?v=20261112-billard2-20261109-rounds1'
    old=copy.deepcopy(before);prefix='https://wvh-web.github.io/workadventure_outside01/castle/art/'
    assert old['metadata']['thumbnail'] in [prefix+'spielesaal-20261108-full/floor.png',prefix+'spielesaal-billard-20261112/floor.png']
    assert after['metadata']['thumbnail']==prefix+'spielesaal-billard-20261112/floor.png'
    old['metadata']['thumbnail']=after['metadata']['thumbnail']
    assert {k:v for k,v in old.items() if k not in ['mapUrl','areas']}=={k:v for k,v in after.items() if k not in ['mapUrl','areas']}
    assert len(before['areas'])==len(after['areas'])==3
    geometries={'lesekamin':(64,272,288,256),'fensterleser':(544,176,288,256),'buchclub':(544,432,288,208)}
    for original,current in zip(before['areas'],after['areas']):
        previous=copy.deepcopy(original)
        if current['name']=='Billard und Zuschauer':
            assert previous['name'] in ['Zuschauernische','Billard und Zuschauer'];previous['name']=current['name']
        assert {k:v for k,v in previous.items() if k not in ['x','y','width','height']}=={k:v for k,v in current.items() if k not in ['x','y','width','height']}
        assert len(current['properties'])==1;prop=current['properties'][0]
        assert prop['type']=='livekitRoomProperty' and prop['roomName'].startswith('school-castle-v2-spielesaal-area-')
        group=prop['roomName'].removeprefix('school-castle-v2-spielesaal-area-')
        assert tuple(current[key] for key in ['x','y','width','height'])==geometries.pop(group)
    assert not geometries


def atomic(path,raw):
    assert path in [TARGET,MANIFEST,POLICY] and path.resolve()==path and path.is_file()
    temporary=path.with_name(path.name+'.billiards-hall');assert not temporary.exists() and not temporary.is_symlink()
    metadata=path.stat()
    with temporary.open('xb') as handle:handle.write(raw);handle.flush();os.fsync(handle.fileno())
    temporary.chmod(metadata.st_mode&0o777);os.chown(temporary,metadata.st_uid,metadata.st_gid);temporary.replace(path)


def inventory(style,previous):
    names=set(load(PILOT/'before.json')['inventory'])|set(load(UI/'before.json')['inventory'])|set(load(TABLE/'stage.json')['inventory'])
    for directory in [PILOT,UI,TABLE]:names.update(str(path) for path in directory.iterdir() if path.is_file())
    names.update(str(path) for path in PINS);names.discard(str(TARGET));names.discard(str(MANIFEST));names.discard(str(POLICY))
    result={}
    for name in names:
        path=Path(name);assert path.resolve()==path and path.is_file();result[name]=sha(path.read_bytes())
    previous['validate_files'](result);return result


def public_assets(stage,style,previous):
    assert sha((style['PUBLIC']/'billiards.css').read_bytes())==style['CSS_SHA']
    release=Path(load(PILOT/'deployment.json')['release']);style['public'](previous,release)
    parent=checked(TABLE/'acceptance-ops.py')['operator']()['parent']()
    for name,digest in stage['candidateFiles'].items():
        assert sha(parent['public']('https://wvh-web.github.io/workadventure_outside01/'+name))==digest
    return parent['public']


def prepare(wam_sha):
    os.umask(0o077);assert not BASE.exists()
    style,previous,helper,ops=dependencies();style['verify']();checked(TABLE/'acceptance-ops.py')['verify']()
    clean=load(TABLE/'cleanup.json');probe=load(TABLE/'stage.json');assert clean['passed'] and clean['probeRemoved']
    assert ops['baseline']()==probe['before'] and len(list(TARGET.parent.iterdir()))==16
    source=Path('/tmp/wvh-castle-billiards-hall.wam');assert source.resolve()==source and source.is_file() and source.stat().st_size<20000
    raw=source.read_bytes();assert sha(raw)==wam_sha;desired=json.loads(raw);old=TARGET.read_bytes();guarded_wrapper(json.loads(old),desired)
    manifest_raw=raw_private(MANIFEST);manifest=json.loads(manifest_raw)
    assert manifest['files']['spielesaal.wam']==sha(old)
    for name,digest in manifest['files'].items():assert sha((TARGET.parent/name).read_bytes())==digest
    updated=copy.deepcopy(manifest);updated['files']['spielesaal.wam']=sha(raw);guarded_manifest(manifest,updated,sha(raw))
    policy=POLICY.read_bytes();assert json.loads(policy)['mode']=='pilot' and sha(policy)==load(PILOT/'deployment.json')['policySha256']
    after_policy=encoded({'version':1,'mode':'school','accounts':[]})
    parent=checked(TABLE/'acceptance-ops.py')['operator']()['parent']();canonical=parent['public'](CANONICAL)
    assert sha(canonical)!=probe['files']['castle/spielesaal-billard2-preview.tmj']
    before=ops['baseline']();running=helper['running']();processes=helper['processes']();frozen=inventory(style,previous)
    BASE.mkdir(mode=0o700);PRIVATE.mkdir(mode=0o700)
    for name,content in [('publication-ops.py',Path(__file__).read_bytes()),('wam-before.json',old),('wam-after.json',raw),
      ('manifest-before.json',manifest_raw),('manifest-after.json',encoded(updated)),('policy-before.json',policy),('policy-after.json',after_policy),('canonical-before.tmj',canonical)]:write(name,content)
    value={'version':1,'passed':True,'before':before,'running':running,'processes':processes,'inventory':frozen,
      'candidateFiles':probe['files'],'candidateMapSha256':probe['files']['castle/spielesaal-billard2-preview.tmj'],
      'originalCanonicalSha256':sha(canonical),'wamBeforeSha256':sha(old),'wamAfterSha256':sha(raw),
      'manifestBeforeSha256':sha(manifest_raw),'manifestAfterSha256':sha(encoded(updated)),
      'policyBeforeSha256':sha(policy),'policyAfterSha256':sha(after_policy)}
    write('stage.json',encoded(value));common(value,False)
    print(json.dumps({'passed':True,'preparedOnly':True,'liveMapsChanged':False,'schoolPolicyChanged':False,'serviceRestarted':False}))


def common(stage,published):
    style,previous,helper,ops=dependencies()
    assert helper['running']()==stage['running'] and helper['processes']()==stage['processes'];previous['validate_files'](stage['inventory'])
    for stem in ['wam','manifest','policy']:
        for state in ['before','after']:assert sha(raw_private(PRIVATE/(stem+'-'+state+'.json')))==stage[stem+state.title()+'Sha256']
    assert sha(raw_private(PRIVATE/'canonical-before.tmj'))==stage['originalCanonicalSha256']
    guarded_wrapper(load(PRIVATE/'wam-before.json'),load(PRIVATE/'wam-after.json'))
    guarded_manifest(load(PRIVATE/'manifest-before.json'),load(PRIVATE/'manifest-after.json'),stage['wamAfterSha256'])
    assert load(PRIVATE/'policy-after.json')=={'version':1,'mode':'school','accounts':[]}
    deployment=load(PILOT/'deployment.json');container=previous['inspect'](previous['NAME'])
    assert container['Id']==deployment['containerId'] and container['State']['Health']['Status']=='healthy'
    assert sha(raw_private(PILOT/'runtime.env'))==deployment['runtimeSha256']
    release=Path(deployment['release']);files=load(PILOT/'before.json')['files']
    previous['validate_files']({str(release/name):digest for name,digest in files.items()})
    assert not any(path.is_symlink() for path in release.rglob('*'))
    fetch=public_assets(stage,style,previous)
    assert sha(fetch(CANONICAL))==(stage['candidateMapSha256'] if published else stage['originalCanonicalSha256'])
    return style,previous,helper,ops,fetch


def publish():
    stage=load(PRIVATE/'stage.json');assert not (PRIVATE/'deployment.json').exists() and not (PRIVATE/'rollback.json').exists()
    style,previous,helper,ops,fetch=common(stage,True)
    assert ops['baseline']()==stage['before']
    for target,stem in [(TARGET,'wam'),(MANIFEST,'manifest'),(POLICY,'policy')]:assert target.read_bytes()==raw_private(PRIVATE/(stem+'-before.json'))
    changed=[]
    try:
        for target,stem in [(POLICY,'policy'),(TARGET,'wam'),(MANIFEST,'manifest')]:
            atomic(target,raw_private(PRIVATE/(stem+'-after.json')));changed.append((target,stem))
        assert ops['baseline']()==projection(stage['before'],stage['wamAfterSha256'],stage['manifestAfterSha256'])
        assert helper['running']()==stage['running'] and helper['processes']()==stage['processes'];previous['validate_files'](stage['inventory'])
        assert sha(fetch(ORIGIN+'/map-storage/castle-preview/spielesaal.wam'))==stage['wamAfterSha256']
        info=json.loads(fetch(ORIGIN+'/map?playUri=https%3A%2F%2Ftogether.deine-schule.com%2F~%2Fcastle-preview%2Fspielesaal.wam'))
        assert info['authenticationMandatory'] is True and info['wamUrl']==ORIGIN+'/map-storage/castle-preview/spielesaal.wam'
        write('deployment.json',encoded({'version':1,'passed':True,'stageSha256':sha(raw_private(PRIVATE/'stage.json')),
          'onlyPreviewMapChanged':'spielesaal.wam','schoolPolicyEnabled':True,'serviceRestarted':False,'oldCastleReplaced':False,'nativeNormalAcceptancePending':True,'fullCastleApprovalFor400':False}))
    except Exception:
        for target,stem in reversed(changed):
            assert target.read_bytes()==raw_private(PRIVATE/(stem+'-after.json'));atomic(target,raw_private(PRIVATE/(stem+'-before.json')))
        assert ops['baseline']()==stage['before'] and helper['running']()==stage['running'] and helper['processes']()==stage['processes']
        write('rollback.json',encoded({'passed':True,'serverFilesRestored':True,'canonicalSourceRestoreRequired':True}));raise
    verify()


def verify():
    stage=load(PRIVATE/'stage.json');record=load(PRIVATE/'deployment.json');style,previous,helper,ops,fetch=common(stage,True)
    assert record['passed'] and not (PRIVATE/'rollback.json').exists() and record['stageSha256']==sha(raw_private(PRIVATE/'stage.json'))
    assert ops['baseline']()==projection(stage['before'],stage['wamAfterSha256'],stage['manifestAfterSha256'])
    for target,stem in [(TARGET,'wam'),(MANIFEST,'manifest'),(POLICY,'policy')]:assert target.read_bytes()==raw_private(PRIVATE/(stem+'-after.json'))
    assert sha(fetch(ORIGIN+'/map-storage/castle-preview/spielesaal.wam'))==stage['wamAfterSha256']
    print(json.dumps({'passed':True,'onlyPreviewMapChanged':'spielesaal.wam','schoolPolicyEnabled':True,'otherMapsAndServicesUnchanged':True,
      'nativeNormalAcceptancePending':not (PRIVATE/'native-acceptance.json').exists(),'oldCastleReplaced':False,'fullCastleApprovalFor400':False}))


if __name__=='__main__':verify()
