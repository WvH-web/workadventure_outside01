'use strict';
const {createSchoolServer}=require('/srv/release/castle-school/server.cjs');
const {createLookup}=require('/srv/release/castle-school/lookup.cjs');
const {validateOffers,IDS}=require('/srv/release/castle-school/offers.cjs');
const {GatewayError}=require('/srv/release/hall-audio/errors.cjs');
const identifiers=JSON.parse(process.env.CASTLE_TEST_IDENTIFIERS||'null');
if(!Array.isArray(identifiers)||identifiers.length!==2||new Set(identifiers).size!==2||
  !identifiers.every(id=>typeof id==='string'&&id===id.toLowerCase()&&id.length<255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)))throw Error('Invalid approved test account scope');
const lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
let targetUrl='https://games.example.test/room/?code=one';
const getOffers=async()=>{
  const now=Date.now(),date=ms=>new Date(ms).toISOString().slice(0,10);
  return validateOffers({version:1,checkedAt:now,offers:IDS.map(id=>({id,title:id==='gamesarea01'?'Getrennte Gastgeberprobe':'Nicht eingerichtete Testressource',
    targetUrl:id==='gamesarea01'?targetUrl:null,revision:1,presentation:'side',rule:{id,published:id==='gamesarea01',audiences:['staff','student'],staffPreview:false,
      minAge:0,maxAge:null,gradeLevels:null,classIds:null,validFrom:date(now-86400000),validUntil:date(now+86400000),
      reviewed:true,reviewedOrigin:'https://games.example.test',reviewedPath:'/room/'}}))},now);
};
const server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret:process.env.SECRET_KEY,trustedProxyIps:[]},
  lookup:async id=>{if(!identifiers.includes(id))throw new GatewayError(403,'not_allowed');return lookup(id);},getOffers,
  updateRoomLink:async body=>{if(body.resourceId!=='gamesarea01'||body.pin!=='998877')throw new GatewayError(403,'wrong_pin');targetUrl=body.targetUrl;return {updated:true};}});
server.prependListener('request',(_req,res)=>res.setHeader('X-Castle-Test-Catalog','synthetic-loopback-only'));
server.listen(3211,'0.0.0.0',()=>console.log('Restricted native game-host preflight ready'));
for(const event of ['SIGINT','SIGTERM'])process.once(event,()=>{server.closeAdmissions();server.close();server.closeIdleConnections();});
