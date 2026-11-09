const fs=require('node:fs'),path=require('node:path');
const ids=require('./castle-map-ids.cjs'),root=path.resolve(__dirname,'..');
function buildCastleUi(){
  const legacy=new Set(['castle-return-hall','castle-stand','castle-ride-stop']),owned={};
  for(const id of ids){
    const map=JSON.parse(fs.readFileSync(path.join(root,'castle',id+'.tmj'))),activities=map.layers.flatMap(l=>l.objects||[])
      .map(o=>o.properties?.find(p=>p.name==='castleActivityId')?.value).filter(Boolean);
    owned[id]=['castle-return-hall-'+id,'castle-stand-'+id,'castle-ride-stop-'+id,...activities.map(a=>'castle-activity-'+id+'-'+a)];
    for(const a of activities)legacy.add('castle-activity-'+a);
  }
  owned['grosse-halle'].push('hall-action-noticeboard','hall-action-games');owned.kino.push('castle-cinema');
  fs.writeFileSync(path.join(root,'castle/ui-ids.js'),'export const ownedUi='+JSON.stringify(owned)+';\nexport const legacyUi='+JSON.stringify([...legacy].sort())+';\n');
  return {maps:ids.length,legacy:legacy.size};
}
module.exports={buildCastleUi};if(require.main===module)console.log(JSON.stringify(buildCastleUi()));
