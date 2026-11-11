"""Promote the accepted astronomy activity by changing one preview wrapper only."""
import copy
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.request

PRIVATE=Path('/opt/wvh-castle-stars/private')
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
TARGET=STORAGE/'sternwarte.wam'
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
STAGE=PRIVATE/'publication-stage.json';RECORD=PRIVATE/'publication-deployment.json'
BACKUP=PRIVATE/'before-publication'
OLD_PROOF=Path('/opt/wvh-castle-school/private/game-host-published-proof-ops.py')
OLD_PROOF_SHA='61a1f36fd958040b603cac9a5425290062776c773d19f01a842cdf793a755c86'
HELPER=Path('/opt/wvh-castle-school/private/game-host-publication-ops.py')
HELPER_SHA='54a379e0d61bb1542e8ddec493848128df014c39d71702be6757ea0c0d80a2b3'
OPS=Path('/tmp/wvh-castle-piano-ops.py');OPS_SHA='4c67a5cc74678992fa8cf0f82c613075ba4eab07c76139bfd1882e9e36415fa3'
PUBLISHED_PROOF=PRIVATE/'published-proof-ops.py'
PUBLISHED_PROOF_SHA='f40a9cd7d3affaef4fe1bc91e97582209b7b188873b4381ab04de004277c9569'
SOURCE='https://wvh-web.github.io/workadventure_outside01/castle/sternwarte-puzzle-preview.tmj?v=20261111-puzzle1-20261109-rounds1'
CANONICAL='https://wvh-web.github.io/workadventure_outside01/castle/sternwarte.tmj'
WEB='https://wvh-web.github.io/workadventure_outside01/'
ORIGIN='https://together.deine-schule.com'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def checked(path,digest):
    assert path.resolve()==path and path.is_file()
    raw=path.read_bytes();assert sha(raw)==digest
    scope={'__name__':'castle_stars_dependency','__file__':str(path)}
    exec(compile(raw,str(path),'exec'),scope);return scope


