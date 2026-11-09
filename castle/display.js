import {catalogItem} from './catalog.js?v=20261108-expansion1';
import {makeMapImagePassive} from './passive-image.js?v=20261108-focus1';
window.castleImagePassive=makeMapImagePassive();
const p=new URLSearchParams(location.search),item=catalogItem({board:p.get('board'),image_url:p.get('image')});
if(item)document.querySelector('img').src=item.image;
