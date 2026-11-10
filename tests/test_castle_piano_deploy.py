"""Unit-check the piano publication scope without touching any server."""
import copy
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('piano_deploy',Path(__file__).resolve().parents[1]/'tools/deploy-castle-piano.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PianoPublication(unittest.TestCase):
    def test_append_only(self):
        old=b'location /castle-school/ {}\nlocation /castle-chess/ {}\nlocation /castle-art/ {}\nlocation /sterne-kollegium/ {}\n'
        result=module.appended(old);self.assertTrue(result.startswith(old));self.assertEqual(result.count(b'location ^~ /castle-piano/'),1)
        for existing in [result,b'location /other/ {}']:
            with self.assertRaises(AssertionError):module.appended(existing)
    def test_preservation(self):
        before={'services':{'play':{'id':'one','started':'old'}},'files':{str(module.NGINX):'old','school.env':'secret-digest','map.wam':'unchanged'}}
        after=copy.deepcopy(before);after['files'][str(module.NGINX)]='new';module.preserved(before,after)
        for key,value in [('services',{'play':{'id':'new','started':'old'}}),('files',{**after['files'],'map.wam':'changed'})]:
            changed={**after,key:value}
            with self.assertRaises(AssertionError):module.preserved(before,changed)
    def test_proof_is_exact_candidate_and_real_school(self):
        keys=['actualToneSampler','actualVpsPianoWebSockets','pupilsCannotModerate','opaqueSecureHttpOnlyCookie','mouseAndMobileTouchHeardBothWays',
          'practiceDoesNotBroadcast','freshSchoolRenewalObserved','creatorMayLeave','remainingParticipantCanPlay','mobileNoOverflow']
        proof={key:True for key in keys};proof.update(passed=True,stageOnly=True,archiveSha256='fixed',normalMicrosoftPupils=2,syntheticSchoolOverrides=False,
          privateStagingTransportProxy=True,realPublicBrowserHandshake=False,loadApprovalFor400=False,errors=[],transportCounts={'sent':2,'received':3})
        module.accepted(proof,'fixed')
        for patch in [{'archiveSha256':'other'},{'syntheticSchoolOverrides':True},{'normalMicrosoftPupils':1},{'errors':['error']},{'mouseAndMobileTouchHeardBothWays':False}]:
            with self.assertRaises(AssertionError):module.accepted({**proof,**patch},'fixed')
if __name__=='__main__':unittest.main()
