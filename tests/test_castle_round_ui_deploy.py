"""The helper front-end change must never replace a process, map, policy or existing manifest."""
import copy
import hashlib
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('round_ui',Path(__file__).resolve().parents[1]/'tools/deploy-castle-round-ui-events.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class RoundUiPublication(unittest.TestCase):
    def test_only_reviewed_three_documents(self):
        self.assertEqual(set(module.FILES),{'rounds.html','presence.html','unowned-ui.js'})
        root=Path(__file__).resolve().parents[1]/'ops/castle-school/public'
        for name,digest in module.FILES.items():self.assertEqual(hashlib.sha256((root/name).read_bytes()).hexdigest(),digest)
    def test_preserve_running_rounds_and_other_files(self):
        before={'services':{'school':{'id':'same','started':'same'}},'files':{str(module.NGINX):'old','map.wam':'map','policy':'policy','deployment.json':'historical'}}
        after=copy.deepcopy(before);after['files'][str(module.NGINX)]='new';module.preserved(before,after)
        for change in [{'services':{}},{'files':{**after['files'],'map.wam':'changed'}},{'files':{**after['files'],'deployment.json':'rewritten'}}]:
            with self.assertRaises(AssertionError):module.preserved(before,{**after,**change})
if __name__=='__main__':unittest.main()
