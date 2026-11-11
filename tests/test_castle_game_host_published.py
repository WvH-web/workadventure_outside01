import copy
import hashlib
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1]
ops=runpy.run_path(str(root/'tools/castle-game-host-published-proof.py'))


class PublishedHostProofTests(unittest.TestCase):
    def fixture(self):
        files={'castle-school/public/'+name:hashlib.sha256((root/'ops/castle-school/public'/name).read_bytes()).hexdigest() for name in ops['PUBLIC']}
        audio={'before':[{'energy':0.1,'inbound':100},{'energy':0.2,'inbound':200}],
            'after':[{'energy':0.2,'inbound':200,'rooms':['native-area-lesekamin']},{'energy':0.3,'inbound':300,'rooms':['native-area-lesekamin']}],
            'connectionAndAudioWaitMilliseconds':2023}
        rows=[]
        for case,flags in ops['FLAGS'].items():
            row={'case':case,**{flag:True for flag in flags}}
            if case in ['native-library','published-game-boundary']:row['normalMicrosoftPupils']=2
            rows.append(row)
        expected={name:files['castle-school/public/'+name] for name in ops['PUBLIC']}
        value={'passed':True,'errors':[],'realNativeWorkAdventure':True,'publishedPreview':True,
            **{key:False for key in ['stageOnly','mapsModifiedOnlyInsideTestBrowsers','realClassOverrideOnlyInStage','productionSchoolAndWebConfigChanged','loadApprovalFor400']},
            'results':rows,'audio':copy.deepcopy(audio),'recovery':{'audio':copy.deepcopy(audio),'candidate':False,'moduleInterception':False,
                'mapInterception':False,'schoolDecisionInterception':False,'naturalHeartbeatFault':True,
                'explicitFaultInjection':{'route':'round-heartbeat','status':503,'count':1},'moduleSha256':expected,
                'observed':{str(number)+':'+name:digest for number in [1,2] for name,digest in expected.items()}},
            'gameHostPublication':{'actualPublishedRoutes':True,'providerCatalogSubstituted':False,'providerContentSubstituted':False,
                'realExternalGameTested':False,'realProviderStudentApproval':False,'serverOrMapInterception':False}}
        return value,files

    def test_complete_native_published_evidence_and_pinned_actual_probe(self):
        value,files=self.fixture();ops['proof'](value,files)
        self.assertEqual(hashlib.sha256((root/'tools/check-castle-rounds-native.cjs').read_bytes()).hexdigest(),ops['PROBE_SHA'])

    def test_entry_points_pin_the_same_new_head_without_overwriting_predecessor_operator(self):
        digest=hashlib.sha256((root/'tools/castle-game-host-published-proof.py').read_bytes()).hexdigest()
        for name in ['accept-castle-game-host-published.py','run-castle-audit.py']:
            self.assertIn(digest,(root/'tools'/name).read_text())
        self.assertEqual(hashlib.sha256((root/'tools/castle-game-host-deployment-ops.py').read_bytes()).hexdigest(),ops['OPERATOR_SHA'])

    def test_synthetic_catalog_and_map_or_auth_substitution_cannot_be_called_published(self):
        for key in ['stageOnly','mapsModifiedOnlyInsideTestBrowsers','realClassOverrideOnlyInStage','loadApprovalFor400']:
            value,files=self.fixture();value[key]=True
            with self.subTest(key=key),self.assertRaises(AssertionError):ops['proof'](value,files)
        for key in ['providerCatalogSubstituted','providerContentSubstituted','serverOrMapInterception','realProviderStudentApproval']:
            value,files=self.fixture();value['gameHostPublication'][key]=True
            with self.subTest(key=key),self.assertRaises(AssertionError):ops['proof'](value,files)

    def test_all_draft_boundaries_and_both_normal_accounts_are_required(self):
        for key in ops['FLAGS']['published-game-boundary']:
            value,files=self.fixture();row=next(row for row in value['results'] if row['case']=='published-game-boundary');row[key]=False
            with self.subTest(key=key),self.assertRaises(AssertionError):ops['proof'](value,files)
        value,files=self.fixture();value['results'][0]['normalMicrosoftPupils']=True
        with self.assertRaises(AssertionError):ops['proof'](value,files)

    def test_stale_or_missing_source_bytes_and_uncontrolled_fault_injection_are_rejected(self):
        for mutation in ['stale','missing','intercepted','replayed']:
            value,files=self.fixture()
            if mutation=='stale':value['recovery']['observed']['1:games.js']='0'*64
            if mutation=='missing':del value['recovery']['observed']['2:rounds.html']
            if mutation=='intercepted':value['recovery']['moduleInterception']=True
            if mutation=='replayed':value['recovery']['explicitFaultInjection']['count']=2
            with self.subTest(mutation=mutation),self.assertRaises(AssertionError):ops['proof'](value,files)

    def test_audio_needs_finite_increasing_energy_and_bytes_in_the_same_real_group(self):
        for mutation in ['nan','constant-energy','constant-bytes','wrong-room','too-late']:
            value,files=self.fixture();audio=value['recovery']['audio']
            if mutation=='nan':audio['after'][0]['energy']=float('nan')
            if mutation=='constant-energy':audio['after'][0]['energy']=audio['before'][0]['energy']
            if mutation=='constant-bytes':audio['after'][1]['inbound']=audio['before'][1]['inbound']
            if mutation=='wrong-room':audio['after'][1]['rooms']=['different']
            if mutation=='too-late':audio['connectionAndAudioWaitMilliseconds']=27001
            with self.subTest(mutation=mutation),self.assertRaises(AssertionError):ops['proof'](value,files)


if __name__=='__main__':unittest.main()
