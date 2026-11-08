const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('./castle-deps.cjs')('@napi-rs/canvas');
async function build(){
  const {characters}=await import('../castle/characters-data.js');
  const collection={name:'Eventgaeste',position:1,textures:characters.map((c,position)=>({id:'wvh-event-'+c.id+'-v1',name:c.name,
    url:new URL(c.sprite).pathname.slice(1),position}))};
  fs.writeFileSync(path.resolve(__dirname,'../castle/event-avatars.json'),JSON.stringify(collection,null,2)+'\n');
  const art=path.resolve(__dirname,'../castle/art/characters-20261108');fs.mkdirSync(art,{recursive:true});
  const labels=createCanvas(96,characters.length*32),g=labels.getContext('2d');g.font='10px Arial';g.textAlign='center';g.textBaseline='bottom';
  for(const [i,c]of characters.entries()){
    g.lineWidth=2;g.strokeStyle='#182624';g.strokeText('Figur '+c.name,48,i*32+28);g.fillStyle='#ffffff';g.fillText('Figur '+c.name,48,i*32+28);
    fs.writeFileSync(path.join(art,c.id+'.json'),JSON.stringify({columns:3,image:c.sprite,imageheight:128,imagewidth:96,margin:0,
      name:'castle-character-'+c.id,spacing:0,tilecount:12,tileheight:32,tilewidth:32,type:'tileset',version:'1.10'})+'\n');
  }
  fs.writeFileSync(path.join(art,'labels.png'),labels.toBuffer('image/png'));
  fs.writeFileSync(path.join(art,'labels.json'),JSON.stringify({columns:3,image:'labels.png',imageheight:characters.length*32,imagewidth:96,margin:0,
    name:'castle-character-labels',spacing:0,tilecount:characters.length*3,tileheight:32,tilewidth:32,type:'tileset',version:'1.10'})+'\n');
  return collection;
}
module.exports={build};
if(require.main===module)build().then(c=>console.log(JSON.stringify({collection:c.name,avatars:c.textures.length}))).catch(e=>{console.error(e.message);process.exitCode=1});
