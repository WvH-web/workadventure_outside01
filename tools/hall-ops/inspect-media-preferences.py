"""Read the deployed UI media preference contract, without user data."""
import subprocess
content=subprocess.check_output(['docker','exec','workadventure-play-1','cat',
    '/usr/src/play/src/front/Connection/LocalUserStore.ts'],text=True)
lines=content.splitlines()
for n,line in enumerate(lines):
    if any(term in line for term in ['requestedCameraState','requestedMicrophoneState','cameraStateKey','microphoneStateKey']):
        print('\n'.join(lines[max(0,n-2):n+4]))
