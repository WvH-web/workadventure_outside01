import copy
from pathlib import Path
import runpy
import unittest

check=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/deploy-castle-homes-control.py'))['proof']


def evidence(candidate=False):
    flags={
        'offline':['actualTracksEnded','ownedFrameRemoved','remoteMediaRemoved'],
        'online':['roomReauthorized','noAutomaticCaptureOrCall','explicitRejoinAndBothDirectionsDecoded'],
        'second-device-open':['doesNotStealExistingCall','noCaptureOnNewDevice'],
        'device-transfer':['oldActualTracksEnded','newCaptureOnlyAfterExplicitClick','noAutomaticTakeback','formerDeviceDepartureDoesNotEndCurrentCall'],
        'account-switch':['oldGuestTracksEnded','newAccountOwnRoomVerified','noAutomaticCapture','oldProtectedViewRejected','otherDeviceCallNotStolen'],
        'logout':['ownedFrameRemoved','allOwnCapturesEnded']}
    pairs=[(stage,label) for stage,labels in [('initial-call',['owner-first-device','guest-mobile']),('online',['owner-first-device','guest-mobile']),
        ('second-device-open',['owner-first-device','guest-mobile']),('explicit-device-transfer',['owner-second-device','guest-mobile']),
        ('former-device-departure',['owner-second-device','guest-mobile'])] for label in labels]
    value=dict(browserVersion='157.fixture',networkResponsesSubstituted=candidate,errors=[],unexpectedResourceFailures=0,
        transitions=[{'episode':episode,**{flag:True for flag in names}} for episode,names in flags.items()],
        decodedRemoteMicrophones=[dict(stage=stage,label=label,rms=.01) for stage,label in pairs],
        decodedRemoteOptionalCameras=[dict(stage=stage,label=label,width=320,height=180,decodedFrames=2) for stage,label in pairs],
        candidateSourcesOnlyInsideTestBrowsers=candidate,candidateRoutes=['castle-room-control.js','proximity.js'] if candidate else [],candidateSources={})
    for key in ['passed','ordinaryMicrosoftStatesUsed','normalLoginRepeated','syntheticPupilsOnly','realPublicGateway','realPublicSchoolContext','realPublicSfu',
        'browserFakeDevicesOnly','noHumanMicrophoneOrCameraUsed','bothActualMediaKindsEndedOnEveryExit','cameraExplicitlyEnabledAfterEveryNewConnection',
        'offlineUsesActualBrowserNetworkEmulation','accountSwitchUsesOnlyApprovedNormalTokens']:value[key]=True
    for key in ['schoolOverrides','servicesRestarted','nativeWorkAdventureTested','realAdministratorLoginTested','loadApprovalFor400']:value[key]=False
    return value


class ControlAcceptanceTests(unittest.TestCase):
    def test_all_six_complete_episodes_are_required(self):
        value=evidence();check(value)
        for row in value['transitions']:
            for flag in row:
                if flag=='episode':continue
                wrong=copy.deepcopy(value);del next(item for item in wrong['transitions'] if item['episode']==row['episode'])[flag]
                with self.subTest(episode=row['episode'],flag=flag),self.assertRaises((AssertionError,KeyError)):check(wrong)

    def test_candidate_cannot_be_claimed_as_unmodified_live_acceptance(self):
        value=evidence(True);check(value,True)
        with self.assertRaises(AssertionError):check(value)
        with self.assertRaises(AssertionError):check(evidence(),True)

    def test_silent_audio_missing_frames_and_wrong_recipients_are_rejected(self):
        for key,field,number in [('decodedRemoteMicrophones','rms',0),('decodedRemoteMicrophones','rms',float('nan')),
            ('decodedRemoteOptionalCameras','decodedFrames',0),('decodedRemoteOptionalCameras','width','320')]:
            value=evidence();value[key][0][field]=number
            with self.subTest(key=key,field=field),self.assertRaises(AssertionError):check(value)
        value=evidence();value['decodedRemoteOptionalCameras'].pop()
        with self.assertRaises(AssertionError):check(value)


if __name__=='__main__':unittest.main()
