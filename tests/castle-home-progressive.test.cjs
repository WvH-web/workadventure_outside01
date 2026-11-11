'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {adaptRoomModule,PINNED}=require('../ops/castle-homes/progressive-adapter.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(run,{fallback=false}={}){
 const names=['document','window','location','IntersectionObserver','innerWidth','innerHeight'],old=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const text={textContent:''},loading={hidden:false,querySelector:()=>text,append(value){this.button=value;}},observers=[],calls=[],pending=new Map(),blocked=new Set(),failed=new Set();let reloads=0,waiting=0;
 const canvas=()=>({width:1,height:1,isConnected:true,attributes:new Map(),setAttribute(key,value){this.attributes.set(key,value);},removeAttribute(key){this.attributes.delete(key);},
  getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([10,20,30,128])})}),getClientRects:()=>[{}],getBoundingClientRect:()=>({left:0,right:20,top:0,bottom:20})});
 const fakeWindow=new EventTarget();fakeWindow.addEventListener('castle-room-media-waiting',()=>waiting++);
 Object.assign(globalThis,{document:{getElementById:()=>loading,createElement:kind=>kind==='canvas'?canvas():{}},window:fakeWindow,location:{reload(){reloads++;}},innerWidth:1000,innerHeight:800});
 if(fallback)delete globalThis.IntersectionObserver;else globalThis.IntersectionObserver=class{
  constructor(callback){this.callback=callback;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target);}unobserve(target){this.targets.delete(target);}disconnect(){this.targets.clear();}
  visible(target,value=true){this.callback([{target,isIntersecting:value}]);}
 };
 let state={room:{placed:[{id:'bed'}]},selected:null,drag:null};let floor='default';const renderer={images:{},alphas:{},floors:{},ready:false,
  getState:()=>state,finishes:()=>({floor}),resize(){this.resized=true;}};
 const source=await fs.readFile(path.resolve(__dirname,'../ops/castle-homes/public/room-media.js'),'utf8');
 const {prepareRoomMedia}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const media=prepareRoomMedia(renderer,{image:url=>{
  const name=url.pathname;calls.push(name);if(failed.has(name))return Promise.reject(Error('Synthetic image unavailable'));
  if(blocked.has(name))return new Promise(resolve=>pending.set(name,()=>resolve({width:1,height:1})));return Promise.resolve({width:1,height:1});
 },ATLAS:{basis:'basis.png',other:'other.png'},FINISHES:[{id:'stone',image:'stone.png'}],
 RoomMaterials:class{constructor(bg,images,floors){Object.assign(this,{bg,images,floors});}},itemFor:id=>({bed:{atlas:'basis'},other:{atlas:'other'}}[id]),base:'https://room.invalid/zimmer/renderer.js'});
 try{await run({media,renderer,calls,canvas,loading,text,observers,blocked,failed,pending,setState:value=>state=value,setFloor:value=>floor=value,
  get waiting(){return waiting;},get reloads(){return reloads;},window:fakeWindow});}
 finally{media.dispose();for(const name of names){const value=old.get(name);if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}}
}
test('the initial scene loads only its background, two avatar sheets and placed furniture, with unchanged alpha indexing',async()=>fixture(async({media,renderer,calls})=>{
 await media.loaded;assert.deepEqual(calls,['/bilder/leer.png']);assert.equal(renderer.ready,false);await media.scene();
 assert.deepEqual([...calls].sort(),['/bilder/leer.png','/game/figuren-vorne.png','/game/figuren-hinten.png','/zimmer/basis.png'].sort());
 assert.equal(renderer.ready,true);assert.deepEqual([...renderer.alphas.basis.data],[128]);assert.equal(renderer.materials.images,renderer.images);
}));
test('hidden catalog canvases do not load atlases; visible thumbnails deduplicate downloads and cannot paint replaced canvases',async()=>fixture(async({media,calls,canvas,observers,blocked,pending})=>{
 await media.scene();blocked.add('/zimmer/other.png');const first=canvas(),second=canvas();let firstDraw=0,secondDraw=0;
 media.thumbnail(first,'other',()=>firstDraw++);media.thumbnail(second,'other',()=>secondDraw++);await tick();assert.equal(calls.includes('/zimmer/other.png'),false);
 observers[0].visible(first);observers[0].visible(second);await tick();assert.equal(calls.filter(row=>row==='/zimmer/other.png').length,1);
 first.isConnected=false;pending.get('/zimmer/other.png')();await tick();assert.equal(firstDraw,0);assert.equal(secondDraw,1);
}));
test('a changed room waits for its real furniture and floor before allowing renderer interaction again',async()=>fixture(async f=>{
 await f.media.scene();f.blocked.add('/zimmer/other.png');f.blocked.add('/zimmer/stone.png');
 f.setState({room:{placed:[{id:'other'}]}});f.setFloor('stone');assert.equal(f.media.frame(f.renderer.getState()),false);assert.equal(f.renderer.ready,false);assert.equal(f.waiting,2);
 await tick();f.pending.get('/zimmer/other.png')();await tick();assert.equal(f.media.frame(f.renderer.getState()),false);
 f.pending.get('/zimmer/stone.png')();await tick();assert.equal(f.media.frame(f.renderer.getState()),true);assert.equal(f.renderer.ready,true);assert.ok(f.renderer.floors.stone);
}));
test('initial completion rechecks the latest room instead of accepting an older visit snapshot',async()=>fixture(async f=>{
 f.blocked.add('/zimmer/basis.png');const work=f.media.scene();await tick();f.setState({room:{placed:[{id:'other'}]}});f.setFloor('stone');f.pending.get('/zimmer/basis.png')();await work;
 assert.ok(f.renderer.images.other&&f.renderer.floors.stone);assert.equal(f.renderer.ready,true);
}));
test('failed required images show a bounded retry state and never retry every animation frame',async()=>fixture(async f=>{
 f.failed.add('/zimmer/basis.png');await assert.rejects(f.media.scene());assert.equal(f.loading.hidden,false);assert.equal(f.loading.button.hidden,false);
 for(let n=0;n<20;n++)assert.equal(f.media.frame(f.renderer.getState()),false);assert.equal(f.calls.filter(row=>row==='/zimmer/basis.png').length,1);
 f.loading.button.onclick();assert.equal(f.reloads,1);assert.match(f.text.textContent,/nicht erreichbar/);
}));
test('leaving during a pending scene cannot restore ready state or paint the departed room',async()=>fixture(async f=>{
 f.blocked.add('/zimmer/basis.png');const work=f.media.scene();await tick();f.media.dispose();f.pending.get('/zimmer/basis.png')();await assert.rejects(work);
 assert.equal(f.renderer.ready,false);assert.equal(f.renderer.images.basis,undefined);assert.equal(f.media.frame(f.renderer.getState()),false);
}));
test('the no-IntersectionObserver fallback still loads only visible connected thumbnails',async()=>fixture(async f=>{
 await f.media.scene();const canvas=f.canvas();canvas.getClientRects=()=>[];f.media.thumbnail(canvas,'other',()=>{});await tick();assert.equal(f.calls.includes('/zimmer/other.png'),false);
 canvas.getClientRects=()=>[{}];f.window.dispatchEvent(new Event('scroll'));await tick();assert.equal(f.calls.filter(row=>row==='/zimmer/other.png').length,1);
},{fallback:true}));
test('only the two exact reviewed modules are adapted; original sources, auth and purchase handlers remain intact',async()=>{
 const root=process.env.STERNENHUETER_SOURCE||(process.platform==='linux'?require('../ops/castle-homes/service.cjs').SOURCE:path.resolve(__dirname,'../../sternenhueter'));
 for(const kind of ['renderer','app']){
  const file=path.join(root,'planung/zimmer-editor/'+(kind==='renderer'?'renderer':'app')+'.js'),source=await fs.readFile(file,'utf8'),adapted=adaptRoomModule(kind,source);
  assert.equal(require('node:crypto').createHash('sha256').update(source).digest('hex'),PINNED[kind]);assert.equal(await fs.readFile(file,'utf8'),source);assert.throws(()=>adaptRoomModule(kind,source+' '));assert.throws(()=>adaptRoomModule(kind,adapted));
  if(kind==='app'){for(const name of ['service','save','purchase','chooseRoomCompanion']){const pattern=new RegExp('(?:async )?function '+name+'\\(');assert.ok(pattern.test(source)&&pattern.test(adapted));}
   const withoutHooks=adapted.replace("\nwindow.addEventListener('castle-room-media-waiting',stop);",'').replace('.then(()=>renderer.media.scene())','');assert.equal(withoutHooks,source);
  }
 }
});
