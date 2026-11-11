export const TOUR_STATE='castleMuseumTourV1';
const SEAT='castleSeatV1',TABLE='castleTableRoundV1',PUBLIC={public:true,persist:false,scope:'room'};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const playerId=p=>Number.isSafeInteger(p.playerId)?p.playerId:p.id;
const board=value=>value===null||typeof value==='string'&&/^show(?:[1-9]|1[0-3])$/.test(value);

export function tourTarget(map){
  if(props(map).castleMapId!=='museum')throw Error('Museum table required');
  const objects=map.layers.flatMap(layer=>layer.objects||[]),area=objects.find(o=>props(o).castleActivityId==='museum-collection');
  if(!area||props(area).castleActivityGroup!=='buchclub')throw Error('Museum table missing');
  const seats=objects.filter(o=>props(o).audioGroup==='buchclub'&&props(o).seatId).map(o=>props(o).seatId);
  if(seats.length!==4||new Set(seats).size!==4)throw Error('Museum seats missing');
  return {seats,choice:'museum-collection'};
}
export function tourSelection(value){
  if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='board,change,counter,source'||!board(value.board)||
    !uuid(value.change)||!Number.isSafeInteger(value.counter)||value.counter<1||value.counter>1000000000||
    !Number.isSafeInteger(value.source)||value.source<0)return null;
  return {counter:value.counter,source:value.source,change:value.change,board:value.board};
}

// Keep the acknowledged selection with the seated participants, like TableRound.
// No persistent tour, pupil profile, arbitrary destination or room-wide navigation is stored.
export class MuseumTour{
  constructor(wa,target,onChange){this.wa=wa;this.target=target;this.onChange=onChange;this.closed=false;this.published=undefined;this.desired=undefined;}
  context(player){
    const id=playerId(player),seat=player.state[SEAT],table=player.state[TABLE];
    if(!Number.isSafeInteger(id)||id<0||seat?.stage!=='seated'||!this.target.seats.includes(seat.id)||!uuid(seat.visit)||
      table?.v!==1||table.seat!==seat.id||table.visit!==seat.visit||!uuid(table.round?.id)||table.round.choice!==this.target.choice)return null;
    return {id,seat:seat.id,visit:seat.visit,round:table.round.id};
  }
  members(self){
    const players=[this.wa.player,...this.wa.players.list()];
    return players.filter((p,i)=>players.findIndex(other=>playerId(other)===playerId(p))===i).flatMap(player=>{
      const context=this.context(player);if(!context||context.round!==self.round)return [];
      const state=player.state[TOUR_STATE],selection=state?.v===1&&state.round===self.round&&state.seat===context.seat&&state.visit===context.visit?tourSelection(state.selection):null;
      return [{...context,selection}];
    });
  }
  start(){
    this.subscriptions=[];
    for(const key of [SEAT,TABLE,TOUR_STATE]){
      this.subscriptions.push(this.wa.player.state.onVariableChange(key).subscribe(()=>this.refresh()));
      this.subscriptions.push(this.wa.players.onVariableChange(key).subscribe(()=>this.refresh()));
    }
    for(const event of ['onPlayerEnters','onPlayerLeaves'])this.subscriptions.push(this.wa.players[event].subscribe(()=>this.refresh()));
    this.refresh();return this;
  }
  refresh(){
    if(this.closed)return;
    const self=this.context(this.wa.player),visit=self?self.round+':'+self.visit:null;
    if(this.visit!==visit){this.visit=visit;this.proposal=null;}
    if(!self){this.publish(null);this.change({active:false,round:null,selection:null,waiting:false});return;}
    const accepted=this.members(self).flatMap(member=>member.selection?[member.selection]:[]),choices=[...accepted];
    if(this.proposal)choices.push(this.proposal);
    choices.sort((a,b)=>b.counter-a.counter||b.source-a.source||b.change.localeCompare(a.change));
    const selected=choices[0]||null;
    if(selected)this.proposal=selected;
    this.publish({v:1,round:self.round,seat:self.seat,visit:self.visit,selection:selected});
    const acknowledged=selected&&accepted.some(value=>same(value,selected));
    this.change({active:true,round:self.round,selection:acknowledged?selected:null,waiting:!!selected&&!acknowledged});
  }
  async choose(value){
    this.refresh();if(this.closed||!this.value?.active||!board(value)||this.writing)return false;
    const self=this.context(this.wa.player),accepted=this.members(self).flatMap(member=>member.selection?[member.selection]:[]);
    const counter=Math.max(0,this.proposal?.counter||0,...accepted.map(value=>value.counter))+1;
    if(counter>1000000000)return false;
    this.proposal={counter,source:self.id,change:crypto.randomUUID(),board:value};this.refresh();
    await this.writing;this.refresh();return !this.closed&&this.value?.round===self.round&&same(this.value.selection,this.proposal);
  }
  publish(value){
    this.desired=value;if(this.writing||same(value,this.published))return;
    this.writing=Promise.resolve().then(async()=>{
      while(!same(this.desired,this.published)){
        const next=this.desired;let timer;
        try{await Promise.race([this.wa.player.state.saveVariable(TOUR_STATE,next,PUBLIC),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tour selection timed out')),5000)})]);this.published=next;}
        finally{clearTimeout(timer);}
      }
    }).catch(()=>{this.published=undefined;}).finally(()=>{this.writing=null;});
  }
  change(value){const signature=JSON.stringify(value);this.value=value;if(signature!==this.signature){this.signature=signature;this.onChange(value);}}
  dispose(){
    if(this.closed)return;this.closed=true;for(const subscription of this.subscriptions||[])subscription.unsubscribe();
    // Closing the side panel does not end a seated round. The chair visit scopes
    // this transient copy; standing or leaving the native room makes it ineligible.
  }
}
