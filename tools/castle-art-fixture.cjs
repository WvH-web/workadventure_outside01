'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {createArtServer}=require('../ops/castle-art/server.cjs');
const {ArtSessions}=require('../ops/castle-art/sessions.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
async function createFixture({directory,source=path.resolve(__dirname,'../../output/wbo-source-v2.18.33')}={}){
  const output=path.resolve(__dirname,'../../output');directory=directory||fs.mkdtempSync(path.join(output,'castle-art-fixture-'));
  if(!directory.startsWith(output+path.sep))throw Error('Isolated fixture output required');fs.mkdirSync(directory,{recursive:true});
  process.env.OTEL_SDK_DISABLED='true';process.env.WBO_SILENT='true';process.env.LOG_LEVEL='error';
  const base=await import(pathToFileURL(path.join(source,'server/configuration.mjs')).href),{createServerApp}=await import(pathToFileURL(path.join(source,'server/server.mjs')).href);
  const boardSecret='e'.repeat(64),secret='synthetic-art-browser-key-not-a-school-key',profiles=new Map();
  const backend=await createServerApp({...base,PORT:0,HOST:'127.0.0.1',AUTH_SECRET_KEY:boardSecret,BASE_PATH:'/castle-art/wbo',
    WEBROOT:path.join(source,'client-data'),HISTORY_DIR:directory,SAVE_INTERVAL:300,MAX_SAVE_DELAY:1000,MAX_ITEM_COUNT:2048,MAX_CHILDREN:500,MAX_BOARD_SIZE:4096,
    BLOCKED_TOOLS:[],IP_SOURCE:'X-Forwarded-For',TRUST_PROXY_HOPS:1,
  },{installShutdownHandlers:false,logStarted:false});
  const config={origin:'http://127.0.0.1',target:'http://127.0.0.1:'+backend.address().port,secret,boardSecret,trustedProxyIps:[]};
  const lookup=async id=>({version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:Date.now()});
  const sessions=new ArtSessions(),server=createArtServer({config,lookup,sessions});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
  async function identity(id,kind='student'){
    profiles.set(id,kind==='student'?{kind,eligible:true,age:9,gradeLevel:3,classId:17}:{kind,eligible:kind==='staff'||kind==='parent',age:null,gradeLevel:null,classId:null});
    return new SignJWT({identifier:id,tags:['teacher'],username:'Synthetic art participant'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(secret));
  }
  async function close(){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await backend.shutdown();}
  return {config,profiles,identity,server,backend,sessions,directory,close};
}
module.exports={createFixture};
