const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('./castle-deps.cjs')('sharp');
const {geometry}=require('./build-library.cjs');
const {nativeTarget,writeWam}=require('./castle-wam.cjs');
const {createCanvas}=require('./castle-deps.cjs')('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),T=32,W=36,H=24,revision='20261108-outdoors3',artRevision='20261108-outdoors2';
const picnicStyle=Object.freeze({width:128,height:96,columns:[40,88],northY:18,southY:74,southStandY:120});
const P=(name,value)=>({name,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string',value});
const rect=(id,x,y,width,height,preserve=false)=>({id,x,y,width,height,preserve});
const gate=(id,x,y,width,height,target,entry)=>({id,x,y,width,height,target:target+'.tmj',entry});
const picnic=(id,label,x,y)=>({id,label,x,y});
const scenes=[
  {id:'umgebung',name:'Schlosshof',key:'Courtyard',actor:['noah','Noah',680,528],
    entries:{start:[17,11],schlosstor:[17,10],garten:[32,14],dorf:[3,14],dorfweg:[17,20]},
    portals:[gate('schloss',17,7,2,1,'grosse-halle','schlosstor'),gate('garten',35,14,1,2,'park','hof'),
      gate('dorf',0,14,1,2,'dorf','schloss'),gate('dorfweg',17,23,2,1,'dorf','schlossweg')],
    tables:[picnic('hofrunde','Hofrunde',144,288),picnic('rosenrunde','Rosentisch',160,544),picnic('gartenrunde','Gartentisch',800,544)],
    groups:[rect('hofrunde',96,256,288,192),rect('rosenrunde',96,512,320,208),rect('gartenrunde',736,512,320,208)],
    collisions:[rect('castle',0,0,1152,256),rect('fountain',768,320,144,112,true),rect('west-trees',0,256,64,160),rect('east-trees',1088,256,64,160)],
    activities:[['hofrunde','Hofgeschichten','story.html?v=20261108-outdoors1',true],['rosenrunde','Unsere Ausstellung','https://together.deine-schule.com/castle-content/collection.html?kind=museum'],['gartenrunde','Expeditionen','expeditions.html']],
  },
  {id:'dorf',name:'Sternendorf',key:'Village',actor:['val','Val',704,352],
    entries:{start:[17,19],schloss:[32,14],schlossweg:[17,20],park:[17,20]},
    portals:[gate('schloss',35,13,1,2,'umgebung','dorf'),gate('gartenpfad',17,23,2,1,'park','dorf')],
    tables:[picnic('marktrunde','Marktrunde',240,320),picnic('buchrunde','Buechertreff',224,544),picnic('musikbank','Musiktreff',800,544)],
    groups:[rect('marktrunde',192,288,288,192),rect('buchrunde',160,512,320,208),rect('musikbank',736,512,320,208)],
    collisions:[rect('shops',0,0,1152,208),rect('west-houses',0,192,144,448),rect('east-house',864,192,224,208),rect('river',1088,0,64,416),
      rect('river-south',1056,480,96,288),rect('fountain',544,304,112,112,true)],
    activities:[['marktrunde','Dorfgeschichten','story.html?v=20261108-outdoors1',true],['buchrunde','Unsere Ausstellung','https://together.deine-schule.com/castle-content/collection.html?kind=museum'],['musikbank','Band und Chor','https://together.deine-schule.com/castle-content/collection.html?kind=music']],
  },
  {id:'park',name:'Schlossgarten',key:'Park',actor:['rosa','Rosa',656,576],
    entries:{start:[17,19],hof:[3,14],dorf:[17,20]},
    portals:[gate('hof',0,14,1,2,'umgebung','garten'),gate('dorfpfad',17,23,2,1,'dorf','park')],
    tables:[picnic('picknick','Picknickrunde',176,544),picnic('blumenrunde','Blumengarten',800,544)],
    groups:[rect('picknick',112,512,320,208),rect('blumenrunde',736,512,320,208)],
    collisions:[rect('north',0,0,1152,96),rect('shed',504,96,144,96,true),rect('island',128,208,320,96,true),
      rect('north-fence',32,128,448,32),rect('south-fence',32,368,448,32),rect('arbor-tree',576,192,160,160),
      rect('tower-body',928,192,128,112),rect('pool',832,352,144,80,true),rect('slide-body',992,192,64,160,true)],
    activities:[['picknick','Gartengeschichten','story.html?v=20261108-outdoors1',true],['blumenrunde','Band und Chor','https://together.deine-schule.com/castle-content/collection.html?kind=music']],
    ride:{id:'wasserrutsche',x:992,y:144,width:48,height:32,waypoints:[{x:1012,y:160},{x:1012,y:208},{x:1010,y:272},{x:1000,y:312},{x:968,y:344},{x:928,y:360},{x:912,y:388},{x:896,y:448}]},
    kart:{parking:{x:488,y:256,width:96,height:96},bounds:{x:32,y:128,width:544,height:272}},
  },
];
async function buildOne(scene,picnicImage){
  const art=path.join(root,'castle/art',scene.id+'-20261108-full'),artPath='art/'+scene.id+'-20261108-full/',count=W*H;
  const seats=scene.tables.flatMap(b=>['n','s'].flatMap(side=>picnicStyle.columns.map((dx,i)=>({id:b.id+'-'+side+i,label:b.label+' '+(side==='n'?'Nord':'Sued')+' '+(i+1),
    x:b.x+dx,y:b.y+(side==='n'?picnicStyle.northY:picnicStyle.southY),standX:b.x+dx,standY:b.y+(side==='n'?-20:picnicStyle.southStandY),facing:side==='n'?'down':'up',audioGroup:b.id}))));
  const groups=scene.groups.map(g=>({...g,label:scene.tables.find(b=>b.id===g.id).label}));
  const [actorId,actorName,actorX,actorY]=scene.actor;
  const collisions=[rect('west',0,0,32,H*T),rect('east',W*T-32,0,32,H*T),rect('south',0,H*T-32,W*T,32),...scene.collisions,
    ...scene.tables.map(b=>rect(b.id+'-table',b.x+16,b.y+20,96,44,true)),rect('npc-'+actorId,actorX-16,actorY-16,32,32,true)];
  const layout={...scene,width:W,height:H,tileSize:T,avatarPixels:32,expectedSeats:seats.length,groups,exit:scene.portals[0],portals:scene.portals.slice(1)};
  const {blocked,reachable}=geometry(layout,seats,collisions);
  const overlays=scene.tables.map(b=>({input:picnicImage,left:b.x,top:b.y}));
  const floorFile='floor-'+artRevision+'.png';
  await sharp(path.join(art,'room-source.png')).resize(W*T,H*T,{fit:'fill',kernel:'lanczos3'}).png({compressionLevel:9}).toFile(path.join(art,'room.png'));
  await sharp(path.join(art,'room.png')).composite(overlays).png({compressionLevel:9}).toFile(path.join(art,floorFile));
  const {data,info}=await sharp(path.join(art,floorFile)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frontCells=new Set();let foregroundPixels=0;
  const furniturePixels=await sharp(picnicImage).ensureAlpha().raw().toBuffer();
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const furniture=scene.tables.some(b=>{
      const dx=x-b.x,dy=y-b.y;
      return dx>=0&&dx<picnicStyle.width&&dy>=0&&dy<picnicStyle.height&&((dy>=20&&dy<67)||dy>=77)&&furniturePixels[(dy*picnicStyle.width+dx)*4+3]>0;
    });
    const clear=seats.some(s=>x>=s.x-16&&x<s.x+16&&y>=s.y-22&&y<s.y+11);
    if(furniture&&!clear){frontCells.add(Math.floor(y/T)*W+Math.floor(x/T));foregroundPixels++}
    else data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
  }
  const frontFile='fronts-'+artRevision+'.png';
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toFile(path.join(art,frontFile));
  await sharp({create:{width:32,height:32,channels:4,background:'#00000000'}}).png().toFile(path.join(art,'marker.png'));
  const water=createCanvas(256,32),brush=water.getContext('2d');
  for(let frame=0;frame<8;frame++){
    brush.fillStyle='#d9fcffb0';
    for(let i=0;i<3;i++){
      const x=frame*32+9+(i*7+frame*2)%16,y=5+(i*9+frame*3)%23;
      brush.fillRect(x,y,3,1);brush.fillRect(x+1,y+1,1,1);
    }
  }
  await sharp(water.toBuffer('image/png')).png({compressionLevel:9}).toFile(path.join(art,'water.png'));
  const collisionGid=count+1,entryGid=count+2,frontGid=count+3,waterGid=count*2+3,kartGid=count*2+11;let lid=1,oid=1;
  const tile=(name,data,properties=[])=>({id:lid++,name,type:'tilelayer',x:0,y:0,width:W,height:H,opacity:1,visible:true,data,...(properties.length?{properties}:{})});
  const marker=points=>{const data=Array(count).fill(0);for(const [x,y]of points)data[y*W+x]=entryGid;return data};
  const area=(name,r,properties)=>({id:oid++,name,type:'area',x:r.x,y:r.y,width:r.width,height:r.height,rotation:0,visible:true,properties});
  const objects=(name,items)=>({id:lid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects:items});
  const layers=Object.entries(scene.entries).map(([name,p])=>tile(name,marker([p]),name==='start'?[]:[P('startLayer',true)]));
  const waterData=Array(count).fill(0),waterTile=scene.id==='umgebung'?[25,11]:scene.id==='dorf'?[19,11]:[28,12];
  waterData[waterTile[1]*W+waterTile[0]]=waterGid;
  layers.push(tile('room-art',Array.from({length:count},(_,i)=>i+1)),tile('water-ripples',waterData),tile('collisions',Array.from({length:count},(_,i)=>blocked.has(i)?collisionGid:0)));
  if(scene.kart){
    const image=await sharp(path.join(root,'village/go-cart-parked.png')).resize(56,44,{fit:'contain',kernel:'nearest'}).png().toBuffer();
    await sharp({create:{width:96,height:96,channels:4,background:'#00000000'}}).composite([{input:image,left:28,top:24}]).png().toFile(path.join(art,'kart.png'));
    const parked=Array(count).fill(0);for(let y=0;y<3;y++)for(let x=0;x<3;x++)parked[(8+y)*W+15+x]=kartGid+y*3+x;
    layers.push(tile('kart-parked',parked));
  }
  for(const p of scene.portals)layers.push(tile('door-'+p.id,marker(Array.from({length:p.width*p.height},(_,i)=>[p.x+i%p.width,p.y+Math.floor(i/p.width)])),[P('exitUrl',nativeTarget(p.target+'#'+p.entry))]));
  layers.push(objects('seating',seats.map(s=>area('seat-'+s.id,{x:s.x-16,y:s.y-16,width:32,height:32},
    ['id','label','x','y','standX','standY','facing','audioGroup'].map((key,i)=>P(['seatId','seatLabel','seatX','seatY','standX','standY','facing','audioGroup'][i],s[key]))))));
  layers.push(objects('conversationAreas',groups.map(g=>area('group-'+g.id,g,[P('conversationGroup',g.id),P('conversationLabel',g.label)]))));
  const activities=scene.activities.map(([group,label,url,api=false])=>({id:scene.id+'-'+group,group,label,url,api,area:groups.find(g=>g.id===group)}));
  activities.push({id:'npc-'+actorId,label:actorName+' ansprechen',url:'characters.html?npc='+actorId,api:false,area:{x:actorX-48,y:actorY+16,width:128,height:64}});
  layers.push(objects('activities',activities.map(a=>area('activity-'+a.id,a.area,[P('castleActivityId',a.id),P('castleActivityLabel',a.label),P('castleActivityUrl',a.url),P('castleActivityApi',a.api)]))));
  layers.push(objects('variables',[{id:oid++,name:'castleStory'+scene.key,type:'variable',x:0,y:0,width:0,height:0,rotation:0,visible:false,properties:[P('persist',false),P('default',false)]}]));
  layers.push(objects('castle-characters',[area('character-'+actorId,{x:actorX-48,y:actorY-48,width:96,height:64},[P('castleNpcId',actorId)])]));
  if(scene.ride)layers.push(objects('rides',[area(scene.ride.id,scene.ride,[P('castleRide',JSON.stringify(scene.ride.waypoints))])]));
  if(scene.kart)layers.push(objects('karts',[area('kart-parking',scene.kart.parking,[P('castleKartParking',true)]),area('kart-circuit',scene.kart.bounds,[P('castleKartBounds',true)])]));
  layers.push(objects('floorLayer',[]),tile('furniture-fronts',Array.from({length:count},(_,i)=>frontCells.has(i)?frontGid+i:0)));
  const imageSet=(firstgid,name,image,columns,tilecount,imagewidth,imageheight,extra={})=>({firstgid,name,image:artPath+image,columns,tilecount,imagewidth,imageheight,tilewidth:T,tileheight:T,margin:0,spacing:0,...extra});
  const mapdata={pixelWidth:W*T,pixelHeight:H*T,avatarSize:32,picnicWidthPixels:picnicStyle.width,seats:seats.length,groups:groups.length,
    blockedTiles:blocked.size,reachableFloorTiles:reachable.size,foregroundPixels,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(art,'room-source.png'))).digest('hex')};
  const back=scene.portals[0];
  const map={compressionlevel:-1,width:W,height:H,tilewidth:T,tileheight:T,infinite:false,orientation:'orthogonal',renderorder:'right-down',tiledversion:'1.11.2',type:'map',version:'1.10',nextlayerid:lid,nextobjectid:oid,layers,
    properties:[P('mapName',scene.name),P('mapDescription',scene.name+' mit kleinen Picknickrunden, begehbaren Wegen und Schlossbewohnern.'),P('mapImage',artPath+floorFile),P('script','outdoors.js?v='+revision+'&room='+scene.id),
      P('castleMapId',scene.id),P('castleRevision',revision),P('castleArtScale',1),P('castleNativeMeetings',true),P('castleNativeRoomUrl',nativeTarget(scene.id+'.tmj')),
      P('castleHallUrl',nativeTarget(back.target+'#'+back.entry)),P('castleReturnLabel',scene.id==='umgebung'?'Grosse Halle':'Schlosshof'),P('castleStoryVariable','castleStory'+scene.key),P('castleMapdata',JSON.stringify(mapdata)),
      P('mapCopyright','Original outdoor and picnic artwork generated for deine Schule; existing school go-cart artwork.')],
    tilesets:[imageSet(1,scene.name,floorFile,W,count,W*T,H*T),imageSet(collisionGid,'Collision marker','marker.png',1,1,T,T,{tiles:[{id:0,properties:[P('collides',true)]}]}),
      imageSet(entryGid,'Entry marker','marker.png',1,1,T,T),imageSet(frontGid,'Picknick-Vorderkanten',frontFile,W,count,W*T,H*T),
      imageSet(waterGid,'Wasserspiel','water.png',8,8,256,32,{tiles:[{id:0,animation:Array.from({length:8},(_,tileid)=>({tileid,duration:120}))}]}),
      ...(scene.kart?[imageSet(kartGid,'Geparktes Kart','kart.png',3,9,96,96)]:[])]};
  const world={id:scene.id,width:W,height:H,illustrated:true,artScale:1,rooms:groups.map(g=>({id:g.id,title:g.label,x:g.x,y:g.y,width:g.width,height:g.height,floor:scene.id})),
    seats,rides:scene.ride?[scene.ride]:[],entries:scene.entries,links:scene.portals.map(p=>({name:p.id,x:p.x*T,y:p.y*T,width:p.width*T,height:p.height*T,target:p.target,entry:p.entry})),mapdata};
  fs.writeFileSync(path.join(root,'castle',scene.id+'.tmj'),JSON.stringify(map)+'\n');writeWam(map,path.join(root,'castle'));
  fs.writeFileSync(path.join(art,'layout.json'),JSON.stringify({scene,seats,groups,collisionRects:collisions,mapdata},null,2)+'\n');
  fs.copyFileSync(path.join(art,floorFile),path.join(root,'castle/art',scene.id+'-overview.png'));
  return {map,world};
}
async function buildCastleOutdoors(){
  const furniture=path.join(root,'castle/art/outdoor-furniture-20261108');
  const image=await sharp(path.join(furniture,'picnic-source.png')).trim().resize(picnicStyle.width,picnicStyle.height,{fit:'contain',kernel:'lanczos3'}).png().toBuffer();
  fs.writeFileSync(path.join(furniture,'picnic.png'),image);
  const results=[];for(const scene of scenes)results.push(await buildOne(scene,image));return results;
}
module.exports={buildCastleOutdoors,scenes,revision,picnicStyle};
if(require.main===module)buildCastleOutdoors().then(results=>{
  if(process.argv.includes('--update-world')){
    const file=path.join(root,'castle/layout.json'),manifest=JSON.parse(fs.readFileSync(file));
    for(const {world}of results){const i=manifest.worlds.findIndex(w=>w.id===world.id);if(i<0)manifest.worlds.push(world);else manifest.worlds[i]=world}
    fs.writeFileSync(file,JSON.stringify(manifest)+'\n');require('./build-castle-ui.cjs').buildCastleUi();
  }
  console.log(JSON.stringify(results.map(r=>({id:r.world.id,...r.world.mapdata}))));
}).catch(e=>{console.error(e);process.exitCode=1});
