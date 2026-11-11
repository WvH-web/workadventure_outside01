export const PUZZLE_STATE='castleStarMachineV1';
const SEAT='castleSeatV1',TABLE='castleTableRoundV1',PUBLIC={public:true,persist:false,scope:'room'},LIMIT=1000000000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const keys=(value,list)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===list;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const props=o=>Object.fromEntries((o.properties||[]).map(p=>[p.name,p.value]));
const playerId=p=>Number.isSafeInteger(p.playerId)?p.playerId:p.id;
const newer=(a,b)=>a.clock-b.clock||a.source-b.source||a.change.localeCompare(b.change);
export const symbols=[['sun','Sonne'],['moon','Mond'],['star','Stern'],['leaf','Blatt'],['waves','Welle'],['flame','Flamme']];
export const puzzles=[
  {title:'Nacht am See',answer:[1,2,4],clues:[
    'Innen: Ich begleite die Erde und leuchte in der Nacht.',
    'Mitte: Auf der Scheibe habe ich f\u00fcnf Spitzen.',
    'Au\u00dfen: Ich bewege das Wasser am Ufer.']},
  {title:'Die Spur im Kreis',answer:[2,3,5],clues:[
    'Innen liegt zwei Schritte nach der Sonne.',
    'Mitte liegt einen Schritt nach dem inneren Zeichen.',
    'Au\u00dfen liegt zwei Schritte nach dem mittleren Zeichen.']},
  {title:'Einmal um den Himmel',answer:[4,1,3],clues:[
    'Au\u00dfen liegt drei Schritte nach der Sonne.',
    'Innen liegt einen Schritt nach dem \u00e4u\u00dferen Zeichen.',
    'Mitte liegt drei Schritte nach dem inneren Zeichen. Nach der Flamme geht es bei der Sonne weiter.']}
];

export function puzzleTarget(map){
  if(props(map).castleMapId!=='sternwarte')throw Error('Sternwartentisch erforderlich');
  const objects=map.layers.flatMap(layer=>layer.objects||[]),area=objects.find(o=>props(o).castleActivityId==='stars-solar');
  if(!area||props(area).castleActivityGroup!=='buchclub'||props(area).castleActivityUrl!=='puzzle.html'||
    props(area).castleActivityOnSit!==true||props(area).castleActivityApi!==true)throw Error('Raetseltisch nicht eingerichtet');
  const seats=objects.filter(o=>props(o).audioGroup==='buchclub'&&props(o).seatId).map(o=>props(o).seatId);
  if(seats.length!==4||new Set(seats).size!==4)throw Error('Raetselsitze fehlen');
  return {seats,choice:'machine'};
}
function stamp(value){
  return Number.isSafeInteger(value.clock)&&value.clock>=1&&value.clock<=LIMIT&&
    Number.isSafeInteger(value.source)&&value.source>=0&&uuid(value.change);
}
export function puzzleSnapshot(value){
  if(!keys(value,'cells,epoch,round,seat,v,visit')||value.v!==1||!uuid(value.round)||!uuid(value.visit)||
    typeof value.seat!=='string'||value.seat.length>80||!keys(value.epoch,'change,clock,index,source')||
    !Number.isInteger(value.epoch.index)||value.epoch.index<0||value.epoch.index>=puzzles.length||
    !(stamp(value.epoch)||value.epoch.clock===0&&value.epoch.source===0&&value.epoch.index===0&&value.epoch.change===value.round)||
    !Array.isArray(value.cells)||value.cells.length!==3||!value.cells.every(cell=>cell===null||keys(cell,'change,clock,source,value')&&stamp(cell)&&
      Number.isInteger(cell.value)&&cell.value>=0&&cell.value<symbols.length&&cell.clock>value.epoch.clock))return null;
  return {v:1,round:value.round,seat:value.seat,visit:value.visit,epoch:{...value.epoch},cells:value.cells.map(cell=>cell&&({...cell}))};
}
export function mergePuzzle(round,snapshots){
  const valid=snapshots.map(puzzleSnapshot).filter(value=>value?.round===round);
  const epoch=valid.map(value=>value.epoch).sort(newer).at(-1)||{clock:0,source:0,change:round,index:0};
  const cells=[0,1,2].map(i=>valid.filter(value=>same(value.epoch,epoch)).map(value=>value.cells[i]).filter(Boolean).sort(newer).at(-1)||null);
  const values=cells.map(cell=>cell?.value??0),solved=values.every((value,i)=>value===puzzles[epoch.index].answer[i]);
  return {epoch,cells,values,solved};
}

