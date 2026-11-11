"""One temporary authenticated puzzle map; no service or existing-map replacement."""
import copy
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.request

BASE=Path('/opt/wvh-castle-stars');PRIVATE=BASE/'private'
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
PROBE=STORAGE/'sternprobe.wam';RECORD=PRIVATE/'stage.json'
INPUT=PRIVATE/'publication.json'
PROOF=Path('/opt/wvh-castle-school/private/game-host-published-proof-ops.py')
PROOF_SHA='61a1f36fd958040b603cac9a5425290062776c773d19f01a842cdf793a755c86'
HELPER=Path('/opt/wvh-castle-school/private/game-host-publication-ops.py')
HELPER_SHA='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
OPS=Path('/tmp/wvh-castle-piano-ops.py')
OPS_SHA='4c67a5cc74678992fa8cf0f82c613075ba4eab07c76139bfd1882e9e36415fa3'
WEB='https://wvh-web.github.io/workadventure_outside01/'
ORIGIN='https://together.deine-schule.com'
FILES={'castle/'+name for name in ['sternwarte-puzzle-preview.tmj','puzzle-preview.bundle.js','puzzle-preview.bundle.manifest.json',
    'puzzle.html','puzzle.css','puzzle.js','puzzle-state.js','art/sternmaschine-20261111/machine.webp']}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def checked(path,digest):
    assert path.resolve()==path and path.is_file()
    raw=path.read_bytes();assert sha(raw)==digest
    scope={'__name__':'castle_stars_dependency','__file__':str(path)}
    exec(compile(raw,str(path),'exec'),scope);return scope


def encoded(value):return (json.dumps(value,indent=2)+'\n').encode()


def write_new(path,raw,mode=0o600):
    assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(mode)


def public(url,maximum=2000000):
    with urllib.request.urlopen(url,timeout=20) as response:
        assert response.status==200
        raw=response.read(maximum+1);assert len(raw)<=maximum;return raw


def wrapper(original):
    result=copy.deepcopy(original)
    assert set(result)=={'version','mapUrl','areas','entities','entityCollections','settings','metadata'}
    assert result['mapUrl'].startswith(WEB+'castle/sternwarte.tmj?v=')
    result['mapUrl']=WEB+'castle/sternwarte-puzzle-preview.tmj?v=20261111-puzzle1'
    count=0
    for area in result['areas']:
        for prop in area['properties']:
            if prop['type']=='livekitRoomProperty':
                assert prop['roomName'].startswith('school-castle-v2-sternwarte-')
                prop['roomName']=prop['roomName'].replace('school-castle-v2-sternwarte-','school-castle-stars-qa-');count+=1
    assert count==3
    return result


def with_probe(before,digest):
    result=copy.deepcopy(before);assert str(PROBE) not in result['files']
    result['files'][str(PROBE)]=digest;return result


def publication(value):
    assert set(value)=={'version','sourceCommit','publicationCommit','previousPublicationCommit','files','onlyAdditionalPublicFiles'}
    assert value['version']==1 and value['onlyAdditionalPublicFiles'] is True
    for name in ['sourceCommit','publicationCommit','previousPublicationCommit']:
        assert len(value[name])==40 and all(c in '0123456789abcdef' for c in value[name])
    assert set(value['files'])==FILES
    for digest in value['files'].values():assert len(digest)==64 and all(c in '0123456789abcdef' for c in digest)
    return value


def stage():
    os.umask(0o077)
    accepted=checked(PROOF,PROOF_SHA);accepted['verify'](False)
    helper=checked(HELPER,HELPER_SHA);ops=checked(OPS,OPS_SHA)
    before=ops['baseline']();running=helper['running']();processes=helper['processes']()
    assert STORAGE.resolve()==STORAGE and len(list(STORAGE.iterdir()))==16 and not PROBE.exists()
    assert BASE.resolve()==BASE and not BASE.is_symlink();BASE.mkdir(mode=0o755,exist_ok=True)
    assert PRIVATE.resolve()==PRIVATE and not PRIVATE.is_symlink();PRIVATE.mkdir(mode=0o700,exist_ok=True)
    assert PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o700 and not RECORD.exists()
    assert INPUT.resolve()==INPUT and INPUT.stat().st_uid==0 and INPUT.stat().st_mode&0o777==0o600 and INPUT.stat().st_size<12000
    published=publication(json.loads(INPUT.read_bytes()))
    for name,digest in published['files'].items():assert sha(public(WEB+name+'?v='+published['publicationCommit'][:12]))==digest
    original=public(WEB+'castle/sternwarte.tmj');assert json.loads(original)['type']=='map'
    original_wam=(STORAGE/'sternwarte.wam').read_bytes();raw=encoded(wrapper(json.loads(original_wam)))
    assert ops['baseline']()==before and helper['running']()==running and helper['processes']()==processes
    wrote=False
    try:
        write_new(PROBE,raw,0o644);wrote=True;os.chown(PROBE,1000,1000)
        expected=with_probe(before,sha(raw));assert ops['baseline']()==expected
        url=ORIGIN+'/map-storage/castle-preview/sternprobe.wam'
        assert sha(public(url))==sha(raw)
        info=json.loads(public(ORIGIN+'/map?playUri=https%3A%2F%2Ftogether.deine-schule.com%2F~%2Fcastle-preview%2Fsternprobe.wam'))
        assert info['wamUrl']==url and info.get('mapUrl') is None and info['authenticationMandatory'] is True
        assert ops['baseline']()==expected and helper['running']()==running and helper['processes']()==processes
        receipt={'version':1,'passed':True,'active':True,'before':before,'after':expected,'running':running,'processes':processes,
            'probeFile':str(PROBE),'probeSha256':sha(raw),'originalWamSha256':sha(original_wam),'originalPublicMapSha256':sha(original),
            'publication':published,'authenticationMandatory':True,'separateConversationNamespace':True,'existingSixteenMapsUnchanged':True,
            'servicesRestarted':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        write_new(RECORD,encoded(receipt))
        print(json.dumps({'passed':True,'additionalProtectedMap':True,'originalMapsUnchanged':True,'servicesRestarted':False,'publicFilesVerified':8}))
    except Exception:
        if wrote and PROBE.exists():assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==sha(raw);PROBE.unlink()
        assert ops['baseline']()==before and helper['running']()==running and helper['processes']()==processes
        accepted['verify'](False);raise


def cleanup():
    ops=checked(OPS,OPS_SHA);helper=checked(HELPER,HELPER_SHA)
    assert RECORD.resolve()==RECORD and RECORD.stat().st_uid==0 and RECORD.stat().st_mode&0o777==0o600
    record_raw=RECORD.read_bytes();value=json.loads(record_raw)
    assert value['version']==1 and value['passed'] and value['active'] and value['probeFile']==str(PROBE)
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==value['probeSha256']
    assert ops['baseline']()==value['after'] and helper['running']()==value['running'] and helper['processes']()==value['processes']
    assert not (PRIVATE/'cleanup.json').exists();PROBE.unlink()
    assert ops['baseline']()==value['before'] and helper['running']()==value['running'] and helper['processes']()==value['processes']
    checked(PROOF,PROOF_SHA)['verify'](False)
    write_new(PRIVATE/'cleanup.json',encoded({'passed':True,'probeRemoved':True,'stageReceiptSha256':sha(record_raw),
        'existingMapsAndServicesUnchanged':True,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))
    print(json.dumps({'passed':True,'probeRemoved':True,'existingMapsAndServicesUnchanged':True}))


if __name__=='__main__':stage()
