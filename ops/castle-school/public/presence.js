import {RoundClient,destination,TRAVEL_READY,TRAVEL_FAILED} from './round-client.js';
const client=new RoundClient(()=>schedule(200));let closed=false,busy=false,timer,roomId='',current,position,move;
const within=(point,bounds)=>point&&point.x>=bounds.x-8&&point.y>=bounds.y-8&&point.x<bounds.x+bounds.width+8&&point.y<bounds.y+bounds.height+8;
function schedule(delay=20000+Math.random()*3000){if(closed)return;clearTimeout(timer);timer=setTimeout(()=>void tick(),delay);}
async function tick(){
  if(closed||busy)return;busy=true;
  client.sync();const lease=client.lease(),journey=client.journey();
  try{
    if(!lease&&!journey)return;
    if(journey&&WA.player.state.loadVariable(TRAVEL_FAILED)===journey.nonce){
      if(lease){await client.api('round-leave',{leaseId:lease.leaseId});client.clearLease(lease.leaseId);}
      client.clearJourney(journey.nonce);return;
    }
    const value=lease?await client.api('round-heartbeat',{leaseId:lease.leaseId}):await client.api('round-visit',{roundId:journey.roundId});
    if(closed||lease&&client.lease()?.leaseId!==lease.leaseId||journey&&client.journey()?.nonce!==journey.nonce)return;
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
    if(error.code!=='cancelled'){
      if(lease)client.clearLease(lease.leaseId);if(journey)client.clearJourney(journey.nonce);current=null;
      console.warn('Castle round registration could not be confirmed.');
    }
  }finally{busy=false;schedule(client.journey()?.mapId===roomId?500:undefined);}
}
if(typeof WA!=='undefined')WA.onInit().then(async()=>{
  if(closed)return;const map=await WA.room.getTiledMap();roomId=map.properties?.find(property=>property.name==='castleMapId')?.value||'';
  if(closed)return;
  move=WA.player.onPlayerMove(value=>{position=value;if(current&&!client.journey()&&!within(position,current.bounds))schedule(250);});
  schedule(300+Math.random()*700);
}).catch(()=>{console.warn('Castle round registration is unavailable.');});
window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);move?.unsubscribe?.();client.dispose();},{once:true});
