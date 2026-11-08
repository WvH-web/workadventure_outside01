const fs=require('node:fs'),path=require('node:path');
const {buildFurnishedRoom}=require('./build-library.cjs');
const buildPrimaryCommonRoom=()=>buildFurnishedRoom({id:'grundschule',folder:'grundschule-20261108',height:20,name:'Grundschulstube',
  description:'Kleine gemuetliche Schlossstube mit Vorleserunde, gemeinsamem Erzaehlspiel, Bausteinraetseln und Musikwerkstatt.',script:'activities.js',
  copyright:'Original primary-school room and building-table artwork generated for deine Schule; approved Great Hall seating; existing village fire animation.'});
module.exports={buildPrimaryCommonRoom};
if(require.main===module)buildPrimaryCommonRoom().then(({world})=>{
  if(process.argv.includes('--update-world')){
    const file=path.resolve(__dirname,'../castle/layout.json'),m=JSON.parse(fs.readFileSync(file)),i=m.worlds.findIndex(w=>w.id===world.id);
    if(i<0)m.worlds.push(world);else m.worlds[i]=world;fs.writeFileSync(file,JSON.stringify(m)+'\n');
  }
  console.log(JSON.stringify(world.mapdata,null,2));
}).catch(e=>{console.error(e);process.exitCode=1});
