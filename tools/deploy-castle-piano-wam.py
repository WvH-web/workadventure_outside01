"""Activate only the accepted music-room wrapper, preserving every native voice area and every other map."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import urllib.parse
import urllib.request
import zipfile

STORAGE=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
MANIFEST=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
NAME='musikzimmer.wam'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def guarded(before,after):
    assert {key:value for key,value in before.items() if key!='mapUrl'}=={key:value for key,value in after.items() if key!='mapUrl'}
    a=urllib.parse.urlsplit(before['mapUrl']);b=urllib.parse.urlsplit(after['mapUrl'])
    assert (a.scheme,a.netloc,a.path,a.fragment)==(b.scheme,b.netloc,b.path,b.fragment)
    assert b.scheme=='https' and b.netloc=='wvh-web.github.io' and b.path=='/workadventure_outside01/castle/musikzimmer.tmj'
    assert urllib.parse.parse_qs(b.query)=={'v':['20261109-piano1-20261109-rounds1']}
def proof(value,live=False):
    assert value['passed'] and value['realNativeWorkAdventure'] and value['normalMicrosoftPupils']==2
    assert value['candidateMapOnlyInsideTestBrowsers'] is (not live) and value['publishedPreview'] is live and not value['schoolOverrides'] and not value['loadApprovalFor400']
    for key in ['publicPianoService','realPublicPianoWebSocketHandshake','visibleGroupPicker','lateJoinSharesChoice','desktopAndMobileTouchHeardBothWays',
      'nativeTableConversationDecodedBoth','nativeMicrophonesActivatedWithUi','standingClosesOnlyOwnedPiano','remainingMusicianContinues','lastStandingResetsChoice',
      'existingBandAndChoirPreserved','visibleInstrumentApproachWorks','noMobileHorizontalOverflow','nonblankNativeCanvas','normalMovementAfterClosure']:assert value[key] is True
    assert value['errors']==[]
def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');private=ops['PRIVATE'];deployment=json.loads((private/'deployment.json').read_text())
    assert deployment['release']=='8a1f180e9b723ef1';container=ops['inspect']('wvh-castle-piano')
    assert container['Id']==deployment['containerId'] and container['State']['Health']['Status']=='healthy'
    stage=json.loads(ops['RECORD'].read_text());assert stage['stopped'] and not ops['exists'](ops['NAME'])
    ui=json.loads(Path('/opt/wvh-castle-school/private/round-ui-events-deployment.json').read_text())
    assert ui['passed'] and ui['runningSchoolServiceUnchanged'] and ui['nginx_before_sha256']==deployment['nginx_after_sha256']
    before=ops['baseline']();assert before['files'][str(ops['PROTECTED'][0])]==ui['nginx_after_sha256']
    acceptance=Path('/home/wilhelm/.cache/wvh-school-qa/piano-native-candidate-proof.private.json')
    assert acceptance.resolve()==acceptance and acceptance.parent.stat().st_mode&0o777==0o700;acceptance.chmod(0o600)
    acceptance_raw=acceptance.read_bytes();accepted=json.loads(acceptance_raw);proof(accepted)
    published=json.loads(Path('/tmp/wvh-castle-runtime-publication.json').read_text());assert published['passed'] and len(published['files'])==29
    sources={item['file']:item['sha256'] for item in published['files']}
    for name,digest in accepted['sourceFiles'].items():assert sources['castle/'+name]==digest
    old_manifest=MANIFEST.read_bytes();files=json.loads(old_manifest)['files'];assert len(files)==16 and set(path.name for path in STORAGE.iterdir())==set(files)
    assert all(sha((STORAGE/name).read_bytes())==digest for name,digest in files.items())
    archive=Path('/tmp/wvh-castle-preview-wams.zip')
    with zipfile.ZipFile(archive) as bundle:
        assert len(bundle.infolist())==16 and set(bundle.namelist())==set(files)
        for name in files:
            if name!=NAME:assert bundle.read(name)==(STORAGE/name).read_bytes()
        new=bundle.read(NAME);assert len(new)<100000
    target=STORAGE/NAME;old=target.read_bytes();guarded(json.loads(old),json.loads(new));assert old!=new
    with urllib.request.urlopen(json.loads(new)['mapUrl'],timeout=20) as response:source=response.read(2000000)
    assert sha(source)==sources['castle/musikzimmer.tmj']==accepted['sourceFiles']['musikzimmer.tmj']
    props={prop['name']:prop['value'] for prop in json.loads(source)['properties']};assert props['castleRevision']=='20261109-piano1' and props['castleCommunity'] is True
    backup=private/'music-wrapper-before-piano.private.wam';assert not backup.exists();backup.write_bytes(old);backup.chmod(0o600)
    backup_manifest=private/'wams-manifest-before-piano.private.json';assert not backup_manifest.exists();backup_manifest.write_bytes(old_manifest);backup_manifest.chmod(0o600)
    updated=json.loads(old_manifest);updated['files'][NAME]=sha(new);updated_raw=(json.dumps(updated,indent=2)+'\n').encode()
    try:
        ops['unchanged'](before);temporary=target.with_name(NAME+'.piano-staging');assert not temporary.exists();original=target.stat()
        temporary.write_bytes(new);temporary.chmod(original.st_mode&0o777);os.chown(temporary,original.st_uid,original.st_gid);temporary.replace(target)
        ops['atomic'](MANIFEST,updated)
        after=ops['baseline']();expected=json.loads(json.dumps(before));expected['files'][str(target)]=sha(new);expected['files'][str(MANIFEST)]=sha(MANIFEST.read_bytes());assert after==expected
        ops['atomic'](private/'accepted-native-candidate-proof.json',accepted)
        result={'passed':True,'sourceCommit':published['head'],'previewMapsChanged':[NAME],'oldWamSha256':sha(old),'newWamSha256':sha(new),
          'nativeCandidateProofSha256':sha(acceptance_raw),'allNativeVoiceAreasUnchanged':True,'allOtherMapsAndServicesUnchanged':True,
          'oldCastleReplaced':False,'loadApprovalFor400':False,'before':before,'after':after}
        ops['atomic'](private/'music-wrapper-deployment.json',result);print(json.dumps({key:value for key,value in result.items() if key not in ['before','after']},indent=2))
    except Exception:
        assert target.read_bytes() in [old,new] and MANIFEST.read_bytes() in [old_manifest,updated_raw]
        target.write_bytes(old);MANIFEST.write_bytes(old_manifest);ops['unchanged'](before)
        raise RuntimeError('Music wrapper activation failed; exact previous wrapper restored') from None
if __name__=='__main__':main()
