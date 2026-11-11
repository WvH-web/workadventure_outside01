import copy
import json
from pathlib import Path
import runpy
import unittest

ROOT=Path(__file__).resolve().parents[1]
ops=runpy.run_path(str(ROOT/'tools/castle-puzzle-stage.py'))


class PuzzleStageTest(unittest.TestCase):
    def test_wrapper_changes_only_map_and_voice_namespace(self):
        source=json.loads((ROOT/'tests/fixtures/sternwarte-before-puzzle.wam').read_text())
        before=copy.deepcopy(source);after=ops['wrapper'](source)
        self.assertEqual(source,before)
        self.assertIn('/sternwarte-puzzle-preview.tmj?',after['mapUrl'])
        changes=0
        for original,new in zip(before['areas'],after['areas']):
            for p,q in zip(original['properties'],new['properties']):
                if p['type']=='livekitRoomProperty':
                    self.assertTrue(q['roomName'].startswith('school-castle-stars-qa-'))
                    q['roomName']=p['roomName'];changes+=1
        after['mapUrl']=before['mapUrl'];self.assertEqual(changes,3);self.assertEqual(after,before)

    def test_other_map_or_mixed_conversation_namespace_is_rejected(self):
        source=json.loads((ROOT/'tests/fixtures/sternwarte-before-puzzle.wam').read_text())
        for patch in [{'mapUrl':'https://evil.invalid/sternwarte.tmj'},{'extra':'x'}]:
            with self.assertRaises(AssertionError):ops['wrapper']({**source,**patch})
        source['areas'][0]['properties'][0]['roomName']='school-castle-v2-museum-area-buchclub'
        with self.assertRaises(AssertionError):ops['wrapper'](source)

    def test_baseline_changes_only_one_additional_map(self):
        before={'services':{'school':{'id':'same'}},'files':{'original':'hash'}}
        after=ops['with_probe'](before,'a'*64)
        self.assertEqual(after['services'],before['services']);self.assertEqual(len(after['files']),2)
        self.assertNotIn(str(ops['PROBE']),before['files'])
        with self.assertRaises(AssertionError):ops['with_probe'](after,'b'*64)

    def test_publication_is_exactly_eight_nonsecret_additional_files(self):
        value={'version':1,'sourceCommit':'a'*40,'publicationCommit':'b'*40,'previousPublicationCommit':'c'*40,
            'onlyAdditionalPublicFiles':True,'files':{name:'d'*64 for name in ops['FILES']}}
        self.assertEqual(ops['publication'](value),value)
        for patch in [{'onlyAdditionalPublicFiles':False},{'files':{**value['files'],'castle/sternwarte.tmj':'d'*64}},
            {'sourceCommit':'not-a-commit'},{'files':{name:'bad' for name in ops['FILES']}}]:
            with self.assertRaises(AssertionError):ops['publication']({**value,**patch})


if __name__=='__main__':unittest.main()
