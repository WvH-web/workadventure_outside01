import copy
from pathlib import Path
import runpy
import unittest

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/deploy-castle-museum-tour.py'))


def fixture(staged=True):
    value={key:True for key in ['passed','realNativeWorkAdventure','onlySyntheticApprovedPupils','realPublicCatalogUnmodified','portalViewerReached',
        'tableSpeechDecodedAtFourStages','automaticPanelOnSeating','bothDirectionsShareBoardAndGallery','chooserMayLeave',
        'lateReturnSeesSelection','unchangedRefreshKeepsContent','emptyTableStartsNewRound','movementAfterStanding',
        'desktopAndMobileCanvasNonblank','noHorizontalOverflow','onlyBoardIdentifiersShared','mediaPlaybackNotAsserted']}
    value.update({key:False for key in ['candidateStaticSourcesOnlyInsideTestBrowsers','networkResponsesSubstituted','publishedMapsChanged',
        'filmPositionAndScrollSynchronized','loadApprovalFor400']})
    value.update(isolatedStageMap=staged,manualCloseKeepsRound=True,normalMicrosoftPupils=2,browserVersion='157.fixture',routed=[],errors=[],
        publishedMapSha256='map',mapSha256='map',scriptSha256='script',media=[])
    for label in ['gallery','selected-contribution','late-return','new-round']:
        value['media'].append(dict(label=label,before=[{'energy':0},{'energy':1}],
            after=[{'energy':1,'rooms':['native-area-buchclub']},{'energy':2,'rooms':['native-area-buchclub']}]))
    return value


class MuseumPublicationTests(unittest.TestCase):
    def test_complete_real_native_evidence_is_required_without_unrelated_claims(self):
        publication={'publicFiles':{'castle/museum-tour-preview.tmj':'map','castle/museum-tour.bundle.js':'script'}}
        value=fixture();module['proof'](value,publication,True);module['proof'](fixture(False),publication,False)
        for key,item in value.items():
            if isinstance(item,bool) and key!='manualCloseKeepsRound':
                changed=copy.deepcopy(value);changed[key]=not item
                with self.assertRaises(AssertionError,msg=key):module['proof'](changed,publication,True)
        changed=fixture(False);changed['manualCloseKeepsRound']=False
        with self.assertRaises(AssertionError):module['proof'](changed,publication,False)
        for key,item in [('normalMicrosoftPupils',1),('routed',['collection.js']),('errors',['broken']),
                ('scriptSha256','old-script'),('mapSha256','other'),('publishedMapSha256','old-map')]:
            changed=copy.deepcopy(value);changed[key]=item
            with self.assertRaises(AssertionError,msg=key):module['proof'](changed,publication,True)

    def test_audio_evidence_needs_all_stages_and_both_receivers(self):
        publication={'publicFiles':{'castle/museum-tour-preview.tmj':'map','castle/museum-tour.bundle.js':'script'}}
        for mutate in [lambda value:value['media'].pop(),lambda value:value['media'][0].update(label='new-round'),
                lambda value:value['media'][0]['after'].pop(),lambda value:value['media'][0]['after'][0].update(energy=0),
                lambda value:value['media'][0]['after'][1].update(energy=float('nan')),
                lambda value:value['media'][0]['after'][1].update(energy=True),
                lambda value:value['media'][0]['after'][1].update(rooms=['other-area-buchclub'])]:
            value=fixture();mutate(value)
            with self.assertRaises(AssertionError):module['proof'](value,publication,True)

    def test_projection_cannot_relax_roles_change_other_maps_or_restart_services(self):
        names=[str(module['TARGET']),str(module['MANIFEST']),str(module['PRIVATE']/'deployment.json')]
        before={'services':{'play':{'id':'original','started':'same'}},'files':{**{name:'old' for name in names},'role.php':'role','another.wam':'another'}}
        original=copy.deepcopy(before);result=module['projection'](before,{name:'new' for name in names})
        self.assertEqual(before,original);self.assertEqual(result['services'],before['services'])
        self.assertEqual(result['files']['role.php'],'role');self.assertEqual(result['files']['another.wam'],'another')
        for changes in [{},{'role.php':'changed'},{'another.wam':'changed'}]:
            with self.assertRaises(AssertionError):module['projection'](before,changes)


if __name__=='__main__':unittest.main()
