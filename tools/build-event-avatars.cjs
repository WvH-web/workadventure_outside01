const fs=require('node:fs'),path=require('node:path');
async function build(){
  const {characters}=await import('../castle/characters-data.js');
  const collection={name:'Eventgaeste',position:1,textures:characters.map((c,position)=>({id:'wvh-event-'+c.id+'-v1',name:c.name,
    url:new URL(c.sprite).pathname.slice(1),position}))};
  fs.writeFileSync(path.resolve(__dirname,'../castle/event-avatars.json'),JSON.stringify(collection,null,2)+'\n');
  return collection;
}
module.exports={build};
if(require.main===module)build().then(c=>console.log(JSON.stringify({collection:c.name,avatars:c.textures.length}))).catch(e=>{console.error(e.message);process.exitCode=1});
