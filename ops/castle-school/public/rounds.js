import {RoundClient,destination,TRAVEL_REQUEST,JOURNEY_KEY,fail} from './round-client.js';
const $=id=>document.getElementById(id),icons=()=>window.lucide?.createIcons();
const wide=matchMedia('(min-width:651px)'),expandForm=()=>{if(wide.matches)$('create-panel').open=true;};
expandForm();wide.addEventListener('change',expandForm);
const messages={unauthorized:'Bitte erneut in WorkAdventure anmelden.',not_allowed:'Diese Runde ist f\u00fcr dein Konto nicht freigegeben.',
  unavailable:'Die Runden sind gerade nicht erreichbar.',invalid_request:'Bitte Treffpunkt, Aktivit\u00e4t und Pl\u00e4tze pr\u00fcfen.',
  already_joined:'Du bist bereits bei einer Runde angemeldet.',round_exists:'An diesem Treffpunkt gibt es bereits eine Runde.',
  round_full:'Alle angemeldeten Pl\u00e4tze sind belegt.',round_missing:'Diese Runde ist nicht mehr verf\u00fcgbar.',
  stale_membership:'Die Anmeldung ist nicht mehr aktiv.',rate_limited:'Bitte kurz warten und erneut versuchen.',
  storage_unavailable:'Die Anmeldung kann in diesem Browser nicht gehalten werden.',travel_unavailable:'Der Raumwechsel ist gerade nicht m\u00f6glich.'};
