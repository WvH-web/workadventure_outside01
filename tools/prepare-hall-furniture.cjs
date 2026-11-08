const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('./castle-deps.cjs')('sharp');
const root=path.resolve(__dirname,'..');
const oldArt=path.join(root,'castle/art/grosse-halle-20261107');
const art=path.join(root,'castle/art/grosse-halle-20261108-scale');
function inside(x,y,polygon){
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
  }
  return hit;
}
async function prepareHallFurniture(){
  const original=JSON.parse(fs.readFileSync(path.join(oldArt,'layout.json')));
  const config=JSON.parse(fs.readFileSync(path.join(art,'furniture.json')));
  const layout=structuredClone(original),scale=config.scale;
  const library=layout.portals.find(p=>p.id==='bibliothek');
  library.target='bibliothek.tmj';library.entry='halle';
  const oldSource=path.join(oldArt,original.render.source);
  const composites=[];
  for(const r of config.preserved)composites.push({input:await sharp(oldSource).extract({left:r.x,top:r.y,width:r.width,height:r.height}).png().toBuffer(),left:r.x,top:r.y});
  for(const door of config.addedDoors||[])composites.push({input:await sharp(oldSource).extract(door.crop).png().toBuffer(),left:door.target.x,top:door.target.y});
  layout.seats=[];layout.groups=[];layout.frontPolygons=[];
  const movedIds=new Set(config.clusters.flatMap(c=>c.collisionIds));
  layout.collisionRects=original.collisionRects.filter(r=>!movedIds.has(r.id));
  for(const door of config.addedDoors||[]){
    layout.portals.push(door.portal);layout.entries[door.id]=door.entry;layout.collisionRects.push(...door.posts);
  }
  for(const cluster of config.clusters){
    const src=cluster.source,target=cluster.target;
    const point=(x,y)=>[Math.round(target.x+(x-src.x)*scale),Math.round(target.y+(y-src.y)*scale)];
    const {data,info}=await sharp(oldSource).extract({left:src.x,top:src.y,width:src.width,height:src.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)
      if(!cluster.masks.some(p=>inside(x+src.x+0.5,y+src.y+0.5,p)))data.fill(0,(y*info.width+x)*4,(y*info.width+x)*4+4);
    const image=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
      .resize(Math.round(src.width*scale),Math.round(src.height*scale),{kernel:'lanczos3'}).png().toBuffer();
    fs.writeFileSync(path.join(art,cluster.id+'.png'),image);
    composites.push({input:image,left:target.x,top:target.y});
    for(const oldSeat of original.seats.filter(s=>s.id.startsWith(cluster.seatPrefix))){
      const [x,y]=point(oldSeat.x,oldSeat.y),[standX,standY]=point(oldSeat.standX,oldSeat.standY);
      // Keep the same foot position while the avatar remains a full native 32px tall.
      const footAdjustment=Math.round(16*(1-scale));
      const tableRaise=oldSeat.facing==='down'&&cluster.id.startsWith('tafel-')?4:0;
      const sofa=oldSeat.id.startsWith('kamin-sofa-');
      layout.seats.push({...oldSeat,x,y:y-footAdjustment-tableRaise,
        standX:sofa?x:standX,standY:sofa?target.y:standY});
    }
    layout.groups.push(cluster.group);
    for(const r of original.collisionRects.filter(r=>cluster.collisionIds.includes(r.id))){
      const [x,y]=point(r.x,r.y);
      layout.collisionRects.push({...r,x,y,width:Math.round(r.width*scale),height:Math.round(r.height*scale),preserve:false});
    }
    for(const polygon of original.frontPolygons){
      if(polygon.every(([x,y])=>x>=src.x&&x<=src.x+src.width&&y>=src.y&&y<=src.y+src.height))
        layout.frontPolygons.push(polygon.map(([x,y])=>point(x,y)));
    }
  }
  const big=config.communal;
  const table=await sharp(path.join(art,'table-source.png')).trim()
    .resize(big.image.width,big.image.height,{fit:'contain',background:'#00000000',kernel:'lanczos3'}).png().toBuffer();
  fs.writeFileSync(path.join(art,'gemeinschaftstafel.png'),table);
  composites.push({input:table,left:big.image.x,top:big.image.y});
  layout.groups.push(big.group);layout.collisionRects.push(big.collision);
  layout.frontPolygons.push(...big.frontPolygons);
  for(const [side,row]of [['n',big.north],['s',big.south]])for(const [index,x]of big.columns.entries()){
    layout.seats.push({id:'gemeinschaft-'+side+(index+1),label:'Gemeinschaftstafel '+(side==='n'?index+1:index+7),
      x,y:row.y,standX:x,standY:row.standY,facing:row.facing,audioGroup:big.group.id});
  }
  layout.games={...config.clusters.find(c=>c.id==='spieltreff').group};
  layout.render={source:'source-gs1.png',floor:'floor-gs1.png',fronts:'fronts.png',fire:'fire.png',portrait:'portrait.png'};
  layout.measurements={...original.measurements,sourcePrompt:'floor-prompt.txt',expectedSeats:42,furnitureScale:scale,
    avatarPixels:32,sofaWidthPixels:100,chairPitchPixels:40,communalSeats:12,
    longTableChairHeightPixels:[28,36],armchairHeightPixels:[39,50],staffBenchSeatSpacingPixels:24,
    headClearance:{x:10,top:22,bottom:3},
    originalLayout:'../grosse-halle-20261107/layout.json',tablePrompt:'table-prompt.txt'};
  await sharp(path.join(art,'floor-source.png')).composite(composites).png({compressionLevel:9}).toFile(path.join(art,layout.render.source));
  layout.measurements.sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(art,layout.render.source))).digest('hex');
  fs.writeFileSync(path.join(art,'layout.json'),JSON.stringify(layout,null,2)+'\n');
  return layout;
}
module.exports={prepareHallFurniture};
if(require.main===module)prepareHallFurniture().then(l=>console.log(JSON.stringify({seats:l.seats.length,groups:l.groups.length,scale:l.measurements.furnitureScale}))).catch(e=>{console.error(e);process.exitCode=1});
