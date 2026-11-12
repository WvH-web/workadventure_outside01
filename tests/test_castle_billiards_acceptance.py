import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-billiards-acceptance.py'))

class BilliardsAcceptance(unittest.TestCase):
    def proof(self):
        value={key:True for key in ['passed','syntheticApprovedAccountsOnly','realPublishedHttpsService','realNativeSidePanels','panelsOpenedByQaThroughNativeApi',
          'normalCastleTableNotYetPublished','bothPlayersExecutedActualStrokes','mutualRematchAndSeatSwap','explicitNativePanelRejoin','desktopAndTouch','nativeAudioDecodedBothWays','normalPublishedCssUsed','placesReleasedAfterConfirmation']}
        value.update({key:False for key in ['normalMapActivityActivated','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400','candidateCssOnly']})
        value.update(archiveSha256='candidate',normalMicrosoftPupils=2,errors=[],cases=['case']*6,
          audio={'before':[{'inbound':10,'energy':1},{'inbound':11,'energy':2}],
            'after':[{'inbound':20,'energy':3,'rooms':['qa-area-buchclub']},{'inbound':21,'energy':4,'rooms':['qa-area-buchclub']}]},
          first={'frames':12,'version':1,'positionsSha256':'a'*64},second={'frames':15,'version':4,'positionsSha256':'b'*64})
        return value

    def test_real_pilot_without_map_publication_is_accepted(self):ops['validate'](self.proof(),'candidate')

    def test_other_candidate_is_not_accepted(self):
        with self.assertRaises(AssertionError):ops['validate'](self.proof(),'other')

    def test_overrides_or_full_school_claims_are_not_accepted(self):
        for key in ['normalMapActivityActivated','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400','candidateCssOnly']:
            proof=self.proof();proof[key]=True
            with self.assertRaises(AssertionError):ops['validate'](proof,'candidate')

    def test_both_real_strokes_and_two_accounts_are_required(self):
        for change in [{'normalMicrosoftPupils':1},{'bothPlayersExecutedActualStrokes':False},{'mutualRematchAndSeatSwap':False},{'realPublishedHttpsService':False}]:
            with self.assertRaises(AssertionError):ops['validate']({**self.proof(),**change},'candidate')

    def test_frozen_or_nonfinite_audio_is_not_accepted(self):
        for key,value in [('inbound',10),('energy',1),('energy',float('nan')),('energy',True)]:
            proof=self.proof();proof['audio']['after'][0][key]=value
            with self.assertRaises(AssertionError):ops['validate'](proof,'candidate')

    def test_different_conversation_groups_are_not_accepted(self):
        proof=self.proof();proof['audio']['after'][1]['rooms']=['other-area-buchclub']
        with self.assertRaises(AssertionError):ops['validate'](proof,'candidate')

    def test_same_old_stroke_cannot_be_used_twice(self):
        proof=self.proof();proof['second']=copy.deepcopy(proof['first'])
        with self.assertRaises(AssertionError):ops['validate'](proof,'candidate')

    def test_missing_rejoin_or_touch_is_not_accepted(self):
        for key in ['explicitNativePanelRejoin','desktopAndTouch','placesReleasedAfterConfirmation']:
            proof=self.proof();proof[key]=False
            with self.assertRaises(AssertionError):ops['validate'](proof,'candidate')

if __name__=='__main__':unittest.main()
