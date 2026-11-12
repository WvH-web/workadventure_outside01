import copy
import json
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1];ops=runpy.run_path(str(root/'tools/castle-billiards-table-r2-stage.py'))
class BilliardsTableSecondStage(unittest.TestCase):
    def map(self):return json.loads((root/'castle/spielesaal-billard2-preview.tmj').read_text())
    def wam(self):return json.loads((root/'castle/spielesaal.wam').read_text())

    def test_second_probe_uses_new_name_and_voice_namespace_without_mutating_input(self):
        original=self.wam();before=copy.deepcopy(original);value=ops['wrapper'](original,self.map(),{'publicationCommit':'a'*40})
        self.assertEqual(original,before);self.assertIn('spielesaal-billard2-preview.tmj',value['mapUrl'])
        self.assertTrue(all(area['properties'][0]['roomName'].startswith('school-castle-billiards-qa2-') for area in value['areas']))

    def test_old_stool_height_and_foreign_voice_rooms_are_rejected(self):
        map=self.map();seat=next(item for layer in map['layers'] for item in layer.get('objects',[]) if item.get('name')=='seat-billard-west')
        next(prop for prop in seat['properties'] if prop['name']=='seatY')['value']=350
        with self.assertRaises(AssertionError):ops['wrapper'](self.wam(),map,{'publicationCommit':'a'*40})
        wam=self.wam();wam['areas'][0]['properties'][0]['roomName']='other-room'
        with self.assertRaises(AssertionError):ops['wrapper'](wam,self.map(),{'publicationCommit':'a'*40})

    def test_only_second_probe_can_be_projected_and_removal_is_exact(self):
        before={'services':{'play':'same'},'files':{'old.wam':'same'}};after=ops['with_probe'](before,'new')
        self.assertEqual(ops['without_probe'](after),before);self.assertEqual(before['files'],{'old.wam':'same'})
        with self.assertRaises(AssertionError):ops['with_probe'](after,'other')

    def test_only_two_additional_revision_assets_are_accepted(self):
        value={'version':1,'sourceCommit':'a'*40,'publicationCommit':'b'*40,'previousPublicationCommit':'c'*40,
          'files':{name:'d'*64 for name in ops['NEW']},'onlyAdditionalPublicFiles':True};ops['publication'](value)
        value['files']['castle/spielesaal.tmj']='d'*64
        with self.assertRaises(AssertionError):ops['publication'](value)

if __name__=='__main__':unittest.main()
