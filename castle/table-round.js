export const TABLE_STATE='castleTableRoundV1';
const SEAT_STATE='castleSeatV1',PUBLIC={public:true,persist:false};
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// The round travels with seated players, never with a browser or a persistent map variable.
// A visit nonce prevents a previous chair reservation from reviving an abandoned round.
export class TableRound {
  constructor(wa,room,tables,onChange){
    this.wa=wa;this.room=room;this.tables=tables;this.onChange=onChange;this.value=null;this.closed=false;this.desired=null;this.published=null;
  }
  participants(table){
    const players=[this.wa.player,...this.wa.players.list()].filter((p,i,all)=>all.findIndex(other=>other.playerId===p.playerId)===i);
    return players.flatMap(player=>{
      const seat=player.state[SEAT_STATE];
      if(seat?.stage!=='seated'||!uuid(seat.visit)||!table.seats.includes(seat.id))return [];
      const state=player.state[TABLE_STATE],round=state?.v===1&&state.seat===seat.id&&state.visit===seat.visit?state.round:null;
      const valid=round&&uuid(round.id)&&Number.isSafeInteger(round.origin)&&table.options.some(option=>option.id===round.choice);
      return [{id:player.playerId,seat:seat.id,visit:seat.visit,round:valid?round:null}];
    }).sort((a,b)=>a.id-b.id);
  }
  refresh(){
    if(this.closed)return;
    const table=this.room.seat&&!this.room.busy&&this.tables.find(table=>table.seats.includes(this.room.seat.id));
    const members=table?this.participants(table):[],self=members.find(member=>member.id===this.wa.player.playerId);
    if(!self){this.visit=null;this.proposal=null;this.publish(null);this.change(null);return;}
    const visit=table.id+':'+self.visit;if(this.visit!==visit){this.visit=visit;this.proposal=null;}
    const rounds=members.flatMap(member=>member.round?[member.round]:[]).sort((a,b)=>a.origin-b.origin||a.id.localeCompare(b.id));
    if(this.proposal)rounds.push(this.proposal);
    rounds.sort((a,b)=>a.origin-b.origin||a.id.localeCompare(b.id));
    let round=rounds[0]||null;
    if(!round&&table.options.length===1&&members[0].id===self.id)round=this.proposal={id:crypto.randomUUID(),origin:self.id,choice:table.options[0].id};
    if(round)this.proposal=round;
    this.publish({v:1,seat:self.seat,visit:self.visit,round});
    // Open only the acknowledged native broadcast, not an optimistic local choice.
    const acknowledged=self.round&&round&&same(self.round,round)&&same(this.published?.round,round);
    this.change({table,visit:self.visit,leader:members[0].id===self.id,round:acknowledged?round:null,waiting:!!round&&!acknowledged});
  }
  choose(id){
    this.refresh();const current=this.value;
    if(!current||!current.leader||current.round||current.waiting||!current.table.options.some(option=>option.id===id))return false;
    const self=this.participants(current.table).find(member=>member.id===this.wa.player.playerId);
    if(!self)return false;
    this.proposal={id:crypto.randomUUID(),origin:self.id,choice:id};
    this.publish({v:1,seat:self.seat,visit:self.visit,round:this.proposal});this.refresh();return true;
  }
  change(value){
    const signature=value?JSON.stringify([value.table.id,value.visit,value.leader,value.round,value.waiting]):'';
    this.value=value;if(signature===this.signature)return;this.signature=signature;this.onChange(value);
  }
  publish(value){
    this.desired=value;if(this.writing||same(value,this.published))return;
    this.writing=(async()=>{
      while(!same(this.desired,this.published)){
        const next=this.desired;let timer;
        try{await Promise.race([this.wa.player.state.saveVariable(TABLE_STATE,next,PUBLIC),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Table round save timed out')),5000)})]);this.published=next;}
        finally{clearTimeout(timer);}
      }
    })().catch(()=>{this.published=undefined;}).finally(()=>{this.writing=null;});
  }
  dispose(){if(this.closed)return;this.closed=true;this.publish(null);this.change(null);}
}
