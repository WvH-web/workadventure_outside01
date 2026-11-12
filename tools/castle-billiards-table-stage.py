"""One additional authenticated game-hall probe, with its own native voice rooms."""
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import time
import urllib.request

BASE=Path('/opt/wvh-castle-billiards-table');PRIVATE=BASE/'private'
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview');PROBE=STORAGE/'billardprobe.wam'
UI=Path('/opt/wvh-castle-billiards-ui/private')
UI_SHA='04cb4fe7cc43d44979ddd3d30d8d2e6977250674fc85355acaefed1e98d3653e'
ACCEPT=Path('/opt/wvh-castle-billiards-pilot-r3/private/acceptance-ops.py')
ACCEPT_SHA='8c3c6533417165ce7a9e520736c5dd9c8a18e5243a4fbcbfcc4eb64cfee5c6e2'
WEB='https://wvh-web.github.io/workadventure_outside01/';ORIGIN='https://together.deine-schule.com'
FILES={'castle/spielesaal-billard-preview.tmj','castle/billiards-preview.bundle.js','castle/billiards-preview.bundle.manifest.json',
 *['castle/art/spielesaal-billard-20261112/'+name+'.png' for name in ['floor','fronts','marker','fire']]}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
encoded=lambda value:(json.dumps(value,indent=2)+'\n').encode()

def checked(path,digest):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    raw=path.read_bytes();assert sha(raw)==digest;scope={'__name__':'billiards_table_dependency','__file__':str(path)}
    exec(compile(raw,str(path),'exec'),scope);return scope

def load(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    return json.loads(path.read_text())

def write(name,raw):
    path=PRIVATE/name;assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)

def public(url):
    with urllib.request.urlopen(url,timeout=20) as response:
        assert response.status==200;raw=response.read(2000001);assert len(raw)<=2000000;return raw

def publication(value):
    assert set(value)=={'version','sourceCommit','publicationCommit','previousPublicationCommit','files','onlyAdditionalPublicFiles'}
    assert value['version']==1 and value['onlyAdditionalPublicFiles'] is True and set(value['files'])==FILES
    for key in ['sourceCommit','publicationCommit','previousPublicationCommit']:
        assert len(value[key])==40 and all(char in '0123456789abcdef' for char in value[key])
    assert all(len(digest)==64 and all(char in '0123456789abcdef' for char in digest) for digest in value['files'].values())
    return value

def wrapper(original,map,published):
    result=copy.deepcopy(original)
    assert set(result)=={'version','mapUrl','areas','entities','entityCollections','settings','metadata'}
    assert result['version']=='2.1.0' and result['entities']=={} and result['entityCollections']==[]
    assert result['mapUrl']==WEB+'castle/spielesaal.tmj?v=20261112-billard1-20261109-rounds1'
    assert result['settings']=={'megaphone':{'enabled':False,'title':'','scope':'ROOM'}}
    objects=[item for layer in map['layers'] for item in layer.get('objects',[])]
    groups={item['name']:item for item in objects if any(prop['name']=='conversationGroup' for prop in item.get('properties',[]))}
    seats=[item for item in objects if any(prop['name']=='seatId' for prop in item.get('properties',[]))]
    assert len(groups)==len(result['areas'])==3 and len(seats)==14
    seen=set()
    for area in result['areas']:
        assert len(area['properties'])==1;prop=area['properties'][0];assert prop['type']=='livekitRoomProperty'
        room=prop['roomName'];assert room.startswith('school-castle-v2-spielesaal-area-')
        group=room.removeprefix('school-castle-v2-spielesaal-area-');name='group-'+group
        assert name in groups and name not in seen;seen.add(name)
        assert all(area[key]==groups[name][key] for key in ['x','y','width','height'])
        prop['roomName']='school-castle-billiards-qa-area-'+group
    result['mapUrl']=WEB+'castle/spielesaal-billard-preview.tmj?v='+published['publicationCommit'][:12]
    return result

def with_probe(before,digest):
    result=copy.deepcopy(before);assert str(PROBE) not in result['files'];result['files'][str(PROBE)]=digest;return result

def dependencies():
    style=checked(UI/'publication-ops.py',UI_SHA);checked(ACCEPT,ACCEPT_SHA)['verify']()
    previous,helper,ops,release=style['predecessors']();value=style['load'](UI/'before.json');record=style['load'](UI/'deployment.json')
    assert record['passed'] and not (UI/'rollback.json').exists() and record['publicationSourceSha256']==UI_SHA
    assert sha((UI/'before.json').read_bytes())==record['beforeSha256']
    previous['validate_files'](value['inventory']);assert helper['running']()==value['running'] and helper['processes']()==value['processes']
    assert style['NGINX'].read_bytes()==style['appended']((UI/'nginx-before.private.conf').read_bytes())
    assert sha(style['NGINX'].read_bytes())==record['nginxSha256'] and sha((style['PUBLIC']/'billiards.css').read_bytes())==record['cssSha256']==style['CSS_SHA']
    style['candidate'](style['load'](UI/'candidate-proof.json'));assert sha((UI/'candidate-proof.json').read_bytes())==value['candidateSha256']
    style['public'](previous,release)
    return style,previous,helper,ops

