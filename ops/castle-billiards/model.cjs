// GPL-3.0: school transport/state adapter around tailuge/billiards' pinned engine.
'use strict';
const clone=value=>structuredClone(value);
class BilliardsError extends Error { constructor(code){super(code);this.code=code;} }
function insist(condition,code='invalid_state'){if(!condition)throw new BilliardsError(code);}
function exact(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
function createBilliardsModel(core){
 const {Ball,Table,TableConfig,TableGeometry,Rack,Vector3,State,Session,EightBall,EventType,R}=core;
 const maxSteps=65000,step=1/512,frameEvery=24;
 function pack(table){return table.balls.map(ball=>({id:ball.id,label:ball.label??null,pos:[ball.pos.x,ball.pos.y,ball.pos.z],state:ball.state}));}
 function validate(state){
  insist(exact(state,['version','turn','groups','scores','breaks','shots','ballInHand','winner','reason','balls']));
  insist(Number.isSafeInteger(state.version)&&state.version>=0&&Number.isSafeInteger(state.shots)&&state.shots>=0);
  insist([0,1].includes(state.turn)&&[null,0,1].includes(state.winner)&&typeof state.ballInHand==='boolean');
  insist(state.reason===null||typeof state.reason==='string'&&state.reason.length<=160);
  for(const key of ['groups','scores','breaks'])insist(Array.isArray(state[key])&&state[key].length===2&&state[key].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000));
  insist(state.groups.every(n=>[0,1,2].includes(n))&&(state.groups.every(n=>n===0)||state.groups[0]+state.groups[1]===3));
  insist(Array.isArray(state.balls)&&state.balls.length===16);
  const labels=new Set();for(const [index,ball] of state.balls.entries()){
   insist(exact(ball,['id','label','pos','state'])&&ball.id===index&&[State.Stationary,State.InPocket].includes(ball.state));
   insist(Array.isArray(ball.pos)&&ball.pos.length===3&&ball.pos.every(n=>finite(n,-20,20)));
   insist(index===0?ball.label===null:Number.isSafeInteger(ball.label)&&ball.label>=1&&ball.label<=15);
   insist(!labels.has(ball.label));labels.add(ball.label);
  }
  return state;
 }
 function restore(state){
  validate(state);TableConfig.apply('eightball',8);Ball.id=0;
  return new Table(state.balls.map(value=>{const ball=new Ball(new Vector3(...value.pos),0xffffff,value.label??undefined);ball.state=value.state;return ball;}));
 }
 function rulesFor(table,state){
  Session.reset();Session.init('seat-'+state.turn,'','school-table',false);
  const session=Session.getInstance();session.playerIndex=state.turn;session.p1type=state.groups[state.turn];
  session.setOpponentClientId('seat-'+(1-state.turn));session.setMyScore(state.scores[state.turn]);session.setOpponentScore(state.scores[1-state.turn]);
  const events=[],notices=[],container={table,isSinglePlayer:false,sound:{playSuccess(){}},
   recorder:{entries:state.shots?[{event:{type:EventType.AIM}}]:[]},sendEvent:event=>events.push(event),notify:notice=>notices.push(notice)};
  const rules=new EightBall(container);container.rules=rules;rules.cueball=table.cueball;rules.currentBreak=state.breaks[state.turn];
  return {rules,events,notices,session};
 }
 function initial(){
  TableConfig.apply('eightball',8);Ball.id=0;Session.reset();const table=new Table(Rack.eightBall());
  return validate({version:0,turn:0,groups:[0,0],scores:[0,0],breaks:[0,0],shots:0,ballInHand:false,winner:null,reason:null,balls:pack(table)});
 }
 function place(state,point){
  validate(state);insist(state.winner===null&&state.ballInHand,'placement_not_allowed');
  insist(exact(point,['x','y'])&&finite(point.x,-2,2)&&finite(point.y,-2,2),'invalid_placement');
  const table=restore(state),{rules}=rulesFor(table,state),position=new Vector3(point.x,point.y,0),allowed=rules.placeBall(position.clone());
  insist(position.distanceTo(allowed)<1e-8&&!table.overlapsAny(position),'invalid_placement');
  table.cueball.pos.copy(position);table.cueball.setStationary();table.cueball.fround();
  return validate({...clone(state),version:state.version+1,ballInHand:false,balls:pack(table)});
 }
 function applyRules(table,state){
  const {rules,events,notices,session}=rulesFor(table,state),next=rules.update(table.outcome),result=clone(state);
  insist(['Aim','WatchAim','End'].includes(next.name),'unsupported_rule_result');
  const score=session.orderedScoresForHud();result.scores=[score.p1,score.p2];result.breaks[state.turn]=rules.currentBreak;
  if(session.p1type!==0){result.groups[state.turn]=session.p1type;result.groups[1-state.turn]=session.p1type===1?2:1;}
  result.ballInHand=events.some(event=>event.type===EventType.PLACEBALL);
  result.reason=notices.at(-1)?.subtext??next.reason??null;
  if(next.name==='WatchAim'){result.turn=1-state.turn;result.breaks[result.turn]=0;}
  if(next.name==='End'){result.winner=next.winner?state.turn:1-state.turn;result.ballInHand=false;}
  result.shots++;result.version++;result.balls=pack(table);validate(result);
  return {state:result,ruleEvents:events.map(event=>({type:event.type})),ruleResult:next.name};
 }
 function shoot(state,shot){
  validate(state);insist(state.winner===null&&!state.ballInHand,'shot_not_allowed');
  insist(exact(shot,['angle','power','offset'])&&finite(shot.angle,-Math.PI,Math.PI)&&finite(shot.power,0.05,core.maxPower)&&
   exact(shot.offset,['x','y'])&&finite(shot.offset.x,-core.offCenterLimit,core.offCenterLimit)&&finite(shot.offset.y,-core.offCenterLimit,core.offCenterLimit)&&
   Math.hypot(shot.offset.x,shot.offset.y)<=core.offCenterLimit,'invalid_shot');
  const table=restore(state);insist(table.cueball.onTable(),'shot_not_allowed');
  const strike=core.cueStrike(shot.angle,shot.power,new Vector3(shot.offset.x,shot.offset.y,0),0);
  table.cueball.state=State.Sliding;table.cueball.vel.copy(strike.vel);table.cueball.rvel.copy(strike.rvel);
  const frames=[],started=performance.now();let steps=0;
  const frame=()=>({t:table.time/1000,balls:table.balls.map(ball=>({id:ball.id,pos:[ball.pos.x,ball.pos.y,ball.pos.z],state:ball.state}))});
  frames.push(frame());
  while(!table.allStationary()&&steps<maxSteps){
   table.advance(step);steps++;
   if(steps%frameEvery===0)frames.push(frame());
  }
  insist(table.allStationary(),'simulation_limit');frames.push(frame());
  const applied=applyRules(table,state);
  return {...applied,frames,simulatedSeconds:table.time/1000,steps,computeMs:performance.now()-started};
 }
 return {initial,validate,place,shoot,geometry:()=>{TableConfig.apply('eightball',8);return {halfX:TableGeometry.tableX,halfY:TableGeometry.tableY,radius:R,
  pockets:core.PocketGeometry.pocketCenters.map(pocket=>({x:pocket.pos.x,y:pocket.pos.y,radius:pocket.radius}))};}};
}
module.exports={createBilliardsModel,BilliardsError};
