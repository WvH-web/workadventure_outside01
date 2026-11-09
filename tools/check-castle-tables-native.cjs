'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {join,sit}=require('./check-cinema-live.cjs');
const {revision}=require('./build-castle-expansion.cjs');
const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(root,'qa/tables-native');
const chess='https://together.deine-schule.com/castle-chess/#table=tisch-1';
const pause=()=>new Promise(resolve=>setTimeout(resolve,300));
async function wait(user,fn,arg){return user.script.waitForFunction(fn,arg,{polling:200,timeout:20000});}
async function panel(user,url){
  for(let i=0;i<80;i++){const frame=user.page.frames().find(frame=>frame.url()===url);if(frame)return frame;await pause();}
  throw Error('Automatic table panel missing');
}
async function stand(user){await user.script.evaluate(()=>castleRoom.stand());await wait(user,()=>!castleActivities.rounds.value&&!castleActivities.website);}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let stage='chess-entry';const users=[],evidence={revision,loadApprovalFor400:false};
  async function enter(number,room,school=false){
    const user=await join(browser,number,{roomId:room,roomUrl:'https://together.deine-schule.com/~/castle-preview/'+room+'.wam#start',outputDir:output,label:'Tischprobe',seats:12,groups:3,revision,
      ...(school?{schoolStorageState:path.join(root,'qa/sso-'+(number===1?'A':'B')+'.private.json')}:{}),parking:room==='mittelstufe'?[[112,400],[880,400]]:[[112,272],[432,608],[800,352]],characterTextureId:'wvh-event-mira-v1'});
    users.push(user);return user;
  }
  try{
    const a=await enter(1,'mittelstufe',true),b=await enter(2,'mittelstufe',true);
    assert.equal(a.page.frames().some(frame=>frame.url().startsWith(chess.split('#')[0])),false);
    const chairs=await a.script.evaluate(()=>castleRoom.layout.seats.filter(s=>s.audioGroup==='spieltisch').map(s=>s.id));assert.ok(chairs.length>=2);
    stage='fixed-auto-chess';await sit(a,chairs[0]);const left=await panel(a,chess);await left.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});
    assert.equal(await left.locator('#table').inputValue(),'tisch-1');assert.equal(await left.locator('#table').isDisabled(),true);
    const round=await a.script.evaluate(()=>castleActivities.rounds.value.round);assert.ok(round?.id);
    stage='late-chess-participant';await sit(b,chairs[1]);const right=await panel(b,chess);await right.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});
    assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);assert.equal(await right.locator('#table').inputValue(),'tisch-1');
    assert.equal(await left.locator('#moves').innerText(),await right.locator('#moves').innerText());
    assert.equal(await left.locator('#reset').isVisible(),false);assert.equal(await right.locator('#reset').isVisible(),false);
    stage='standing-one';await stand(a);assert.equal(b.page.frames().some(frame=>frame.url()===chess),true);assert.deepEqual(await b.script.evaluate(()=>castleActivities.rounds.value.round),round);
    await sit(a,chairs[0]);await panel(a,chess);await wait(a,id=>castleActivities.rounds.value?.round?.id===id,round.id);
    stage='last-standing';await stand(a);await stand(b);await sit(a,chairs[0]);await wait(a,id=>castleActivities.rounds.value?.round?.id&&castleActivities.rounds.value.round.id!==id,round.id);await panel(a,chess);
    await a.page.screenshot({path:path.join(output,'chess-auto-native.private.png')});
    evidence.chess={normalMicrosoftPupils:2,automaticOnSitting:true,physicalBoardBound:true,lateJoinSameRound:true,oneStandingKeepsPeerRound:true,allStandingCreatesNewRound:true,noUnrelatedGameMovesOrSeatsChanged:true};
    for(const user of [a,b])await user.context.close();
    stage='choice-entry';const one=await enter(1,'oberstufe'),two=await enter(2,'oberstufe');
    const seats=await one.script.evaluate(()=>castleRoom.layout.seats.filter(s=>s.audioGroup==='buchclub').map(s=>s.id));
    await sit(one,seats[0]);await one.page.getByRole('button',{name:'Erzaehlkarten',exact:true}).waitFor();await one.page.getByRole('button',{name:'Erzaehlkarten',exact:true}).click();
    const story='https://wvh-web.github.io/workadventure_outside01/castle/story.html#table',first=await panel(one,story);await first.locator('#roll:not(:disabled)').waitFor();
    const choice=await one.script.evaluate(()=>castleActivities.rounds.value.round);assert.equal(choice.choice,'story');
    stage='shared-choice-late';await sit(two,seats[1]);const second=await panel(two,story);await second.locator('#roll:not(:disabled)').waitFor();assert.deepEqual(await two.script.evaluate(()=>castleActivities.rounds.value.round),choice);
    await first.locator('#roll').click();const cards=await first.locator('body').getAttribute('data-round');assert.ok(cards);await second.waitForFunction(id=>document.body.dataset.round===id,cards);
    stage='creator-departure';await one.context.close();await wait(two,id=>castleActivities.rounds.value?.round?.id===id,choice.id);
    const late=await enter(3,'oberstufe');await sit(late,seats[2]);await panel(late,story);await wait(late,id=>castleActivities.rounds.value?.round?.id===id,choice.id);
    stage='all-leave-reset';await stand(two);await stand(late);await sit(two,seats[1]);await two.page.getByRole('button',{name:'Erzaehlkarten',exact:true}).waitFor();
    assert.equal(await two.script.evaluate(()=>castleActivities.rounds.value.round),null);await two.page.screenshot({path:path.join(output,'shared-choice-native.private.png')});
    evidence.choice={syntheticParticipants:3,visiblePickerClicked:true,lateJoinSameChoice:true,realSharedStoryBroadcast:true,creatorLeavingMapPreservesRound:true,lastStandingResetsChoice:true};
    const errors=users.flatMap(user=>user.errors);assert.deepEqual(errors,[]);evidence.passed=true;evidence.errors=errors;fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,diagnostics:users.map(u=>u.diagnostics)},null,2));console.error(JSON.stringify({passed:false,stage,errorType:error.name}));let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+(++i)+'.private.png')}).catch(()=>{});process.exitCode=1;}
  finally{await browser.close();}
}
main().catch(error=>{console.error('Native table probe stopped: '+error.name);process.exitCode=1;});
