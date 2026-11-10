"""Music-wrapper scope checks use synthetic documents, never production files."""
import copy
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('piano_wam',Path(__file__).resolve().parents[1]/'tools/deploy-castle-piano-wam.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class MusicWrapper(unittest.TestCase):
    def test_only_source_version_changes(self):
        before={'mapUrl':'https://wvh-web.github.io/workadventure_outside01/castle/musikzimmer.tmj?v=old','areas':[{'id':'unchanged','properties':[{'roomName':'same'}]}],'entities':{}}
        after=copy.deepcopy(before);after['mapUrl']='https://wvh-web.github.io/workadventure_outside01/castle/musikzimmer.tmj?v=20261109-piano1-20261109-rounds1';module.guarded(before,after)
        for patch in [{'areas':[]},{'entities':{'other':1}},{'mapUrl':'https://example.invalid/map.tmj?v=20261109-piano1-20261109-rounds1'},
          {'mapUrl':after['mapUrl']+'&token=bad'},{'mapUrl':after['mapUrl'].replace('musikzimmer','park')}]:
            with self.assertRaises(AssertionError):module.guarded(before,{**after,**patch})
    def test_partial_native_proof_is_not_an_acceptance(self):
        value={key:True for key in ['passed','realNativeWorkAdventure','candidateMapOnlyInsideTestBrowsers','publicPianoService','realPublicPianoWebSocketHandshake',
          'visibleGroupPicker','lateJoinSharesChoice','desktopAndMobileTouchHeardBothWays','nativeTableConversationDecodedBoth','nativeMicrophonesActivatedWithUi',
          'standingClosesOnlyOwnedPiano','remainingMusicianContinues','lastStandingResetsChoice','existingBandAndChoirPreserved','visibleInstrumentApproachWorks',
          'noMobileHorizontalOverflow','nonblankNativeCanvas','normalMovementAfterClosure']}
        value.update(normalMicrosoftPupils=2,publishedPreview=False,schoolOverrides=False,loadApprovalFor400=False,errors=[]);module.proof(value)
        module.proof({**value,'candidateMapOnlyInsideTestBrowsers':False,'publishedPreview':True},live=True)
        with self.assertRaises(AssertionError):module.proof(value,live=True)
        for patch in [{'nativeTableConversationDecodedBoth':False},{'normalMovementAfterClosure':False},{'normalMicrosoftPupils':1},{'schoolOverrides':True},{'errors':['error']}]:
            with self.assertRaises(AssertionError):module.proof({**value,**patch})
if __name__=='__main__':unittest.main()
