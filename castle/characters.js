import {characters,characterById} from './characters-data.js?v=20261108-characters1';
const $=id=>document.getElementById(id),requested=new URLSearchParams(location.search).get('npc');
function sprite(element,character){element.style.backgroundImage=`url("${character.sprite}")`;}
function choose(character){
  $('cast').hidden=true;$('profile').hidden=false;$('back').hidden=Boolean(requested);
  $('title').textContent=character.name;$('name').textContent=character.name;
  $('role').textContent='Schlossfigur: '+character.role;$('description').textContent=character.style;
  sprite($('portrait').querySelector('.woka'),character);$('speech').textContent=character.intro;
  $('questions').replaceChildren(...character.questions.map(([question,answer])=>{
    const button=document.createElement('button');button.textContent=question;button.onclick=()=>{$('speech').textContent=answer;};return button;
  }));
}
$('cast').replaceChildren(...characters.map(character=>{
  const button=document.createElement('button');button.className='guest';const portrait=document.createElement('div');portrait.className='portrait';portrait.setAttribute('aria-hidden','true');
  const woka=document.createElement('span');woka.className='woka';sprite(woka,character);portrait.append(woka);
  const name=document.createElement('strong');name.textContent=character.name;const role=document.createElement('small');role.textContent=character.role;
  button.append(portrait,name,role);button.onclick=()=>choose(character);return button;
}));
$('back').onclick=()=>{$('profile').hidden=true;$('cast').hidden=false;$('back').hidden=true;$('title').textContent='Schlossgaeste';};
if(requested){const character=characterById(requested);if(character)choose(character);else{$('cast').hidden=true;$('title').textContent='Gast nicht gefunden';}}
window.lucide?.createIcons();window.addEventListener('load',()=>window.lucide?.createIcons());
