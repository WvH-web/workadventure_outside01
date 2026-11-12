import copy
import json
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1];ops=runpy.run_path(str(root/'tools/castle-billiards-table-stage.py'))
def original_wam():return json.loads((root/'tests/fixtures/castle-billiards-table-v1.wam.json').read_text())
def original_map():return json.loads((root/'castle/spielesaal-billard-preview.tmj').read_text())
class BilliardsTableStage(unittest.TestCase):
    def test_only_one_additional_map_is_allowed(self):
        before={'services':{'play':'same'},'files':{'old.wam':'same'}};after=ops['with_probe'](before,'probe')
        self.assertEqual(after['services'],before['services']);self.assertEqual(before['files'],{'old.wam':'same'})
        self.assertEqual(after['files'],{'old.wam':'same',str(ops['PROBE']):'probe'})
        with self.assertRaises(AssertionError):ops['with_probe'](after,'other')

    def test_real_candidate_uses_separate_voice_names_without_changing_its_geometry(self):
        original=original_wam();map=original_map();before=copy.deepcopy(original)
        result=ops['wrapper'](original,map,{'publicationCommit':'a'*40});self.assertEqual(original,before)
        self.assertEqual(result['mapUrl'],ops['WEB']+'castle/spielesaal-billard-preview.tmj?v='+'a'*12)
        for a,b in zip(original['areas'],result['areas']):
            self.assertEqual({k:v for k,v in a.items() if k!='properties'},{k:v for k,v in b.items() if k!='properties'})
            self.assertTrue(b['properties'][0]['roomName'].startswith('school-castle-billiards-qa-'))

    def test_wrong_map_source_or_foreign_voice_room_is_rejected(self):
        original=original_wam();map=original_map()
        for mutate in [lambda value:value.update(mapUrl='https://foreign.invalid/map.tmj'),lambda value:value['areas'][0]['properties'][0].update(roomName='old-castle')]:
            changed=copy.deepcopy(original);mutate(changed)
            with self.assertRaises(AssertionError):ops['wrapper'](changed,map,{'publicationCommit':'a'*40})

    def test_changed_native_geometry_cannot_be_hidden_by_a_candidate_map(self):
        original=original_wam();map=original_map();original['areas'][0]['width']+=32
        with self.assertRaises(AssertionError):ops['wrapper'](original,map,{'publicationCommit':'a'*40})

if __name__=='__main__':unittest.main()
