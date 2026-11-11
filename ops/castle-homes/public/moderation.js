const $=id=>document.getElementById(id),endpoint=new URL('../api/moderation/chat',location.href);
const reasons={unkind:'Gemein oder beleidigend',personal:'Private Daten',worry:'Besorgniserregend',other:'Andere Meldung'};
const actions={resolve:'Als erledigt markieren',timeout:'Schreibpause: 15 Minuten',close:'Zimmerbesuche schliessen: 15 Minuten'};
const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;};
const date=value=>Number.isFinite(value)?new Date(value).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):'';
let reports=[],selected=null,filter='open',busy=false,epoch=0,controller,pendingCommand;
function icons(){window.lucide?.createIcons();}
function clear(message){reports=[];selected=null;pendingCommand=null;if($('confirm').open)$('confirm').close();$('reports').replaceChildren();$('detail').replaceChildren(element('p',message));$('status').textContent=message;$('empty').hidden=true;}
function choose(action,id){if(busy)return;if(action==='resolve'){void load({action,id});return;}pendingCommand={action,id};$('confirm-text').textContent=actions[action]+'?';$('confirm').showModal();}
function draw(){
 const visible=reports.filter(report=>report.status===filter);$('reports').replaceChildren();$('empty').hidden=visible.length>0;$('empty').textContent=filter==='open'?'Keine offenen Meldungen.':'Keine erledigten Meldungen.';
 for(const report of visible){const item=element('li'),button=element('button');button.className='report';button.type='button';button.dataset.reportId=report.id;button.setAttribute('aria-current',String(report.id===selected));
  button.append(element('strong',report.senderName||'Zimmergast'),element('span',reasons[report.reason]||'Meldung'),element('small',date(report.created)));button.onclick=()=>{selected=report.id;draw();};item.append(button);$('reports').append(item);}
 const report=visible.find(row=>row.id===selected);$('detail').replaceChildren();
 if(!report){$('detail').append(element('p','Meldung auswaehlen'));return;}
 $('detail').append(element('h2',reasons[report.reason]||'Meldung'));const details=element('dl');
 for(const [label,value]of [['Gemeldet von',report.reporterName],['Zimmer von',report.ownerName],['Zeitpunkt',date(report.created)],['Status',report.status==='open'?'Offen':'Erledigt']])details.append(element('dt',label),element('dd',value||''));$('detail').append(details);
 if(report.note){const note=element('p',report.note);note.className='note';$('detail').append(note);}
 const context=element('div');context.className='context';for(const message of Array.isArray(report.context)?report.context:[]){
  const row=element('div');row.className='message'+(message.id===report.message?' reported':'');row.append(element('small',(message.name||'Zimmergast')+' - '+date(message.created??message.time)),element('p',message.text||''));context.append(row);
 }$('detail').append(context);
 if(report.status==='open'){const commands=element('div');commands.className='actions';for(const [action,label]of Object.entries(actions)){
  const button=element('button'),icon=element('i');icon.dataset.lucide={resolve:'check',timeout:'clock',close:'door-closed'}[action];button.append(icon,element('span',label));button.type='button';button.disabled=busy;
  if(action==='close')button.className='caution';button.onclick=()=>choose(action,report.id);commands.append(button);
 }$('detail').append(commands);}else $('detail').append(element('p','Bearbeitet am '+date(report.handled_at)));
 icons();
}
async function load(command){
 if(busy&&!command)return;const revision=++epoch;controller?.abort();controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),8000);busy=true;$('refresh').disabled=true;$('status').textContent=command?'Massnahme wird gespeichert ...':'Meldungen werden geladen ...';draw();
 try{
  const response=await fetch(endpoint,{method:command?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:command?{'Content-Type':'application/json'}:{},body:command?JSON.stringify(command):undefined,signal:current.signal});
  const value=await response.json();if(revision!==epoch)return;if(!response.ok)throw Error(response.status===401||response.status===403?'Dein Moderationszugang ist nicht freigegeben.':'Die Meldungen sind gerade nicht erreichbar.');
  if(!Array.isArray(value.reports)||value.reports.length>100)throw Error('Die Meldungen konnten nicht gelesen werden.');reports=value.reports;
  if(!reports.some(row=>row.id===selected&&row.status===filter))selected=reports.find(row=>row.status===filter)?.id??null;
  $('status').textContent=reports.filter(row=>row.status==='open').length+' offene Meldungen';
 }catch(error){if(revision===epoch)clear(error.name==='AbortError'?'Die Verbindung ist unterbrochen.':error.message);}
 finally{clearTimeout(timer);if(revision===epoch){busy=false;$('refresh').disabled=false;draw();}}
}
for(const id of ['open','handled'])$(id).onclick=()=>{filter=id;selected=reports.find(row=>row.status===filter)?.id??null;$('open').setAttribute('aria-pressed',String(id==='open'));$('handled').setAttribute('aria-pressed',String(id==='handled'));draw();};
$('refresh').onclick=()=>void load();window.addEventListener('offline',()=>{epoch++;controller?.abort();busy=false;clear('Die Verbindung ist unterbrochen.');});
$('confirm-cancel').onclick=()=>{pendingCommand=null;$('confirm').close();};$('confirm').oncancel=()=>{pendingCommand=null;};$('confirm-yes').onclick=()=>{const command=pendingCommand;pendingCommand=null;$('confirm').close();if(command)void load(command);};
window.addEventListener('online',()=>void load());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
const interval=setInterval(()=>{if(!document.hidden)void load();},15000);window.addEventListener('pagehide',()=>{epoch++;clearInterval(interval);controller?.abort();},{once:true});
window.addEventListener('load',icons,{once:true});icons();void load();
