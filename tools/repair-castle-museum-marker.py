"""Repair only the tour status marker; retain the original staging evidence."""
import hashlib
import json
from pathlib import Path
import runpy
import zipfile


def reviewed_marker(before,after,previous_publication,publication):
    assert len(before)==15 and set(before)==set(after)
    assert publication['publicFiles']==previous_publication['publicFiles'] and publication['head']==previous_publication['head']
    assert {name for name in after if after[name]!=before[name]}=={'collection.html','collection.js'}


def main():
    path=Path('/tmp/wvh-stage-castle-museum-tour.py');raw=path.read_bytes()
    assert path.resolve()==path and hashlib.sha256(raw).hexdigest()=='44cae4c84e9f20ec77cbc79351be6c8b6a1dd29c47973573b78b8890c56dd292'
    helper=runpy.run_path(str(path));ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');private=helper['PRIVATE'];sha=helper['sha']
    stage=json.loads((private/'museum-tour-stage.json').read_text());content=json.loads((private/'museum-tour-content.json').read_text())
    before=ops['baseline']();assert before==stage['after'] and helper['process_snapshot']()==stage['processes']
    target=private/'museum-tour-repair-1.json';assert not target.exists()
    record=helper['RECORD'];old_raw=record.read_bytes();assert sha(old_raw)==content['recordSha256']
    old=json.loads(old_raw);old_release=helper['CURRENT'].resolve();assert str(old_release)==old['release']
    publication=json.loads(Path('/tmp/wvh-castle-museum-publication-repair-1.json').read_text())
    assert publication['publicFiles']==stage['publication']['publicFiles'] and publication['head']==stage['publication']['head']
    archive=Path('/tmp/wvh-castle-museum-content-repair-1.zip');assert sha(archive.read_bytes())==publication['contentArchiveSha256']
    with zipfile.ZipFile(archive) as bundle:
        assert len(bundle.infolist())==15 and set(bundle.namelist())==helper['FILES'] and sum(item.file_size for item in bundle.infolist())<4000000
        payload={name:bundle.read(name) for name in helper['FILES']}
    files={name:sha(value) for name,value in payload.items()};assert files==publication['contentFiles']
    reviewed_marker(old['files'],files,stage['publication'],publication)
    for name,digest in old['files'].items():assert sha((old_release/name).read_bytes())==digest
    backup=private/'before-museum-tour'/'marker-repair-deployment.json';assert not backup.exists();backup.write_bytes(old_raw);backup.chmod(0o600)
    release=helper['BASE']/'releases'/publication['contentArchiveSha256'][:16];assert not release.exists() and release.resolve()==release
    release.mkdir(mode=0o755)
    for name,value in payload.items():
        item=release/name;item.parent.mkdir(mode=0o755,parents=True,exist_ok=True);item.parent.chmod(0o755);item.write_bytes(value);item.chmod(0o644)
    updated={**old,'release':str(release),'archive_sha256':publication['contentArchiveSha256'],'files':files,
        'previous_release':str(old_release),'previous_record_sha256':sha(old_raw),'changed_files':['collection.html','collection.js']}
    switched=False;recorded=False;new_raw=None
    try:
        assert ops['baseline']()==before and helper['CURRENT'].resolve()==old_release
        helper['switch'](release);switched=True
        for name,digest in files.items():helper['public_file'](name,digest)
        assert ops['baseline']()==before and helper['process_snapshot']()==stage['processes']
        ops['atomic'](record,updated);recorded=True;new_raw=record.read_bytes()
        after=helper['baseline_after_content'](before,sha(new_raw));assert ops['baseline']()==after
        ops['atomic'](target,dict(passed=True,before=before,after=after,processes=stage['processes'],files=files,publication=publication,
            previousRecordFile=str(backup),previousRecordSha256=sha(old_raw),recordSha256=sha(new_raw),previousRelease=str(old_release),release=str(release),
            onlyMarkerAndScriptVersionChanged=True,allMapsAndServicesUnchanged=True))
        print(json.dumps(dict(passed=True,onlyMarkerAndScriptVersionChanged=True,allMapsAndServicesUnchanged=True)))
    except Exception:
        if switched and helper['CURRENT'].resolve()==release:helper['switch'](old_release)
        if recorded:
            assert record.read_bytes()==new_raw;helper['restore_record'](old_raw)
        assert ops['baseline']()==before
        raise


if __name__=='__main__':main()
