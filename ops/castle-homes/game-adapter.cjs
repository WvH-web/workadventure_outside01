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
 return options=>({game:createVillage({...options,dbPath,maxPlayers}),assetPaths,roomSocial,assetOverrides});
}
module.exports={gameFactory,roomSocialAdapter,SOCIAL_SHA};
