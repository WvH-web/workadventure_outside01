const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let sharp;try{sharp=require('sharp')}catch{sharp=require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp')}
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/teacher-lounge-20261107');
const before=path.resolve(process.argv[2]||path.join(root,'../output/teacher-lounge-20261107/before/teachersmeetingground.tmj'));
const W=24,H=16,T=32;
const prop=(name,value)=>({name,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string',value});
const seats=[
 {id:'armchair-red',label:'Kamin-Sessel',x:92,y:196,standX:144,standY:192,facing:'right'},
 {id:'armchair-green',label:'Gruener Sessel',x:204,y:228,standX:272,standY:272,facing:'left'},
 {id:'armchair-reading',label:'Roter Lesesessel',x:76,y:284,standX:144,standY:336,facing:'right'},
 ...[360,430,500,566].map((x,n)=>({id:'table-north-'+(n+1),label:'Tafelplatz '+(n+1),x,y:212,standX:x,standY:176,facing:'down'})),
 ...[360,430,500,566].map((x,n)=>({id:'table-south-'+(n+1),label:'Tafelplatz '+(n+5),x,y:290,standX:x,standY:352,facing:'up'})),
 {id:'desk',label:'Schreibtisch',x:684,y:432,standX:624,standY:464,facing:'up'},
];
for(const seat of seats)seat.audioGroup=seat.id.startsWith('table-')?'council':seat.id.startsWith('armchair-')?'fireplace':'';
const blocked=new Set();
function rect(x1,y1,x2,y2){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)blocked.add(y*W+x)}
rect(0,0,23,4);rect(0,0,0,15);rect(23,0,23,15);rect(0,15,10,15);rect(13,15,23,15);
rect(6,5,8,5); // Fireplace hearth projects beyond the north bookcases.
rect(2,5,3,7);rect(5,6,7,8);rect(1,8,3,10);
rect(10,6,18,8);rect(10,9,11,9);rect(13,9,13,9);rect(15,9,16,9);rect(17,9,18,9);
rect(21,4,22,6);rect(21,7,22,9);rect(20,12,22,13);rect(21,14,22,14);
rect(1,12,3,14);rect(4,12,4,13);
for(const s of seats){
 // Keep each seating socket physically valid, including the body's lower edge.
 for(const x of [Math.floor((s.x-6)/T),Math.floor((s.x+6)/T)])
  for(const y of [Math.floor((s.y-6)/T),Math.floor((s.y+6)/T)])blocked.delete(y*W+x);
 blocked.delete(Math.floor(s.standY/T)*W+Math.floor(s.standX/T));
}
const foreground=Array(W*H).fill(0);
function front(x1,y1,x2,y2){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)foreground[y*W+x]=387+y*W+x}
front(10,7,18,7);for(const x of [10,11,13,15,16,17,18])front(x,9,x,9);
front(10,6,18,8);front(1,6,3,7);front(5,6,7,8);front(1,8,3,10);front(20,13,22,14);
const original=JSON.parse(fs.readFileSync(before,'utf8'));
const resources=[];const seen=new Set();
function collect(layers){for(const l of layers||[]){collect(l.layers);for(const o of l.objects||[]){
 const props=Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
 if(typeof props.openWebsite==='string'&&/^https:\/\//.test(props.openWebsite)&&!seen.has(props.openWebsite)){
  seen.add(props.openWebsite);
  const meeting=/teams-meeting\.html/.test(props.openWebsite);
  resources.push({label:meeting?'Besprechungsraum '+(resources.filter(x=>x.kind==='meeting').length+1):o.name.replace(/\d+$/,'').trim(),url:props.openWebsite,kind:meeting?'meeting':'leisure'});
 }
}}}
collect(original.layers);
resources.push({label:'Verwaltungsportal',url:'https://deutsche-online-schule.com/schooltools/verwaltung/',kind:'tools'});
let lid=1,oid=1;
const tileLayer=(name,data,properties=[])=>({id:lid++,name,type:'tilelayer',x:0,y:0,width:W,height:H,opacity:1,visible:true,data,...(properties.length?{properties}:{})});
const objectLayer=(name,objects)=>({id:lid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects});
const markers=points=>{const a=Array(W*H).fill(0);for(const [x,y]of points)a[y*W+x]=386;return a};
const area=(name,x,y,width,height,properties)=>({id:oid++,name,type:'area',x,y,width,height,rotation:0,visible:true,properties});
const layers=[
 tileLayer('start',markers([[11,13],[12,13],[11,14],[12,14]])),
 tileLayer('east',markers([[12,13]]),[prop('startLayer',true)]),
 tileLayer('west',markers([[11,13]]),[prop('startLayer',true)]),
 tileLayer('south',markers([[11,14],[12,14]]),[prop('startLayer',true)]),
 tileLayer('floor',Array.from({length:W*H},(_,i)=>i+1)),
 ...[-12,0,12].map((offsetx,n)=>{
  const data=Array(W*H).fill(0);
  data[4*W+7]=771+112+n;
  data[5*W+7]=771+134+n;
  return {...tileLayer('hearth-flames-'+(n+1),data),offsetx,offsety:8};
 }),
 tileLayer('collisions',Array.from({length:W*H},(_,i)=>blocked.has(i)?385:0)),
 tileLayer('exitSouth',markers([[11,15],[12,15]]),[prop('exitUrl','Schloss01.tmj')]),
 objectLayer('seating',seats.map(s=>area('seat-'+s.id,s.x-16,s.y-16,32,32,
  [prop('seatId',s.id),prop('seatLabel',s.label),prop('seatX',s.x),prop('seatY',s.y),prop('standX',s.standX),prop('standY',s.standY),prop('facing',s.facing),prop('audioGroup',s.audioGroup)]))),
 objectLayer('ambience',[
  area('kamin-prasseln',32,144,256,208,[prop('playAudio','village/fire.mp3'),prop('audioLoop',true),prop('audioVolume',0.12)]),
 ]),
 objectLayer('tools',[
  area('kollegiumstafel-links',624,160,48,144,[prop('openWebsite','assets/teacher-lounge-20261107/resources.html'),
   prop('openWebsiteAllowApi',true),prop('openWebsiteTrigger','onaction'),prop('openWebsiteTriggerMessage','Kollegiumswerkzeuge oeffnen'),prop('openWebsiteWidth',40)]),
 ]),
 objectLayer('floorLayer',[]),
 tileLayer('seatFronts',foreground),
];
const map={compressionlevel:-1,height:H,width:W,infinite:false,layers,nextlayerid:lid,nextobjectid:oid,orientation:'orthogonal',renderorder:'right-down',
 tiledversion:'1.11.2',tileheight:T,tilewidth:T,type:'map',version:'1.10',
 properties:[prop('mapName','Das magische Lehrerzimmer'),prop('mapDescription','Ein geschuetzter Ort fuer das Kollegium.'),
  prop('mapImage','assets/teacher-lounge-20261107/floor.png'),prop('script','assets/teacher-lounge-20261107/room.js?v=20261107-hall1'),
  prop('teacherLoungeHallUrl','https://together.deine-schule.com/~/castle-preview/grosse-halle.wam#vom-lehrerzimmer'),
  prop('teacherLoungeResources',JSON.stringify(resources)),prop('mapCopyright','Original artwork generated for deine Schule. Fictional wizard-school interior.')],
 tilesets:[{firstgid:1,name:'Zauberschul-Lehrerzimmer',columns:W,image:'assets/teacher-lounge-20261107/floor.png',imageheight:H*T,imagewidth:W*T,margin:0,spacing:0,tilecount:W*H,tileheight:T,tilewidth:T},
 {firstgid:385,name:'Collision marker',columns:1,image:'assets/teacher-lounge-20261107/marker.png',imageheight:T,imagewidth:T,margin:0,spacing:0,tilecount:1,tileheight:T,tilewidth:T,tiles:[{id:0,properties:[prop('collides',true)]}]},
 {firstgid:386,name:'Entry marker',columns:1,image:'assets/teacher-lounge-20261107/marker.png',imageheight:T,imagewidth:T,margin:0,spacing:0,tilecount:1,tileheight:T,tilewidth:T}],
};
map.tilesets.push({firstgid:387,name:'Chair and table fronts',columns:W,image:'assets/teacher-lounge-20261107/fronts.png',imageheight:H*T,imagewidth:W*T,margin:0,spacing:0,tilecount:W*H,tileheight:T,tilewidth:T});
const fire=JSON.parse(fs.readFileSync(path.join(root,'village/wa-headquarters.tmj'),'utf8')).tilesets.find(t=>t.name==='fire');
const fireAnimations=[];
for(const source of fire.tiles){
 for(let phase=0;phase<3;phase++){
  const shift=phase*2;
  const animation=source.animation.slice(shift).concat(source.animation.slice(0,shift));
  fireAnimations.push({id:source.id+phase,animation});
 }
}
map.tilesets.push({...fire,firstgid:771,image:'village/tilesets/fire.png',tiles:fireAnimations});
const frontShapes=[
 [[320,218],[606,218],[606,276],[320,276]],
 [[57,192],[70,194],[77,207],[111,210],[121,200],[127,206],[125,225],[106,235],[74,232],[66,218]],
 [[170,223],[181,224],[186,237],[218,240],[230,224],[237,228],[232,251],[219,267],[191,264],[177,250]],
 [[48,279],[60,280],[65,293],[90,296],[102,281],[112,284],[110,309],[94,322],[67,317],[54,300]],
 ...[360,430,500,566].map(x=>[[x-18,300],[x+18,300],[x+18,315],[x-18,315]]),
 [[663,442],[704,442],[706,450],[692,465],[669,463]],
];
function inside(x,y,polygon){
 let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
 }return hit;
}
async function main(){
 const input=path.join(dir,'source.png');const metadata=await sharp(input).metadata();
 if(metadata.width!==1536||metadata.height!==1024)throw Error('Unexpected artwork dimensions');
 await sharp(input).resize(W*T,H*T,{kernel:'nearest'}).png({compressionLevel:9}).toFile(path.join(dir,'floor.png'));
 // Reuse original furniture pixels as transparent foreground, not a second painted image.
 const {data,info}=await sharp(path.join(dir,'floor.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(!frontShapes.some(p=>inside(x+.5,y+.5,p)))data[(y*info.width+x)*4+3]=0;
 await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toFile(path.join(dir,'fronts.png'));
 await sharp({create:{width:T,height:T,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(path.join(dir,'marker.png'));
 fs.writeFileSync(path.join(root,'teachersmeetingground.tmj'),JSON.stringify(map,null,2)+'\n');
 console.log(JSON.stringify({map:'teachersmeetingground.tmj',width:W,height:H,seats:seats.length,resources:resources.length,
  floor_bytes:fs.statSync(path.join(dir,'floor.png')).size,original_sha256:crypto.createHash('sha256').update(fs.readFileSync(before)).digest('hex')}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
