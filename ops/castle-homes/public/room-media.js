export function prepareRoomMedia(renderer,{image,ATLAS,FINISHES,RoomMaterials,itemFor,base}){
 const resources=new Map(),thumbnails=new Map(),floorById=new Map(FINISHES.filter(row=>row.image).map(row=>[row.id,row.image]));
 let active=true,started=false,waiting=false,cleanupQueued=false;
 const loading=document.getElementById('loading'),message=loading?.querySelector('span');
 const retry=document.createElement('button');retry.type='button';retry.textContent='Erneut versuchen';retry.hidden=true;retry.onclick=()=>location.reload();loading?.append(retry);
 function show(error=false){
  if(!active)return;renderer.ready=false;if(loading)loading.hidden=false;if(message)message.textContent=error?'Ein Zimmerbild ist gerade nicht erreichbar.':'Deine Einrichtung wird geladen ...';retry.hidden=!error;
  if(!waiting){waiting=true;window.dispatchEvent(new Event('castle-room-media-waiting'));}
 }
 function resource(key,url,apply){
  if(resources.has(key))return resources.get(key);
  const row={state:'pending',promise:null};resources.set(key,row);
  row.promise=Promise.resolve().then(()=>image(new URL(url,base))).then(value=>{
   if(!active)throw Error('Room media closed');apply(value);row.state='ready';return value;
  }).catch(error=>{row.state='failed';throw error;});row.promise.catch(()=>{});return row;
 }
 function atlas(key){
  if(!Object.hasOwn(ATLAS,key))throw Error('Unknown room atlas');
  return resource('atlas:'+key,ATLAS[key],value=>{
   const surface=document.createElement('canvas');surface.width=value.width;surface.height=value.height;const context=surface.getContext('2d',{willReadFrequently:true});context.drawImage(value,0,0);
   const rgba=context.getImageData(0,0,value.width,value.height).data,alpha=new Uint8Array(value.width*value.height);for(let n=0;n<alpha.length;n++)alpha[n]=rgba[n*4+3];
   renderer.images[key]=value;renderer.alphas[key]={data:alpha,width:value.width};
  });
 }
 const background=resource('background','../bilder/leer.png',value=>renderer.bg=value);
 const loaded=background.promise.then(()=>{if(active)renderer.materials=new RoomMaterials(renderer.bg,renderer.images,renderer.floors);});loaded.catch(()=>{});
 function required(view){
  const rows=[background,
   resource('avatar:front','../game/figuren-vorne.png',value=>renderer.front=value),
   resource('avatar:back','../game/figuren-hinten.png',value=>renderer.back=value)];
  const ids=[...(view.room?.placed||[]).map(row=>row.id),view.selected,view.drag?.id].filter(Boolean),keys=new Set(ids.map(id=>itemFor(id)?.atlas).filter(Boolean));
  for(const key of keys)rows.push(atlas(key));
  const floor=renderer.finishes().floor;if(floorById.has(floor))rows.push(resource('floor:'+floor,floorById.get(floor),value=>renderer.floors[floor]=value));
  return rows;
 }
 function ready(rows){return rows.every(row=>row.state==='ready');}
 function launch(row){
  if(!active||!started||!renderer.ready||!row.visible||!row.canvas.isConnected)return;
  row.canvas.setAttribute('aria-busy','true');atlas(row.atlas).promise.then(()=>{
   if(!active||!renderer.ready||thumbnails.get(row.canvas)!==row||!row.canvas.isConnected)return;
   thumbnails.delete(row.canvas);observer?.unobserve(row.canvas);row.canvas.removeAttribute('aria-busy');row.draw();
  }).catch(()=>{if(active&&thumbnails.get(row.canvas)===row){row.canvas.removeAttribute('aria-busy');row.canvas.title='Bild derzeit nicht erreichbar';}});
 }
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){const row=thumbnails.get(entry.target);if(row){row.visible=entry.isIntersecting;launch(row);}}
 },{rootMargin:'80px'}):null;
 function visibleFallback(){if(observer||!active)return;for(const row of thumbnails.values()){
  const box=row.canvas.getBoundingClientRect();row.visible=!!row.canvas.getClientRects().length&&box.bottom>=-80&&box.top<=innerHeight+80&&box.right>=0&&box.left<=innerWidth;launch(row);
 }}
 function cleanup(){
  if(cleanupQueued)return;cleanupQueued=true;queueMicrotask(()=>{cleanupQueued=false;for(const [canvas,row]of thumbnails)if(!canvas.isConnected){observer?.unobserve(canvas);thumbnails.delete(canvas);}visibleFallback();});
 }
 function thumbnail(canvas,id,draw){
  const item=itemFor(id);if(!item)return false;
  if(renderer.images[item.atlas]){const prior=thumbnails.get(canvas);if(prior){observer?.unobserve(canvas);thumbnails.delete(canvas);}return false;}
  const prior=thumbnails.get(canvas);if(!prior||prior.id!==id){const row={canvas,id,atlas:item.atlas,draw,visible:false};thumbnails.set(canvas,row);observer?.observe(canvas);cleanup();}
  return true;
 }
 function complete(){renderer.ready=true;waiting=false;if(loading)loading.hidden=true;retry.hidden=true;for(const row of thumbnails.values())launch(row);visibleFallback();}
 async function scene(){
  if(!active)throw Error('Room media closed');started=true;show();
  try{
   await loaded;while(active){const rows=required(renderer.getState());await Promise.all(rows.map(row=>row.promise));
    if(ready(required(renderer.getState()))){renderer.resize();complete();return;}}
   throw Error('Room media closed');
  }catch(error){show(true);throw error;}
 }
 function frame(view){
  if(!active||!started)return false;const rows=required(view);
  if(!ready(rows)){show(rows.some(row=>row.state==='failed'));return false;}
  if(!renderer.ready||waiting)complete();return true;
 }
 function dispose(){if(!active)return;active=false;renderer.ready=false;observer?.disconnect();thumbnails.clear();window.removeEventListener('scroll',visibleFallback,true);window.removeEventListener('resize',visibleFallback);}
 if(!observer){window.addEventListener('scroll',visibleFallback,true);window.addEventListener('resize',visibleFallback);}
 window.addEventListener('pagehide',dispose,{once:true});
 return Object.freeze({loaded,scene,frame,thumbnail,dispose});
}
