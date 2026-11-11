"""Promote only the verified new-preview museum; keep old castle and all services unchanged."""
import hashlib
import json
import math
import os
from pathlib import Path
import runpy
import urllib.request

PRIVATE=Path('/opt/wvh-castle-content/private')
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
TARGET=STORAGE/'museum.wam';PROBE=STORAGE/'museumprobe.wam'
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
SOURCE='https://wvh-web.github.io/workadventure_outside01/castle/museum-tour-preview.tmj?v=20261111-tour1'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def proof(value,publication,staged):
    positive=['passed','realNativeWorkAdventure','onlySyntheticApprovedPupils','realPublicCatalogUnmodified','portalViewerReached',
        'tableSpeechDecodedAtFourStages','automaticPanelOnSeating','bothDirectionsShareBoardAndGallery','chooserMayLeave',
        'lateReturnSeesSelection','unchangedRefreshKeepsContent','emptyTableStartsNewRound','movementAfterStanding',
        'desktopAndMobileCanvasNonblank','noHorizontalOverflow','onlyBoardIdentifiersShared','mediaPlaybackNotAsserted']
    negative=['candidateStaticSourcesOnlyInsideTestBrowsers','networkResponsesSubstituted','publishedMapsChanged',
        'filmPositionAndScrollSynchronized','loadApprovalFor400']
    assert all(value.get(key) is True for key in positive) and all(value.get(key) is False for key in negative)
    assert value.get('isolatedStageMap') is staged and value.get('normalMicrosoftPupils')==2
    if not staged:assert value.get('manualCloseKeepsRound') is True
    assert isinstance(value.get('browserVersion'),str) and value['browserVersion'].startswith('157.')
    assert value.get('routed')==[] and value.get('errors')==[]
    assert value['publishedMapSha256']==publication['publicFiles']['castle/museum-tour-preview.tmj']
    assert value['mapSha256']==value['publishedMapSha256'] and value['scriptSha256']==publication['publicFiles']['castle/museum-tour.bundle.js']
    media=value.get('media');assert isinstance(media,list) and len(media)==4
    assert sorted(item['label'] for item in media)==['gallery','late-return','new-round','selected-contribution']
    for item in media:
        assert len(item['before'])==len(item['after'])==2
        for before,after in zip(item['before'],item['after']):
            assert all(type(row['energy']) in [int,float] and math.isfinite(row['energy']) and row['energy']>=0 for row in [before,after])
            assert after['energy']>before['energy']
        assert any(name.endswith('area-buchclub') and name in item['after'][1]['rooms'] for name in item['after'][0]['rooms'])


def projection(before,changes):
    allowed={str(TARGET),str(MANIFEST),str(PRIVATE/'deployment.json')}
    assert set(changes)<=allowed and changes
    result=json.loads(json.dumps(before));assert all(name in result['files'] for name in changes)
    result['files'].update(changes);return result


def helper():
    path=Path('/tmp/wvh-stage-castle-museum-tour.py');assert path.resolve()==path
    assert sha(path.read_bytes())=='44cae4c84e9f20ec77cbc79351be6c8b6a1dd29c47973573b78b8890c56dd292'
    return runpy.run_path(str(path))


def snapshots():
    content_raw=(PRIVATE/'museum-tour-content.json').read_bytes();content=json.loads(content_raw)
    stage_raw=(PRIVATE/'museum-tour-stage.json').read_bytes();stage=json.loads(stage_raw)
    repair_raw=(PRIVATE/'museum-tour-repair-1.json').read_bytes();repair=json.loads(repair_raw)
    assert content['passed'] and stage['passed'] and repair['passed'] and stage['active']
    assert content['after']==stage['before'] and stage['after']==repair['before']
    assert repair['previousRecordSha256']==content['recordSha256']
    assert projection(repair['before'],{str(PRIVATE/'deployment.json'):repair['recordSha256']})==repair['after']
    assert content['processes']==stage['processes']==repair['processes']
    return content,stage,repair,stage_raw,repair_raw


def atomic_bytes(path,raw):
    assert path in [TARGET,MANIFEST] and path.resolve()==path
    temporary=path.with_name(path.name+'.museum-tour');assert not temporary.exists() and not temporary.is_symlink()
    metadata=path.stat();temporary.write_bytes(raw);temporary.chmod(metadata.st_mode&0o777);os.chown(temporary,metadata.st_uid,metadata.st_gid);temporary.replace(path)


