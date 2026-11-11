import copy
from pathlib import Path
import runpy
import unittest

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/stage-castle-museum-tour.py'))
review_marker=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/repair-castle-museum-marker.py'))['reviewed_marker']


class MuseumStageTests(unittest.TestCase):
    def test_marker_repair_cannot_change_the_state_module_or_native_map_sources(self):
        before={name:'old' for name in module['FILES']};after={**before,'collection.html':'new','collection.js':'new'}
        publication={'head':'same','publicFiles':{'map.tmj':'unchanged'}};review_marker(before,after,publication,publication)
        for files,receipt in [({**after,'tour-state.js':'changed'},publication),(after,{**publication,'head':'other'}),
                (after,{**publication,'publicFiles':{'map.tmj':'changed'}})]:
            with self.assertRaises(AssertionError):review_marker(before,files,publication,receipt)

    def test_only_two_existing_files_and_one_new_module_may_change(self):
        before={name:'old' for name in module['LEGACY']};after={**before,'tour-state.js':'new'}
        for name in ['collection.html','collection.js']:after[name]='new'
        module['reviewed_files'](before,after)
        for patch in [{'catalog.js':'changed'},{'extra.js':'unknown'},{'collection.js':'old'}]:
            with self.assertRaises(AssertionError):module['reviewed_files'](before,{**after,**patch})
        with self.assertRaises(AssertionError):module['reviewed_files'](after,after)

    def test_content_projection_preserves_every_map_service_role_and_route_hash(self):
        before={'services':{'play':{'id':'same','started':'same'}},'files':{'map.wam':'map','role.php':'role','nginx':'routing',str(module['RECORD']):'old'}}
        original=copy.deepcopy(before);after=module['baseline_after_content'](before,'new')
        self.assertEqual(before,original);self.assertEqual(after['files'][str(module['RECORD'])],'new')
        after['files'][str(module['RECORD'])]='old';self.assertEqual(after,before)

    def test_probe_has_its_own_native_meeting_namespace_without_geometry_changes(self):
        source={'version':1,'mapUrl':'https://wvh-web.github.io/workadventure_outside01/castle/museum.tmj?v=current',
            'areas':[{'id':1,'x':1,'y':2,'width':3,'height':4,'properties':[{'type':'livekitRoomProperty','roomName':'school-castle-v2-museum-area-buchclub'}]}],
            'entities':{},'entityCollections':[],'metadata':{},'settings':{}}
        old=copy.deepcopy(source);result=module['probe_wrapper'](source);self.assertEqual(source,old)
        self.assertIn('museum-tour-preview.tmj',result['mapUrl'])
        result['mapUrl']=source['mapUrl'];result['areas'][0]['properties'][0]['roomName']=source['areas'][0]['properties'][0]['roomName']
        self.assertEqual(result,source)
        for patch in [{'mapUrl':'https://evil.invalid/map.tmj'},{'foreign':'unexpected'}]:
            with self.assertRaises(AssertionError):module['probe_wrapper']({**source,**patch})
        source['areas'][0]['properties'][0]['roomName']='foreign-group'
        with self.assertRaises(AssertionError):module['probe_wrapper'](source)


if __name__=='__main__':unittest.main()
