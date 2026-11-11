"""The helper front-end change must never replace a process, map, policy or existing manifest."""
import copy
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import unittest
spec=importlib.util.spec_from_file_location('round_ui',Path(__file__).resolve().parents[1]/'tools/deploy-castle-round-ui-events.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class RoundUiPublication(unittest.TestCase):
    def historical(self,name):
        root=Path(__file__).resolve().parents[1]
        return subprocess.check_output(['git','show','e0d34ab02dff74af3f3e92df69608cd954b1f2f5:ops/castle-school/public/'+name],cwd=root)
    def test_only_reviewed_three_historical_documents(self):
        self.assertEqual(set(module.FILES),{'rounds.html','presence.html','unowned-ui.js'})
        for name,digest in module.FILES.items():self.assertEqual(hashlib.sha256(self.historical(name)).hexdigest(),digest)
    def test_current_round_html_changes_only_the_reviewed_game_navigation(self):
        old=self.historical('rounds.html')
        before=b'<a href="/castle-school/games" target="_blank" rel="noopener noreferrer" class="icon-button" title="Spielangebote in neuem Tab" aria-label="Spielangebote in neuem Tab">'
        after=b'<a href="/castle-school/games#rounds" class="icon-button" title="Spielangebote" aria-label="Spielangebote">'
        self.assertEqual(old.count(before),1)
        current=(Path(__file__).resolve().parents[1]/'ops/castle-school/public/rounds.html').read_bytes()
        self.assertEqual(current,old.replace(before,after))
    def test_preserve_running_rounds_and_other_files(self):
        before={'services':{'school':{'id':'same','started':'same'}},'files':{str(module.NGINX):'old','map.wam':'map','policy':'policy','deployment.json':'historical'}}
        after=copy.deepcopy(before);after['files'][str(module.NGINX)]='new';module.preserved(before,after)
        for change in [{'services':{}},{'files':{**after['files'],'map.wam':'changed'}},{'files':{**after['files'],'deployment.json':'rewritten'}}]:
            with self.assertRaises(AssertionError):module.preserved(before,{**after,**change})
if __name__=='__main__':unittest.main()
