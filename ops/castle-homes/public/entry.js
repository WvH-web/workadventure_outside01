const BASE='/castle-homes/',UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const messages={unauthorized:'Bitte erneut in WorkAdventure anmelden.',not_allowed:'Fuer dieses Konto ist der Zimmerzugang nicht freigegeben.',unavailable:'Die Zimmer sind gerade nicht erreichbar.',session_expired:'Deine Schulverbindung wird erneuert.',rate_limited:'Bitte kurz warten.',browser_required:'Bitte diese Ansicht neu oeffnen.'};
const $=id=>document.getElementById(id);
class HomePage{
 constructor(){
  try{this.clientId=sessionStorage.getItem('castle-home-client-v1');if(!UUID.test(this.clientId)){this.clientId=crypto.randomUUID();sessionStorage.setItem('castle-home-client-v1',this.clientId);}}catch{this.clientId=crypto.randomUUID();}
  this.active=true;this.epoch=0;this.invitation=new URL(location.href).searchParams.get('besuch');if(!/^[A-F0-9]{10}$/.test(this.invitation||''))this.invitation=null;
  this.moderation=location.hash==='#moderation';if(this.moderation){document.title='Gemeldete Zimmergespraeche';document.querySelector('h1').textContent='Gemeldete Zimmergespraeche';}
  window.addEventListener('hashchange',()=>{if(this.moderation!==(location.hash==='#moderation'))location.reload();});
  $('retry').onclick=()=>{this.active=true;void this.authorize();};$('leave').onclick=()=>this.leave();
  window.addEventListener('storage',event=>{if(event.key==='authToken'||event.key===null){this.sync();if(this.active)void this.authorize();}});
  window.addEventListener('online',()=>{if(this.active)void this.authorize();});window.addEventListener('offline',()=>this.clear('Die Verbindung wurde unterbrochen.'));
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===this.frame?.contentWindow&&event.data?.type==='castle-home-close'&&event.data.view===this.view)this.leave();});
  window.addEventListener('pagehide',()=>this.dispose(),{once:true});this.poll=setInterval(()=>{if(this.sync()&&this.active)void this.authorize();},1000);
  window.addEventListener('load',()=>window.lucide?.createIcons(),{once:true});window.lucide?.createIcons();this.sync();void this.authorize();
 }
 token(){try{return localStorage.getItem('authToken');}catch{return null;}}
 sync(){
  const next=this.token();if(next===this.auth)return false;const view=this.view,requestId=this.requestId;this.auth=next;this.epoch++;
  this.controller?.abort();this.clear(next?'Schulzugang wird geprueft ...':messages.unauthorized);if(requestId)void this.release(view,requestId);return true;
 }
 clear(message){clearTimeout(this.renew);clearTimeout(this.expiry);this.frame?.remove();this.frame=null;this.view=null;$('message').hidden=false;$('message').textContent=message;$('connection').textContent=message;}
 async authorize(){
  this.sync();if(this.closed||!this.active||!this.auth)return;
  const epoch=this.epoch,token=this.auth,requestId=crypto.randomUUID(),started=Date.now();this.requestId=requestId;
  this.controller?.abort();clearTimeout(this.renew);const controller=new AbortController();this.controller=controller;const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(BASE+'session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId,requestId})});
   const value=await response.json();if(this.closed||!this.active||epoch!==this.epoch||requestId!==this.requestId||token!==this.token())return;
   if(!response.ok)throw Object.assign(Error(),{code:value.error});if(value.ready!==true||!UUID.test(value.view)||!Number.isFinite(value.leaseMs)||value.leaseMs<=0||value.leaseMs>45000)throw Error('Invalid room response');
   const remaining=started+value.leaseMs-Date.now();if(remaining<=0)throw Error('Expired room response');
   const destination=BASE+'view/'+value.view+(this.moderation?'/moderation/':'/zimmer/'+(this.invitation?'?besuch='+this.invitation:''));
   if(this.moderation&&this.view!==value.view){const check=await fetch(destination,{credentials:'same-origin',cache:'no-store',signal:controller.signal});await check.body?.cancel();if(!check.ok){void this.release(value.view,requestId);throw Object.assign(Error(),{code:'not_allowed'});}}
   if(this.view!==value.view){this.frame?.remove();this.frame=document.createElement('iframe');this.frame.title=this.moderation?'Gemeldete Zimmergespraeche':'Dein Schlosszimmer';this.frame.allow=document.documentElement.dataset.roomCalls==='enabled'&&!this.moderation?'clipboard-write; microphone; camera':'clipboard-write';
    this.frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');this.frame.referrerPolicy='no-referrer';
    this.frame.src=destination;$('content').append(this.frame);this.view=value.view;}
   $('message').hidden=true;$('connection').textContent='Mit deinem Schulzugang verbunden';this.failures=0;
   clearTimeout(this.expiry);this.expiry=setTimeout(()=>{this.clear(messages.session_expired);if(this.active)void this.authorize();},remaining);
   this.renew=setTimeout(()=>void this.authorize(),Math.min(20000,Math.max(1000,remaining/2)));
  }catch(error){
   if(this.closed||!this.active||epoch!==this.epoch||requestId!==this.requestId||token!==this.token())return;
   this.clear(messages[error.code]||messages.unavailable);if(error.code==='not_allowed')this.active=false;if(this.active)this.renew=setTimeout(()=>void this.authorize(),Math.min(15000,1500*2**Math.min(this.failures=(this.failures||0)+1,3)));
  }finally{clearTimeout(timeout);if(this.controller===controller)this.controller=null;}
 }
 release(view,requestId){if(!requestId)return Promise.resolve();return fetch(BASE+'leave',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId,requestId,view:view||null})}).catch(()=>{});}
 leave(){const view=this.view,requestId=this.requestId;this.active=false;this.epoch++;this.controller?.abort();this.clear('Dein Zimmer ist geschlossen.');void this.release(view,requestId);}
 dispose(){if(this.closed)return;this.leave();this.closed=true;clearInterval(this.poll);}
}
new HomePage();
