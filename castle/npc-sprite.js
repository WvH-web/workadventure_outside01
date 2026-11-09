import {characterById} from './characters-data.js?v=20261108-characters1';
import {makeMapImagePassive} from './passive-image.js?v=20261108-focus1';
window.castleImagePassive=makeMapImagePassive();
const character=characterById(new URLSearchParams(location.search).get('npc'));
if(character){document.getElementById('label').textContent='Figur '+character.name;document.getElementById('sprite').style.backgroundImage=`url("${character.sprite}")`;}
