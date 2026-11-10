"""Record published native acceptance and prove the exact service/map update scope."""
import hashlib
import json
from pathlib import Path
import runpy
import time
import urllib.request

sha=lambda raw:hashlib.sha256(raw).hexdigest()
ops=runpy.run_path('/tmp/wvh-castle-rounds-ops.py');private=ops['PRIVATE']
record=json.loads(ops['RECORD'].read_text());live=json.loads((private/'rounds-live-check.json').read_text())
assert live['passed'] and live['release']=='6973432bdfccee7c' and record['release']==str(ops['BASE']/'releases'/live['release'])
release=Path(record['release']);assert release.resolve()==release
assert len(record['files'])==40 and all(sha((release/name).read_bytes())==digest for name,digest in record['files'].items())
school=ops['inspect']('wvh-castle-school');assert school['Id']==live['containerId'] and school['Image']==live['image']
assert school['State']['Health']['Status']=='healthy' and school['Config']['User']=='1000:1000' and school['HostConfig']['ReadonlyRootfs']
previous=ops['inspect'](record['previous_rounds_container']);assert not previous['State']['Running'] and previous['Id']==live['before']['services']['wvh-castle-school']['id']
after=ops['baseline']();before=live['before']
assert {name:value for name,value in before['services'].items() if name!='wvh-castle-school'}=={name:value for name,value in after['services'].items() if name!='wvh-castle-school'}
storage=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
manifest_path=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json');manifest=json.loads(manifest_path.read_text())['files']
assert len(manifest)==16 and set(path.name for path in storage.iterdir())==set(manifest)
allowed={str(ops['RECORD']),str(manifest_path),*[str(storage/name) for name in manifest]}
assert {name:value for name,value in before['files'].items() if name not in allowed}=={name:value for name,value in after['files'].items() if name not in allowed}
backup=private/('deployment-before-rounds-'+live['release']+'.json');original=json.loads(backup.read_text())
assert record['nginx_after_sha256']==original['nginx_after_sha256']
publication=json.loads(Path('/tmp/wvh-castle-runtime-publication.json').read_text());assert publication['passed'] and len(publication['files'])==29
for item in publication['files']:
    with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/'+item['file']+'?v='+publication['head'][:12],timeout=20) as response:
        assert response.status==200 and sha(response.read(4000000))==item['sha256']
wam_archive=Path('/tmp/wvh-castle-preview-wams.zip')
wam_backup=Path('/opt/wvh-hall-audio/private')/('castle-wams-before-'+sha(wam_archive.read_bytes())[:12])
for name,digest in manifest.items():
    path=storage/name;assert sha(path.read_bytes())==digest
    previous_wam=wam_backup/name;assert sha(previous_wam.read_bytes())==before['files'][str(path)]
    old=json.loads(previous_wam.read_text());new=json.loads(path.read_text())
    assert {key:value for key,value in old.items() if key!='mapUrl'}=={key:value for key,value in new.items() if key!='mapUrl'}
    with urllib.request.urlopen(new['mapUrl'],timeout=20) as response:source=json.load(response)
    properties={value['name']:value['value'] for value in source['properties']}
    assert properties['castleMapId']==name[:-4] and properties['castleCommunity'] is True and properties['castleRuntimeRevision']=='20261109-rounds1'
reports={}
retained_path=private/'rounds-published-acceptance.json'
retained=json.loads(retained_path.read_text()) if retained_path.exists() else None
for kind in ['native','all-rooms','brothers']:
    source=Path('/home/wilhelm/.cache/wvh-school-qa/rounds-'+kind+'-live-result.json')
    assert source.resolve()==source and not source.is_symlink() and source.parent.stat().st_mode&0o777==0o700
    if source.exists():source.chmod(0o600);raw=source.read_bytes()
    else:
        target=private/('rounds-'+kind+'-live-proof.json');assert target.resolve()==target and not target.is_symlink()
        raw=target.read_bytes();assert retained and sha(raw)==retained['proofSha256'][kind]
    value=json.loads(raw);assert value['passed']
    reports[kind]=(source,raw,value)
native=reports['native'][2]
assert native['publishedPreview'] and not native['stageOnly'] and not native['mapsModifiedOnlyInsideTestBrowsers'] and native['errors']==[]
assert native['results'][0]['normalMicrosoftPupils']==2 and native['results'][0]['tableAudioDecodedBoth']
assert native['results'][0]['realGradeFiltering'] and native['results'][0]['stageClassOverrideNotPublished']
assert native['results'][1]['crossMapArrivalReauthorized'] and native['results'][1]['lastPhysicalDepartureRemovesAnnouncement']
assert len(native['audio']['before'])==len(native['audio']['after'])==2
assert all(after['energy']>before['energy'] for before,after in zip(native['audio']['before'],native['audio']['after']))
rooms=reports['all-rooms'][2]
assert rooms['publishedMaps']==16 and rooms['idleRoundApiRequests']==0 and rooms['errors']==[]
assert {value['id'] for value in rooms['results']}=={name[:-4] for name in manifest}
assert all(value['enabled'] and value['runtime']=='20261109-rounds1' and value['nonblankCanvas'] for value in rooms['results'])
brothers=reports['brothers'][2]
assert brothers['normalMicrosoftSameAccountConnections']==2 and brothers['sameAccountVerified']
assert not brothers['transientPrivateStateReachedOtherConnection'] and brothers['observedForMilliseconds']>brothers['requestFreshnessWindowMilliseconds']
assert brothers['probeVariableRemoved'] and not brothers['gameOrSeatChanged']
assert not ops['exists'](ops['NAME']) and not ops['run']('ss','-ltnH','sport = :13212').strip()
assert not ops['TOKEN'].exists()
for url in ['https://together.deine-schule.com/ping','https://together.deine-schule.com/castle-school/health','https://together.deine-schule.com/castle-audio/health']:
    with urllib.request.urlopen(url,timeout=15) as response:assert response.status==200
for kind,(source,raw,value) in reports.items():
    target=private/('rounds-'+kind+'-live-proof.json')
    if target.exists():assert target.read_bytes()==raw
    else:target.write_bytes(raw);target.chmod(0o600)
    if source.exists():source.unlink()
result={'passed':True,'runtime':'20261109-rounds1','serviceRelease':live['release'],'publicationHead':publication['head'],
 'publishedPreviewMaps':16,'normalMicrosoftPupilsInSharedRound':2,'nativeAudioTouchAndTravel':True,
 'allRoomsNonblankAndSingleBridge':True,'idleRoundApiRequests':0,'sameAccountTransientBoundaryObserved':True,
 'nativeVoiceAreasAndAllOtherWamFieldsUnchanged':True,'onlySchoolServiceReplaced':True,
 'otherServiceIdsAndStartTimesUnchanged':True,'authAndWebConfigurationUnchanged':True,
 'oldCastleNotReplaced':True,'temporaryStageAndTokenHandoffRemoved':True,'loadApprovalFor400':False,
 'checked_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
 'proofSha256':{kind:sha(raw) for kind,(source,raw,value) in reports.items()}}
ops['atomic'](private/'rounds-published-acceptance.json',result);print(json.dumps(result,indent=2))
