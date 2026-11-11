import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/record-castle-puzzle-native.py'))


def fixture():
    stage={'publication':{'files':{'castle/puzzle-preview.bundle.js':'a'*64}},'originalPublicMapSha256':'b'*64}
    audio={'before':[{'energy':0,'inbound':0},{'energy':0,'inbound':0}],
        'after':[{'energy':1,'inbound':20,'rooms':['https://together.deine-schule.com.abc123-school-castle-stars-qa-area-buchclub']},
                 {'energy':1,'inbound':20,'rooms':['https://together.deine-schule.com.abc123-school-castle-stars-qa-area-buchclub']}]}
    proof={'passed':True,'syntheticApprovedAccountsOnly':True,'desktopAndTouchMobile':True,'isolatedProtectedStage':True,
        'allThreePuzzlesSolvedInBothClients':True,'concurrentDistinctRingsPreserved':True,
        'networkResponsesSubstituted':False,'authorizationResponsesSubstituted':False,'publishedOriginalMapsChanged':False,'loadApprovalFor400':False,
        'normalMicrosoftPupils':2,'errors':[],'cases':sorted(ops['CASES']),'fileHashes':{'puzzle-preview.bundle.js':'a'*64},
        'candidateBundleSha256':'a'*64,'publishedOriginalMapSha256':'b'*64,'requests':[{'authorizationPresent':False}],
        'nativeAudioMeasurements':[{'label':label,**copy.deepcopy(audio)} for label in ['automatic-puzzle','late-return','completed-puzzles']]}
    return proof,stage


class NativeProofTest(unittest.TestCase):
    def test_complete_stage_scope_is_accepted(self):
        proof,stage=fixture();ops['validate'](proof,stage)

    def test_missing_live_scenarios_or_production_claims_are_rejected(self):
        for patch in [{'normalMicrosoftPupils':True},{'normalMicrosoftPupils':1},{'cases':[]},{'allThreePuzzlesSolvedInBothClients':False},
            {'concurrentDistinctRingsPreserved':False},{'networkResponsesSubstituted':True},{'authorizationResponsesSubstituted':True},
            {'publishedOriginalMapsChanged':True},{'loadApprovalFor400':True},{'errors':['error']},{'requests':[{'authorizationPresent':True}]}]:
            proof,stage=fixture()
            with self.assertRaises(AssertionError):ops['validate']({**proof,**patch},stage)

    def test_exact_asset_and_original_map_hashes_are_required(self):
        for patch in [{'fileHashes':{}},{'candidateBundleSha256':'c'*64},{'publishedOriginalMapSha256':'c'*64}]:
            proof,stage=fixture()
            with self.assertRaises(AssertionError):ops['validate']({**proof,**patch},stage)

    def test_real_two_way_audio_is_required_in_the_separate_stage_room(self):
        for key,value in [('energy',0),('energy',float('inf')),('inbound',0),('rooms',['school-castle-v2-sternwarte-area-buchclub']),
            ('rooms',['https://evil.invalid.abc123-school-castle-stars-qa-area-buchclub']),
            ('rooms',['https://together.deine-schule.com.abc123-school-castle-v2-sternwarte-area-buchclub'])]:
            proof,stage=fixture();proof['nativeAudioMeasurements'][0]['after'][0][key]=value
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)
        proof,stage=fixture();proof['nativeAudioMeasurements'].pop()
        with self.assertRaises(AssertionError):ops['validate'](proof,stage)


if __name__=='__main__':unittest.main()
