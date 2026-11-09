'use strict';
const {IDS,validateOffers}=require('../../ops/castle-school/offers.cjs');
function offerCatalog(now,patches={}) {
  return {version:1,checkedAt:now,offers:IDS.map(id=>{
    const rule={id,published:id==='gamesarea01',audiences:['staff','student','parent'],staffPreview:true,
      minAge:16,maxAge:18,gradeLevels:[10,11],classIds:[17],validFrom:new Date(now-30*86400000).toISOString().slice(0,10),validUntil:new Date(now+30*86400000).toISOString().slice(0,10),
      reviewedOrigin:'https://games.example.test',reviewedPath:'/room/',reviewed:true};
    const patch=patches[id]||{};
    return {id,title:id==='gamesarea01'?'Gemeinsame Spielrunde':'Spiel '+id,targetUrl:['gamesarea02','gamesarea03'].includes(id)?null:'https://games.example.test/room/?code=one',revision:1,presentation:'external',
      ...patch,rule:{...rule,...patch.rule}};
  })};
}
const checkedCatalog=(now,patches)=>validateOffers(offerCatalog(now,patches),now);
module.exports={offerCatalog,checkedCatalog};
