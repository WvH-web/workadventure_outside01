const fs=require('node:fs'),path=require('node:path');
const sharp=require('./castle-deps.cjs')('sharp');
const dir=path.resolve(__dirname,'../castle/art/story-cards-20261108');
(async()=>{
  const atlas=await sharp(path.join(dir,'atlas-source.png')).resize(1200,1200,{fit:'fill'}).png().toBuffer();
  for(let i=0;i<9;i++)await sharp(atlas).extract({left:i%3*400,top:Math.floor(i/3)*400,width:400,height:400})
    .resize(320,320).webp({quality:90}).toFile(path.join(dir,'card-'+i+'.webp'));
  console.log('Nine story pictures prepared; original atlas preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
