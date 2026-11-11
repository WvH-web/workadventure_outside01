"""Add only a disposable native probe; existing sixteen wrappers and all services stay byte-identical."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import urllib.parse
import urllib.request

ROOT=Path('/opt/wvh-castle-homes/private')
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
TARGET=STORAGE/'zimmerprobe.wam'
RECORD=ROOT/'native-probe.json'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def stage():
    os.umask(0o077)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before=ops['baseline']()
    existing=json.loads(Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json').read_text())['files']
    assert len(existing)==16 and {item.name for item in STORAGE.iterdir()}==set(existing)
    assert all(sha((STORAGE/name).read_bytes())==digest for name,digest in existing.items())
    assert TARGET.resolve()==TARGET and TARGET.parent==STORAGE and not TARGET.exists() and not RECORD.exists()
    publication=json.loads(Path('/tmp/wvh-castle-home-entry-publication.json').read_text())
    assert publication['passed'] and publication['onlyNewProbeFiles'] and publication['existingMapSourcesUnchanged']
    assert publication['head']=='45414cafec849dd146aa36c05cb4dbe297775016'
    candidate=Path('/tmp/wvh-castle-home-zimmerprobe.wam').read_bytes()
    old=json.loads((STORAGE/'obergeschoss.wam').read_text())
    expected=json.loads(json.dumps(old))
    expected['mapUrl']='https://wvh-web.github.io/workadventure_outside01/castle/obergeschoss-homes-pilot.tmj?v=20261111-homes2'
    for area in expected['areas']:
        for prop in area['properties']:
            assert prop['type']=='livekitRoomProperty' and prop['roomName'].startswith('school-castle-v2-obergeschoss-')
            prop['roomName']=prop['roomName'].replace('school-castle-v2-obergeschoss-','school-castle-homes-qa-obergeschoss-')
    assert json.loads(candidate)==expected
    for file,digest in publication['files'].items():
        assert file in ['castle/'+name for name in ['gallery.js','homes-entry.js','obergeschoss-homes-pilot.tmj','upper-gallery.bundle.js','upper-gallery.bundle.manifest.json']]
        with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/'+file+'?v='+publication['head'][:12],timeout=20) as response:
            assert sha(response.read())==digest
    processes={name:subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10) for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service','wvh-sterne-kollegium.service']}
    temporary=TARGET.with_suffix('.wam.native-probe-staging')
    assert temporary.resolve()==temporary and not temporary.exists()
    try:
        temporary.write_bytes(candidate)
        temporary.chmod(0o644)
        os.chown(temporary,1000,1000)
        temporary.replace(TARGET)
        url='https://together.deine-schule.com/map-storage/castle-preview/zimmerprobe.wam'
        with urllib.request.urlopen(url,timeout=20) as response:
            assert response.status==200 and sha(response.read())==sha(candidate)
        query=urllib.parse.urlencode({'playUri':'https://together.deine-schule.com/~/castle-preview/zimmerprobe.wam'})
        with urllib.request.urlopen('https://together.deine-schule.com/map?'+query,timeout=20) as response:
            info=json.load(response)
            assert info['wamUrl']==url and info.get('mapUrl') is None
        after=ops['baseline']()
        expected_after=json.loads(json.dumps(before));expected_after['files'][str(TARGET)]=sha(candidate)
        assert after==expected_after
        assert all(subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)==value for name,value in processes.items())
        record=dict(passed=True,active=True,original=before,withProbe=after,probeFile=str(TARGET),probeSha256=sha(candidate),sourcePublication=publication,
            processes=processes,onlyAdditionalProbeWrapper=True,existingSixteenMapsUnchanged=True,separateNativeMeetingNamespace=True,
            authenticationMandatory=info.get('authenticationMandatory'))
        ops['atomic'](RECORD,record)
        print(json.dumps(dict(passed=True,onlyAdditionalProbeWrapper=True,existingSixteenMapsUnchanged=True,noServiceRestart=True)))
    except Exception:
        if TARGET.exists():
            assert TARGET.resolve()==TARGET and sha(TARGET.read_bytes())==sha(candidate)
            TARGET.unlink()
        if temporary.exists():
            assert temporary.resolve()==temporary and sha(temporary.read_bytes())==sha(candidate)
            temporary.unlink()
        assert ops['baseline']()==before
        raise


def cleanup():
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    raw=RECORD.read_bytes();record=json.loads(raw)
    assert record['passed'] and record['active'] and record['onlyAdditionalProbeWrapper']
    assert record['probeFile']==str(TARGET) and TARGET.resolve()==TARGET and sha(TARGET.read_bytes())==record['probeSha256']
    assert ops['baseline']()==record['withProbe']
    assert not (ROOT/'native-probe-cleanup.json').exists()
    TARGET.unlink()
    assert ops['baseline']()==record['original']
    assert all(subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)==value for name,value in record['processes'].items())
    ops['atomic'](ROOT/'native-probe-cleanup.json',dict(passed=True,stopped=True,stageReceiptSha256=sha(raw),existingMapsAndServicesUnchanged=True,probeRemoved=True))
    print(json.dumps(dict(passed=True,probeRemoved=True,existingMapsAndServicesUnchanged=True)))


if __name__=='__main__':
    stage()
