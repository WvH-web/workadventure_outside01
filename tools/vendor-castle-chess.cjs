'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const output=path.resolve(__dirname,'../../output/castle-chess-vendor');fs.mkdirSync(output,{recursive:true});
const packages=[
 {name:'chess.js',version:'1.4.0',integrity:'sha512-BBJgrrtKQOzFLonR0l+k64A98NLemPwNsCskwb+29bRwobUa4iTm51E1kwGPbWXAcfdDa18nad6vpPPKPWarqw=='},
 {name:'cm-chessboard',version:'8.15.4',integrity:'sha512-ydJBZkIntEQnyxe3VztWVQbQ79FU1kSyafCF5XhaVy1lPkRH4Y2Hbqrv5W5oPletKIXGus2MNHH3qVuUGbuzsQ=='},
 {name:'eventsource-parser',version:'4.1.3',integrity:'sha512-jZVIVilXZfAx6H20ZKKEj5dabbpD9ETmMj3uHsjMmgBzBHB6tsHrmdWB4mAiy3amtN6MOoVkfXRQu4wf1n88Rw=='},
];
async function main(){
 const root=path.resolve(__dirname,'../ops/castle-chess'),installed=[];
 for(const pkg of packages){
  const endpoint='https://registry.npmjs.org/'+pkg.name+'/'+pkg.version,response=await fetch(endpoint);
  if(!response.ok)throw Error('Package metadata unavailable');const metadata=await response.json();
  const expected='https://registry.npmjs.org/'+pkg.name+'/-/'+pkg.name+'-'+pkg.version+'.tgz';
  if(metadata.version!==pkg.version||metadata.dist?.integrity!==pkg.integrity||metadata.dist.tarball!==expected)throw Error('Pinned package metadata changed');
  const download=await fetch(expected);if(!download.ok)throw Error('Pinned package download failed');const bytes=Buffer.from(await download.arrayBuffer());
  if(bytes.length>1000000||'sha512-'+crypto.createHash('sha512').update(bytes).digest('base64')!==pkg.integrity)throw Error('Pinned package integrity mismatch');
  const file=path.join(output,pkg.name+'-'+pkg.version+'.tgz');fs.writeFileSync(file,bytes);
  const entries=cp.execFileSync('tar',['-tzf',file],{encoding:'utf8'}).trim().split(/\r?\n/);
  if(new Set(entries).size!==entries.length||entries.some(name=>!name.startsWith('package/')||name.split('/').includes('..')))throw Error('Unexpected package paths');
  const mappings=[];
  if(pkg.name==='chess.js')mappings.push(['package/dist/cjs/chess.js','vendor/chess.cjs'],['package/LICENSE','vendor/chess-LICENSE'],
    ['package/dist/esm/chess.js','public/vendor/chess/chess.mjs'],['package/LICENSE','public/vendor/chess/LICENSE']);
  if(pkg.name==='cm-chessboard'){
    for(const entry of entries){const member=entry.slice('package/'.length);
      if(/^src\/(?:Chessboard\.js|(?:model|view|lib)\/.*\.js|extensions\/(?:markers|promotion-dialog)\/.*\.js)$/.test(member)||
        ['assets/chessboard.css','assets/extensions/markers/markers.css','assets/extensions/markers/markers.svg','assets/extensions/promotion-dialog/promotion-dialog.css','assets/pieces/standard.svg','LICENSE'].includes(member))
        mappings.push([entry,'public/vendor/cm-chessboard/'+member]);
    }
  }
  if(pkg.name==='eventsource-parser')for(const member of ['dist/index.js','dist/errors.js','dist/parse.js','dist/types.js','LICENSE'])mappings.push(['package/'+member,'public/vendor/eventsource-parser/'+member]);
  for(const [entry,relative]of mappings){
    if(!entries.includes(entry))throw Error('Pinned package member missing');
    const data=cp.execFileSync('tar',['-xOf',file,entry]),destination=path.join(root,relative);
    if(!destination.startsWith(root+path.sep)||data.length>300000)throw Error('Unexpected vendor member');
    if(fs.existsSync(destination)&&!fs.readFileSync(destination).equals(data))throw Error('Existing vendor file differs; inspect before replacing');
    fs.mkdirSync(path.dirname(destination),{recursive:true});if(!fs.existsSync(destination))fs.writeFileSync(destination,data);
    installed.push({path:relative,source:expected+'#'+entry,sha256:crypto.createHash('sha256').update(data).digest('hex'),package:pkg.name,version:pkg.version});
  }
  console.log(JSON.stringify({name:pkg.name,version:pkg.version,integrityVerified:true,files:mappings.length}));
 }
 fs.writeFileSync(path.join(root,'vendor-manifest.json'),JSON.stringify({version:1,packages,files:installed},null,2)+'\n');
 console.log('Vendored only selected licensed runtime files; no package scripts executed and no noncommercial Staunty graphics copied.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
