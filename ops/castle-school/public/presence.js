import {RoundClient,destination,recoveryDeadline,recoveryDelay,TRAVEL_READY,TRAVEL_FAILED} from './round-client.js';
const client=new RoundClient(()=>schedule(200));let closed=false,busy=false,timer,roomId='',current,position,move,failures=0;
const within=(point,bounds)=>point&&point.x>=bounds.x-8&&point.y>=bounds.y-8&&point.x<bounds.x+bounds.width+8&&point.y<bounds.y+bounds.height+8;
function schedule(delay=20000+Math.random()*3000){if(closed)return;clearTimeout(timer);timer=setTimeout(()=>void tick(),delay);}
async function tick(){
  if(closed||busy)return;busy=true;
  client.sync();const lease=client.lease(),journey=client.journey();let retry=null,confirming=false;
  try{
    if(!lease&&!journey){current=null;return;}
    if(journey&&WA.player.state.loadVariable(TRAVEL_FAILED)===journey.nonce){
      if(lease){await client.api('round-leave',{leaseId:lease.leaseId});client.clearLease(lease.leaseId);}
      client.clearJourney(journey.nonce);return;
    }
    confirming=true;
    const value=lease?await client.api('round-heartbeat',{leaseId:lease.leaseId}):await client.api('round-visit',{roundId:journey.roundId});
    confirming=false;
    if(closed||lease&&client.lease()?.leaseId!==lease.leaseId||journey&&client.journey()?.nonce!==journey.nonce)return;
    if(lease&&!client.confirmLease(lease.leaseId,value))return;
    failures=0;
    current=destination(value.destination);
    if(journey&&journey.roundId===value.round.id&&journey.mapId===roomId){
      const sameRoom=journey.sourceMap===roomId;
      if(!sameRoom||WA.player.state.loadVariable(TRAVEL_READY)===journey.nonce){
        client.clearJourney(journey.nonce);
        await WA.player.teleport(current.arrival.x,current.arrival.y);
        if(closed)return;position=await WA.player.getPosition();
      }
    }
    if(lease&&!client.journey()){
      position=await WA.player.getPosition();
      if(closed)return;
      if(roomId!==current.mapId||!within(position,current.bounds)){
        await client.api('round-leave',{leaseId:lease.leaseId});client.clearLease(lease.leaseId);current=null;
      }
    }
  }catch(error){
    if(!closed&&error.code!=='cancelled'&&(!lease||client.lease()?.leaseId===lease.leaseId)&&(!journey||client.journey()?.nonce===journey.nonce)){
      retry=confirming?recoveryDelay(error,recoveryDeadline(lease,journey),failures++):null;current=null;
      // Keep only the opaque handle until its last confirmed deadline; every retry
      // still requires a fresh server decision and never recreates a registration.
      if(retry===null){if(lease)client.clearLease(lease.leaseId);if(journey)client.clearJourney(journey.nonce);failures=0;}
      console.warn('Castle round registration could not be confirmed.');
    }
  }finally{busy=false;schedule(retry??(client.journey()?.mapId===roomId?500:undefined));}
}
if(typeof WA!=='undefined')WA.onInit().then(async()=>{
  if(closed)return;const map=await WA.room.getTiledMap();roomId=map.properties?.find(property=>property.name==='castleMapId')?.value||'';
  if(closed)return;
  move=WA.player.onPlayerMove(value=>{position=value;if(current&&!client.journey()&&!within(position,current.bounds))schedule(250);});
  schedule(300+Math.random()*700);
}).catch(()=>{console.warn('Castle round registration is unavailable.');});
window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);move?.unsubscribe?.();client.dispose();},{once:true});