// Three independent last-write registers preserve concurrent edits to different
// rings. A newer puzzle epoch excludes delayed edits from the previous puzzle.
// This is transient play state, never an authorization or hidden-door gate.
export class StarMachine{
  constructor(wa,target,onChange,{timeout=5000}={}){
    this.wa=wa;this.target=target;this.onChange=onChange;this.timeout=timeout;this.closed=false;
    this.published=puzzleSnapshot(wa.player.state[PUZZLE_STATE]);this.proposal=null;this.failed=false;
  }
  context(player){
    const id=playerId(player),seat=player.state[SEAT],table=player.state[TABLE];
    if(!Number.isSafeInteger(id)||id<0||seat?.stage!=='seated'||!this.target.seats.includes(seat.id)||!uuid(seat.visit)||
      table?.v!==1||table.seat!==seat.id||table.visit!==seat.visit||!uuid(table.round?.id)||table.round.choice!==this.target.choice)return null;
    return {id,seat:seat.id,visit:seat.visit,round:table.round.id};
  }
  members(self){
    const players=[this.wa.player,...this.wa.players.list()],seen=new Set();
    return players.filter(player=>{const id=playerId(player);if(seen.has(id))return false;seen.add(id);return true;}).flatMap(player=>{
      const context=this.context(player);if(!context||context.round!==self.round)return [];
      const state=context.id===playerId(this.wa.player)?this.published:puzzleSnapshot(player.state[PUZZLE_STATE]);
      return [{...context,snapshot:state&&state.round===self.round&&state.seat===context.seat&&state.visit===context.visit?state:null}];
    }).sort((a,b)=>a.id-b.id);
  }
  start(){
    this.subscriptions=[];
    for(const key of [SEAT,TABLE,PUZZLE_STATE]){
      this.subscriptions.push(this.wa.player.state.onVariableChange(key).subscribe(()=>this.refresh()));
      this.subscriptions.push(this.wa.players.onVariableChange(key).subscribe(()=>this.refresh()));
    }
    for(const event of ['onPlayerEnters','onPlayerLeaves'])this.subscriptions.push(this.wa.players[event].subscribe(()=>this.refresh()));
    this.timer=setInterval(()=>this.refresh(),500);this.refresh();return this;
  }
  refresh(){
    if(this.closed)return;
    const self=this.context(this.wa.player),visit=self?self.round+':'+self.visit:null;
    if(this.visit!==visit){this.visit=visit;this.proposal=null;this.failed=false;}
    if(!self){this.desired=null;this.change({active:false,waiting:false,failed:false});return;}
    const members=this.members(self),snapshots=members.map(member=>member.snapshot).filter(Boolean),accepted=mergePuzzle(self.round,snapshots);
    const proposed=mergePuzzle(self.round,[...snapshots,...(this.proposal?[this.proposal]:[])]);
    this.publish({v:1,round:self.round,seat:self.seat,visit:self.visit,epoch:proposed.epoch,cells:proposed.cells});
    if(same(proposed.epoch,accepted.epoch)&&same(proposed.cells,accepted.cells))this.proposal=null;
    const position=members.findIndex(member=>member.id===self.id),hints=[0,1,2].filter(i=>i%members.length===position);
    this.change({active:true,round:self.round,index:accepted.epoch.index,values:accepted.values,solved:accepted.solved,
      participants:members.length,hints,waiting:!same(proposed.epoch,accepted.epoch)||!same(proposed.cells,accepted.cells),failed:this.failed});
  }
  async setRing(index,value){
    return this.update((merged,self,clock)=>{
      if(!Number.isInteger(index)||index<0||index>2||!Number.isInteger(value)||value<0||value>=symbols.length||merged.solved)return null;
      if(merged.values[index]===value)return null;
      merged.cells[index]={clock,source:self.id,change:crypto.randomUUID(),value};return merged;
    });
  }
  async advance(){return this.update((merged,self,clock)=>merged.solved&&merged.epoch.index<puzzles.length-1?
    {epoch:{clock,source:self.id,change:crypto.randomUUID(),index:merged.epoch.index+1},cells:[null,null,null]}:null);}
  async restart(){return this.update((_merged,self,clock)=>({epoch:{clock,source:self.id,change:crypto.randomUUID(),index:0},cells:[null,null,null]}));}
  async update(edit){
    this.refresh();if(this.closed||!this.value?.active||this.value.waiting||this.failed)return false;
    const self=this.context(this.wa.player),merged=mergePuzzle(self.round,this.members(self).map(member=>member.snapshot).filter(Boolean));
    const clock=Math.max(merged.epoch.clock,...merged.cells.map(cell=>cell?.clock||0))+1;if(clock>LIMIT)return false;
    const edited=edit(structuredClone(merged),self,clock);if(!edited)return false;
    const proposal={v:1,round:self.round,seat:self.seat,visit:self.visit,epoch:edited.epoch,cells:edited.cells};
    this.proposal=proposal;this.refresh();await this.writing;this.refresh();
    const current=this.context(this.wa.player);return !this.closed&&current?.round===self.round&&current.visit===self.visit&&!this.failed&&!this.value.waiting;
  }
  retry(){if(this.closed)return;this.failed=false;this.refresh();return this.writing;}
  publish(value){
    this.desired=value;if(this.closed||this.failed||this.writing||same(value,this.published))return;
    this.writing=Promise.resolve().then(async()=>{
      while(!this.closed&&this.desired&&!same(this.desired,this.published)){
        const next=this.desired;let timer;
        try{
          await Promise.race([this.wa.player.state.saveVariable(PUZZLE_STATE,next,PUBLIC),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Puzzle publication timed out')),this.timeout)})]);
          this.published=next;
        }finally{clearTimeout(timer);}
      }
    }).catch(()=>{this.failed=true;}).finally(()=>{this.writing=null;this.refresh();});
  }
  change(value){this.value=value;const signature=JSON.stringify(value);if(signature!==this.signature){this.signature=signature;this.onChange(value);}}
  dispose(){this.closed=true;clearInterval(this.timer);for(const subscription of this.subscriptions||[])subscription.unsubscribe();}
}
