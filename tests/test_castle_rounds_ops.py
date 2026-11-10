"""Owned stage cleanup is exact and never stops a replacement or a production container."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('round_ops',Path(__file__).resolve().parents[1]/'tools/castle-rounds-ops.py')
ops=importlib.util.module_from_spec(spec);spec.loader.exec_module(ops)

class RoundStageCleanup(unittest.TestCase):
    def fixture(self,run):
        with tempfile.TemporaryDirectory() as directory:
            private=Path(directory);qa=private/'rounds-stage-0123456789abcdef';qa.mkdir()
            for name in ['tokens.private.json','bootstrap.cjs']:(qa/name).write_text('isolated synthetic fixture')
            preserved=private/'runtime.env';preserved.write_text('unchanged fixture')
            stage=private/'rounds-stage.json'
            record={'name':ops.NAME,'id':'owned-stage-id','release_id':'0123456789abcdef','qa':str(qa),'before':{'fixture':True},'stopped':False}
            stage.write_text(json.dumps(record))
            value={'Id':'owned-stage-id','Config':{'Labels':{'wvh.component':'castle-rounds-stage','wvh.release':record['release_id']}}}
            calls=[]
            with patch.object(ops,'PRIVATE',private),patch.object(ops,'STAGE',stage),patch.object(ops,'inspect',return_value=value),\
                 patch.object(ops,'run',side_effect=lambda *args:calls.append(args)),patch.object(ops,'unchanged') as check:
                run(private,qa,stage,record,value,calls,check)
            self.assertEqual(preserved.read_text(),'unchanged fixture')

    def test_only_recorded_container_is_stopped_and_its_two_private_stage_files_removed(self):
        def check(private,qa,stage,record,value,calls,unchanged):
            ops.stop()
            self.assertEqual(calls,[('docker','stop','-t','8',ops.NAME),('docker','rm',ops.NAME)])
            self.assertFalse(qa.exists());self.assertTrue(json.loads(stage.read_text())['stopped'])
            unchanged.assert_called_once_with(record['before'])
        self.fixture(check)

    def test_a_replacement_container_id_is_not_stopped_or_deleted(self):
        def check(private,qa,stage,record,value,calls,unchanged):
            value['Id']='someone-elses-container'
            with self.assertRaises(AssertionError):ops.stop()
            self.assertEqual(calls,[]);self.assertTrue((qa/'tokens.private.json').exists());unchanged.assert_not_called()
        self.fixture(check)

    def test_wrong_component_or_release_never_qualifies_for_cleanup(self):
        for key in ['wvh.component','wvh.release']:
            with self.subTest(key=key):
                def check(private,qa,stage,record,value,calls,unchanged):
                    value['Config']['Labels'][key]='other'
                    with self.assertRaises(AssertionError):ops.stop()
                    self.assertEqual(calls,[]);self.assertTrue(qa.exists())
                self.fixture(check)

    def test_foreign_record_name_is_rejected_before_container_lookup(self):
        def check(private,qa,stage,record,value,calls,unchanged):
            record['name']='wvh-castle-school';stage.write_text(json.dumps(record))
            with self.assertRaises(AssertionError):ops.stop()
            ops.inspect.assert_not_called();self.assertEqual(calls,[]);self.assertTrue(qa.exists())
        self.fixture(check)

    def test_unexpected_private_directory_is_not_followed(self):
        def check(private,qa,stage,record,value,calls,unchanged):
            record['qa']=str(private);stage.write_text(json.dumps(record))
            with self.assertRaises(AssertionError):ops.stop()
            self.assertEqual(calls,[])
            self.assertTrue((qa/'tokens.private.json').exists());self.assertTrue((private/'runtime.env').exists())
        self.fixture(check)

if __name__=='__main__':unittest.main()
