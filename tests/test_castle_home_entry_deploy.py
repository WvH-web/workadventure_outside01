import copy
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import patch

MODULE=Path(__file__).resolve().parents[1]/'tools/deploy-castle-home-entry.py'


class NativeEntryDeployment(unittest.TestCase):
    def setUp(self):
        self.module=runpy.run_path(str(MODULE))

    def evidence(self,preview=False):
        value=dict(passed=True,browserVersion='157.0-test',normalMicrosoftPupils=2,decodedPrivateSpeechBoth=[.01,.02],
            networkResponsesSubstituted=False,schoolOverrides=False,loadApprovalFor400=False,errors=[],
            existingMapsChanged=preview,probeWrapperOnly=not preview,previewGalleryOnly=preview,
            roomUrl='https://together.deine-schule.com/~/castle-preview/obergeschoss.wam')
        for key in ['realNativeWorkAdventure','realPublicRoomService','realPublicRoomMedia','anonymousRedirectedToMicrosoft',
            'automaticSidePanelOnEntry','actualPrivateVisit','nativeConversationDecodedBeforeAndAfter',
            'quietEntryWithoutNativeSpeechBeforeAndDuring','privateMicrophoneCaptureOnlyAfterExplicitClick',
            'mapApiNotGranted','microphonePreferenceUnchanged','departureClosesOwnedPanelAndEndsActualTracks',
            'desktopAndMobileRendered','noHorizontalOverflow']:
            value[key]=True
        return value

    def test_real_public_native_media_and_all_boundaries_are_required(self):
        for preview in [False,True]:
            value=self.evidence(preview);self.module['proof'](value,preview=preview)
            for key,original in value.items():
                if type(original) is not bool or key=='previewGalleryOnly' and not preview:
                    continue
                wrong=copy.deepcopy(value);wrong[key]=not original
                with self.subTest(preview=preview,key=key),self.assertRaises(AssertionError):
                    self.module['proof'](wrong,preview=preview)
        for changes in [dict(browserVersion='151.0'),dict(normalMicrosoftPupils=1),dict(decodedPrivateSpeechBoth=[.01,0]),
            dict(decodedPrivateSpeechBoth=[.01]),dict(errors=['script error'])]:
            with self.subTest(changes=changes),self.assertRaises(AssertionError):
                self.module['proof']({**self.evidence(),**changes})
        with self.assertRaises(AssertionError):
            self.module['proof']({**self.evidence(True),'roomUrl':'https://foreign.invalid/'},preview=True)

    def test_atomic_replacement_preserves_the_requested_bytes(self):
        with tempfile.TemporaryDirectory(prefix='castle-entry-test-') as directory:
            target=Path(directory)/'gallery.wam';target.write_bytes(b'old')
            with patch.object(self.module['os'],'chown',create=True):
                self.module['replace'](target,b'new\n',0o644,1000,1000)
            self.assertEqual(target.read_bytes(),b'new\n')
            self.assertEqual(list(Path(directory).iterdir()),[target])

    def test_concurrent_staging_file_is_never_replaced_or_removed(self):
        with tempfile.TemporaryDirectory(prefix='castle-entry-test-') as directory:
            target=Path(directory)/'gallery.wam';target.write_bytes(b'old')
            other=target.with_name(target.name+'.homes-staging');other.write_bytes(b'other')
            with self.assertRaises(AssertionError):
                self.module['replace'](target,b'new',0o644,1000,1000)
            self.assertEqual(target.read_bytes(),b'old');self.assertEqual(other.read_bytes(),b'other')


if __name__=='__main__':unittest.main()
