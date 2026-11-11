import {ProximityPanel as OriginalPanel} from './castle-room-proximity-original.js';
function icon(button,name,label,{text=false}={}){
 const glyph=document.createElement('i');glyph.dataset.lucide=name;glyph.setAttribute('aria-hidden','true');
 const caption=document.createElement('span');caption.textContent=label;caption.hidden=!text;
 button.replaceChildren(glyph,caption);button.title=label;button.setAttribute('aria-label',label);
}
export class ProximityPanel extends OriginalPanel{
 constructor(options){
  super(options);this.panel.dataset.roomCall='true';this.mini.dataset.roomCall='true';this.reportDialog.dataset.roomCall='true';
  this.note.hidden=true;this.modeBox.hidden=true;this.policy.textContent='Keine Aufzeichnung. Meldungen sieht nur die freigeschaltete Moderation.';
  this.session.chooseMode('group');
  icon(this.panel.querySelector('header button'),'x','Gespraech zuklappen');
  this.panel.addEventListener('pointerdown',options.onFocus||(()=>{}));
 }
 async loadModes(){
  this.modeBox.hidden=true;
  try{const value=await this.request();if(!value.available&&this.session.active)this.stop('Das Zimmergespraech ist gerade nicht verfuegbar.');}
  catch{if(this.session.active)this.stop('Die Verbindung ist unterbrochen.');}
 }
 draw(data){
  super.draw(data);this.modeBox.hidden=true;this.note.hidden=true;
  this.title.textContent='Zimmergespraech';this.panel.setAttribute('aria-label','Zimmergespraech');
  icon(this.button,data.active?'users':'messages-square',data.active?'Zimmergespraech aktiv':'Zimmergespraech oeffnen',{text:true});
  icon(this.action,data.active?'log-out':'log-in',data.active?'Gespraech verlassen':'Am Gespraech teilnehmen',{text:true});
  icon(this.microphone,data.microphone?'mic':'mic-off',data.microphone?'Mikrofon ausschalten':'Mikrofon einschalten');
  icon(this.camera,data.camera?'video':'video-off',data.camera?'Kamera ausschalten':'Kamera einschalten');
  icon(this.audio,'volume-2','Gespraechston freigeben',{text:true});
  icon(this.reportButton,'flag','Etwas melden',{text:true});
  for(const [id,tile]of this.tiles)if(id!=='self')icon(tile.mute,data.muted.has(id)?'volume-x':'volume-2',data.muted.has(id)?'Ton wieder an':'Stummschalten');
  icon(this.miniOpen,'messages-square','Gespraech oeffnen',{text:true});
  window.lucide?.createIcons();
 }
 async openReport(){
  const pending=super.openReport();
  const intro=this.reportDialog.querySelector('p');if(intro)intro.textContent='Deine Beschreibung geht nur an die freigeschaltete Moderation. Es gibt keine Ton- oder Kameraaufnahme.';
  await pending;
 }
}
