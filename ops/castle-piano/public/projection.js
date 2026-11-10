const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const pitch=value=>Number.isInteger(value)&&value>=48&&value<=84;
const copy=value=>JSON.parse(JSON.stringify(value));
export function validState(value,context){
  return value?.version===1&&value.type==='state'&&value.serverId===context.serverId&&value.roomId===context.room.id&&
    Number.isSafeInteger(value.sequence)&&value.sequence>=0&&Number.isFinite(value.time)&&Array.isArray(value.members)&&value.members.length<=8&&
    new Set(value.members.map(member=>member?.voiceId)).size===value.members.length&&value.members.every(member=>uuid.test(member?.voiceId)&&
      /^#[a-f0-9]{6}$/.test(member.color)&&typeof member.pedal==='boolean'&&Array.isArray(member.keys)&&member.keys.length<=24&&
      new Set(member.keys.map(key=>key?.note)).size===member.keys.length&&member.keys.every(key=>pitch(key?.note)&&uuid.test(key.pressId)&&
        typeof key.down==='boolean'&&Number.isFinite(key.startedAt)&&Number.isInteger(key.velocity)&&key.velocity>0&&key.velocity<=127))&&
    (value.ack===null||uuid.test(value.ack?.voiceId)&&uuid.test(value.ack?.id));
}
function apply(state,voiceId,command,time){
  const member=state.members.find(member=>member.voiceId===voiceId);if(!member)return;
  const key=member.keys.find(key=>key.note===command.note);
  if(command.type==='down'&&!key?.down){
    if(member.keys.filter(key=>key.down).length>=8)return;
    member.keys=member.keys.filter(key=>key.note!==command.note);
    if(member.keys.length>=24){const index=member.keys.findIndex(key=>!key.down);if(index>=0)member.keys.splice(index,1);}
    member.keys.push({note:command.note,velocity:command.velocity,down:true,pressId:command.id,startedAt:time});
  }else if(command.type==='up'&&key){if(member.pedal)key.down=false;else member.keys=member.keys.filter(item=>item!==key);}
  else if(command.type==='pedal'){member.pedal=command.down;if(!command.down)member.keys=member.keys.filter(key=>key.down);}
  else if(command.type==='clear'){member.keys=[];member.pedal=false;}
  else if(command.type==='hold')member.keys=member.keys.filter(key=>!key.down||command.notes.includes(key.note)||member.pedal);
}
export class PianoProjection{
  constructor(context,clock=Date.now){
    this.context=context;this.clock=clock;this.pending=[];this.latest={version:1,type:'state',serverId:context.serverId,roomId:context.room.id,
      sequence:0,time:clock(),ack:null,members:context.mode==='practice'?[{voiceId:context.voiceId,color:'#d9ac55',pedal:false,keys:[]}]:[]};
  }
  accept(value){
    if(!validState(value,this.context)||value.sequence<this.latest.sequence)return false;
    if(value.ack?.voiceId===this.context.voiceId){const index=this.pending.findIndex(item=>item.command.id===value.ack.id);if(index>=0)this.pending.splice(0,index+1);}
    this.latest=copy(value);return true;
  }
  command(command){
    if(this.pending.length>=80)throw Error('pending_limit');
    if(this.context.mode==='practice'){apply(this.latest,this.context.voiceId,command,this.clock());this.latest.time=this.clock();this.latest.sequence++;}
    else this.pending.push({command:copy(command),time:this.clock()});
  }
  view(){const result=copy(this.latest);for(const item of this.pending)apply(result,this.context.voiceId,item.command,item.time);return result;}
  clear(){this.pending=[];this.latest.members=[];}
}
