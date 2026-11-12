import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-billiards-ui-publication.py'))

class BilliardsUiPublication(unittest.TestCase):
    def test_one_exact_static_route_and_nothing_else(self):
        old=b'location ^~ /castle-billiards/ {}\nlocation /castle-school/ {}\n';new=ops['appended'](old)
        self.assertEqual(new,old+ops['BLOCK']);self.assertEqual(ops['BLOCK'].count(b'location '),1)
        self.assertIn(b'location = /castle-billiards/billiards.css',new);self.assertIn(b'if ($args != "") { return 404; }',new)
        self.assertNotIn(b'proxy_pass',ops['BLOCK']);self.assertNotIn(b'/castle-preview/',ops['BLOCK'])
        with self.assertRaises(AssertionError):ops['appended'](new)

    def test_current_game_route_is_required(self):
        with self.assertRaises(AssertionError):ops['appended'](b'location /other/ {}')

    def test_only_nginx_digest_can_change(self):
        before={'services':{'play':'same','billiards':'same'},'files':{str(ops['NGINX']):'old','map.wam':'same','policy.json':'same'}}
        after=copy.deepcopy(before);after['files'][str(ops['NGINX'])]='new';ops['preserved'](before,after,'new')
        for key in ['map.wam','policy.json']:
            changed=copy.deepcopy(after);changed['files'][key]='other'
            with self.assertRaises(AssertionError):ops['preserved'](before,changed,'new')
        after['services']['billiards']='restarted'
        with self.assertRaises(AssertionError):ops['preserved'](before,after,'new')

    def proof(self):
        proof={key:True for key in ['passed','syntheticApprovedAccountsOnly','realPublishedHttpsService','realNativeSidePanels','candidateCssOnly','networkResponsesSubstituted',
          'bothPlayersExecutedActualStrokes','mutualRematchAndSeatSwap','explicitNativePanelRejoin','nativeAudioDecodedBothWays','desktopAndTouch','placesReleasedAfterConfirmation']}
        proof.update({key:False for key in ['schoolLookupOverridden','normalMapActivityActivated','normalPublishedCssUsed','oldCastleReplaced','fullCastleApprovalFor400']})
        proof.update(normalMicrosoftPupils=2,errors=[],candidateCssSha256=ops['CSS_SHA'],archiveSha256='4a81fa9246b809bff1cf1ca119e0a081c58fc29bcb12cde7cc6eb25e52792e44')
        return proof

    def test_exact_native_css_candidate_is_required(self):ops['candidate'](self.proof())

    def test_other_source_or_incomplete_native_proof_is_rejected(self):
        for patch in [{'candidateCssSha256':'other'},{'archiveSha256':'other'},{'normalMicrosoftPupils':1},{'nativeAudioDecodedBothWays':False},{'placesReleasedAfterConfirmation':False},{'schoolLookupOverridden':True}]:
            with self.assertRaises(AssertionError):ops['candidate']({**self.proof(),**patch})

if __name__=='__main__':unittest.main()
