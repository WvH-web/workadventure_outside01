"""Stage the museum tour without restarting services or replacing any existing map."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import urllib.request
import zipfile

BASE=Path('/opt/wvh-castle-content');PRIVATE=BASE/'private';CURRENT=BASE/'current';RECORD=PRIVATE/'deployment.json'
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
PROBE=STORAGE/'museumprobe.wam'
ARCHIVE=Path('/tmp/wvh-castle-museum-content.zip')
PUBLICATION=Path('/tmp/wvh-castle-museum-publication.json')
LEGACY={'collection.html','collection.css','collection.js','catalog.js','vendor/lucide.min.js','vendor/LICENSE',
    'npc-sprite.html','npc-sprite.css','npc-sprite.js','characters-data.js','passive-image.js','display.html','display.css','display.js'}
FILES=LEGACY|{'tour-state.js'};CHANGES={'collection.html','collection.js','tour-state.js'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def reviewed_files(before,after):
    assert set(before)==LEGACY and set(after)==FILES
    assert {name for name in FILES if before.get(name)!=after[name]}==CHANGES


def baseline_after_content(before,digest):
    result=json.loads(json.dumps(before));result['files'][str(RECORD)]=digest
    return result


def probe_wrapper(original):
    result=json.loads(json.dumps(original))
    assert set(result)=={'version','mapUrl','areas','entities','entityCollections','settings','metadata'}
    assert result['mapUrl'].startswith('https://wvh-web.github.io/workadventure_outside01/castle/museum.tmj?v=')
    result['mapUrl']='https://wvh-web.github.io/workadventure_outside01/castle/museum-tour-preview.tmj?v=20261111-tour1'
    for area in result['areas']:
        for prop in area['properties']:
            if prop['type']=='livekitRoomProperty':
                assert prop['roomName'].startswith('school-castle-v2-museum-')
                prop['roomName']=prop['roomName'].replace('school-castle-v2-museum-','school-castle-museum-qa-')
    return result


def switch(release):
    assert release.resolve()==release and release.parent==BASE/'releases'
    temporary=BASE/'museum-tour.staging';assert not temporary.exists() and not temporary.is_symlink()
    temporary.symlink_to(release,target_is_directory=True);temporary.replace(CURRENT)


def restore_record(raw):
    temporary=PRIVATE/'deployment.museum-rollback';assert not temporary.exists()
    temporary.write_bytes(raw);temporary.chmod(0o600);temporary.replace(RECORD)


def process_snapshot():
    return {name:subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)
        for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service','wvh-sterne-kollegium.service']}


def public_file(name,digest):
    with urllib.request.urlopen('https://together.deine-schule.com/castle-content/'+name,timeout=20) as response:
        assert response.status==200 and sha(response.read(4000000))==digest
        assert response.headers.get('X-Frame-Options')=='SAMEORIGIN' and response.headers.get('Cache-Control')=='no-store'
        assert response.headers.get('Permissions-Policy')=='camera=(), microphone=(), display-capture=()'
        assert response.headers.get('Content-Security-Policy')==("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://deutsche-online-schule.com; "
            "connect-src https://deutsche-online-schule.com; frame-src https://deutsche-online-schule.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'")


def stage():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']();processes=process_snapshot()
    assert len(list(STORAGE.iterdir()))==16 and not PROBE.exists()
    assert not (PRIVATE/'museum-tour-stage.json').exists() and not (PRIVATE/'museum-tour-content.json').exists()
    assert CURRENT.is_symlink() and PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    original_record=RECORD.read_bytes();old=json.loads(original_record);old_release=CURRENT.resolve()
    assert old_release.parent==BASE/'releases' and str(old_release)==old['release'] and set(old['files'])==LEGACY
    assert not any(item.is_symlink() for item in old_release.rglob('*'))
    assert {item.relative_to(old_release).as_posix() for item in old_release.rglob('*') if item.is_file()}==LEGACY
    for name,digest in old['files'].items():
        assert sha((old_release/name).read_bytes())==digest;public_file(name,digest)
    assert PUBLICATION.resolve()==PUBLICATION and ARCHIVE.resolve()==ARCHIVE
    publication=json.loads(PUBLICATION.read_text());assert publication['version']==1 and publication['onlyAdditionalPublicFiles']
    assert len(publication['head'])==40 and set(publication['publicFiles'])=={'castle/museum-tour-preview.tmj','castle/museum-tour.bundle.js','castle/museum-tour.bundle.manifest.json'}
    assert sha(ARCHIVE.read_bytes())==publication['contentArchiveSha256']
    with zipfile.ZipFile(ARCHIVE) as bundle:
        assert len(bundle.infolist())==len(FILES) and set(bundle.namelist())==FILES
        assert sum(item.file_size for item in bundle.infolist())<4000000
        payload={name:bundle.read(name) for name in FILES}
    files={name:sha(raw) for name,raw in payload.items()};assert files==publication['contentFiles'];reviewed_files(old['files'],files)
    for name,digest in publication['publicFiles'].items():
        with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/'+name+'?v='+publication['head'][:12],timeout=20) as response:
            assert response.status==200 and sha(response.read(2000000))==digest
    backup=PRIVATE/'before-museum-tour';assert not backup.exists();backup.mkdir(mode=0o700)
    (backup/'deployment.json').write_bytes(original_record);(backup/'deployment.json').chmod(0o600)
    release=BASE/'releases'/publication['contentArchiveSha256'][:16];assert not release.exists() and not release.is_symlink();release.mkdir(mode=0o755)
    for name,raw in payload.items():
        target=release/name;assert target.resolve().is_relative_to(release);target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        target.parent.chmod(0o755);target.write_bytes(raw);target.chmod(0o644)
    updated={**old,'release':str(release),'archive_sha256':publication['contentArchiveSha256'],'files':files,
        'previous_release':str(old_release),'previous_record_sha256':sha(original_record),'changed_files':sorted(CHANGES),'routing_modified':False}
    installed_raw=(json.dumps(updated,indent=2)+'\n').encode();switched=False;recorded=False
    probe_bytes=None
    try:
        assert ops['baseline']()==before and process_snapshot()==processes
        switch(release);switched=True
        for name,digest in files.items():public_file(name,digest)
        assert ops['baseline']()==before and process_snapshot()==processes and RECORD.read_bytes()==original_record
        ops['atomic'](RECORD,updated);recorded=True;installed_raw=RECORD.read_bytes()
        content_baseline=baseline_after_content(before,sha(installed_raw));assert ops['baseline']()==content_baseline
        ops['atomic'](PRIVATE/'museum-tour-content.json',dict(passed=True,before=before,after=content_baseline,processes=processes,
            previousRecordFile=str(backup/'deployment.json'),previousRecordSha256=sha(original_record),recordSha256=sha(installed_raw),
            release=str(release),previousRelease=str(old_release),files=files,publication=publication,routingChanged=False,servicesRestarted=False))
        original=json.loads((STORAGE/'museum.wam').read_text());probe_bytes=(json.dumps(probe_wrapper(original),separators=(',',':'))+'\n').encode()
        assert PROBE.resolve()==PROBE and not PROBE.exists();PROBE.write_bytes(probe_bytes);PROBE.chmod(0o644);os.chown(PROBE,1000,1000)
        url='https://together.deine-schule.com/map-storage/castle-preview/museumprobe.wam'
        with urllib.request.urlopen(url,timeout=20) as response:assert response.status==200 and sha(response.read())==sha(probe_bytes)
        query='https://together.deine-schule.com/map?playUri=https%3A%2F%2Ftogether.deine-schule.com%2F~%2Fcastle-preview%2Fmuseumprobe.wam'
        with urllib.request.urlopen(query,timeout=20) as response:info=json.load(response)
        assert info['wamUrl']==url and info.get('mapUrl') is None and info.get('authenticationMandatory') is True
        expected=json.loads(json.dumps(content_baseline));expected['files'][str(PROBE)]=sha(probe_bytes)
        assert ops['baseline']()==expected and process_snapshot()==processes
        ops['atomic'](PRIVATE/'museum-tour-stage.json',dict(passed=True,active=True,before=content_baseline,after=expected,
            probeFile=str(PROBE),probeSha256=sha(probe_bytes),processes=processes,publication=publication,
            existingSixteenMapsUnchanged=True,separateNativeMeetingNamespace=True,authenticationMandatory=True))
        print(json.dumps(dict(passed=True,staticFilesChecked=15,onlyAdditionalProtectedProbe=True,existingSixteenMapsUnchanged=True,noServiceRestart=True)))
    except Exception:
        if PROBE.exists():
            assert probe_bytes and PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==sha(probe_bytes);PROBE.unlink()
        if switched and CURRENT.resolve()==release:switch(old_release)
        if recorded:
            assert RECORD.read_bytes()==installed_raw;restore_record(original_record)
            assert RECORD.read_bytes()==original_record
        assert ops['baseline']()==before and process_snapshot()==processes
        ops['atomic'](PRIVATE/'museum-tour-stage-failure.json',dict(passed=False,contentRestored=True,probeRemoved=True,
            existingMapsAndServicesUnchanged=True))
        raise


def cleanup():
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');record=PRIVATE/'museum-tour-stage.json';raw=record.read_bytes();value=json.loads(raw)
    assert value['passed'] and value['active'] and value['probeFile']==str(PROBE) and PROBE.resolve()==PROBE
    assert sha(PROBE.read_bytes())==value['probeSha256'] and ops['baseline']()==value['after'] and process_snapshot()==value['processes']
    assert not (PRIVATE/'museum-tour-cleanup.json').exists();PROBE.unlink()
    assert ops['baseline']()==value['before']
    ops['atomic'](PRIVATE/'museum-tour-cleanup.json',dict(passed=True,probeRemoved=True,stageReceiptSha256=sha(raw),
        before=value['after'],after=value['before'],allExistingMapsAndServicesUnchanged=True))
    print(json.dumps(dict(passed=True,probeRemoved=True,allExistingMapsAndServicesUnchanged=True)))


if __name__=='__main__':stage()
