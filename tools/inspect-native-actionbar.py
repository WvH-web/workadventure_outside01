"""Read the installed WorkAdventure custom-action implementation without changing runtime files."""
from pathlib import Path

root=Path('/root/togetherWorkadventure/upgrades/20261107/source/play/src/front')
for path in root.rglob('*'):
    if path.is_file() and path.suffix in {'.svelte','.ts'} and path.name in {'ButtonActionBarEvent.ts','AdditionalItemsMenuStore.ts','AdditionalMenuItems.svelte','BottomActionBarStore.ts','Ui.ts'}:
        print(str(path.relative_to(root)))
        lines=path.read_text().splitlines()
        indexes={index for index,line in enumerate(lines) if any(term in line for term in ['custom','Custom','button','Button','location','bottom','profileMenu','registerMenuCommand'])}
        visible=set()
        for index in indexes:visible.update(range(max(0,index-2),min(len(lines),index+4)))
        for index in sorted(visible):print(str(index+1)+': '+lines[index])
