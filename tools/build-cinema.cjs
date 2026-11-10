const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('./castle-deps.cjs')('sharp');
const { nativeTarget, writeWam } = require('./castle-wam.cjs');
const {createCanvas,loadImage}=require('./castle-deps.cjs')('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
const art = path.join(root, 'castle/art/kino-20261108');
const artPath = 'art/kino-20261108/';
const P = (name, value) => ({name, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'float' : 'string', value});
const contains = (r, x, y) => x >= r.x && y >= r.y && x < r.x+r.width && y < r.y+r.height;
function geometry(scene, seats, groups, collisionRects) {
  const {width:W,height:H,tileSize:T,entries,exit}=scene;
  const blocked=new Set(),cell=(x,y)=>Math.floor(y/T)*W+Math.floor(x/T);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(collisionRects.some(r=>contains(r,x*T+16,y*T+16)))blocked.add(y*W+x);
  const clear=(x,y)=>{
    if(x<8||y<8||x>=W*T-8||y>=H*T-8)throw Error('Cinema point outside room');
    for(const xx of [Math.floor((x-8)/T),Math.floor((x+8)/T)])
      for(const yy of [Math.floor((y-8)/T),Math.floor((y+8)/T)])blocked.delete(yy*W+xx);
  };
  const portals=new Set();
  for(let y=exit.y;y<exit.y+exit.height;y++)for(let x=exit.x;x<exit.x+exit.width;x++){
    portals.add(y*W+x);blocked.delete(y*W+x);
  }
  for(const s of seats){clear(s.x,s.y);clear(s.standX,s.standY);}
  for(const [x,y]of Object.values(entries))clear(x*T+16,y*T+16);
  for(const r of collisionRects)for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(contains(r,x*T+16,y*T+16)&&!blocked.has(y*W+x))throw Error('Cinema seating clears solid furniture: '+r.id);
  const start=entries.start[1]*W+entries.start[0],queue=[start],reachable=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%W,y=Math.floor(n/W);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const next=yy*W+xx;
      if(xx<0||yy<0||xx>=W||yy>=H||blocked.has(next)||portals.has(next)||reachable.has(next))continue;
      reachable.add(next);queue.push(next);
    }
  }
  if(seats.length!==64||new Set(seats.map(s=>s.id)).size!==64)throw Error('Cinema must have 48 quiet seats and 16 conversation seats');
  for(const s of seats){
    if(!reachable.has(cell(s.standX,s.standY))||blocked.has(cell(s.x,s.y)))throw Error('Unreachable cinema seat: '+s.id);
    const area=s.audioGroup?groups.find(g=>g.id===s.audioGroup):scene.audience.quiet;
    // Native area membership follows the avatar foot, 16px below the script position.
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])
      if(!area||!contains(area,p.x,p.y)||!contains(area,p.x,p.y+16))throw Error('Cinema seat leaves its native audio area: '+s.id);
    for(const p of [{x:s.x,y:s.y},{x:s.standX,y:s.standY}])
      if(!contains(scene.film,p.x,p.y+16))throw Error('Seat leaves shared film area: '+s.id);
  }
  for(const [name,[x,y]]of Object.entries(entries))
    if(!reachable.has(y*W+x)||portals.has(cell(x*T+16,y*T+32)))throw Error('Unsafe cinema arrival: '+name);
  if(![...portals].some(n=>reachable.has(n-W)))throw Error('Cinema exit cannot be reached');
  return {blocked,reachable};
}
async function buildCandles(scene) {
  const village=JSON.parse(fs.readFileSync(path.join(root,'village/wa-headquarters.tmj')));
  const fire=village.tilesets.find(t=>t.name==='fire');
  const animation=fire.tiles.find(t=>t.id===112).animation;
  const frames=[];
  for(let i=0;i<animation.length;i++){
    const id=animation[i].tileid;
    const flame=await sharp(path.join(root,'village/tilesets/fire.png'))
      .extract({left:id%fire.columns*32,top:Math.floor(id/fire.columns)*32,width:32,height:64})
      .resize(6,12,{kernel:'nearest'}).png().toBuffer();
    const input=await sharp({create:{width:32,height:32,channels:4,background:'#00000000'}})
      .composite([{input:flame,left:7,top:18},{input:flame,left:17,top:10},{input:flame,left:26,top:18}]).png().toBuffer();
    frames.push({input,left:i*32,top:0});
  }
  await sharp({create:{width:animation.length*32,height:32,channels:4,background:'#00000000'}})
    .composite(frames).png({compressionLevel:9}).toFile(path.join(art,'candles.png'));
  return {count:animation.length,tiles:scene.candles.map(c=>({id:c.phase,
    animation:animation.map((f,i)=>({tileid:(i+c.phase)%animation.length,duration:f.duration}))}))};
}
async function buildSigns(scene){
  const signs=[];
  for(const sign of scene.signs){
    const base=await sharp(path.join(art,'sign-source.png')).trim()
      .resize(112,80,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
    const c=createCanvas(sign.width*4,sign.height*4),ctx=c.getContext('2d');
    ctx.scale(4*sign.width/112,4*sign.height/80);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(await loadImage(base),0,0,112,80);
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#e9c47a';ctx.font='bold 8px Georgia';ctx.fillText(sign.heading,51,22);
    ctx.fillStyle=sign.color;
    for(const [i,line]of sign.lines.entries()){
      const size=sign.lines.length===1?12:11;
      ctx.font=`bold ${size}px Georgia`;
      if(ctx.measureText(line).width>76)throw Error('Cinema sign text does not fit: '+sign.id);
      ctx.fillText(line,51,sign.lines.length===1?38:34+i*12);
    }
    const tip=sign.direction==='up'?31:47,tail=sign.direction==='up'?47:31;
    const head=sign.direction==='up'?35:43;
    ctx.strokeStyle='#e9c47a';ctx.lineWidth=1.4;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(93,tail);ctx.lineTo(93,tip);
    ctx.moveTo(89,head);ctx.lineTo(93,tip);ctx.lineTo(97,head);ctx.stroke();
    const image=await sharp(c.toBuffer('image/png')).resize(sign.width,sign.height,{kernel:'lanczos3'}).png().toBuffer();
    fs.writeFileSync(path.join(art,'sign-'+sign.id+'.png'),image);
    signs.push({...sign,image,alpha:await sharp(image).ensureAlpha().raw().toBuffer()});
  }
  return signs;
}
async function buildCinema() {
  const scene=JSON.parse(fs.readFileSync(path.join(art,'scene.json')));
  const {width:W,height:H,tileSize:T}=scene,count=W*H;
  if(W!==30||H!==28||T!==32||scene.avatarPixels!==32)throw Error('Approved cinema scale changed');
  const composites=[],seats=[],groups=[],frontShapes=[];
  const chair=await sharp(path.join(art,'chair-source.png')).trim()
    .resize(scene.chair.width,scene.chair.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
  fs.writeFileSync(path.join(art,'chair.png'),chair);
  const chairRaw=await sharp(chair).ensureAlpha().raw().toBuffer();
  for(const [row,y]of scene.audience.rows.entries())for(const [col,x]of scene.audience.columns.entries()){
    const seat={id:`kino-${row}-${col}`,label:`Kinosessel ${row+1}-${col+1}`,x,y,standX:x,
      standY:y+scene.audience.standOffsetY,facing:'up',audioGroup:''};
    seats.push(seat);
    const rect={x:x-scene.chair.width/2,y:y+scene.chair.topOffset,width:scene.chair.width,height:scene.chair.height};
    composites.push({input:chair,left:rect.x,top:rect.y});
    frontShapes.push({...rect,alpha:chairRaw});
  }
  const ref=JSON.parse(fs.readFileSync(path.resolve(art,scene.approvedReference)));
  const source=scene.lounges,loungeFile=path.resolve(art,source.source);
  const lounge=await sharp(loungeFile).resize(source.width,source.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
  fs.writeFileSync(path.join(art,'lounge.png'),lounge);
  const loungeRaw=await sharp(lounge).ensureAlpha().raw().toBuffer();
  const collisionRects=scene.walls.map(r=>({...r}));
  for(const [i,x]of source.columns.entries()){
    const dx=x-source.sourceX,dy=source.y-source.sourceY,id='kino-lounge-'+i;
    groups.push({id,label:'Gespraechstisch '+(i+1),x:x-16,y:source.groupY,width:source.groupWidth,height:source.groupHeight});
    composites.push({input:lounge,left:x,top:source.y});
    for(const s of ref.seats.filter(s=>s.id.startsWith('spiel-'))){
      const side=s.id.slice(6),shift=source.seatShiftX[side];
      seats.push({...s,id:id+'-'+side,label:'Kino-Tisch '+(i+1)+' '+s.label.replace('Spieltisch ',''),
        x:s.x+dx+shift,y:s.y+dy,standX:s.standX+dx+shift,standY:s.standY+dy,audioGroup:id});
    }
    frontShapes.push({x,y:source.y,width:source.width,height:source.height,alpha:loungeRaw});
    const r=ref.collisionRects.find(r=>r.id==='game-table');
    collisionRects.push({...r,id:id+'-table',x:r.x+dx,y:r.y+dy});
  }
  for(const sign of await buildSigns(scene)){
    composites.push({input:sign.image,left:sign.x,top:sign.y});
    frontShapes.push({x:sign.x,y:sign.y,width:sign.width,height:sign.height,alpha:sign.alpha});
    collisionRects.push(sign.base);
  }
  const {blocked,reachable}=geometry(scene,seats,groups,collisionRects);
  const floorFile=scene.render.floor;
  await sharp(path.join(art,'room-source.png')).resize(W*T,H*T,{fit:'fill',kernel:'lanczos3'})
    .composite(composites).png({compressionLevel:9}).toFile(path.join(art,floorFile));
  const {data,info}=await sharp(path.join(art,floorFile)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const frontCells=new Set();let foregroundPixels=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const h=scene.headClearance;
    const protectedAvatar=seats.some(s=>x>=s.x-h.x&&x<s.x+h.x&&y>=s.y-h.top&&
      y<s.y+(s.facing==='down'?h.facingDownBottom:h.bottom));
    const keep=!protectedAvatar&&frontShapes.some(s=>contains(s,x,y)&&s.alpha[((y-s.y)*s.width+x-s.x)*4+3]>127);
    if(keep){foregroundPixels++;frontCells.add(Math.floor(y/T)*W+Math.floor(x/T));}
    else data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
  }
  const frontFile=scene.render.fronts;
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toFile(path.join(art,frontFile));
  await sharp({create:{width:T,height:T,channels:4,background:'#00000000'}}).png().toFile(path.join(art,'marker.png'));
  const candles=await buildCandles(scene);
  const collisionGid=count+1,entryGid=count+2,frontGid=count+3,candleGid=count*2+3;
  let lid=1,oid=1;
  const tile=(name,data,properties=[])=>({id:lid++,name,type:'tilelayer',x:0,y:0,width:W,height:H,opacity:1,visible:true,data,...(properties.length?{properties}:{})});
  const marker=(points)=>{const data=Array(count).fill(0);for(const [x,y]of points)data[y*W+x]=entryGid;return data;};
  const area=(name,r,properties)=>({id:oid++,name,type:'area',x:r.x,y:r.y,width:r.width,height:r.height,rotation:0,visible:true,properties});
  const objects=(name,items)=>({id:lid++,name,type:'objectgroup',draworder:'topdown',x:0,y:0,opacity:1,visible:true,objects:items});
  const layers=Object.entries(scene.entries).map(([name,p])=>tile(name,marker([p]),name==='start'?[]:[P('startLayer',true)]));
  layers.push(tile('room-art',Array.from({length:count},(_,i)=>i+1)),tile('collisions',Array.from({length:count},(_,i)=>blocked.has(i)?collisionGid:0)));
  for(const [i,c]of scene.candles.entries()){
    const data=Array(count).fill(0);data[c.y*W+c.x]=candleGid+c.phase;
    layers.push(tile('candlelight-'+i,data));
  }
  const e=scene.exit;
  layers.push(tile('door-foyer',marker(Array.from({length:e.width*e.height},(_,i)=>[e.x+i%e.width,e.y+Math.floor(i/e.width)])),
    [P('exitUrl',nativeTarget(e.target+'#'+e.entry))]));
  layers.push(objects('seating',seats.map(s=>area('seat-'+s.id,{x:s.x-16,y:s.y-16,width:32,height:32},
    ['id','label','x','y','standX','standY','facing','audioGroup'].map((key,i)=>P(['seatId','seatLabel','seatX','seatY','standX','standY','facing','audioGroup'][i],s[key]))))));
  layers.push(objects('conversationAreas',groups.map(g=>area('group-'+g.id,g,[P('conversationGroup',g.id),P('conversationLabel',g.label)]))));
  layers.push(objects('cinema',[
    area('kino-film',scene.film,[P('castleCinemaUrl',scene.film.url),P('castleCinemaWidth',scene.film.panelWidth),
      P('castleCinemaPolicy','fullscreen; autoplay; encrypted-media; picture-in-picture')]),
    area('kino-ruhezone',scene.audience.quiet,[P('silent',true)])
  ]));
  layers.push(objects('wayfinding',scene.signs.map(s=>area('sign-'+s.id,s,[P('cinemaSignFor',s.id),
    P('cinemaSignText',s.heading+': '+s.lines.join(' ')),P('cinemaSignDirection',s.direction)]))));
  layers.push(objects('floorLayer',[]),tile('furniture-fronts',Array.from({length:count},(_,i)=>frontCells.has(i)?frontGid+i:0)));
  const imageSet=(firstgid,name,image,columns,tilecount,imagewidth,imageheight,extra={})=>({firstgid,name,
    image:artPath+image,columns,tilecount,imagewidth,imageheight,tilewidth:T,tileheight:T,margin:0,spacing:0,...extra});
  const mapdata={pixelWidth:W*T,pixelHeight:H*T,avatarSize:32,seats:seats.length,quietSeats:48,conversationSeats:16,
    chairWidth:scene.chair.width,chairHeight:scene.chair.height,blockedTiles:blocked.size,reachableFloorTiles:reachable.size,foregroundPixels,
    sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(art,'room-source.png'))).digest('hex')};
  const map={compressionlevel:-1,width:W,height:H,tilewidth:T,tileheight:T,infinite:false,orientation:'orthogonal',renderorder:'right-down',tiledversion:'1.11.2',type:'map',version:'1.10',nextlayerid:lid,nextobjectid:oid,layers,
    properties:[P('mapName','Schlosskino'),P('mapDescription','Ein kleines Schlosskino mit ruhigen Filmsesseln und vier gemuetlichen Gespraechstischen.'),
      P('mapImage',artPath+floorFile),P('script','cinema.js?v='+scene.revision),P('castleMapId','kino'),P('castleRevision',scene.revision),
      P('castleArtScale',1),P('castleNativeMeetings',true),P('castleNativeRoomUrl',nativeTarget('kino.tmj')),P('castleHallUrl',nativeTarget('grosse-halle.tmj#kino')),
      P('castleMapdata',JSON.stringify(mapdata)),P('mapCopyright','Original room and cinema chair generated for deine Schule. Furniture at the approved Great Hall avatar scale; existing village flame animation.')],
    tilesets:[imageSet(1,'Schlosskino',floorFile,W,count,W*T,H*T),imageSet(collisionGid,'Collision marker','marker.png',1,1,T,T,{tiles:[{id:0,properties:[P('collides',true)]}]}),
      imageSet(entryGid,'Entry marker','marker.png',1,1,T,T),imageSet(frontGid,'Moebel-Vorderkanten',frontFile,W,count,W*T,H*T),
      imageSet(candleGid,'Kino-Kerzen','candles.png',candles.count,candles.count,candles.count*T,T,{tiles:candles.tiles})]};
  const world={id:'kino',width:W,height:H,illustrated:true,artScale:1,rooms:[
    {id:'kinosaal',title:'Stiller Kinosaal',...scene.audience.quiet,floor:'kino'},
    ...groups.map(g=>({id:g.id,title:g.label,x:g.x,y:g.y,width:g.width,height:g.height,floor:'kino'})),
    {id:'foyer',title:'Kinofoyer',x:432,y:656,width:96,height:208,floor:'kino'}],
    seats,rides:[],entries:scene.entries,links:[{name:'foyer',x:e.x*T,y:e.y*T,width:e.width*T,height:e.height*T,target:e.target,entry:e.entry}],mapdata};
  require('./castle-runtime.cjs').applyRuntime(map);
  fs.writeFileSync(path.join(root,'castle/kino.tmj'),JSON.stringify(map)+'\n');
  writeWam(map,path.join(root,'castle'));
  fs.writeFileSync(path.join(art,'layout.json'),JSON.stringify({scene,seats,groups,collisionRects,mapdata},null,2)+'\n');
  await sharp(path.join(art,floorFile)).png().toFile(path.join(root,'castle/art/kino-overview.png'));
  return {map,world};
}
module.exports={buildCinema};
if(require.main===module)buildCinema().then(({world})=>{
  if(process.argv.includes('--update-world')){
    const file=path.join(root,'castle/layout.json'),manifest=JSON.parse(fs.readFileSync(file));
    const i=manifest.worlds.findIndex(w=>w.id===world.id);
    if(i<0)manifest.worlds.push(world);else manifest.worlds[i]=world;
    fs.writeFileSync(file,JSON.stringify(manifest)+'\n');
  }
  console.log(JSON.stringify({map:world.id,...world.mapdata},null,2));
}).catch(e=>{console.error(e);process.exitCode=1});
