import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-billiards-table-acceptance.py'))

class NativeTableAcceptance(unittest.TestCase):
    def sample(self):
        proof={key:True for key in ['passed','stageOnly','syntheticApprovedAccountsOnly','sharedNativeSitChoice','lateSitterAutomaticallyFollows',
          'actualAuthoritativeStroke','nativeVoiceBetweenStools','nativeVoiceWithWindowSpectator','originalChessPreservedAndIsolated',
          'creatorMayLeaveAndRejoin','lastStandingResetsChoice','mobileAndDesktop','nativeMovementResumes']}
        proof.update({key:False for key in ['normalGameHallActivated','networkResponsesSubstituted','schoolLookupOverridden','oldCastleReplaced','fullCastleApprovalFor400']})
        proof.update(normalMicrosoftPupils=2,errors=[],cases=['case']*7,wamSha256='a'*64,publishedCandidateFiles={'test.tmj':'b'*64})
        proof['voices']=[{'before':[{'inbound':0,'energy':0}]*2,'after':[{'inbound':100,'energy':1,'rooms':[suffix]}]*2}
          for suffix in ['area-fensterleser','area-fensterleser','area-buchclub']]
        quiet=[{'energy':1,'rooms':['separate-a']},{'energy':1,'rooms':[]}]
        proof['firstIsolation']={'before':copy.deepcopy(quiet),'after':copy.deepcopy(quiet)}
        proof['isolationBefore']=copy.deepcopy(quiet);proof['isolationAfter']=copy.deepcopy(quiet)
        return proof,{'probeSha256':'a'*64,'files':{'castle/test.tmj':'b'*64}}

    def test_real_shared_voice_and_solo_disconnection_accepted(self):ops['validate'](*self.sample())

    def test_substitution_or_normal_activation_claim_rejected(self):
        for key in ['networkResponsesSubstituted','schoolLookupOverridden','normalGameHallActivated']:
            proof,stage=self.sample();proof[key]=True
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)

    def test_wrong_map_assets_or_voice_namespace_rejected(self):
        for mutate in [lambda p:p.update(wamSha256='c'*64),lambda p:p['publishedCandidateFiles'].update({'other.tmj':'d'*64}),
          lambda p:p['voices'][2]['after'][1].update(rooms=['area-fensterleser'])]:
            proof,stage=self.sample();mutate(proof)
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)

    def test_leaked_voice_nonfinite_energy_and_no_decoding_rejected(self):
        for mutate in [lambda p:p['isolationAfter'][1].update(energy=1.1),lambda p:p['isolationAfter'][1].update(rooms=['separate-a']),
          lambda p:p['voices'][0]['after'][0].update(energy=float('nan')),lambda p:p['voices'][1]['after'][1].update(inbound=0)]:
            proof,stage=self.sample();mutate(proof)
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)

if __name__=='__main__':unittest.main()