def activate():
    os.umask(0o077);h=helper();ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    content,stage,repair,stage_raw,repair_raw=snapshots();before=ops['baseline']()
    assert before==repair['after'] and h['process_snapshot']()==stage['processes']
    assert not (PRIVATE/'museum-tour-deployment-stage.json').exists() and not (PRIVATE/'museum-tour-deployment.json').exists()
    supplied=Path('/tmp/wvh-castle-museum-staged-proof.private.json').read_bytes();assert len(supplied)<1000000
    proof(json.loads(supplied),repair['publication'],True)
    assert PROBE.resolve()==PROBE and sha(PROBE.read_bytes())==stage['probeSha256'] and stage['probeFile']==str(PROBE)
    backup=PRIVATE/'before-museum-tour';assert backup.resolve()==backup and backup.stat().st_mode&0o777==0o700
    old=TARGET.read_bytes();old_manifest=MANIFEST.read_bytes();manifest=json.loads(old_manifest)
    assert manifest['files']['museum.wam']==sha(old) and len(manifest['files'])==16
    for name,digest in manifest['files'].items():assert sha((STORAGE/name).read_bytes())==digest
    for name,raw in [('museum.wam',old),('manifest.json',old_manifest),('staged-browser.private.json',supplied)]:
        item=backup/name;assert not item.exists();item.write_bytes(raw);item.chmod(0o600)
    # Remove only the additional, hash-verified probe. Its historical records stay unchanged.
    assert not (PRIVATE/'museum-tour-cleanup.json').exists();PROBE.unlink()
    clean=json.loads(json.dumps(before));del clean['files'][str(PROBE)];assert ops['baseline']()==clean
    ops['atomic'](PRIVATE/'museum-tour-cleanup.json',dict(passed=True,probeRemoved=True,before=before,after=clean,
        stageReceiptSha256=sha(stage_raw),repairReceiptSha256=sha(repair_raw),allExistingMapsAndServicesUnchanged=True))
    updated=json.loads(old);updated['mapUrl']=SOURCE;new=(json.dumps(updated,separators=(',',':'))+'\n').encode()
    manifest['files']['museum.wam']=sha(new);new_manifest=(json.dumps(manifest,indent=2)+'\n').encode();changed=False
    try:
        assert ops['baseline']()==clean and TARGET.read_bytes()==old and MANIFEST.read_bytes()==old_manifest
        atomic_bytes(TARGET,new);changed=True;atomic_bytes(MANIFEST,new_manifest)
        after=projection(clean,{str(TARGET):sha(new),str(MANIFEST):sha(new_manifest)})
        assert ops['baseline']()==after and h['process_snapshot']()==stage['processes']
        with urllib.request.urlopen('https://together.deine-schule.com/map-storage/castle-preview/museum.wam',timeout=20) as response:
            assert response.status==200 and sha(response.read())==sha(new)
        ops['atomic'](PRIVATE/'museum-tour-deployment-stage.json',dict(passed=True,provisional=True,before=clean,after=after,
            original=content['before'],processes=stage['processes'],source=SOURCE,publication=repair['publication'],
            oldWamSha256=sha(old),newWamSha256=sha(new),manifestBeforeSha256=sha(old_manifest),manifestAfterSha256=sha(new_manifest),
            stagedBrowserProofSha256=sha(supplied),contentReceiptSha256=sha((PRIVATE/'museum-tour-content.json').read_bytes()),
            stageReceiptSha256=sha(stage_raw),repairReceiptSha256=sha(repair_raw),cleanupReceiptSha256=sha((PRIVATE/'museum-tour-cleanup.json').read_bytes()),
            onlyMuseumPreviewWrapperChanged=True,oldCastleReplaced=False,loadApprovalFor400=False))
        print(json.dumps(dict(passed=True,provisional=True,onlyMuseumPreviewWrapperChanged=True,probeRemoved=True,noServiceRestart=True)))
    except Exception:
        if changed:
            assert TARGET.read_bytes()==new;atomic_bytes(TARGET,old)
            if MANIFEST.read_bytes()==new_manifest:atomic_bytes(MANIFEST,old_manifest)
        assert ops['baseline']()==clean
        raise


def finish():
    h=helper();ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');path=PRIVATE/'museum-tour-deployment-stage.json';raw=path.read_bytes();stage=json.loads(raw)
    assert stage['passed'] and stage['provisional'] and not (PRIVATE/'museum-tour-deployment.json').exists()
    supplied=Path('/tmp/wvh-castle-museum-published-proof.private.json').read_bytes();assert len(supplied)<1000000
    proof(json.loads(supplied),stage['publication'],False)
    assert ops['baseline']()==stage['after'] and h['process_snapshot']()==stage['processes'] and not PROBE.exists()
    target=PRIVATE/'museum-tour-published-browser.private.json';assert not target.exists();target.write_bytes(supplied);target.chmod(0o600)
    ops['atomic'](PRIVATE/'museum-tour-deployment.json',{**stage,'provisional':False,'provisionalReceiptSha256':sha(raw),
        'publishedBrowserProofSha256':sha(supplied),'allOtherMapsAndServicesUnchanged':True})
    print(json.dumps(dict(passed=True,provisional=False,realNativeTwoPupilAcceptance=True,allOtherMapsAndServicesUnchanged=True)))


def rollback():
    h=helper();ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');path=PRIVATE/'museum-tour-deployment-stage.json';stage=json.loads(path.read_text())
    assert not (PRIVATE/'museum-tour-deployment.json').exists() and ops['baseline']()==stage['after'] and h['process_snapshot']()==stage['processes']
    backup=PRIVATE/'before-museum-tour';old=(backup/'museum.wam').read_bytes();manifest=(backup/'manifest.json').read_bytes()
    assert sha(old)==stage['oldWamSha256'] and sha(manifest)==stage['manifestBeforeSha256']
    atomic_bytes(TARGET,old);atomic_bytes(MANIFEST,manifest);assert ops['baseline']()==stage['before']
    ops['atomic'](PRIVATE/'museum-tour-rollback.json',dict(passed=True,previousMuseumRestored=True,before=stage['after'],after=stage['before'],
        publishedMapsAndServicesOtherwiseUnchanged=True))
    print(json.dumps(dict(passed=True,previousMuseumRestored=True)))


if __name__=='__main__':activate()
