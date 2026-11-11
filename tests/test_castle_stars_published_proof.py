import copy
from pathlib import Path
import runpy
import unittest
from test_castle_puzzle_native_proof import fixture

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-stars-published-proof.py'))


def published_fixture():
    proof,stage=fixture();stage.update(newWamSha256='c'*64,canonicalBeforeSha256='b'*64,candidateMapSha256='d'*64)
    proof.update(normalPublishedPreview=True,normalPreviewWrapperChanged=True,isolatedProtectedStage=False,
        publishedWrapperSha256='c'*64,canonicalSourceSha256DuringProbe='b'*64,canonicalSourceSynchronizedDuringProbe=False)
    for row in proof['nativeAudioMeasurements']:
        for sample in row['after']:sample['rooms']=['https://together.deine-schule.com.abc123-school-castle-v2-sternwarte-area-buchclub']
    return proof,stage


class PublishedStarsProofTest(unittest.TestCase):
    def test_normal_room_is_required_with_exact_wrapper_and_candidate_hashes(self):
        proof,stage=published_fixture();ops['validate'](proof,stage)
        for patch in [{'isolatedProtectedStage':True},{'normalPublishedPreview':False},{'normalPreviewWrapperChanged':False},
            {'publishedWrapperSha256':'x'*64},{'fileHashes':{}},{'normalMicrosoftPupils':True},
            {'canonicalSourceSha256DuringProbe':'x'*64},{'canonicalSourceSynchronizedDuringProbe':True},
            {'networkResponsesSubstituted':True},{'authorizationResponsesSubstituted':True}]:
            with self.assertRaises(AssertionError):ops['validate']({**proof,**patch},stage)

    def test_canonical_sync_reports_the_actual_phase_without_changing_the_tested_game(self):
        proof,stage=published_fixture();proof.update(canonicalSourceSha256DuringProbe='d'*64,canonicalSourceSynchronizedDuringProbe=True)
        ops['validate'](proof,stage)

    def test_stage_audio_wrong_host_single_direction_and_missing_levels_are_rejected(self):
        for change in [lambda p:p.update(cases=[]),lambda p:p.update(allThreePuzzlesSolvedInBothClients=False),
            lambda p:p['nativeAudioMeasurements'][0]['after'][0].update(energy=0),
            lambda p:p['nativeAudioMeasurements'][0]['after'][0].update(rooms=['https://together.deine-schule.com.abc123-school-castle-stars-qa-area-buchclub']),
            lambda p:p['nativeAudioMeasurements'][0]['after'][0].update(rooms=['https://evil.invalid.abc123-school-castle-v2-sternwarte-area-buchclub'])]:
            proof,stage=published_fixture();change(proof)
            with self.assertRaises(AssertionError):ops['validate'](proof,stage)


if __name__=='__main__':unittest.main()
