'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit,stats,writeAudio,audioFixture}=require('./check-cinema-live.cjs');
const root=path.resolve(__dirname,'..'),origin='https://together.deine-schule.com',base=origin+'/castle-homes/';
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(privateRoot,'qa/homes-native-candidate');
const prefix='https://wvh-web.github.io/workadventure_outside01/castle/';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function main(){
 fs.mkdirSync(output,{recursive:true});fs.rmSync(path.join(output,'result.json'),{force:true});writeAudio();
 const map=JSON.parse(fs.readFileSync(path.join(root,'castle/obergeschoss.tmj'))),P=(name,value)=>({name,type:typeof value==='boolean'?'bool':'string',value});
 assert.equal(map.properties.find(p=>p.name==='castleMapId').value,'obergeschoss');
 // Candidate controller bytes replace only this browser's already registered gallery script.
 // Publication will use its own upper-gallery URL and must be tested again without routing.
 map.properties.push(P('castleHomesPilot','20261110-homes1'));
 map.layers.push({id:map.nextlayerid++,name:'castle-homes-pilot',type:'objectgroup',x:0,y:0,opacity:1,visible:true,draworder:'topdown',objects:[
  {id:map.nextobjectid++,name:'castle-home-entry',type:'area',x:576,y:320,width:128,height:160,rotation:0,visible:true,properties:[P('silent',true),P('castleHomeEntry',true)]}]});
 const candidate=Buffer.from(JSON.stringify(map)),script=fs.readFileSync(path.join(root,'castle/upper-gallery.bundle.js'));
 fs.writeFileSync(path.join(output,'map.private.json'),candidate);
 const routed=[],users=[];let stage='entry';
 const browser=await chromium.launch({...(process.argv.includes('--system-chrome')?{channel:'chrome'}:{}),headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
  '--use-file-for-fake-audio-capture='+audioFixture,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function configureContext(context){
  await context.addInitScript(()=>{
   if(!location.pathname.startsWith('/castle-homes/view/'))return;window.__homeImageLoads=[];
   const Original=window.Image;window.Image=new Proxy(Original,{construct(target,args){
    const image=Reflect.construct(target,args),record={image,decoded:false,failed:false},decode=image.decode.bind(image);
    window.__homeImageLoads.push(record);image.decode=()=>decode().then(value=>{record.decoded=true;return value;},error=>{record.failed=true;throw error;});return image;
   }});
  });
  await context.route(prefix+'**',route=>{
  const name=new URL(route.request().url()).pathname.slice(new URL(prefix).pathname.length);
  if(name==='obergeschoss.tmj'){routed.push(name);return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:candidate});}
  if(name==='expansion.bundle.js'){routed.push(name);return route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:script});}
  return route.continue();
 });}
 async function enter(number){
  const user=await join(browser,number,{roomId:'obergeschoss',roomUrl:origin+'/~/castle-preview/obergeschoss.wam#start',outputDir:output,
   label:'Zimmerprobe',seats:10,groups:2,revision:map.properties.find(p=>p.name==='castleRevision').value,
   schoolStorageState:path.join(privateRoot,'qa/sso-'+(number===1?'A':'B')+'.private.json'),mobile:number===2,
   parking:[[432,608],[832,608]],characterTextureId:'wvh-event-mira-v1',configureContext});users.push(user);
  const microphone=user.page.getByTestId('microphone-button');await microphone.click();await user.page.waitForTimeout(200);await microphone.click();
  assert.equal(await user.page.evaluate(()=>JSON.parse(localStorage.getItem('requestedMicrophoneStateKey'))),true);
  for(let n=0;n<40&&!user.entry;n++){for(const frame of user.page.frames())if(await frame.evaluate(()=>!!window.castleHomeEntry).catch(()=>false))user.entry=frame;if(!user.entry)await user.page.waitForTimeout(200);}
  assert.ok(user.entry,'Home entry controller loaded');await user.entry.waitForFunction(()=>window.castleHomeEntry?.started);return user;
 }
 async function conversation(a,b){
  const before=[await stats(a),await stats(b)],until=Date.now()+25000;let after;
  while(Date.now()<until){await a.page.waitForTimeout(1000);after=[await stats(a),await stats(b)];if(after.every((row,i)=>row.energy>before[i].energy)&&after[0].rooms.some(room=>room.endsWith('area-buchclub')&&after[1].rooms.includes(room)))return {before,after};}
  throw Error('Both table participants must decode native speech');
 }
 async function home(user){
  for(let n=0;n<80;n++){const frame=user.page.frames().find(f=>f.url()===base);if(frame){const inner=frame.frameLocator('iframe[title="Dein Schlosszimmer"]');await inner.locator('#loading').waitFor({state:'attached',timeout:20000});await inner.locator('#loading').waitFor({state:'hidden',timeout:30000});return {root:frame,inner};}await user.page.waitForTimeout(250);}
  throw Error('Automatic native room panel did not open');
 }
 async function quiet(a,b){
  for(let n=0;n<40;n++){const values=[await stats(a),await stats(b)];if(values.every(row=>row.rooms.length===0)){await a.page.waitForTimeout(1000);const before=[await stats(a),await stats(b)];await a.page.waitForTimeout(3500);const after=[await stats(a),await stats(b)];if(after.every((row,i)=>row.rooms.length===0&&row.energy===before[i].energy))return {before,after};}await a.page.waitForTimeout(300);}
  throw Error('The room entrance must not receive a native table or proximity conversation');
 }
 try{
  const a=await enter(1),b=await enter(2);assert.ok(routed.includes('obergeschoss.tmj')&&routed.includes('expansion.bundle.js'));
  stage='native-table-before-entry';const chairs=await a.script.evaluate(()=>castleRoom.layout.seats.filter(seat=>seat.audioGroup==='buchclub').map(seat=>seat.id));
  await sit(a,chairs[0]);await sit(b,chairs[1]);const tableBefore=await conversation(a,b);
  stage='automatic-room-entry';
  for(const [user,position]of [[a,[608,384]],[b,[672,416]]]){
   await user.page.bringToFront();await user.script.evaluate(async p=>{await castleRoom.stand();await WA.player.teleport(p[0],p[1]);await castleRoom.syncPosition();},position);
   await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(60);await user.page.keyboard.up('ArrowRight');
   user.home=await home(user);
  }
  const isolated=await quiet(a,b);assert.equal(await a.page.evaluate(()=>JSON.parse(localStorage.getItem('requestedMicrophoneStateKey'))),true);
  assert.equal(await b.page.evaluate(()=>JSON.parse(localStorage.getItem('requestedMicrophoneStateKey'))),true);
  for(const user of users){const pixels=await user.home.inner.locator('#room').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;const colors=new Set();for(let i=0;i<data.length;i+=188)colors.add(data[i]+','+data[i+1]+','+data[i+2]);return colors.size;});assert.ok(pixels>100);}
  stage='native-private-visit';if(!await a.home.inner.locator('.room-social-panel').isVisible())await a.home.inner.locator('.social-tab').click();
  await a.home.inner.locator('.room-social-panel').waitFor({state:'visible'});
  await a.home.inner.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  await a.home.inner.locator('body').evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__homeInvitation=value;}}}));
  await a.home.inner.getByRole('button',{name:'Einladung kopieren',exact:true}).click();const invitation=await a.home.inner.locator('body').evaluate(()=>window.__homeInvitation);
  assert.equal(new URL(invitation).origin,origin);assert.equal(new URL(invitation).pathname,'/castle-homes/');
  await b.home.root.goto(invitation,{waitUntil:'domcontentloaded'});await b.home.inner.locator('#loading').waitFor({state:'attached',timeout:20000});await b.home.inner.locator('#loading').waitFor({state:'hidden',timeout:30000});
  await b.home.inner.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();await b.home.inner.getByRole('button',{name:'Hallo zusammen!',exact:true}).click();
  await a.home.inner.locator('.social-log').getByText('Hallo zusammen!',{exact:true}).waitFor();await quiet(a,b);
  for(const [user,label]of [[a,'desktop'],[b,'mobile']])await user.page.screenshot({path:path.join(output,label+'.private.png')});
  assert.equal(await b.home.root.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  stage='departure-and-normal-conversation';for(const user of users){await user.script.evaluate(async()=>{await WA.player.teleport(832,608);await castleRoom.syncPosition();});
   await user.page.bringToFront();await user.page.keyboard.down('ArrowRight');await user.page.waitForTimeout(60);await user.page.keyboard.up('ArrowRight');await user.entry.waitForFunction(()=>!castleHomeEntry.active&&!castleHomeEntry.website);}
  assert.ok(users.every(user=>!user.page.frames().some(frame=>frame.url().startsWith(base))));
  await sit(a,chairs[0]);await sit(b,chairs[1]);const tableAfter=await conversation(a,b);
  const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);
  const proof={passed:true,browserVersion:browser.version(),normalMicrosoftPupils:2,realNativeWorkAdventure:true,
   realPublicRoomService:true,automaticSidePanelOnEntry:true,actualPrivateVisitAndReceivedPhrase:true,
   nativeConversationDecodedBeforeAndAfter:true,quietEntryHasNoNativeConversation:true,microphonePreferenceUnchanged:true,
   departureClosesOnlyOwnedPanel:true,desktopAndMobileRendered:true,noMobileHorizontalOverflow:true,clipboardWriteStubbed:true,
   candidateMapOnlyInsideTestBrowsers:true,publishedMapsChanged:false,schoolOverrides:false,voiceInPrivateRoomsEnabled:false,
   candidateMapSha256:sha(candidate),entryScriptSha256:sha(script),routed,tableBefore,isolated,tableAfter,errors,loadApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,tableBefore:undefined,isolated:undefined,tableAfter:undefined}));
 }catch(error){
  const roomFrames=[];for(const user of users)for(const frame of user.page.frames())if(frame.url().includes('/castle-homes/view/'))roomFrames.push(await frame.evaluate(()=>({
   visibility:document.visibilityState,loading:document.querySelector('#loading')?.hidden,saved:document.querySelector('#saved')?.textContent,
   images:(window.__homeImageLoads||[]).map(record=>({path:new URL(record.image.src).pathname,complete:record.image.complete,width:record.image.naturalWidth,decoded:record.decoded,failed:record.failed})),
   resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,duration:Math.round(r.duration),bytes:r.transferSize})),
  })).catch(()=>null));
  const loaders=[];for(const user of users)loaders.push(await user.script.evaluate(async()=>({
   scripts:[...document.scripts].map(s=>s.src),resources:performance.getEntriesByType('resource').map(r=>{try{const u=new URL(r.name);return u.origin+u.pathname;}catch{return 'unknown';}}),
   mapProperties:(await WA.room.getTiledMap()).properties.filter(p=>['script','castleHomesPilot'].includes(p.name)),
   controller:!!window.castleHomeEntry,
  })).catch(()=>null));
  fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,loaders,roomFrames,
   diagnostics:users.map(user=>user.diagnostics),errors:users.flatMap(user=>user.errors),routed},null,2)+'\n');
  let n=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++n)+'.private.png')}).catch(()=>{});
  console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
 }finally{for(const user of users){await user.home?.root.locator('#leave').click({timeout:2000}).catch(()=>{});await user.script.evaluate(async()=>{await castleRoom.stand();await WA.player.teleport(432,608);}).catch(()=>{});}await browser.close();}
}
main().catch(error=>{console.error('Native home probe stopped: '+error.name);process.exitCode=1;});
