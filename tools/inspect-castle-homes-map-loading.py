"""Read the deployed client's script-loading implementation, without runtime secrets."""
from pathlib import Path

root=Path('/root/togetherWorkadventure/upgrades/20261107/source/play/src/front')
for relative,anchor,count in [('Phaser/Game/GameScene.ts','private getScriptUrls(',22),
                              ('Api/IframeListener.ts','registerScript(',75)]:
    file=root/relative
    if not file.is_file():
        print(relative+': unavailable')
        continue
    lines=file.read_text().splitlines()
    for i,line in enumerate(lines):
        if anchor in line:
            print(relative+':'+str(i+1)+'\n'+'\n'.join(lines[i:i+count]))
            break
