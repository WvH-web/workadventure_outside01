"""Keep the successful native preflight evidence privately before removing the isolated test service."""
import json
from pathlib import Path
import runpy

ops=runpy.run_path('/tmp/wvh-castle-rounds-ops.py')
source=Path('/home/wilhelm/.cache/wvh-school-qa/rounds-native-stage-result.json')
assert source.resolve()==source and not source.is_symlink() and source.parent.stat().st_mode&0o777==0o700
source.chmod(0o600);raw=source.read_bytes()
assert ops['sha'](raw)=='1d950199f5fdbf36721c47d8a6691d268fcf5dc0473c65e273cc3105b9495094'
proof=json.loads(raw)
assert proof['passed'] and proof['stageOnly'] and proof['realNativeWorkAdventure'] and proof['errors']==[]
assert proof['mapsModifiedOnlyInsideTestBrowsers'] and proof['realClassOverrideOnlyInStage']
assert not proof['productionSchoolAndWebConfigChanged'] and not proof['loadApprovalFor400']
assert len(proof['results'])==2 and proof['results'][0]['normalMicrosoftPupils']==2
assert all(value is True for key,value in proof['results'][0].items() if key not in ['case','normalMicrosoftPupils'])
assert all(value is True for key,value in proof['results'][1].items() if key!='case')
audio=proof['audio'];assert len(audio['before'])==len(audio['after'])==2
assert all(after['energy']>before['energy'] for before,after in zip(audio['before'],audio['after']))
assert any(room.endswith('area-lesekamin') and room in audio['after'][1]['rooms'] for room in audio['after'][0]['rooms'])
record=json.loads(ops['STAGE'].read_text());assert record['release_id']==ops['EXPECTED_ARCHIVE'][:16] and not record['stopped']
assert ops['inspect'](ops['NAME'])['Id']==record['id'] and record['api_proof']['exactClassAndRuleAgainstFreshSchoolDatabase']
ops['unchanged'](record['before'])
target=ops['PRIVATE']/'rounds-native-stage-proof.json'
assert not target.exists();target.write_bytes(raw);target.chmod(0o600)
record['native_proof_sha256']=ops['sha'](raw);ops['atomic'](ops['STAGE'],record)
print(json.dumps({'recorded':True,'nativeMicrosoftPupils':2,'realDecodedTableAudio':True,
 'mobileTouchAndCrossMapTravelPassed':True,'productionPlatformAndMapsUnchanged':True}))
