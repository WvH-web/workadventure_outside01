import copy
import hashlib
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1]
module=runpy.run_path(str(root/'tools/record-castle-game-host-native.py'))


class NativeGameHostAcceptanceTests(unittest.TestCase):
    def fixture(self):
        files={'castle-school/public/'+name:hashlib.sha256((root/'ops/castle-school/public'/name).read_bytes()).hexdigest() for name in module['PUBLIC']}
        value={'passed':True,'errors':[],'routeFailures':[],'routeCancellations':[],'normalMicrosoftPupils':2,'realNativeWorkAdventure':True,
            'realSchoolAuthenticationAndProfiles':True,'allSchoolResourcesForwardedToRestrictedStage':True,'syntheticProviderCatalogOnlyInStage':True,
            'providerResponsesReplaced':True,'stageFixtureReset':True,'schoolProfileInterception':False,'mapsReplaced':False,
            'liveSchoolOrPortalChanged':False,'published':False,'loadApprovalFor400':False,
            'results':[{'case':name,**{key:True for key in flags},**({'normalMicrosoftPupils':2} if name=='native-group-start' else {})} for name,flags in module['CASE_FLAGS'].items()],
            'served':[{'number':number,'file':name,'sha256':files['castle-school/public/'+name]} for number in [1,2] for name in module['PUBLIC']],
            'providerRequests':[{'number':2,'code':code} for code in ['one','two']],
            'audio':[{'label':label,'milliseconds':2000,'before':[{'inbound':0,'energy':0} for _ in [1,2]],
                'after':[{'inbound':100,'energy':1,'rooms':['fixture-area-lesekamin']} for _ in [1,2]]}
                for label in ['before-game-window','while-playing','after-link-change','after-panel-return']]}
        return value,files

    def test_exact_native_probe_and_all_evidence_boundaries_are_required(self):
        value,files=self.fixture();module['proof'](value,files)
        self.assertEqual(hashlib.sha256((root/'tools/check-castle-game-host-native.cjs').read_bytes()).hexdigest(),module['PROBE_SHA'])
        for patch in [{'normalMicrosoftPupils':1},{'published':True},{'schoolProfileInterception':True},{'stageFixtureReset':False},{'routeFailures':[{'errorType':'Error'}]}]:
            with self.assertRaises(AssertionError):module['proof']({**value,**patch},files)

    def test_silent_wrong_room_infinite_or_missing_audio_cannot_be_accepted(self):
        value,files=self.fixture()
        for patch in [{'energy':0},{'energy':float('inf')},{'inbound':0},{'rooms':['other-room']}]:
            changed=copy.deepcopy(value);changed['audio'][0]['after'][1].update(patch)
            with self.assertRaises(AssertionError):module['proof'](changed,files)
        changed=copy.deepcopy(value);changed['audio'].pop()
        with self.assertRaises(AssertionError):module['proof'](changed,files)

    def test_substituted_sources_or_hidden_routing_failures_cannot_pass_as_native_success(self):
        value,files=self.fixture();changed=copy.deepcopy(value);changed['served'][0]['sha256']='0'*64
        with self.assertRaises(AssertionError):module['proof'](changed,files)
        changed=copy.deepcopy(value);changed['served'].pop()
        with self.assertRaises(AssertionError):module['proof'](changed,files)
        changed=copy.deepcopy(value);changed['routeCancellations']=[{'number':1,'path':'/castle-school/games','errorType':'AssertionError','reason':'shutdown'}]
        with self.assertRaises(AssertionError):module['proof'](changed,files)
        changed=copy.deepcopy(value);del changed['results'][1]['nativeRoundApiAfterReturn']
        with self.assertRaises(AssertionError):module['proof'](changed,files)


if __name__=='__main__':unittest.main()
