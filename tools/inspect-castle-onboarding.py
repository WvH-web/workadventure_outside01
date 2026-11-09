"""Read only onboarding-related client source; no environment or user data."""
from pathlib import Path
root=Path('/root/togetherWorkadventure/upgrades/20261107/source/play/src')
assert root.is_dir()
for name in ['front/Stores/OnboardingStore.ts','front/Components/Onboarding/Onboarding.svelte']:
    print('\nFILE '+name+'\n'+(root/name).read_text())
for file in root.rglob('*PlayerVariables*'):
    if file.is_file():
        print('\nVARIABLES '+file.relative_to(root).as_posix())
        for number,line in enumerate(file.read_text().splitlines(),1):
            if any(word in line for word in ['scope','global','world','localStorage']):print(str(number)+': '+line[:240])
for name in ['front/Api/Iframe/player.ts','front/Phaser/Game/GameScene.ts']:
    print('\nTOKEN API '+name)
    lines=(root/name).read_text().splitlines()
    for number,line in enumerate(lines):
        if any(word in line for word in ['getIdToken','getJwtToken','getAuthToken','getAccessToken']):print('\n'.join(str(i+1)+': '+lines[i] for i in range(max(0,number-2),min(len(lines),number+8))))
