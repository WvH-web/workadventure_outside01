'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {adaptRoomModule}=require('./progressive-adapter.cjs');
const SOCIAL_SHA='bee934ede160a3ab221d6b7b928701675e3d2ed6c00459dcfec5a0e5d1998f15';
function roomSocialAdapter(source){
 if(crypto.createHash('sha256').update(source).digest('hex')!==SOCIAL_SHA)throw Error('Review the changed room invitation module before adapting it');
 const anchor="new URL('zimmer/',this.base)",replacement="new URL(document.querySelector('meta[name=castle-home-invite-base]')?.content||'zimmer/',this.base)";
 if(source.split(anchor).length!==2)throw Error('Room invitation anchor changed');return source.replace(anchor,replacement);
}
async function gameFactory(root,{dbPath,maxPlayers=100}={}){
 root=path.resolve(root);const base=path.join(root,'dorfplatz');
 const {createVillage}=await import(pathToFileURL(path.join(base,'server/index.mjs')).href);
 const {bedroomAssets}=await import(pathToFileURL(path.join(base,'server/bedrooms.mjs')).href);
 const roomSocial=roomSocialAdapter(await fs.readFile(path.join(base,'public/room-social.js'),'utf8'));
 const assetOverrides=new Map([
  ['/zimmer/renderer.js',adaptRoomModule('renderer',await fs.readFile(path.join(root,'planung/zimmer-editor/renderer.js'),'utf8'))],
  ['/zimmer/app.js',adaptRoomModule('app',await fs.readFile(path.join(root,'planung/zimmer-editor/app.js'),'utf8'))],
  ['/zimmer/castle-room-media.js',await fs.readFile(path.join(__dirname,'public/room-media.js'),'utf8')],
 ]);
 const assetPaths=new Set([...bedroomAssets(base).keys(),'/proximity.js','/proximity.css','/proximity-session.js','/vendor/livekit-client-2.23.0.js']);
 assetPaths.add('/zimmer/castle-room-media.js');
 const callPanel=await fs.readFile(path.join(__dirname,'public/room-call.js'),'utf8');
 const callSource=await fs.readFile(path.join(base,'public/proximity.js'),'utf8');
 const callSession=await fs.readFile(path.join(base,'public/proximity-session.js'));
 const callControl=await fs.readFile(path.join(__dirname,'public/room-control.js'),'utf8');
 const callManifest=await fs.readFile(path.join(__dirname,'game.manifest.json'));
 if(crypto.createHash('sha256').update(callManifest).digest('hex')!==require('./runtime.cjs').OWNED_SHA||crypto.createHash('sha256').update(callSource).digest('hex')!==JSON.parse(callManifest).sourceFiles['dorfplatz/public/proximity.js'])throw Error('Review the changed proximity panel before adapting it');
 if(crypto.createHash('sha256').update(callSession).digest('hex')!==JSON.parse(callManifest).sourceFiles['dorfplatz/public/proximity-session.js'])throw Error('Review the changed proximity session before adapting control renewal');
 return options=>{
  const assets=new Set(assetPaths),overrides=new Map(assetOverrides);
  if(options.media){assets.add('/castle-room-proximity-original.js');assets.add('/castle-room-control.js');overrides.set('/castle-room-proximity-original.js',callSource);overrides.set('/proximity.js',callPanel);overrides.set('/castle-room-control.js',callControl);}
  return {game:createVillage({...options,dbPath,maxPlayers}),assetPaths:assets,roomSocial,assetOverrides:overrides};
 };
}
module.exports={gameFactory,roomSocialAdapter,SOCIAL_SHA};
