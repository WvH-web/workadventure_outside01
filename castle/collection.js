import {fetchCatalog} from './catalog.js?v=20261109-content1';
const $=id=>document.getElementById(id),music=new URLSearchParams(location.search).get('kind')==='music';
const title=music?'Band und Chor':'Schlossmuseum';let selected=null,busy=false,closed=false,controller,timer,fingerprint='',viewerRevision=0;
const canEmbed=location.origin==='https://together.deine-schule.com';
$('title').textContent=title;document.title=title;$('mark').dataset.lucide=music?'music-2':'gallery-horizontal-end';
function icons(){window.lucide?.createIcons()}
function choose(item){
  if(!canEmbed){window.open(item.open,'_blank','noopener,noreferrer');return;}
  const url=new URL(item.open);url.searchParams.set('v',Date.now().toString(36)+'-'+(++viewerRevision));
  selected=item;$('gallery').hidden=true;$('status').hidden=true;$('viewer').hidden=false;$('viewer').src=url.href;
  $('title').textContent=item.title;$('external').href=item.open;$('external').hidden=false;$('back').hidden=false;
}
function back(){
  selected=null;$('viewer').removeAttribute('src');$('viewer').hidden=true;$('gallery').hidden=false;
  $('title').textContent=title;$('external').hidden=true;$('back').hidden=true;
}
async function refresh(){
  if(closed||busy||document.hidden)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const items=(await fetchCatalog(controller.signal)).filter(item=>music?item.board.startsWith('musik'):item.board.startsWith('show'))
      .sort((a,b)=>a.board.localeCompare(b.board,undefined,{numeric:true}));
    if(closed)return;
    let withdrawn=false;
    if(selected){
      const current=items.find(item=>item.board===selected.board);
      if(!current){back();withdrawn=true;}
      else if(JSON.stringify(current)!==JSON.stringify(selected))choose(current);
    }
    const next=JSON.stringify(items);
    if(next!==fingerprint){
      $('gallery').replaceChildren(...items.map(item=>{
        const button=document.createElement('button');button.className='exhibit';
        const image=document.createElement('img');image.src=item.image;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
        const caption=document.createElement('strong');caption.textContent=item.title;button.append(image,caption);button.onclick=()=>choose(item);return button;
      }));fingerprint=next;
    }
    $('status').textContent=withdrawn?'Dieser Beitrag ist nicht mehr verfuegbar.':items.length?'':'Noch keine Beitraege';
    $('status').hidden=!withdrawn&&(Boolean(items.length)||Boolean(selected));
  }catch(error){
    if(!closed){$('status').textContent='Beitraege sind gerade nicht erreichbar.';$('status').hidden=Boolean(selected);}
  }finally{clearTimeout(timeout);busy=false;}
}
$('back').onclick=back;$('retry').onclick=()=>void refresh();
window.addEventListener('load',icons);icons();void refresh();timer=setInterval(()=>void refresh(),60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
window.addEventListener('pagehide',()=>{closed=true;clearInterval(timer);controller?.abort()},{once:true});
