import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-stars-publication.py'))


class StarsPublicationTest(unittest.TestCase):
    def test_wrapper_preserves_every_field_except_the_one_approved_source(self):
        before={'mapUrl':ops['CANONICAL']+'?v=old','areas':[{'voice':'same'}],'entities':{},'metadata':{'name':'Sternwarte'}}
        after=copy.deepcopy(before);after['mapUrl']=ops['SOURCE'];ops['guarded_wrapper'](before,after)
        for patch in [{'areas':[]},{'entities':{'x':1}},{'mapUrl':'https://evil.invalid/map.tmj'},
            {'mapUrl':ops['SOURCE']+'&token=unexpected'},{'metadata':{'name':'Other'}}]:
            with self.assertRaises(AssertionError):ops['guarded_wrapper'](before,{**after,**patch})

    def test_manifest_updates_only_the_observatory_hash_among_sixteen(self):
        before={'files':{'sternwarte.wam':'old',**{f'room-{i}.wam':f'hash-{i}' for i in range(15)}},'version':1}
        after=copy.deepcopy(before);after['files']['sternwarte.wam']='new';ops['guarded_manifest'](before,after,'new')
        for mutate in [lambda value:value['files'].update({'room-0.wam':'changed'}),
            lambda value:value['files'].update({'room-16.wam':'additional'}),lambda value:value.update({'version':2})]:
            other=copy.deepcopy(after);mutate(other)
            with self.assertRaises(AssertionError):ops['guarded_manifest'](before,other,'new')

    def test_projection_changes_exactly_two_recorded_files_and_no_service(self):
        before={'services':{'school':{'id':'same','started':'same'}},'files':{str(ops['TARGET']):'old',str(ops['MANIFEST']):'old-manifest','other':'kept'}}
        after=ops['projection'](before,'new','new-manifest')
        self.assertEqual(after['services'],before['services']);self.assertEqual(after['files']['other'],'kept')
        self.assertEqual(before['files'][str(ops['TARGET'])],'old')
        self.assertEqual({key for key in before['files'] if before['files'][key]!=after['files'][key]},{str(ops['TARGET']),str(ops['MANIFEST'])})
        with self.assertRaises(AssertionError):ops['projection']({'services':{},'files':{}},'new','new-manifest')


if __name__=='__main__':unittest.main()
