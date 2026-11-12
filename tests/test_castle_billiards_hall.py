import copy
import json
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1];ops=runpy.run_path(str(root/'tools/castle-billiards-hall-publication.py'))

class BilliardsHallPublication(unittest.TestCase):
    def pair(self):
        before=json.loads((root/'tests/fixtures/castle-billiards-table-v1.wam.json').read_text())
        after=json.loads((root/'castle/spielesaal.wam').read_text());return before,after

    def test_only_new_hall_geometry_and_revision_accepted(self):ops['guarded_wrapper'](*self.pair())

    def test_actual_original_window_label_and_geometry_can_be_promoted(self):
        before,after=self.pair();before['areas'][1].update(name='Zuschauernische',x=656,y=176,width=176,height=176)
        before['areas'][2].update(y=400,height=240);ops['guarded_wrapper'](before,after)

    def test_other_map_voice_privileges_or_extra_properties_rejected(self):
        for mutate in [lambda v:v.update(mapUrl=v['mapUrl'].replace('spielesaal','village')),lambda v:v['areas'][0]['properties'][0].update(roomName='foreign'),
          lambda v:v['areas'][1].update(width=400),lambda v:v['settings']['megaphone'].update(enabled=True),lambda v:v.update(unexpected=True)]:
            before,after=self.pair();mutate(after)
            with self.assertRaises((AssertionError,KeyError)):ops['guarded_wrapper'](before,after)

    def test_manifest_can_change_only_one_of_sixteen_entries(self):
        before={'version':1,'files':{'spielesaal.wam':'old',**{'map'+str(i)+'.wam':'same' for i in range(15)}}};after=copy.deepcopy(before);after['files']['spielesaal.wam']='new'
        ops['guarded_manifest'](before,after,'new');after['files']['map0.wam']='changed'
        with self.assertRaises(AssertionError):ops['guarded_manifest'](before,after,'new')

    def test_projection_never_changes_existing_services_or_unrelated_files(self):
        before={'services':{'play':'same'},'files':{str(ops['TARGET']):'old',str(ops['MANIFEST']):'old','village':'same'}}
        after=ops['projection'](before,'wam','manifest');self.assertEqual(after['services'],before['services']);self.assertEqual(after['files']['village'],'same')
        self.assertEqual(before['files'][str(ops['TARGET'])],'old');self.assertEqual(after['files'][str(ops['TARGET'])],'wam')

if __name__=='__main__':unittest.main()
