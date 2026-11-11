import {StarMachine,puzzleTarget,puzzles,symbols} from './puzzle-state.js?v=20261111-puzzle1';
const $=id=>document.getElementById(id),preview=new URLSearchParams(location.search).get('preview')==='1'&&['localhost','127.0.0.1'].includes(location.hostname);
let game,view,closed=false,acting=false,allClues=false,lastRound='',lastIndex=-1;
const icons=()=>window.lucide?.createIcons();
function createControls(){
  $('rings').replaceChildren(...['Innen','Mitte','Au\u00dfen'].map((name,index)=>{
    const field=document.createElement('fieldset'),legend=document.createElement('legend'),buttons=document.createElement('div');
    legend.textContent=name;buttons.className='symbols';buttons.setAttribute('role','radiogroup');buttons.setAttribute('aria-label',name);
    for(const [value,[icon,label]] of symbols.entries()){
      const button=document.createElement('button'),mark=document.createElement('i');mark.dataset.lucide=icon;mark.setAttribute('aria-hidden','true');
      button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-checked','false');button.setAttribute('aria-label',label);button.title=label;
      button.dataset.ring=index;button.dataset.value=value;button.disabled=true;button.append(mark);
      button.onclick=()=>{if(!view?.waiting&&!view?.failed&&!view?.solved)void act(()=>game.setRing(index,value));};
      button.onkeydown=event=>{
        const delta={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
        if(!delta)return;event.preventDefault();event.stopPropagation();
        const next=buttons.children[(value+delta+symbols.length)%symbols.length];if(!next.disabled){next.focus();next.click();}
      };
      buttons.append(button);
    }
    field.append(legend,buttons);return field;
  }));icons();
}
function render(value=view){
  if(closed)return;view=value;
  if(lastRound!==value?.round||lastIndex!==value?.index){allClues=false;lastRound=value?.round;lastIndex=value?.index;}
  const active=Boolean(value?.active),puzzle=puzzles[value?.index??0],busy=acting||value?.waiting;
  $('connection').textContent=preview?'Einzelvorschau':active?'Gemeinsame Runde \u00b7 '+value.participants:'Keine aktive Tischrunde';
  $('puzzle-title').textContent=puzzle.title;$('step').textContent=((value?.index??0)+1)+' / '+puzzles.length;
  document.body.dataset.stage=value?.index??'';document.body.dataset.values=JSON.stringify(value?.values||[]);
  document.body.dataset.solved=String(Boolean(value?.solved));
  for(const button of $('rings').querySelectorAll('button')){
    const checked=value?.values?.[Number(button.dataset.ring)]===Number(button.dataset.value);
    button.setAttribute('aria-checked',String(checked));button.tabIndex=checked?0:-1;
    button.disabled=!active||value.failed||value.solved;button.setAttribute('aria-disabled',String(Boolean(button.disabled||busy)));
  }
  for(const [index,name] of ['inner','middle','outer'].entries())$('machine').querySelector('.'+name).style.setProperty('--angle',(value?.values?.[index]||0)*60+'deg');
  $('solved').hidden=!value?.solved;$('next').hidden=!active||!value.solved||value.index===puzzles.length-1;$('next').disabled=busy||value?.failed;
  $('restart').disabled=!active||busy||value.failed;$('retry').hidden=!value?.failed;
  $('all-clues').disabled=!active;$('all-clues').setAttribute('aria-pressed',String(allClues));$('clue-title').textContent=allClues?'Alle Hinweise':'Meine Hinweise';
  const clueIds=allClues?[0,1,2]:value?.hints||[];
  $('clues').replaceChildren(...clueIds.map(index=>{const item=document.createElement('li');item.value=index+1;item.textContent=puzzle.clues[index];return item;}));
  $('no-clue').hidden=!active||clueIds.length>0;
  $('status').classList.toggle('error',Boolean(value?.failed));
  $('status').textContent=value?.failed?'Nicht gespeichert. Verbindung erneut versuchen.':busy?'Wird gespeichert ...':value?.solved?
    value.index===puzzles.length-1?'Alle drei Himmelsbilder sind gel\u00f6st.':'Das Himmelsbild stimmt.':active?'Sonne \u2192 Mond \u2192 Stern \u2192 Blatt \u2192 Welle \u2192 Flamme \u2192 Sonne':'';
}
async function act(callback){
  if(!game||acting||closed)return;acting=true;render();
  try{await callback();}catch{if(!closed){$('status').textContent='Nicht gespeichert. Bitte erneut versuchen.';$('status').classList.add('error');}}
  finally{acting=false;render();}
}
function localPreview(){
  const round=crypto.randomUUID(),visit=crypto.randomUUID(),listeners=new Set(),event={subscribe(fn){listeners.add(fn);return {unsubscribe:()=>listeners.delete(fn)};}};
  const state={castleSeatV1:{id:'preview',stage:'seated',visit},castleTableRoundV1:{v:1,seat:'preview',visit,round:{id:round,choice:'machine'}},
    onVariableChange:()=>event,async saveVariable(key,value){state[key]=structuredClone(value);for(const fn of listeners)fn();}};
  return {wa:{player:{playerId:0,state},players:{list:()=>[],onVariableChange:()=>event,onPlayerEnters:event,onPlayerLeaves:event}},target:{seats:['preview'],choice:'machine'}};
}
async function init(){
  createControls();
  if(preview){const {wa,target}=localPreview();game=new StarMachine(wa,target,render).start();window.castleStarMachine=game;return;}
  if(window.parent===window)throw Error('Bitte am Raetseltisch in der Sternwarte oeffnen.');
  let timeout;
  try{
    await Promise.race([(async()=>{
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://together.deine-schule.com/iframe_api.js';script.onload=resolve;script.onerror=()=>reject(Error('Verbindung fehlgeschlagen'));document.head.append(script);});
      await WA.onInit();
    })(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Verbindung nicht verfuegbar')),30000);})]);
  }finally{clearTimeout(timeout);}
  const target=puzzleTarget(await WA.room.getTiledMap());await WA.players.configureTracking({players:true,movement:false});
  if(closed)return;game=new StarMachine(WA,target,render).start();window.castleStarMachine=game;
}
$('next').onclick=()=>act(()=>game.advance());$('all-clues').onclick=()=>{allClues=!allClues;render();};
$('restart').onclick=()=>$('confirmation').showModal();$('cancel').onclick=()=>$('confirmation').close();
$('confirm-reset').onclick=()=>{$('confirmation').close();void act(()=>game.restart());};$('retry').onclick=()=>{if(game)void act(()=>game.retry());else location.reload();};
window.addEventListener('load',icons);window.addEventListener('pagehide',()=>{closed=true;game?.dispose();},{once:true});
init().catch(error=>{if(!closed){$('connection').textContent='Nicht verbunden';$('status').textContent=error.message;$('status').classList.add('error');$('retry').hidden=false;}});
