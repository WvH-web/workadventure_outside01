const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('./castle-deps.cjs')('sharp');
const {nativeTarget,writeWam}=require('./castle-wam.cjs');
const root=path.resolve(__dirname,'..');
const P=(name,value)=>({name,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string',value});
const contains=(r,x,y)=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height;
function inside(x,y,p){
  let hit=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [a,b]=p[i],[c,d]=p[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
  }
  return hit;
}
function geometry(scene,seats,rects){
  const {width:W,height:H,tileSize:T,exit:e}=scene,blocked=new Set(),cell=(x,y)=>Math.floor(y/T)*W+Math.floor(x/T);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(rects.some(r=>contains(r,x*T+16,y*T+16)))blocked.add(y*W+x);
  const clear=(x,y)=>{
    if(x<8||y<8||x>=W*T-8||y>=H*T-8)throw Error('Library point outside room');
    for(const xx of [Math.floor((x-8)/T),Math.floor((x+8)/T)])for(const yy of [Math.floor((y-8)/T),Math.floor((y+8)/T)])blocked.delete(yy*W+xx);
  };
  const portal=new Set();
  for(const p of [e,...(scene.portals||[])])for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++){
    if(x<0||y<0||x>=W||y>=H)throw Error('Room portal outside map');
    portal.add(y*W+x);blocked.delete(y*W+x);
  }
  for(const s of seats){clear(s.x,s.y);clear(s.standX,s.standY)}
  for(const [x,y]of Object.values(scene.entries))clear(x*T+16,y*T+16);
  for(const r of rects.filter(r=>r.preserve))for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(contains(r,x*T+16,y*T+16)&&!blocked.has(y*W+x))throw Error('Library seat clears protected furniture: '+r.id);
  const start=scene.entries.start[1]*W+scene.entries.start[0],queue=[start],reachable=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%W,y=Math.floor(n/W);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*W+xx;
      if(xx<0||yy<0||xx>=W||yy>=H||blocked.has(next)||portal.has(next)||reachable.has(next))continue;
      reachable.add(next);queue.push(next);
    }
  }
  const expected=scene.expectedSeats??13;
  if(seats.length!==expected||new Set(seats.map(s=>s.id)).size!==expected)throw Error('Unexpected room seat count or duplicate seats');
  for(const s of seats){
    if(!reachable.has(cell(s.standX,s.standY))||blocked.has(cell(s.x,s.y)))throw Error('Unreachable library seat: '+s.id);
    const g=scene.groups.find(g=>g.id===s.audioGroup);
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])for(const dy of [0,16])
      if(!g||!contains(g,p.x,p.y+dy))throw Error('Library seat/foot outside reading group: '+s.id);
  }
  for(const [name,[x,y]]of Object.entries(scene.entries))if(!reachable.has(y*W+x)||portal.has(y*W+x))throw Error('Unsafe library entry: '+name);
  for(const p of [e,...(scene.portals||[])])if(!Array.from({length:p.width*p.height},(_,i)=>(p.y+Math.floor(i/p.width))*W+p.x+i%p.width)
    .some(n=>[n-W,n+W,n-1,n+1].some(k=>reachable.has(k))))throw Error('Room exit unreachable: '+(p.id||'south'));
  return {blocked,reachable};
}
async function buildFurnishedRoom(options={}){
  const id=options.id||'bibliothek',folder=options.folder||'bibliothek-20261108';
  const art=path.join(root,'castle/art',folder),artPath='art/'+folder+'/';
  const name=options.name||'Schlossbibliothek',description=options.description||'Gemuetliche Schlossbibliothek mit drei getrennten Lesegruppen, Fensternische und Kamin.';
  const scene=options.scene||JSON.parse(fs.readFileSync(path.join(art,'scene.json'))),{width:W,height:H,tileSize:T}=scene,count=W*H;
  if(W!==(options.width||28)||H!==(options.height||22)||T!==32||scene.avatarPixels!==32)throw Error('Approved room scale changed');
  const ref=JSON.parse(fs.readFileSync(path.resolve(art,scene.circle.reference))),c=scene.circle,dx=c.x-c.sourceX,dy=c.y-c.sourceY;
  const seats=ref.seats.filter(s=>s.audioGroup==='kaminrunde').map(s=>({...s,id:'lese-'+s.id,label:s.label.replace('Kamin','Lese'),
    x:s.x+dx,y:s.y+dy,standX:s.standX+dx,standY:s.standY+dy,audioGroup:'lesekamin'}));
  const b=scene.bookclub;
  for(const [side,y,standY,facing]of [['n',b.northY,b.northStandY,'down'],['s',b.southY,b.southStandY,'up']])
    for(const [i,x]of b.columns.entries())seats.push({id:'buchclub-'+side+i,label:(b.label||'Buchclub')+' '+side+(i+1),x:b.x+x,y:b.y+y,standX:b.x+x,standY:b.y+standY,facing,audioGroup:'buchclub'});
  for(const [i,x]of scene.window.columns.entries())seats.push({id:'fenster-'+i,label:(scene.window.label||'Fensterbank')+' '+(i+1),x,y:scene.window.y,standX:x,standY:scene.window.standY,facing:'down',audioGroup:'fensterleser'});
  const circleIds=['lounge-lamps','lounge-sofa','tea-table','lounge-chair-west','lounge-chair-east','lounge-chair-south'];
  const rects=[...scene.collisions,...ref.collisionRects.filter(r=>circleIds.includes(r.id)).map(r=>({...r,x:r.x+dx,y:r.y+dy}))];
  const {blocked,reachable}=geometry(scene,seats,rects);
  await sharp(path.join(art,'room-source.png')).resize(W*T,H*T,{fit:'fill',kernel:'lanczos3'}).png({compressionLevel:9}).toFile(path.join(art,'room.png'));
  await sharp(path.resolve(art,b.source||'bookclub-source.png')).trim().resize(b.width,b.height,{fit:'fill',kernel:'lanczos3'}).png({compressionLevel:9}).toFile(path.join(art,'bookclub.png'));
  const circle=path.resolve(art,c.source),circleMeta=await sharp(circle).metadata();
  if(circleMeta.width!==c.width||circleMeta.height!==c.height)throw Error('Approved reading furniture size changed');
  await sharp(path.join(art,'room.png')).composite([{input:circle,left:c.x,top:c.y},{input:path.join(art,'bookclub.png'),left:b.x,top:b.y},...(options.overlays||[])])
    .png({compressionLevel:9}).toFile(path.join(art,'floor.png'));
  const polygons=ref.frontPolygons.filter(p=>p.every(([x,y])=>x>=c.sourceX&&x<=c.sourceX+c.width&&y>=c.sourceY&&y<=c.sourceY+c.height))
    .map(p=>p.map(([x,y])=>[x+dx,y+dy]));
  polygons.push(...scene.bookclubFronts.map(p=>p.map(([x,y])=>[x+b.x,y+b.y])),scene.windowFront);
  const {data,info}=await sharp(path.join(art,'floor.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frontCells=new Set();let foregroundPixels=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const h=scene.headClearance,protectedAvatar=seats.some(s=>x>=s.x-h.x&&x<s.x+h.x&&y>=s.y-h.top&&y<s.y+(s.facing==='down'?h.facingDownBottom:h.bottom));
    if(!protectedAvatar&&polygons.some(p=>inside(x+.5,y+.5,p))){foregroundPixels++;frontCells.add(Math.floor(y/T)*W+Math.floor(x/T))}
    else data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
  }
  const frontFile=scene.frontFile||'fronts.png';
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toFile(path.join(art,frontFile));
  await sharp({create:{width:T,height:T,channels:4,background:'#00000000'}}).png().toFile(path.join(art,'marker.png'));
  const village=JSON.parse(fs.readFileSync(path.join(root,'village/wa-headquarters.tmj'))),fire=village.tilesets.find(t=>t.name==='fire');
  const animation=fire.tiles.find(t=>t.id===112).animation,frames=[],flames=[];
  for(const f of animation){
    const frame=await sharp(path.join(root,'village/tilesets/fire.png')).extract({left:f.tileid%fire.columns*32,top:Math.floor(f.tileid/fire.columns)*32,width:32,height:64}).png().toBuffer();
    flames.push(await sharp(frame).trim().resize(scene.hearth.width,scene.hearth.height,{fit:'fill',kernel:'nearest'}).png().toBuffer());
  }
  for(let i=0;i<animation.length;i++){
    frames.push({input:await sharp({create:{width:96,height:64,channels:4,background:'#00000000'}})
      .composite(scene.hearth.flames.map(f=>({input:flames[(i+f.phase)%flames.length],left:f.x,top:f.y}))).png().toBuffer(),left:i*96,top:0});
  }
  await sharp({create:{width:animation.length*96,height:64,channels:4,background:'#00000000'}}).composite(frames).png({compressionLevel:9}).toFile(path.join(art,'fire.png'));
  const collisionGid=count+1,entryGid=count+2,frontGid=count+3,fireGid=count*2+3;let lid=1,oid=1;
  const tile=(name,data,properties=[])=>({id:lid++,name,type:'tilelayer',x:0,y:0,width:W,height:H,opacity:1,visible:true,data,...(properties.length?{properties}:{})});
  const marker=points=>{const d=Array(count).fill(0);for(const [x,y]of points)d[y*W+x]=entryGid;return d};
  const area=(name,r,properties)=>({id:oid++,name,type:'area',x:r.x,y:r.y,width:r.width,height:r.height,rotation:0,visible:true,properties});
  const objects=(name,items)=>({id:lid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects:items});
  const layers=Object.entries(scene.entries).map(([name,p])=>tile(name,marker([p]),name==='start'?[]:[P('startLayer',true)]));
  const fireData=Array(count).fill(0);
  if(!scene.noHearth)for(let y=0;y<2;y++)for(let x=0;x<3;x++)fireData[(scene.hearth.tileY+y)*W+scene.hearth.tileX+x]=fireGid+y*animation.length*3+x;
  layers.push(tile('room-art',Array.from({length:count},(_,i)=>i+1)),...(!scene.noHearth?[tile('hearth-flames',fireData)]:[]),tile('collisions',Array.from({length:count},(_,i)=>blocked.has(i)?collisionGid:0)));
  const e=scene.exit;
  layers.push(tile('door-halle',marker(Array.from({length:e.width*e.height},(_,i)=>[e.x+i%e.width,e.y+Math.floor(i/e.width)])),[P('exitUrl',nativeTarget(e.target+'#'+e.entry))]));
  for(const p of scene.portals||[])layers.push(tile('door-'+p.id,marker(Array.from({length:p.width*p.height},(_,i)=>[p.x+i%p.width,p.y+Math.floor(i/p.width)])),[P('exitUrl',nativeTarget(p.target+(p.entry?'#'+p.entry:'')))]));
  layers.push(objects('seating',seats.map(s=>area('seat-'+s.id,{x:s.x-16,y:s.y-16,width:32,height:32},
    ['id','label','x','y','standX','standY','facing','audioGroup'].map((key,i)=>P(['seatId','seatLabel','seatX','seatY','standX','standY','facing','audioGroup'][i],s[key]))))));
  layers.push(objects('conversationAreas',scene.groups.map(g=>area('group-'+g.id,g,[P('conversationGroup',g.id),P('conversationLabel',g.label)]))));
  if(!scene.noHearth)layers.push(objects('ambience',[area('kamin-prasseln',scene.hearth.audio,[P('playAudio','../village/fire.mp3'),P('audioLoop',true),P('audioVolume',.06)])]));
  if(scene.activities)layers.push(objects('activities',scene.activities.map(a=>area('activity-'+a.id,scene.groups.find(g=>g.id===a.group),[
    P('castleActivityId',a.id),P('castleActivityLabel',a.label),P('castleActivityUrl',a.url),P('castleActivityApi',a.api)]))));
  if(scene.storyVariable)layers.push(objects('variables',[{id:oid++,name:scene.storyVariable,type:'variable',x:0,y:0,width:0,height:0,rotation:0,visible:false,properties:[P('persist',false),P('default',false)]}]));
  if(scene.displays?.length)layers.push(objects('exhibit-displays',scene.displays.map(d=>area('display-'+d.board,d,[P('castleDisplayBoard',d.board)]))));
  layers.push(objects('floorLayer',[]),tile('furniture-fronts',Array.from({length:count},(_,i)=>frontCells.has(i)?frontGid+i:0)));
  const imageSet=(firstgid,name,image,columns,tilecount,imagewidth,imageheight,extra={})=>({firstgid,name,image:artPath+image,columns,tilecount,imagewidth,imageheight,tilewidth:T,tileheight:T,margin:0,spacing:0,...extra});
  const mapdata={pixelWidth:W*T,pixelHeight:H*T,avatarSize:32,seats:seats.length,groups:scene.groups.length,sofaWidthPixels:100,bookclubChairWidthPixels:40,
    blockedTiles:blocked.size,reachableFloorTiles:reachable.size,foregroundPixels,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(art,'room-source.png'))).digest('hex')};
  const fireTiles=Array.from({length:6},(_,i)=>{const id=Math.floor(i/3)*animation.length*3+i%3;return {id,animation:animation.map((f,j)=>({tileid:id+j*3,duration:f.duration}))}});
  const map={compressionlevel:-1,width:W,height:H,tilewidth:T,tileheight:T,infinite:false,orientation:'orthogonal',renderorder:'right-down',tiledversion:'1.11.2',type:'map',version:'1.10',nextlayerid:lid,nextobjectid:oid,layers,
    properties:[P('mapName',name),P('mapDescription',description),P('mapImage',artPath+'floor.png'),P('script',(options.script||'room.js')+'?v='+scene.revision),
      P('castleMapId',id),P('castleRevision',scene.revision),P('castleArtScale',1),P('castleNativeMeetings',true),P('castleNativeRoomUrl',nativeTarget(id+'.tmj')),P('castleHallUrl',nativeTarget(e.target+'#'+e.entry)),
      ...(scene.storyVariable?[P('castleStoryVariable',scene.storyVariable)]:[]),
      P('castleMapdata',JSON.stringify(mapdata)),P('mapCopyright',options.copyright||'Original library and book-club artwork generated for deine Schule; approved Great Hall reading furniture; existing village fire animation.')],
    tilesets:[imageSet(1,'Schlossbibliothek','floor.png',W,count,W*T,H*T),imageSet(collisionGid,'Collision marker','marker.png',1,1,T,T,{tiles:[{id:0,properties:[P('collides',true)]}]}),
      imageSet(entryGid,'Entry marker','marker.png',1,1,T,T),imageSet(frontGid,'Moebel-Vorderkanten',frontFile,W,count,W*T,H*T),...(!scene.noHearth?[imageSet(fireGid,'Bibliothekskamin','fire.png',animation.length*3,animation.length*6,animation.length*96,64,{tiles:fireTiles})]:[])]};
  const world={id,width:W,height:H,illustrated:true,artScale:1,rooms:scene.groups.map(g=>({id:g.id,title:g.label,x:g.x,y:g.y,width:g.width,height:g.height,floor:id})),
    seats,rides:[],entries:scene.entries,links:[{name:'halle',x:e.x*T,y:e.y*T,width:e.width*T,height:e.height*T,target:e.target,entry:e.entry},...(scene.portals||[]).map(p=>({name:p.id,x:p.x*T,y:p.y*T,width:p.width*T,height:p.height*T,target:p.target,entry:p.entry||''}))],mapdata};
  fs.writeFileSync(path.join(root,'castle',id+'.tmj'),JSON.stringify(map)+'\n');writeWam(map,path.join(root,'castle'));
  fs.writeFileSync(path.join(art,'layout.json'),JSON.stringify({scene,seats,groups:scene.groups,collisionRects:rects,frontPolygons:polygons,mapdata},null,2)+'\n');
  const previewFire=await sharp(path.join(art,'fire.png')).extract({left:0,top:0,width:96,height:64}).png().toBuffer();
  await sharp(path.join(art,'floor.png')).composite(scene.noHearth?[]:[{input:previewFire,left:scene.hearth.tileX*T,top:scene.hearth.tileY*T}]).png().toFile(path.join(root,'castle/art',id+'-overview.png'));
  return {map,world};
}
const buildLibrary=()=>buildFurnishedRoom();
module.exports={buildLibrary,buildFurnishedRoom};
if(require.main===module)buildLibrary().then(({world})=>{
  if(process.argv.includes('--update-world')){
    const file=path.join(root,'castle/layout.json'),m=JSON.parse(fs.readFileSync(file)),i=m.worlds.findIndex(w=>w.id===world.id);
    if(i<0)m.worlds.push(world);else m.worlds[i]=world;fs.writeFileSync(file,JSON.stringify(m)+'\n');
  }
  console.log(JSON.stringify(world.mapdata,null,2));
}).catch(e=>{console.error(e);process.exitCode=1});
