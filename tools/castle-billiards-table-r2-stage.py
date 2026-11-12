"""Second, isolated native table probe; retain the exact first probe and all normal maps."""
import copy
import hashlib
import json
import os
from pathlib import Path
import time

BASE=Path('/opt/wvh-castle-billiards-table-r2');PRIVATE=BASE/'private'
FIRST=Path('/opt/wvh-castle-billiards-table/private')
FIRST_SHA='3615983189238dc8a2142fb3da727b4791bf37f9904d3c9228c77c174ac480e5'
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview');PROBE=STORAGE/'billardprobe2.wam'
WEB='https://wvh-web.github.io/workadventure_outside01/';ORIGIN='https://together.deine-schule.com'
NEW={'castle/spielesaal-billard2-preview.tmj','castle/art/spielesaal-billard-20261112/fronts-r2.png'}
SHARED={'castle/billiards-preview.bundle.js','castle/billiards-preview.bundle.manifest.json',
 *['castle/art/spielesaal-billard-20261112/'+name+'.png' for name in ['floor','marker','fire']]}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
encoded=lambda value:(json.dumps(value,indent=2)+'\n').encode()

def parent():
    path=FIRST/'stage-ops.py';assert path.resolve()==path and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();assert sha(raw)==FIRST_SHA
    scope={'__name__':'billiards_first_probe_helpers','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope

def load(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    return json.loads(path.read_text())

def write(name,raw):
    path=PRIVATE/name;assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)

def publication(value):
    assert set(value)=={'version','sourceCommit','publicationCommit','previousPublicationCommit','files','onlyAdditionalPublicFiles'}
    assert value['version']==1 and value['onlyAdditionalPublicFiles'] is True and set(value['files'])==NEW
    for key in ['sourceCommit','publicationCommit','previousPublicationCommit']:
        assert len(value[key])==40 and all(char in '0123456789abcdef' for char in value[key])
    assert all(len(digest)==64 and all(char in '0123456789abcdef' for char in digest) for digest in value['files'].values())
    return value

def wrapper(original,map,published):
    result=copy.deepcopy(original)
    assert set(result)=={'version','mapUrl','areas','entities','entityCollections','settings','metadata'}
    assert result['version']=='2.1.0' and result['entities']=={} and result['entityCollections']==[]
    assert result['mapUrl']==WEB+'castle/spielesaal.tmj?v=20261112-billard2-20261109-rounds1'
    assert result['settings']=={'megaphone':{'enabled':False,'title':'','scope':'ROOM'}}
    props=lambda value:{p['name']:p['value'] for p in value.get('properties',[])}
    assert props(map)['castleMapId']=='spielesaal' and props(map)['castleRevision']=='20261112-billard2'
    objects=[item for layer in map['layers'] for item in layer.get('objects',[])]
    groups={props(item)['conversationGroup']:item for item in objects if 'conversationGroup' in props(item)}
    seats={props(item)['seatId']:props(item) for item in objects if 'seatId' in props(item)}
    assert len(groups)==len(result['areas'])==3 and len(seats)==14
    assert seats['billard-west']['seatY']==seats['billard-east']['seatY']==338
    seen=set()
    for area in result['areas']:
        assert len(area['properties'])==1;prop=area['properties'][0];assert prop['type']=='livekitRoomProperty'
        room=prop['roomName'];assert room.startswith('school-castle-v2-spielesaal-area-')
        group=room.removeprefix('school-castle-v2-spielesaal-area-');assert group in groups and group not in seen;seen.add(group)
        assert all(area[key]==groups[group][key] for key in ['x','y','width','height'])
        prop['roomName']='school-castle-billiards-qa2-area-'+group
    result['mapUrl']=WEB+'castle/spielesaal-billard2-preview.tmj?v='+published['publicationCommit'][:12];return result

def with_probe(before,digest):
    result=copy.deepcopy(before);assert str(PROBE) not in result['files'];result['files'][str(PROBE)]=digest;return result

def dependencies():
    first=parent();style,previous,helper,ops=first['dependencies']()
    old=load(FIRST/'stage.json');clean=load(FIRST/'cleanup.json')
    assert old['passed'] and clean['passed'] and clean['probeRemoved'] and clean['stageSha256']==sha((FIRST/'stage.json').read_bytes())
    assert not (STORAGE/'billardprobe.wam').exists()
    previous['validate_files'](old['inventory'])
    assert sha((FIRST/'publication.json').read_bytes())==old['publicationSha256']
    assert sha((FIRST/'probe-input.json').read_bytes())==old['wamInputSha256']
    baseline=ops['baseline']()
    if PROBE.exists():baseline=without_probe(baseline)
    assert old['before']==baseline
    return first,style,previous,helper,ops

def without_probe(value):
    result=copy.deepcopy(value);assert str(PROBE) in result['files'];del result['files'][str(PROBE)];return result

def resources(first,published):
    old=first['publication'](load(FIRST/'publication.json'));assert set(old['files'])>=SHARED
    values={**{name:old['files'][name] for name in SHARED},**published['files']};assert len(values)==7
    for name,digest in values.items():assert sha(first['public'](WEB+name+'?v='+published['publicationCommit'][:12]))==digest
    return values

def stage(publication_sha,wam_sha):
    os.umask(0o077);first,style,previous,helper,ops=dependencies();style['verify']()
    assert not BASE.exists() and not PROBE.exists() and STORAGE.resolve()==STORAGE and len(list(STORAGE.iterdir()))==16
    publication_file=Path('/tmp/wvh-castle-billiards-r2-publication.json');wam_file=Path('/tmp/wvh-castle-billiards-r2-probe.wam')
    for file,digest in [(publication_file,publication_sha),(wam_file,wam_sha)]:assert file.resolve()==file and file.is_file() and file.stat().st_size<20000 and sha(file.read_bytes())==digest
    published=publication(json.loads(publication_file.read_bytes()));files=resources(first,published)
    map=json.loads(first['public'](WEB+'castle/spielesaal-billard2-preview.tmj?v='+published['publicationCommit'][:12]))
    raw=encoded(wrapper(json.loads(wam_file.read_bytes()),map,published));before=ops['baseline']();running=helper['running']();processes=helper['processes']()
    frozen={str(path):sha(path.read_bytes()) for directory in [FIRST,first['UI'],first['ACCEPT'].parent] for path in directory.iterdir() if path.is_file()}
    assert all(Path(name).resolve()==Path(name) for name in frozen)
    BASE.mkdir(mode=0o700);PRIVATE.mkdir(mode=0o700)
    write('stage-ops.py',Path(__file__).read_bytes());write('publication.json',publication_file.read_bytes());write('probe-input.json',wam_file.read_bytes())
    wrote=False;identity=None
    try:
        with PROBE.open('xb') as handle:
            wrote=True;value=os.fstat(handle.fileno());identity=(value.st_dev,value.st_ino);handle.write(raw)
        PROBE.chmod(0o644);os.chown(PROBE,1000,1000)
        after=with_probe(before,sha(raw));assert ops['baseline']()==after and helper['running']()==running and helper['processes']()==processes;previous['validate_files'](frozen)
        for _ in range(20):
            try:
                if sha(first['public'](ORIGIN+'/map-storage/castle-preview/billardprobe2.wam'))==sha(raw):break
            except Exception:pass
            time.sleep(.2)
        else:raise RuntimeError('Second protected probe did not become ready')
        info=json.loads(first['public'](ORIGIN+'/map?playUri=https%3A%2F%2Ftogether.deine-schule.com%2F~%2Fcastle-preview%2Fbillardprobe2.wam'))
        assert info['wamUrl']==ORIGIN+'/map-storage/castle-preview/billardprobe2.wam' and info.get('mapUrl') is None and info['authenticationMandatory'] is True
        write('stage.json',encoded({'version':1,'passed':True,'before':before,'after':after,'running':running,'processes':processes,'inventory':frozen,'files':files,
          'probeSha256':sha(raw),'publicationSha256':sha(publication_file.read_bytes()),'wamInputSha256':sha(wam_file.read_bytes()),
          'authenticationMandatory':True,'separateVoiceNamespace':True,'existingMapsChanged':False,'serviceRestarted':False}))
    except Exception:
        if wrote and PROBE.exists():
            value=PROBE.stat();assert PROBE.resolve()==PROBE and (value.st_dev,value.st_ino)==identity and raw.startswith(PROBE.read_bytes());PROBE.unlink()
        assert ops['baseline']()==before and helper['running']()==running and helper['processes']()==processes;previous['validate_files'](frozen);raise
    verify()

def verify():
    value=load(PRIVATE/'stage.json');first,style,previous,helper,ops=dependencies()
    assert value['passed'] and not (PRIVATE/'cleanup.json').exists() and PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==value['probeSha256']
    assert ops['baseline']()==value['after']==with_probe(value['before'],value['probeSha256'])
    assert helper['running']()==value['running'] and helper['processes']()==value['processes'];previous['validate_files'](value['inventory'])
    assert sha((PRIVATE/'publication.json').read_bytes())==value['publicationSha256'] and sha((PRIVATE/'probe-input.json').read_bytes())==value['wamInputSha256']
    published=publication(load(PRIVATE/'publication.json'));assert resources(first,published)==value['files']
    map=json.loads(first['public'](WEB+'castle/spielesaal-billard2-preview.tmj?v='+published['publicationCommit'][:12]))
    assert json.loads(PROBE.read_bytes())==wrapper(load(PRIVATE/'probe-input.json'),map,published)
    assert sha(first['public'](ORIGIN+'/map-storage/castle-preview/billardprobe2.wam'))==value['probeSha256']
    print(json.dumps({'passed':True,'additionalAuthenticatedProbe':True,'secondCandidate':True,'firstEvidenceRetained':True,'existingSixteenMapsUnchanged':True,
      'noServiceRestart':True,'normalGameHallNotYetActivated':True,'fullCastleApprovalFor400':False}))

def cleanup():
    verify();value=load(PRIVATE/'stage.json');first,style,previous,helper,ops=dependencies()
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==value['probeSha256'];PROBE.unlink()
    assert ops['baseline']()==value['before'] and helper['running']()==value['running'] and helper['processes']()==value['processes'];previous['validate_files'](value['inventory'])
    style['verify']();write('cleanup.json',encoded({'passed':True,'probeRemoved':True,'stageSha256':sha((PRIVATE/'stage.json').read_bytes()),'existingPlatformRetained':True}))
    print(json.dumps({'passed':True,'secondTemporaryProbeRemoved':True,'existingMapsAndServicesUnchanged':True}))

if __name__=='__main__':verify()
