"""Read only the existing tutorial replay action, without account or environment data."""
from pathlib import Path
root=Path('/root/togetherWorkadventure/upgrades/20261107/source/play/src/front')
for file in root.rglob('*.svelte'):
    lines=file.read_text().splitlines()
    for number,line in enumerate(lines):
        if 'onboardingStore.restart' in line:
            print(file.relative_to(root).as_posix())
            print('\n'.join(lines[max(0,number-14):number+15]))
file=root/'Connection/ConnectionManager.ts'
lines=file.read_text().splitlines()
for number,line in enumerate(lines):
    if 'setLocalUser(' in line or 'getLocalUser(' in line:
        print('\nCONNECTION '+str(number+1)+'\n'+'\n'.join(lines[max(0,number-8):number+12]))
for name in ['Phaser/Game/PlayerVariablesManager.ts']:
    print('\nVARIABLE IMPLEMENTATION '+name+'\n'+(root/name).read_text())
file=root/'Connection/LocalUserStore.ts';lines=file.read_text().splitlines()
for number,line in enumerate(lines):
    if 'isLogged()' in line or 'isLoggedKey' in line:
        print('\nLOGIN FLAG '+str(number+1)+'\n'+'\n'.join(lines[max(0,number-1):number+8]))
