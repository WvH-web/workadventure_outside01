const pending=new WeakMap();

export function installRoomControl(session){
 session.pulse=()=>refreshRoomControl(session);return session;
}

export async function refreshRoomControl(session){
 if(!session.active||!session.client||pending.get(session)?.generation===session.generation)return;
 if(!session.gameConnected()){session.stop('Die Spielverbindung wurde unterbrochen. Schalte das Zimmergespraech danach neu ein.');return;}
 const operation={generation:session.generation},started=performance.now(),scope=session.context();pending.set(session,operation);
 const current=()=>session.generation===operation.generation&&session.active;
 try{
  const data=await session.request({action:'pulse',client:session.client});
  if(current()){
   // Media negotiation must not hold the next school/control renewal behind it.
   void Promise.resolve(session.accept(data,operation.generation,started,scope)).catch(error=>{
    if(current())session.stop(error.message||'Das Zimmergespraech wurde unterbrochen. Bitte schalte es neu ein.');
   });
  }
 }catch(error){if(current())session.stop(error.message||'Die Verbindung wurde unterbrochen. Bitte schalte das Zimmergespraech neu ein.');}
 finally{if(pending.get(session)===operation)pending.delete(session);}
}
