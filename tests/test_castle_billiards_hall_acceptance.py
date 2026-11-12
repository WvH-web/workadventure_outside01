from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-billiards-hall-acceptance.py'))
import test_castle_billiards_table_acceptance as fixtures

class NativeHallAcceptance(unittest.TestCase):
    def sample(self):
        proof,_=fixtures.NativeTableAcceptance().sample()
        proof.update(stageOnly=False,normalGameHallActivated=True,compactNativeSeatControlVerified=True,
          publishedCandidateFiles={'spielesaal.tmj':'b'*64})
        return proof,{'candidateFiles':{'castle/spielesaal-billard2-preview.tmj':'b'*64},'candidateMapSha256':'b'*64,'wamAfterSha256':'a'*64}

    def test_only_actual_normal_native_acceptance_passes(self):ops['validate'](*self.sample())

    def test_stage_or_legacy_seat_popup_cannot_be_accepted_as_normal(self):
        for mutate in [lambda p:p.update(stageOnly=True),lambda p:p.update(normalGameHallActivated=False),lambda p:p.update(compactNativeSeatControlVerified=False),
          lambda p:p.update(networkResponsesSubstituted=True),lambda p:p.update(publishedCandidateFiles={'spielesaal-billard2-preview.tmj':'b'*64})]:
            proof,stage=self.sample();mutate(proof)
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)

    def test_each_native_voice_measurement_and_isolation_is_required(self):
        for mutate in [lambda p:p['voices'].pop(),lambda p:p['voices'][2]['after'][0].update(energy=0),
          lambda p:p['isolationAfter'][1].update(energy=2),lambda p:p.update(wamSha256='e'*64)]:
            proof,stage=self.sample();mutate(proof)
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)

if __name__=='__main__':unittest.main()
