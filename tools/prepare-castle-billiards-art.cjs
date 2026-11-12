'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('./castle-local-storage.cjs').configure();const sharp=require('./castle-deps.cjs')('sharp');
async function main(){
 const input=process.argv[2];if(!input||!path.isAbsolute(input)||fs.lstatSync(input).isSymbolicLink())throw Error('Selected generated furniture image required');
 const folder=path.resolve(__dirname,'../castle/art/billard-20261112');fs.mkdirSync(folder,{recursive:true});
 const source=path.join(folder,'furniture-source.png'),bytes=fs.readFileSync(input),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
 if(fs.existsSync(source)&&sha(fs.readFileSync(source))!==sha(bytes))throw Error('Do not replace the selected source image');
 fs.writeFileSync(source,bytes);const original=await sharp(bytes).metadata();if(!original.hasAlpha)throw Error('Transparent source required');
 const sprite=await sharp(bytes).trim().resize({width:256,kernel:'lanczos3'}).png({compressionLevel:9}).toBuffer(),metadata=await sharp(sprite).metadata();
 if(metadata.width!==256||metadata.height<64||metadata.height>128||!metadata.hasAlpha)throw Error('Furniture does not fit the approved avatar scale');
 const alpha=(await sharp(sprite).stats()).channels[3];if(alpha.min!==0||alpha.max!==255)throw Error('Furniture transparency is not preserved');
 fs.writeFileSync(path.join(folder,'furniture.png'),sprite);
 const manifest={version:1,generator:'built-in image generation',sourceSha256:sha(bytes),spriteSha256:sha(sprite),width:metadata.width,height:metadata.height,
  approvedAvatarPixels:32,originalPreserved:true,transparent:true};fs.writeFileSync(path.join(folder,'furniture.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify(manifest));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
