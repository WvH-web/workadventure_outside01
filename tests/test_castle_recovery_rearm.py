import copy
from pathlib import Path
import runpy
import tempfile
import unittest

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/rearm-castle-round-recovery.py'))


class RecoveryRearmTests(unittest.TestCase):
    def fixture(self):
        before={'services':{'school':'same'},'files':{'nginx':'old','map':'same'}}
        after=copy.deepcopy(before);after['files']['nginx']='new'
        processes={'homes':'same','control':'same','original':'same'}
        staged={'passed':True,'provisional':True,'before':before,'after':after,'processes':processes}
        rollback={'passed':True,'restored':True,'before':after,'after':before}
        return staged,rollback,before,processes

    def test_only_a_completed_reversed_transition_can_release_the_old_stage_slot(self):
        staged,rollback,before,processes=self.fixture();module['validate'](staged,rollback,before,processes)
        for change in [{'restored':False},{'before':before},{'after':staged['after']},{'passed':False}]:
            with self.assertRaises(AssertionError):module['validate'](staged,{**rollback,**change},before,processes)
        for change in [{'provisional':False},{'passed':False}]:
            with self.assertRaises(AssertionError):module['validate']({**staged,**change},rollback,before,processes)

    def test_an_unrelated_current_service_or_file_change_is_not_a_restored_baseline(self):
        staged,rollback,before,processes=self.fixture()
        for section,key in [('services','school'),('files','map')]:
            changed=copy.deepcopy(before);changed[section][key]='foreign'
            with self.assertRaises(AssertionError):module['validate'](staged,rollback,changed,processes)
        with self.assertRaises(AssertionError):module['validate'](staged,rollback,before,{**processes,'homes':'restarted'})

    def test_exact_archive_writes_are_idempotent_and_never_overwrite_different_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory).resolve()/'proof.json';module['exact'](path,b'original');module['exact'](path,b'original')
            with self.assertRaises(AssertionError):module['exact'](path,b'changed')
            self.assertEqual(path.read_bytes(),b'original')


if __name__=='__main__':unittest.main()