def raw_private(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and path.stat().st_mode&0o777==0o600
    return path.read_bytes()


def load(path):return json.loads(raw_private(path))


def encoded(value):return (json.dumps(value,indent=2)+'\n').encode()


def write_new(path,raw):
    assert path.resolve()==path and not path.exists()
    with path.open('xb') as handle:handle.write(raw)
    path.chmod(0o600)


def public(url):
    with urllib.request.urlopen(url,timeout=20) as response:
        assert response.status==200;raw=response.read(2000001);assert len(raw)<=2000000;return raw


def guarded_wrapper(before,after):
    assert before['mapUrl'].startswith(CANONICAL+'?v=')
    assert after['mapUrl']==SOURCE
    assert {k:v for k,v in before.items() if k!='mapUrl'}=={k:v for k,v in after.items() if k!='mapUrl'}


def projection(before,wam_digest,manifest_digest):
    result=copy.deepcopy(before)
    assert str(TARGET) in result['files'] and str(MANIFEST) in result['files']
    result['files'][str(TARGET)]=wam_digest;result['files'][str(MANIFEST)]=manifest_digest
    return result


def guarded_manifest(before,after,wam_digest):
    assert len(before['files'])==16 and set(before['files'])==set(after['files'])
    expected=copy.deepcopy(before);assert 'sternwarte.wam' in expected['files'];expected['files']['sternwarte.wam']=wam_digest
    assert after==expected


def inventory(helper):
    result=helper['evidence_inventory']()
    # The prior helper excludes its own generation of receipts; this transition
    # freezes them too rather than changing their history or expected values.
    for path in HELPER.parent.glob('game-host-*.json'):
        assert path.resolve()==path and path.is_file() and path.stat().st_size<8000000
        result[str(path)]=sha(raw_private(path))
    for path in [OLD_PROOF,HELPER]:result[str(path)]=sha(raw_private(path))
    return result


def validate_inventory(files,expected_manifest):
    for name,digest in files.items():
        path=Path(name);assert path.resolve()==path and path.is_file()
        assert sha(path.read_bytes())==(expected_manifest if path==MANIFEST else digest)


def atomic(path,raw):
    assert path in [TARGET,MANIFEST] and path.resolve()==path
    temporary=path.with_name(path.name+'.stars-publication');assert not temporary.exists() and not temporary.is_symlink()
    metadata=path.stat()
    with temporary.open('xb') as handle:handle.write(raw)
    temporary.chmod(metadata.st_mode&0o777);os.chown(temporary,metadata.st_uid,metadata.st_gid);temporary.replace(path)


def assets(publication):
    assert publication['onlyAdditionalPublicFiles'] and len(publication['files'])==8
    for name,digest in publication['files'].items():assert sha(public(WEB+name+'?v='+publication['publicationCommit'][:12]))==digest


def stage():
    os.umask(0o077);assert not STAGE.exists() and not RECORD.exists() and not BACKUP.exists()
    predecessor=checked(OLD_PROOF,OLD_PROOF_SHA)['verify']()
    ops=checked(OPS,OPS_SHA);helper=checked(HELPER,HELPER_SHA)
    accepted=load(PRIVATE/'native-acceptance.json');probe=load(PRIVATE/'stage.json');cleanup=load(PRIVATE/'cleanup.json')
    assert accepted['passed'] and accepted['stageOnly'] and accepted['allThreePuzzlesSolvedInBothClients'] and accepted['concurrentDistinctRingsPreserved']
    assert accepted['normalMicrosoftPupils']==2 and accepted['nativeAudioMeasurements']==3
    assert accepted['nativeProofSha256']==sha(raw_private(PRIVATE/'native-proof.json'))
    assert cleanup['passed'] and cleanup['probeRemoved'] and cleanup['stageReceiptSha256']==sha(raw_private(PRIVATE/'stage.json'))
    assert not (STORAGE/'sternprobe.wam').exists() and len(list(STORAGE.iterdir()))==16
    before=ops['baseline']();assert before==probe['before']
    running=helper['running']();processes=helper['processes']();preserved=inventory(helper)
    assets(probe['publication'])
    assert sha(public(CANONICAL))==probe['originalPublicMapSha256']
    old=TARGET.read_bytes();manifest_raw=raw_private(MANIFEST);manifest=json.loads(manifest_raw)
    assert sha(old)==probe['originalWamSha256']==manifest['files']['sternwarte.wam']
    for name,digest in manifest['files'].items():assert sha((STORAGE/name).read_bytes())==digest
    updated=json.loads(old);updated['mapUrl']=SOURCE;guarded_wrapper(json.loads(old),updated)
    new=encoded(updated);new_manifest=copy.deepcopy(manifest);new_manifest['files']['sternwarte.wam']=sha(new)
    guarded_manifest(manifest,new_manifest,sha(new));manifest_after=encoded(new_manifest)
    BACKUP.mkdir(mode=0o700)
    for name,raw in [('sternwarte.wam',old),('manifest.json',manifest_raw)]:write_new(BACKUP/name,raw)
    assert ops['baseline']()==before and helper['running']()==running and helper['processes']()==processes
    write_new(STAGE,encoded({'version':1,'passed':True,'before':before,'running':running,'processes':processes,'preservedEvidence':preserved,
        'puzzleEvidence':{name:sha(raw_private(PRIVATE/name)) for name in ['stage.json','native-proof.json','native-acceptance.json','cleanup.json']},
        'predecessorAcceptanceSha256':sha(raw_private(OLD_PROOF.parent/'game-host-published-acceptance.json')),
        'predecessorAcceptedAt':predecessor['checkedAt'],'stagedNativeAcceptanceSha256':sha(raw_private(PRIVATE/'native-acceptance.json')),
        'oldWamSha256':sha(old),'newWamSha256':sha(new),'manifestBeforeSha256':sha(manifest_raw),'manifestAfterSha256':sha(manifest_after),
        'newWam':updated,'newManifest':new_manifest,'publication':probe['publication'],'canonicalBeforeSha256':probe['originalPublicMapSha256'],
        'candidateMapSha256':probe['publication']['files']['castle/sternwarte-puzzle-preview.tmj'],
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))
    print(json.dumps({'passed':True,'publicationStaged':True,'protectedEvidenceFiles':len(preserved),'mapsChanged':False,'servicesRestarted':False}))


def common(stage,fetch_public=True):
    ops=checked(OPS,OPS_SHA);helper=checked(HELPER,HELPER_SHA)
    assert sha(raw_private(OLD_PROOF.parent/'game-host-published-acceptance.json'))==stage['predecessorAcceptanceSha256']
    assert sha(raw_private(PRIVATE/'native-acceptance.json'))==stage['stagedNativeAcceptanceSha256']
    for name,digest in stage['puzzleEvidence'].items():assert sha(raw_private(PRIVATE/name))==digest
    assert helper['running']()==stage['running'] and helper['processes']()==stage['processes']
    assert sha(raw_private(BACKUP/'sternwarte.wam'))==stage['oldWamSha256']
    assert sha(raw_private(BACKUP/'manifest.json'))==stage['manifestBeforeSha256']
    assert sha(encoded(stage['newWam']))==stage['newWamSha256'] and sha(encoded(stage['newManifest']))==stage['manifestAfterSha256']
    guarded_wrapper(load(BACKUP/'sternwarte.wam'),stage['newWam'])
    guarded_manifest(load(BACKUP/'manifest.json'),stage['newManifest'],stage['newWamSha256'])
    if fetch_public:assets(stage['publication'])
    return ops,helper


def verify(fetch_public=True):
    stage=load(STAGE);record=load(RECORD);ops,helper=common(stage,fetch_public)
    expected=projection(stage['before'],stage['newWamSha256'],stage['manifestAfterSha256'])
    assert record['passed'] and record['provisional'] and record['stageReceiptSha256']==sha(raw_private(STAGE)) and record['after']==expected
    assert ops['baseline']()==expected and TARGET.read_bytes()==encoded(stage['newWam']) and raw_private(MANIFEST)==encoded(stage['newManifest'])
    validate_inventory(stage['preservedEvidence'],stage['manifestAfterSha256'])
    # Recheck the unchanged school release and its public authorization boundary;
    # the predecessor's frozen baseline remains a historical checkpoint, not a
    # fabricated view of the newly changed wrapper and manifest.
    school=helper['load'](helper['STAGE']);helper['release_files'](helper['RELEASE'],school['files'])
    assert ops['inspect']('wvh-castle-school')['State']['Health']['Status']=='healthy'
    if fetch_public:helper['public_files'](school['files'])
    if fetch_public:
        assert sha(public(ORIGIN+'/map-storage/castle-preview/sternwarte.wam'))==stage['newWamSha256']
        canonical=sha(public(CANONICAL));assert canonical in [stage['canonicalBeforeSha256'],stage['candidateMapSha256']]
    assert helper['running']()==stage['running'] and helper['processes']()==stage['processes'] and ops['baseline']()==expected
    if (PRIVATE/'publication-acceptance.json').exists():checked(PUBLISHED_PROOF,PUBLISHED_PROOF_SHA)['verify_receipt'](stage,record,globals())
    return stage,record


def publish():
    assert not RECORD.exists() and not (PRIVATE/'publication-rollback.json').exists()
    stage=load(STAGE);ops,helper=common(stage)
    assert ops['baseline']()==stage['before'] and TARGET.read_bytes()==raw_private(BACKUP/'sternwarte.wam') and raw_private(MANIFEST)==raw_private(BACKUP/'manifest.json')
    validate_inventory(stage['preservedEvidence'],stage['manifestBeforeSha256'])
    changed=False
    try:
        atomic(TARGET,encoded(stage['newWam']));changed=True;atomic(MANIFEST,encoded(stage['newManifest']))
        expected=projection(stage['before'],stage['newWamSha256'],stage['manifestAfterSha256'])
        assert ops['baseline']()==expected and helper['running']()==stage['running'] and helper['processes']()==stage['processes']
        write_new(RECORD,encoded({'version':1,'passed':True,'provisional':True,'stageReceiptSha256':sha(raw_private(STAGE)),
            'after':expected,'onlyPreviewMapChanged':'sternwarte.wam','servicesRestarted':False,'oldCastleReplaced':False,'fullCastleApprovalFor400':False}))
        verify();print(json.dumps({'passed':True,'provisional':True,'onlyPreviewMapChanged':'sternwarte.wam','servicesRestarted':False}))
    except Exception:
        if changed:
            assert sha(public(CANONICAL))==stage['canonicalBeforeSha256'],'Restore the canonical public source before restoring its old wrapper'
            assert TARGET.read_bytes()==encoded(stage['newWam']);atomic(TARGET,raw_private(BACKUP/'sternwarte.wam'))
            if raw_private(MANIFEST)==encoded(stage['newManifest']):atomic(MANIFEST,raw_private(BACKUP/'manifest.json'))
        assert ops['baseline']()==stage['before'] and helper['running']()==stage['running'] and helper['processes']()==stage['processes']
        write_new(PRIVATE/'publication-rollback.json',encoded({'passed':True,'previousWrapperRestored':True,'allServicesUnchanged':True}))
        if RECORD.exists():RECORD.rename(PRIVATE/'publication-failed-record.json')
        raise


def rollback():
    assert not (PRIVATE/'publication-acceptance.json').exists() and not (PRIVATE/'publication-rollback.json').exists()
    stage,record=verify();ops,helper=common(stage,False)
    assert sha(public(CANONICAL))==stage['canonicalBeforeSha256'],'Restore the canonical public source before restoring its old wrapper'
    atomic(TARGET,raw_private(BACKUP/'sternwarte.wam'));atomic(MANIFEST,raw_private(BACKUP/'manifest.json'))
    assert ops['baseline']()==stage['before'] and helper['running']()==stage['running'] and helper['processes']()==stage['processes']
    checked(OLD_PROOF,OLD_PROOF_SHA)['verify']()
    write_new(PRIVATE/'publication-rollback.json',encoded({'passed':True,'previousWrapperRestored':True,'allServicesUnchanged':True,
        'stageReceiptSha256':sha(raw_private(STAGE))}))
    RECORD.rename(PRIVATE/'publication-rolled-back-record.json')
    print(json.dumps({'passed':True,'previousWrapperRestored':True,'allServicesUnchanged':True}))


def main(action):
    assert action in ['stage','publish','verify','rollback']
    if action=='verify':
        stage,record=verify()
        print(json.dumps({'passed':True,'onlyPreviewMapChanged':'sternwarte.wam','otherMapsAndServicesUnchanged':True,
            'nativePublishedAcceptancePending':not (PRIVATE/'publication-acceptance.json').exists(),
            'canonicalSourceSyncPending':sha(public(CANONICAL))!=stage['candidateMapSha256'],'fullCastleApprovalFor400':False}))
    else:globals()[action]()


if __name__=='__main__':main('stage')
