"""Accept the real-media stage evidence and stop only its two transient services."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import time

ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-calls-stage-proof.private.json')


def main():
    os.umask(0o077)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    sha=lambda raw:hashlib.sha256(raw).hexdigest()
    record_raw=(PRIVATE/'calls-stage.json').read_bytes()
    record=json.loads(record_raw)
    assert record['passed'] and record['active'] and not record['installed']
    assert record['archiveSha256']=='189930258e7bd346f4f24f4556a1ae7a41dec5aa9209ba4ce188fcc143d8f0ad'
    assert record['unit']=='wvh-homes-calls-stage.service' and record['controlUnit']=='wvh-homes-media-stage.service'
    assert ops['baseline']()==record['before']==record['after']
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600)
    proof_raw=INPUT.read_bytes()
    proof=json.loads(proof_raw)
    assert proof['passed'] and proof['browserVersion'].startswith('157.') and proof['ordinaryMicrosoftStatesUsed'] and proof['syntheticPupilAccountsOnly']
    assert proof['realPublicSchoolContext'] and proof['realPublicSfu'] and proof['loopbackGatewayThroughPinnedSsh'] and proof['backendIntrospectionAlsoThroughPinnedSsh']
    assert not proof['livePublicGateway'] and not proof['networkInterception'] and proof['browserFakeDevicesOnly'] and proof['noHumanMicrophoneOrCameraUsed']
    assert proof['separateOwnerRoomsIsolated'] and proof['joinDoesNotCaptureDevices'] and proof['microphoneAndCameraRequireSeparateClicks'] and proof['roomChangeStopsCapture']
    assert len(proof['decodedRemoteMicrophonesBoth'])==2 and all(row['rms']>.002 and row['remoteAudioTracks']==1 for row in proof['decodedRemoteMicrophonesBoth'])
    assert len(proof['decodedRemoteOptionalCamera'])==1 and all(row['width']>0 and row['height']>0 and row['decodedFrames']>0 for row in proof['decodedRemoteOptionalCamera'])
    assert proof['desktopAnd390And320Fit'] and proof['receivedContactReportSubmitted'] and proof['pupilModerationDenied'] and proof['ownerClosureStopsCaptureAndRemotes']
    assert proof['errors']==[] and proof['unexpectedResourceFailures']==0 and not proof['nativeWorkAdventureTested'] and not proof['realAdministratorLoginTested']
    assert not (PRIVATE/'calls-stage-acceptance.json').exists()
    for unit in [record['unit'],record['controlUnit']]:
        state=subprocess.run(['systemctl','show',unit,'--property=MainPID,ActiveState,ExecStart'],capture_output=True,text=True,timeout=10)
        assert 'ActiveState=active' in state.stdout and 'MainPID=0\n' not in state.stdout and record['release'] in state.stdout
        subprocess.run(['systemctl','stop',unit],capture_output=True,text=True,check=True,timeout=95)
        state=subprocess.run(['systemctl','show',unit,'--property=MainPID,ActiveState'],capture_output=True,text=True,timeout=10)
        assert 'MainPID=0' in state.stdout and 'ActiveState=inactive' in state.stdout
    assert not Path('/run/wvh-homes-calls-stage').exists()
    for port in [13251,13252]:
        assert not subprocess.run(['ss','-ltnH','sport = :'+str(port)],capture_output=True,text=True,check=True,timeout=10).stdout.strip()
    credential=Path(record['credentialFile'])
    assert credential==PRIVATE/'calls-stage.service.json' and credential.resolve()==credential and credential.stat().st_mode&0o777==0o600
    assert sha(credential.read_bytes())==record['credentialSha256']
    credential.unlink()
    assert ops['baseline']()==record['before']
    for name,value in record['processes'].items():
        assert subprocess.check_output(['systemctl','show',name,'--property=MainPID,ActiveState,SubState'],text=True,timeout=10)==value
    proof_path=PRIVATE/'calls-stage-browser.private.json'
    proof_path.write_bytes(proof_raw)
    proof_path.chmod(0o600)
    accepted=dict(passed=True,stopped=True,stageReceiptSha256=sha(record_raw),browserProofSha256=sha(proof_raw),archiveSha256=record['archiveSha256'],
        release=record['release'],existingServicesAndMapsUnchanged=True,noProductionRoomDataUsed=True,stageCredentialRemoved=True,
        checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
    ops['atomic'](PRIVATE/'calls-stage-acceptance.json',accepted)
    print(json.dumps(accepted))


if __name__=='__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
