import {ownedUi,legacyUi} from './ui-ids.js?v=20261109-rounds1';
export function clearPreviousCastleUi(wa,current){
  if(!ownedUi[current])return;
  for(const id of legacyUi)wa.ui.actionBar.removeButton(id);
  for(const [owner,ids]of Object.entries(ownedUi))if(owner!==current)for(const id of ids)wa.ui.actionBar.removeButton(id);
}
