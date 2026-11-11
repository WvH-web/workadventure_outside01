"""Publish only the new preview gallery entrance, with exact backups and real-browser acceptance."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import time
import urllib.request

PRIVATE=Path('/opt/wvh-castle-homes/private')
STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
TARGET=STORAGE/'obergeschoss.wam'
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
RECORD=PRIVATE/'native-entry-stage.json'
ACCEPTED=PRIVATE/'native-entry-deployment.json'
INPUT=Path('/tmp/wvh-castle-home-entry')
SOURCE='https://wvh-web.github.io/workadventure_outside01/castle/obergeschoss-homes.tmj?v=20261111-homes2'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def proof(value,preview=False):
    assert value['passed'] and value['browserVersion'].startswith('157.') and value['normalMicrosoftPupils']==2
    for key in ['realNativeWorkAdventure','realPublicRoomService','realPublicRoomMedia','anonymousRedirectedToMicrosoft',
        'automaticSidePanelOnEntry','actualPrivateVisit','nativeConversationDecodedBeforeAndAfter',
        'quietEntryWithoutNativeSpeechBeforeAndDuring','privateMicrophoneCaptureOnlyAfterExplicitClick',
        'mapApiNotGranted','microphonePreferenceUnchanged','departureClosesOwnedPanelAndEndsActualTracks',
        'desktopAndMobileRendered','noHorizontalOverflow']:
        assert value[key] is True
    assert len(value['decodedPrivateSpeechBoth'])==2 and all(number>.002 for number in value['decodedPrivateSpeechBoth'])
    assert not value['networkResponsesSubstituted'] and not value['schoolOverrides'] and not value['loadApprovalFor400'] and value['errors']==[]
    assert value['existingMapsChanged'] is preview and value['probeWrapperOnly'] is (not preview)
    if preview:
        assert value['previewGalleryOnly'] and value['roomUrl']=='https://together.deine-schule.com/~/castle-preview/obergeschoss.wam'


def processes():
    return {name:subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)
        for name in ['wvh-castle-homes.service','wvh-castle-homes-control.service','wvh-sterne-kollegium.service']}


def replace(path,raw,mode,uid,gid):
    temporary=path.with_name(path.name+'.homes-staging')
    assert path.resolve()==path and not temporary.exists()
    try:
        temporary.write_bytes(raw);temporary.chmod(mode);os.chown(temporary,uid,gid);temporary.replace(path)
    finally:
        if temporary.exists():
            assert temporary.resolve()==temporary and temporary.read_bytes()==raw
            temporary.unlink()


def stage():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    assert not RECORD.exists() and not ACCEPTED.exists()
    assert json.loads((PRIVATE/'calls-deployment.json').read_text())['after']==before
    probe_raw=(PRIVATE/'native-probe.json').read_bytes();probe=json.loads(probe_raw)
    cleanup_raw=(PRIVATE/'native-probe-cleanup.json').read_bytes();cleanup=json.loads(cleanup_raw)
    assert cleanup['passed'] and cleanup['stopped'] and cleanup['stageReceiptSha256']==sha(probe_raw)
    assert cleanup['existingMapsAndServicesUnchanged'] and cleanup['probeRemoved'] and before==probe['original']
    accepted_raw=INPUT.with_suffix('.probe.private.json').read_bytes();accepted=json.loads(accepted_raw);proof(accepted)
    assert accepted['candidateMapSha256']==probe['sourcePublication']['files']['castle/obergeschoss-homes-pilot.tmj']
    assert accepted['entryScriptSha256']==probe['sourcePublication']['files']['castle/upper-gallery.bundle.js']
    publication=json.loads(INPUT.with_suffix('.publication.json').read_text())
    assert publication['passed'] and publication['onlyNewPreviewSource'] and publication['existingMapSourcesUnchanged']
    assert publication['head']=='ddb69e4f15ffb23cbe53a13279e75da50d8fa19e'
    assert set(publication['files'])=={'castle/obergeschoss-homes.tmj'}
    with urllib.request.urlopen(SOURCE,timeout=20) as response:source=response.read(2000000)
    assert sha(source)==publication['files']['castle/obergeschoss-homes.tmj']
    old_source='https://wvh-web.github.io/workadventure_outside01/castle/obergeschoss-homes-pilot.tmj?v=20261111-homes2'
    with urllib.request.urlopen(old_source,timeout=20) as response:original_source=response.read(2000000)
    assert sha(original_source)==accepted['candidateMapSha256']
    original=json.loads(original_source);candidate=json.loads(source)
    original['properties']=[{**p,'value':'https://together.deine-schule.com/~/castle-preview/obergeschoss.wam'} if p['name']=='castleNativeRoomUrl' else p for p in original['properties']]
    assert candidate==original
    old=TARGET.read_bytes();new=INPUT.with_suffix('.wam').read_bytes();old_manifest=MANIFEST.read_bytes()
    expected=json.loads(old);expected['mapUrl']=SOURCE;assert json.loads(new)==expected and old!=new
    manifest=json.loads(old_manifest);assert len(manifest['files'])==16 and {p.name for p in STORAGE.iterdir()}==set(manifest['files'])
    assert all(sha((STORAGE/name).read_bytes())==digest for name,digest in manifest['files'].items())
    backup=PRIVATE/'before-native-entry';assert not backup.exists();backup.mkdir(mode=0o700)
    for name,raw in [('obergeschoss.wam',old),('manifest.json',old_manifest),('probe.private.json',accepted_raw)]:
        (backup/name).write_bytes(raw);(backup/name).chmod(0o600)
    updated=json.loads(old_manifest);updated['files'][TARGET.name]=sha(new);updated_raw=(json.dumps(updated,indent=2)+'\n').encode()
    target_stat=TARGET.stat();manifest_stat=MANIFEST.stat();services=processes()
    try:
        assert ops['baseline']()==before
        replace(TARGET,new,target_stat.st_mode&0o777,target_stat.st_uid,target_stat.st_gid)
        replace(MANIFEST,updated_raw,manifest_stat.st_mode&0o777,manifest_stat.st_uid,manifest_stat.st_gid)
        after=ops['baseline']();expected_after=json.loads(json.dumps(before));expected_after['files'][str(TARGET)]=sha(new);expected_after['files'][str(MANIFEST)]=sha(updated_raw)
        assert after==expected_after and processes()==services
        with urllib.request.urlopen('https://together.deine-schule.com/map-storage/castle-preview/obergeschoss.wam',timeout=20) as response:assert response.read()==new
        value=dict(passed=True,provisional=True,before=before,after=after,processes=services,backup=str(backup),
            publication=publication,newWamSha256=sha(new),oldWamSha256=sha(old),manifestBeforeSha256=sha(old_manifest),manifestAfterSha256=sha(updated_raw),
            probeProofSha256=sha(accepted_raw),probeCleanupSha256=sha(cleanup_raw),probeStageSha256=sha(probe_raw),
            sourceSha256=sha(source),entryScriptSha256=accepted['entryScriptSha256'],previewMapsChanged=['obergeschoss.wam'],
            allNativeVoiceAreasUnchanged=True,allOtherMapsAndServicesUnchanged=True,noServiceRestart=True,
            oldCastleReplaced=False,broadSchoolRoomAccess=False,loadApprovalFor400=False,
            targetMode=target_stat.st_mode&0o777,targetUid=target_stat.st_uid,targetGid=target_stat.st_gid,
            manifestMode=manifest_stat.st_mode&0o777,manifestUid=manifest_stat.st_uid,manifestGid=manifest_stat.st_gid)
        ops['atomic'](RECORD,value)
        print(json.dumps(dict(passed=True,provisional=True,previewGalleryOnly=True,nativeVoiceAreasUnchanged=True,noServiceRestart=True)))
    except Exception:
        assert TARGET.read_bytes() in [old,new] and MANIFEST.read_bytes() in [old_manifest,updated_raw]
        replace(TARGET,old,target_stat.st_mode&0o777,target_stat.st_uid,target_stat.st_gid)
        replace(MANIFEST,old_manifest,manifest_stat.st_mode&0o777,manifest_stat.st_uid,manifest_stat.st_gid)
        assert ops['baseline']()==before
        raise RuntimeError('Gallery activation failed; previous preview restored') from None


def accept():
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');raw=RECORD.read_bytes();value=json.loads(raw)
    assert value['passed'] and value['provisional'] and not ACCEPTED.exists()
    assert ops['baseline']()==value['after'] and processes()==value['processes']
    browser_raw=INPUT.with_suffix('.preview.private.json').read_bytes();browser=json.loads(browser_raw);proof(browser,preview=True)
    assert browser['candidateMapSha256']==value['sourceSha256'] and browser['entryScriptSha256']==value['entryScriptSha256']
    ops['atomic'](PRIVATE/'native-entry-browser.private.json',browser)
    result={**value,'provisional':False,'stageReceiptSha256':sha(raw),'publicNativeBrowserProofSha256':sha(browser_raw),
        'nativeMapEntryEnabled':True,'twoNormalMicrosoftParticipants':True,'nativePrivateAudioSeparationVerified':True,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    ops['atomic'](ACCEPTED,result)
    print(json.dumps(dict(passed=True,previewGalleryOnly=True,nativeMapEntryEnabled=True,twoNormalMicrosoftParticipants=True,
        nativeAndPrivateAudioSeparated=True,noServiceRestart=True,oldCastleReplaced=False,broadSchoolRoomAccess=False,loadApprovalFor400=False)))


def rollback():
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');value=json.loads(RECORD.read_text());backup=PRIVATE/'before-native-entry'
    assert not ACCEPTED.exists() and value['backup']==str(backup) and ops['baseline']()==value['after'] and processes()==value['processes']
    assert sha((backup/'obergeschoss.wam').read_bytes())==value['oldWamSha256'] and sha((backup/'manifest.json').read_bytes())==value['manifestBeforeSha256']
    replace(TARGET,(backup/'obergeschoss.wam').read_bytes(),value['targetMode'],value['targetUid'],value['targetGid'])
    replace(MANIFEST,(backup/'manifest.json').read_bytes(),value['manifestMode'],value['manifestUid'],value['manifestGid'])
    assert ops['baseline']()==value['before']
    ops['atomic'](PRIVATE/'native-entry-rollback.json',dict(passed=True,restored=True,stageReceiptSha256=sha(RECORD.read_bytes())))
    print(json.dumps(dict(passed=True,previousPreviewRestored=True)))


if __name__=='__main__':stage()