function icon(name){const element=document.createElement('i');element.dataset.lucide=name;element.setAttribute('aria-hidden','true');return element;}
function command(name,label,callback){const button=document.createElement('button');button.className='icon-button';button.type='button';button.title=label;button.setAttribute('aria-label',label);button.append(icon(name));button.onclick=callback;return button;}
let data={targets:[],rounds:[],kinds:{},me:null},pending=false,closed=false,timer,fingerprint='',nativeRoom='',refreshRequested=false;
const inGame=window.parent!==window;
const nativeReady=inGame&&typeof WA!=='undefined'?WA.onInit().then(async()=>{const map=await WA.room.getTiledMap();nativeRoom=map.properties?.find(property=>property.name==='castleMapId')?.value||'';return true;}).catch(()=>false):Promise.resolve(false);
const client=new RoundClient(kind=>{if(kind==='auth'){data={targets:[],rounds:[],kinds:{},me:null};fingerprint='';renderTargets();$('account').textContent='Schulzugang wird gepr\u00fcft \u2026';render();void refresh();}else renderMine();});
function message(text='',tone='error'){$('message').textContent=text;$('message').hidden=!text;$('message').dataset.tone=tone;}
function failed(error){if(error.code!=='cancelled')message(messages[error.code]||messages.unavailable);}
function renderMine(){
  const round=data.rounds.find(round=>round.mine);$('mine').hidden=!round;
  $('my-title').textContent=round?round.title+' \u00b7 Angemeldet':'';
  $('my-place').textContent=round?round.location+' \u00b7 '+round.label:'';
}
function render(){
  renderMine();const selected=$('filter').value,free=$('free-only').checked;
  const rows=data.rounds.filter(round=>(!selected||round.kind===selected)&&(!free||round.registered<round.capacity||round.mine));
  const next=JSON.stringify([rows,data.account?.kind]);
  if(next!==fingerprint){
    const fragment=document.createDocumentFragment();
    for(const round of rows){
      const row=document.createElement('article');row.className='round';row.dataset.roundId=round.id;
      const image=document.createElement('img');image.src='/castle-school/round-rooms/'+round.mapId+'.webp';image.alt='';image.loading='lazy';image.decoding='async';image.width=72;image.height=54;
      const content=document.createElement('div'),title=document.createElement('h2'),place=document.createElement('p'),state=document.createElement('small'),buttons=document.createElement('div');
      title.textContent=round.title;place.textContent=round.location+' \u00b7 '+round.label;
      state.textContent=round.registered+' von '+round.capacity+' Pl\u00e4tzen angemeldet';content.append(title,place,state);
      if(round.staffRegistered){const staff=document.createElement('small');staff.className='staff';staff.textContent='Mit Lehrkraft angemeldet';content.append(staff);}
      buttons.className='commands';const join=command(round.mine?'map-pin':'user-round-plus',round.mine?'Zur Runde':'Mitmachen',()=>void action(round.mine?'return':'join',round.id));
      join.dataset.roundCommand='join';
      join.disabled=pending||(!round.mine&&round.registered>=round.capacity);buttons.append(join);
      buttons.append(command('eye','Treffpunkt besuchen',()=>void action('visit',round.id)));
      if(data.account?.kind==='staff')buttons.append(command('x','Runde schliessen',()=>{if(window.confirm('Diese Runde f\u00fcr alle abmelden?'))void action('close',round.id);}));
      row.append(image,content,buttons);fragment.append(row);
    }$('round-list').replaceChildren(fragment);fingerprint=next;icons();
  }
  for(const row of $('round-list').children){
    const round=rows.find(round=>round.id===row.dataset.roundId);
    for(const button of row.querySelectorAll('button'))button.disabled=pending||button.dataset.roundCommand==='join'&&!round?.mine&&round?.registered>=round?.capacity;
  }
  $('empty').hidden=Boolean(rows.length);$('empty').textContent=data.targets.length?'Keine offenen Runden':'Keine Rundenfreigabe f\u00fcr dieses Konto';
  for(const id of ['target','kind','capacity','announce'])$(id).disabled=pending||!data.targets.length;
  $('leave').disabled=pending;$('my-travel').disabled=pending;
}
function fillKinds(){
  const target=data.targets.find(target=>target.id===$('target').value),previous=$('kind').value;
  $('kind').replaceChildren(...(target?.kinds||[]).map(kind=>{const option=document.createElement('option');option.value=kind;option.textContent=data.kinds[kind];return option;}));
  if(target?.kinds.includes(previous))$('kind').value=previous;
  $('capacity').max=target?.capacity||2;$('capacity').value=Math.max(2,Math.min(Number($('capacity').value)||4,target?.capacity||2));
}
function renderTargets(){
  const previous=$('target').value;
  $('target').replaceChildren(...data.targets.map(target=>{const option=document.createElement('option');option.value=target.id;option.textContent=target.location+' \u00b7 '+target.label;return option;}));
  if(data.targets.some(target=>target.id===previous))$('target').value=previous;
  else if(nativeRoom){const target=data.targets.find(target=>target.mapId===nativeRoom);if(target)$('target').value=target.id;}
  fillKinds();const selected=$('filter').value;
  const all=document.createElement('option');all.value='';all.textContent='Alle Runden';
  $('filter').replaceChildren(all,...Object.entries(data.kinds).map(([id,label])=>{const option=document.createElement('option');option.value=id;option.textContent=label;return option;}));
  $('filter').value=selected;
}
async function refresh(){
  if(closed)return;if(pending){refreshRequested=true;return;}pending=true;
  try{
    const value=await client.api('round-context');
    if(!Array.isArray(value.targets)||!Array.isArray(value.rounds)||!value.kinds||value.targets.length>100||value.rounds.length>100)throw fail('unavailable');
    const changed=JSON.stringify([data.targets,data.kinds])!==JSON.stringify([value.targets,value.kinds]);data=value;
    $('account').textContent=value.account.kind==='staff'?'Lehrkraftzugang':'Schulzugang';
    if(changed)renderTargets();
  }catch(error){if(error.code!=='cancelled'){data={targets:[],rounds:[],kinds:{},me:null};fingerprint='';renderTargets();$('account').textContent='Keine best\u00e4tigte Schulfreigabe';failed(error);}}
  finally{pending=false;render();if(refreshRequested&&!closed){refreshRequested=false;queueMicrotask(()=>void refresh());}}
}
async function travel(value,mode){
  const target=destination(value.destination),ready=await nativeReady;
  const nonce=crypto.randomUUID();client.write(JOURNEY_KEY,{roundId:value.round.id,mode,mapId:target.mapId,sourceMap:nativeRoom,nonce,createdAt:Date.now()});
  if(inGame){if(!ready){client.clearJourney(nonce);throw fail('travel_unavailable');}
    await WA.player.state.saveVariable(TRAVEL_REQUEST,{v:1,nonce,mapId:target.mapId,createdAt:Date.now()},{public:false,persist:false});
  }else location.assign(target.playUri);
}
async function action(kind,roundId){
  if(pending)return;pending=true;message();render();
  try{
    if(kind==='close'){await client.api('round-close',{roundId});return;}
    if(kind==='leave'){
      const lease=client.lease();if(!lease)throw fail('stale_membership');
      await client.api('round-leave',{leaseId:lease.leaseId});client.clearLease(lease.leaseId);client.clearJourney();return;
    }
    const previous=client.lease();
    if(kind==='visit'&&previous&&previous.roundId!==roundId){
      await client.api('round-leave',{leaseId:previous.leaseId});client.clearLease(previous.leaseId);client.clearJourney();
    }
    const value=await client.api(kind==='visit'?'round-visit':'round-join',{roundId});
    if(kind!=='visit')client.remember(value);await travel(value,kind==='visit'?'visit':'join');
  }catch(error){if(error.code==='stale_membership')client.clearLease();failed(error);}
  finally{pending=false;fingerprint='';void refresh();}
}
$('create-form').addEventListener('submit',async event=>{
  event.preventDefault();if(pending||!$('create-form').reportValidity())return;pending=true;message();render();
  try{const value=await client.api('round-create',{targetId:$('target').value,kind:$('kind').value,capacity:Number($('capacity').value)});
    client.remember(value);$('create-panel').open=wide.matches;await travel(value,'join');
  }catch(error){failed(error);}finally{pending=false;fingerprint='';void refresh();}
});
$('refresh').onclick=()=>void refresh();$('target').onchange=fillKinds;$('filter').onchange=()=>{fingerprint='';render();};$('free-only').onchange=()=>{fingerprint='';render();};
$('leave').onclick=()=>void action('leave');$('my-travel').onclick=()=>{const own=data.rounds.find(round=>round.mine);if(own)void action('return',own.id);};
function schedule(){clearTimeout(timer);if(!closed)timer=setTimeout(async()=>{if(!document.hidden)await refresh();schedule();},12000+Math.random()*3000);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);wide.removeEventListener('change',expandForm);client.dispose();},{once:true});
window.addEventListener('load',icons,{once:true});icons();void nativeReady.then(()=>refresh());schedule();
