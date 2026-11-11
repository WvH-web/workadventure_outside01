'use strict';
const crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {createHomeGateway}=require('../ops/castle-homes/gateway.cjs'),{gameFactory}=require('../ops/castle-homes/game-adapter.cjs');
const {createSchoolVerifier}=require('../ops/castle-school/identity.cjs'),{SignJWT}=require('../ops/hall-audio/node_modules/jose');
async function createRehearsal({port=0,origin,clock=Date.now,moderationFixture=false,media}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'castle-home-gateway-')),key=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(32).toString('hex');
 const source=path.resolve(process.env.STERNENHUETER_SOURCE||path.join(__dirname,'../../sternenhueter'));
 const profiles=new Map([['a@invalid.local',{sub:'wvh:student:7',role:'student',grade:3,age:9,moderator:false,read_only:false}],
  ['b@invalid.local',{sub:'wvh:student:8',role:'student',grade:7,age:13,moderator:false,read_only:false}]]);
 if(moderationFixture)profiles.set('m@invalid.local',{sub:'wvh:staff:70',role:'teacher',grade:null,age:null,moderator:true,read_only:false});
 let gateway,game;const requests=[];
 async function cleanup(){const resolved=await fs.realpath(directory),temporary=await fs.realpath(os.tmpdir());if(path.dirname(resolved)!==temporary||!path.basename(resolved).startsWith('castle-home-gateway-'))throw Error('Unsafe local fixture cleanup');await fs.rm(directory,{recursive:true,force:true});}
 try{
  const factory=await gameFactory(source,{dbPath:path.join(directory,'synthetic.sqlite')});
  gateway=await createHomeGateway({port,origin,allowInsecureLocal:true,key,clock,media,verify:createSchoolVerifier(secret,{clock}),lookup:async identifier=>profiles.get(identifier)??null,
   createGame:options=>{const value=factory(options);game=value.game;
    game.server.prependListener('request',req=>requests.push({path:req.url,authorizationForwarded:!!req.headers.authorization,
     unrelatedCookieForwarded:!!req.headers.cookie?.includes('unrelated'),hasGameCookie:!!req.headers.cookie?.includes('sternenhueter_school=')}));return value;}});
  async function issueToken(id){if(!['a','b',...(moderationFixture?['m']:[])].includes(id))throw Error('Unknown synthetic account');return new SignJWT({identifier:id+'@invalid.local',username:'Private synthetic name',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(clock()/1000)+3600).sign(new TextEncoder().encode(secret));}
  const tokens={};for(const id of ['a','b',...(moderationFixture?['m']:[])])tokens[id]=await issueToken(id);
  return {gateway,game,profiles,tokens,issueToken,requests,source,async close(){await gateway.close();await cleanup();}};
 }catch(error){await gateway?.close();await cleanup();throw error;}
}
module.exports={createRehearsal};
