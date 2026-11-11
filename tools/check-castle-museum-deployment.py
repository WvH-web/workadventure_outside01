"""Verify the append-only museum staging, marker repair and accepted native promotion."""
import hashlib
import json
from pathlib import Path
import runpy
import urllib.request

PRIVATE=Path('/opt/wvh-castle-content/private')
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
TARGET=STORAGE/'museum.wam';PROBE=STORAGE/'museumprobe.wam'
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
RECORD=PRIVATE/'deployment.json'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def transition(expected,value,content,stage,repair,cleanup):
    assert value['original']==content['before']==expected
    current=json.loads(json.dumps(expected));current['files'][str(RECORD)]=content['recordSha256']
    assert content['after']==stage['before']==current
    current['files'][str(PROBE)]=stage['probeSha256'];assert stage['after']==repair['before']==current
    current['files'][str(RECORD)]=repair['recordSha256'];assert repair['after']==cleanup['before']==current
    del current['files'][str(PROBE)];assert cleanup['after']==value['before']==current
    current['files'][str(TARGET)]=value['newWamSha256'];current['files'][str(MANIFEST)]=value['manifestAfterSha256']
    assert value['after']==current
    return current


def read(name):
    path=PRIVATE/name;assert path.resolve()==path and path.stat().st_mode&0o777==0o600
    raw=path.read_bytes();return raw,json.loads(raw)


def verify(ops,expected,fetch_public=True):
    if not (PRIVATE/'museum-tour-deployment.json').exists():return expected,False
    raw,value=read('museum-tour-deployment.json');assert value['passed'] and value['provisional'] is False
    assert value['onlyMuseumPreviewWrapperChanged'] and value['allOtherMapsAndServicesUnchanged']
    assert value['oldCastleReplaced'] is False and value['loadApprovalFor400'] is False
    provisional_raw,provisional=read('museum-tour-deployment-stage.json')
    assert sha(provisional_raw)==value['provisionalReceiptSha256'] and provisional['provisional'] is True
    assert all(value[key]==item for key,item in provisional.items() if key!='provisional')
    content_raw,content=read('museum-tour-content.json');stage_raw,stage=read('museum-tour-stage.json')
    repair_raw,repair=read('museum-tour-repair-1.json');cleanup_raw,cleanup=read('museum-tour-cleanup.json')
    for raw,key in [(content_raw,'contentReceiptSha256'),(stage_raw,'stageReceiptSha256'),(repair_raw,'repairReceiptSha256'),(cleanup_raw,'cleanupReceiptSha256')]:
        assert sha(raw)==value[key]
    assert all(item['passed'] for item in [content,stage,repair,cleanup])
    assert content['routingChanged'] is False and content['servicesRestarted'] is False
    assert stage['existingSixteenMapsUnchanged'] and stage['separateNativeMeetingNamespace'] and stage['authenticationMandatory']
    assert repair['onlyMarkerAndScriptVersionChanged'] and repair['allMapsAndServicesUnchanged']
    assert cleanup['probeRemoved'] and cleanup['allExistingMapsAndServicesUnchanged']
    assert cleanup['stageReceiptSha256']==sha(stage_raw) and cleanup['repairReceiptSha256']==sha(repair_raw)
    assert content['processes']==stage['processes']==repair['processes']==value['processes']
    after=transition(expected,value,content,stage,repair,cleanup)
    helper=Path('/tmp/wvh-deploy-castle-museum-tour.py');assert helper.resolve()==helper
    assert sha(helper.read_bytes())=='1d81afc61a085e6d1bec98febc2fdef25b4ebf61f4f2bc675ad005e9a9f04cd2'
    functions=runpy.run_path(str(helper));h=functions['helper']()
    assert h['process_snapshot']()==value['processes'] and ops['baseline']()==after
    backup=PRIVATE/'before-museum-tour';assert backup.resolve()==backup and backup.stat().st_mode&0o777==0o700
    original=(backup/'deployment.json').read_bytes();previous=json.loads(original)
    assert sha(original)==content['previousRecordSha256']==expected['files'][str(RECORD)]
    h['reviewed_files'](previous['files'],content['files'])
    marker=(backup/'marker-repair-deployment.json').read_bytes()
    assert sha(marker)==content['recordSha256']==repair['previousRecordSha256']
    assert json.loads(marker)['files']==content['files']
    assert {name for name in repair['files'] if repair['files'][name]!=content['files'][name]}=={'collection.html','collection.js'}
    assert stage['publication']['publicFiles']==repair['publication']['publicFiles']==value['publication']['publicFiles']
    assert stage['publication']['head']==repair['publication']['head']==value['publication']['head']
    deployed=RECORD.read_bytes();current=json.loads(deployed)
    assert sha(deployed)==repair['recordSha256'] and current['files']==repair['files'] and current['release']==repair['release']
    assert h['CURRENT'].is_symlink() and str(h['CURRENT'].resolve())==repair['release']
    for release,files in [(Path(content['previousRelease']),previous['files']),(Path(content['release']),content['files']),(Path(repair['release']),repair['files'])]:
        assert release.resolve()==release and release.parent==h['BASE']/'releases'
        assert not any(path.is_symlink() for path in release.rglob('*'))
        assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(files)
        assert all(sha((release/name).read_bytes())==digest for name,digest in files.items())
    old=(backup/'museum.wam').read_bytes();old_manifest=(backup/'manifest.json').read_bytes()
    assert sha(old)==value['oldWamSha256']==expected['files'][str(TARGET)]
    assert sha(old_manifest)==value['manifestBeforeSha256']==expected['files'][str(MANIFEST)]
    source=json.loads(old);probe=h['probe_wrapper'](source)
    assert sha((json.dumps(probe,separators=(',',':'))+'\n').encode())==stage['probeSha256']
    source['mapUrl']=functions['SOURCE'];assert json.loads(TARGET.read_text())==source and sha(TARGET.read_bytes())==value['newWamSha256']
    manifest=json.loads(old_manifest);manifest['files']['museum.wam']=value['newWamSha256']
    assert json.loads(MANIFEST.read_text())==manifest and sha(MANIFEST.read_bytes())==value['manifestAfterSha256']
    assert len(manifest['files'])==16 and {path.name for path in STORAGE.iterdir()}==set(manifest['files']) and not PROBE.exists()
    assert all(sha((STORAGE/name).read_bytes())==digest for name,digest in manifest['files'].items())
    staged_raw=(backup/'staged-browser.private.json').read_bytes();published_raw=(PRIVATE/'museum-tour-published-browser.private.json').read_bytes()
    assert sha(staged_raw)==value['stagedBrowserProofSha256'] and sha(published_raw)==value['publishedBrowserProofSha256']
    functions['proof'](json.loads(staged_raw),value['publication'],True);functions['proof'](json.loads(published_raw),value['publication'],False)
    if fetch_public:
        for name,digest in current['files'].items():h['public_file'](name,digest)
        for name,digest in value['publication']['publicFiles'].items():
            with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/'+name+'?v='+value['publication']['head'][:12],timeout=20) as response:
                assert response.status==200 and sha(response.read(2000000))==digest
    assert ops['baseline']()==after
    return after,True
