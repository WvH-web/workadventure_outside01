import {fetchCatalog} from './catalog.js?v=20261109-content1';
import {MuseumTour,tourTarget} from './tour-state.js?v=20261111-tour1';
const $=id=>document.getElementById(id),music=new URLSearchParams(location.search).get('kind')==='music';
const title=music?'Band und Chor':'Schlossmuseum';let selected=null,busy=false,closed=false,controller,timer,fingerprint='',viewerRevision=0;
const canEmbed=location.origin==='https://together.deine-schule.com';
const sharedRequested=!music&&new URLSearchParams(location.search).get('shared')==='table';
let tour,tourValue,available=[],tourTimer,tourRound;
$('title').textContent=title;document.title=title;$('mark').dataset.lucide=music?'music-2':'gallery-horizontal-end';
function icons(){window.lucide?.createIcons()}
function show(item){
  if(!canEmbed){window.open(item.open,'_blank','noopener,noreferrer');return;}
  const url=new URL(item.open);url.searchParams.set('v',Date.now().toString(36)+'-'+(++viewerRevision));
  selected=item;$('gallery').hidden=true;$('status').hidden=true;$('viewer').hidden=false;$('viewer').src=url.href;
  $('title').textContent=item.title;$('external').href=item.open;$('external').hidden=false;$('back').hidden=false;
}
function back(){
  selected=null;$('viewer').removeAttribute('src');$('viewer').hidden=true;$('gallery').hidden=false;
  $('title').textContent=title;$('external').hidden=true;$('back').hidden=true;
}
function sharedRender(value=tourValue){
  tourValue=value;
  for(const button of $('gallery').querySelectorAll('button'))button.disabled=sharedRequested&&!value?.active;
  if(!sharedRequested)return;
  if(tourRound!==value?.round){tourRound=value?.round;back();}
  if(!value?.active){back();$('status').hidden=false;$('status').textContent='Keine aktive Ausstellungsrunde';return;}
  if(value.waiting)return;
  const board=value.selection?.board||null,item=available.find(item=>item.board===board);
  if(item){if(JSON.stringify(selected)!==JSON.stringify(item))show(item);}
  else{
    back();$('status').textContent=board?'Dieser Beitrag ist nicht mehr verfuegbar.':available.length?'':'Noch keine Beitraege';
    $('status').hidden=!board&&Boolean(available.length);
  }
}
async function choose(item){
  if(!sharedRequested){show(item);return;}
  try{if(!await tour?.choose(item?.board||null))throw Error('Selection not acknowledged');}
  catch{if(!closed){$('status').hidden=false;$('status').textContent='Auswahl nicht gespeichert. Bitte erneut versuchen.';}}
}
async function connectTour(){
  if(!sharedRequested)return;
  sharedRender();
  if(!canEmbed||window.parent===window)throw Error('Bitte am Ausstellungstisch im Schloss oeffnen.');
  let timeout;
  try{
    await Promise.race([(async()=>{
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/iframe_api.js';script.onload=resolve;script.onerror=()=>reject(Error('Verbindung fehlgeschlagen'));document.head.append(script);});
      await WA.onInit();
    })(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Verbindung nicht verfuegbar')),30000)})]);
  }finally{clearTimeout(timeout);}
  const target=tourTarget(await WA.room.getTiledMap());await WA.players.configureTracking({players:true,movement:false});
  if(closed)return;
  $('shared').removeAttribute('hidden');icons();tour=new MuseumTour(WA,target,sharedRender).start();window.castleMuseumTour=tour;
  tourTimer=setInterval(()=>tour.refresh(),500);
}
async function refresh(){
  if(closed||busy||document.hidden)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const items=(await fetchCatalog(controller.signal)).filter(item=>music?item.board.startsWith('musik'):item.board.startsWith('show'))
      .sort((a,b)=>a.board.localeCompare(b.board,undefined,{numeric:true}));
    if(closed)return;
    available=items;let withdrawn=false;
    if(selected&&!sharedRequested){
      const current=items.find(item=>item.board===selected.board);
      if(!current){back();withdrawn=true;}
      else if(JSON.stringify(current)!==JSON.stringify(selected))show(current);
    }
    const next=JSON.stringify(items);
    if(next!==fingerprint){
      $('gallery').replaceChildren(...items.map(item=>{
        const button=document.createElement('button');button.className='exhibit';button.dataset.board=item.board;
        const image=document.createElement('img');image.src=item.image;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
        const caption=document.createElement('strong');caption.textContent=item.title;button.append(image,caption);button.onclick=()=>choose(item);return button;
      }));fingerprint=next;
    }
    $('status').textContent=withdrawn?'Dieser Beitrag ist nicht mehr verfuegbar.':items.length?'':'Noch keine Beitraege';
    $('status').hidden=!withdrawn&&(Boolean(items.length)||Boolean(selected));
    if(sharedRequested)sharedRender();
  }catch(error){
    if(!closed){$('status').textContent='Beitraege sind gerade nicht erreichbar.';$('status').hidden=Boolean(selected);}
  }finally{clearTimeout(timeout);busy=false;}
}
$('back').onclick=()=>{if(sharedRequested)void choose(null);else back();};$('retry').onclick=()=>void refresh();
window.addEventListener('load',icons);icons();void refresh();timer=setInterval(()=>void refresh(),60000);
void connectTour().catch(error=>{if(!closed){$('status').hidden=false;$('status').textContent=error.message;}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
window.addEventListener('pagehide',()=>{closed=true;clearInterval(timer);clearInterval(tourTimer);controller?.abort();tour?.dispose()},{once:true});