def stage(publication_sha,wam_sha):
    os.umask(0o077);style=checked(UI/'publication-ops.py',UI_SHA);style['verify']();style,previous,helper,ops=dependencies()
    assert not BASE.exists() and not PROBE.exists() and STORAGE.resolve()==STORAGE and len(list(STORAGE.iterdir()))==16
    publication_file=Path('/tmp/wvh-castle-billiards-publication.json');wam_file=Path('/tmp/wvh-castle-billiards-probe.wam')
    for file,digest in [(publication_file,publication_sha),(wam_file,wam_sha)]:assert file.resolve()==file and file.is_file() and file.stat().st_size<20000 and sha(file.read_bytes())==digest
    published=publication(json.loads(publication_file.read_bytes()))
    for name,digest in published['files'].items():assert sha(public(WEB+name+'?v='+published['publicationCommit'][:12]))==digest
    map=json.loads(public(WEB+'castle/spielesaal-billard-preview.tmj?v='+published['publicationCommit'][:12]))
    raw=encoded(wrapper(json.loads(wam_file.read_bytes()),map,published));before=ops['baseline']();running=helper['running']();processes=helper['processes']()
    frozen={str(path):sha(path.read_bytes()) for directory in [UI,ACCEPT.parent] for path in directory.iterdir() if path.is_file()}
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
                if sha(public(ORIGIN+'/map-storage/castle-preview/billardprobe.wam'))==sha(raw):break
            except Exception:pass
            time.sleep(.2)
        else:raise RuntimeError('Additional protected probe did not become ready')
        info=json.loads(public(ORIGIN+'/map?playUri=https%3A%2F%2Ftogether.deine-schule.com%2F~%2Fcastle-preview%2Fbillardprobe.wam'))
        assert info['wamUrl']==ORIGIN+'/map-storage/castle-preview/billardprobe.wam' and info.get('mapUrl') is None and info['authenticationMandatory'] is True
        write('stage.json',encoded({'version':1,'passed':True,'before':before,'after':after,'running':running,'processes':processes,'inventory':frozen,
          'probeSha256':sha(raw),'publicationSha256':sha(publication_file.read_bytes()),'wamInputSha256':sha(wam_file.read_bytes()),
          'authenticationMandatory':True,'separateVoiceNamespace':True,'existingMapsChanged':False,'serviceRestarted':False}))
    except Exception:
        if wrote and PROBE.exists():
            value=PROBE.stat();assert PROBE.resolve()==PROBE and (value.st_dev,value.st_ino)==identity and raw.startswith(PROBE.read_bytes());PROBE.unlink()
        assert ops['baseline']()==before and helper['running']()==running and helper['processes']()==processes;previous['validate_files'](frozen);raise
    verify()

def verify():
    value=load(PRIVATE/'stage.json');style,previous,helper,ops=dependencies()
    assert value['passed'] and not (PRIVATE/'cleanup.json').exists() and PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==value['probeSha256']
    assert ops['baseline']()==value['after']==with_probe(value['before'],value['probeSha256'])
    assert helper['running']()==value['running'] and helper['processes']()==value['processes'];previous['validate_files'](value['inventory'])
    assert sha((PRIVATE/'publication.json').read_bytes())==value['publicationSha256'] and sha((PRIVATE/'probe-input.json').read_bytes())==value['wamInputSha256']
    published=publication(load(PRIVATE/'publication.json'));map=json.loads(public(WEB+'castle/spielesaal-billard-preview.tmj?v='+published['publicationCommit'][:12]))
    assert json.loads(PROBE.read_bytes())==wrapper(load(PRIVATE/'probe-input.json'),map,published)
    assert sha(public(ORIGIN+'/map-storage/castle-preview/billardprobe.wam'))==value['probeSha256']
    print(json.dumps({'passed':True,'additionalAuthenticatedProbe':True,'existingSixteenMapsUnchanged':True,'noServiceRestart':True,'separateNativeVoiceRooms':True,
      'normalGameHallNotYetActivated':True,'fullCastleApprovalFor400':False}))

def cleanup():
    verify();value=load(PRIVATE/'stage.json');style,previous,helper,ops=dependencies()
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==value['probeSha256'];PROBE.unlink()
    assert ops['baseline']()==value['before'] and helper['running']()==value['running'] and helper['processes']()==value['processes'];previous['validate_files'](value['inventory'])
    style['verify']();write('cleanup.json',encoded({'passed':True,'probeRemoved':True,'stageSha256':sha((PRIVATE/'stage.json').read_bytes()),'existingPlatformRetained':True}))
    print(json.dumps({'passed':True,'temporaryProbeRemoved':True,'existingMapsAndServicesUnchanged':True}))

if __name__=='__main__':verify()
