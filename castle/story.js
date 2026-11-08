import {storyCards,SharedStory,newStory} from './story-state.js?v=20261108-1';
const $=id=>document.getElementById(id),preview=new URLSearchParams(location.search).get('preview')==='1';
let shared,closed=false,cooldown;
function render(value){
  const ids=value?.cards||[0,1,2];
  $('cards').replaceChildren(...ids.map(id=>{
    const figure=document.createElement('figure');figure.className='story-card';figure.dataset.card=String(id);
    const image=document.createElement('img');image.src='art/story-cards-20261108/card-'+id+'.webp';image.alt=storyCards[id][1];
    const caption=document.createElement('figcaption');caption.textContent=storyCards[id][0];figure.append(image,caption);return figure;
  }));
  $('status').classList.remove('error');$('status').textContent=value?'Unsere Runde':'Noch keine Runde';
  document.body.dataset.round=value?.round||'';
}
async function init(){
  render(null);window.lucide?.createIcons();
  if(preview){
    $('connection').textContent='Lokale Vorschau';$('roll').disabled=false;
    $('roll').onclick=()=>render(newStory());return;
  }
  if(window.parent===window)throw Error('Bitte im Schloss oeffnen.');
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://together.deine-schule.com/iframe_api.js';script.onload=resolve;script.onerror=()=>reject(Error('Verbindung fehlgeschlagen'));document.head.append(script);
  });
  let timer;
  try{await Promise.race([WA.onInit(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Verbindung nicht verfuegbar')),30000)})])}
  finally{clearTimeout(timer)}
  const map=await WA.room.getTiledMap(),key=map.properties?.find(p=>p.name==='castleStoryVariable')?.value;
  if(closed)return;
  shared=new SharedStory(WA.state,key,render).start();window.castleStory=shared;
  $('connection').textContent='Gemeinsame Runde';$('roll').disabled=false;
  $('roll').onclick=async()=>{
    $('roll').disabled=true;
    try{await shared.roll()}catch{if(!closed){$('status').textContent='Nicht gespeichert. Bitte erneut versuchen.';$('status').classList.add('error')}}
    finally{if(!closed)cooldown=setTimeout(()=>{$('roll').disabled=false},2000)}
  };
}
window.addEventListener('pagehide',()=>{closed=true;clearTimeout(cooldown);shared?.dispose()},{once:true});
window.addEventListener('load',()=>window.lucide?.createIcons());
init().catch(e=>{if(!closed){$('connection').textContent='Nicht verbunden';$('status').textContent=e.message;$('status').classList.add('error');$('retry').hidden=false;$('retry').onclick=()=>location.reload()}});
