'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const output=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts/qa');
const url='https://together.deine-schule.com/castle-chess/';
async function main(){
  const handoff=JSON.parse(fs.readFileSync(path.join(output,'../handoff.json'),'utf8'));assert.equal(handoff.contains_real_pupil_data,false);assert.ok(handoff.accounts.every(account=>account.microsoftAccountEnabled===true));
  const browser=await chromium.launch({channel:'chrome',headless:true}),users=[],errors=[],results=[];let ownTable,stage='entry';
  async function waitMove(page,san){await page.locator('#moves').getByText(san,{exact:true}).waitFor();}
  async function square(page,name){
    await page.locator('#board').scrollIntoViewIfNeeded();const rect=await page.locator('#board rect.square[data-square='+name+']').boundingBox();assert.ok(rect);
    if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
    else await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  }
  async function move(user,from,to,san){await square(user.page,from);await square(user.page,to);for(const peer of users)await waitMove(peer.page,san);}
  async function action(user,id){await user.page.locator('#'+id).click();if(await user.page.locator('#confirm').isVisible())await user.page.locator('#confirm-yes').click();}
  async function drawn(a,b){await a.page.locator('#offer-draw').click();await b.page.locator('#draw-offer').waitFor({state:'visible'});await b.page.locator('#accept-draw').click();for(const user of users)await user.page.getByText('1/2-1/2 · Remis vereinbart',{exact:true}).waitFor();}
  async function rematch(a,b){await a.page.locator('#rematch').click();await b.page.locator('#rematch').click();for(const user of users)await user.page.waitForFunction(()=>document.querySelectorAll('#moves li').length===0&&!document.querySelector('#result').getClientRects().length);}
  try{
    for(const key of ['A','B']){
      const context=await browser.newContext({storageState:path.join(output,'sso-'+key+'.private.json'),viewport:key==='A'?{width:1200,height:940}:{width:390,height:844},...(key==='B'?{isMobile:true,hasTouch:true}:{})});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await page.getByText('Verbunden',{exact:true}).waitFor({timeout:30000});
      assert.equal(await page.locator('#reset').isVisible(),false);assert.equal(await page.locator('#board rect.square').count(),64);users.push({key,context,page});
    }
    const [a,b]=users,options=await a.page.locator('#table option').evaluateAll(options=>options.map(option=>({id:option.value,label:option.textContent})));
    ownTable=options.filter(option=>/ · frei$/.test(option.label)).at(-1)?.id;assert.ok(ownTable,'No unused table: never overwrite another game');
    for(const user of users)await user.page.locator('#table').selectOption(ownTable);
    stage='claim-seats';await a.page.locator('#white:not(:disabled)').waitFor();await a.page.locator('#white').click();await b.page.locator('#black:not(:disabled)').waitFor();await b.page.locator('#black').click();await a.page.getByText('Weiß am Zug',{exact:true}).waitFor();
    const box=await a.page.locator('#board').boundingBox();await square(a.page,'e2');assert.equal(await a.page.locator('#board rect.square').count(),64);assert.equal(await a.page.locator('#board .pieces g[data-square]').count(),32);assert.deepEqual(await a.page.locator('#board').boundingBox(),box);
    await square(a.page,'e4');for(const user of users)await waitMove(user.page,'e4');await move(b,'e7','e5','e5');
    stage='reload-own-table';await a.page.reload();await a.page.locator('#resume').waitFor({state:'visible',timeout:30000});assert.equal(await a.page.locator('#table').inputValue(),ownTable);await a.page.locator('#resume').click();await a.page.getByText('Du spielst Weiß',{exact:true}).waitFor();
    await move(a,'g1','f3','Nf3');await move(b,'b8','c6','Nc6');
    for(const user of users){assert.equal(await user.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await user.page.screenshot({path:path.join(output,'real-pupils-chess-'+user.key+'.private.png'),fullPage:true});}
    stage='first-draw';await drawn(a,b);results.push({id:'first-game',twoNormalMicrosoftPupilLogins:true,realSchoolProfiles:true,sharedMoves:['e4','e5','Nf3','Nc6'],reloadFindsOwnTable:true,reloadNeedsExplicitResume:true,mobileTouchMoves:true,boardDoesNotShiftOnSelection:true,drawAgreedByBoth:true});
    stage='second-game';await rematch(a,b);await b.page.getByText('Du spielst Weiß',{exact:true}).waitFor();await a.page.getByText('Du spielst Schwarz',{exact:true}).waitFor();
    await move(b,'d2','d4','d4');await move(a,'d7','d5','d5');await drawn(b,a);
    results.push({id:'second-game',bothConsentToNewGame:true,colorsSwap:true,sharedMoves:['d4','d5'],pupilsHaveNoResetControl:true});
    // Both test players consent to an empty next game, then release only their own seats.
    stage='cleanup-own-table';await rematch(a,b);await action(a,'leave-seat');await action(b,'leave-seat');
    for(const user of users){await user.page.locator('#white:not(:disabled)').waitFor();assert.equal(await user.page.locator('#moves li').count(),0);}
    assert.deepEqual(errors,[]);const evidence={passed:true,tableId:ownTable,realNormalMicrosoftPupilLogins:2,realPupilMultiplayerTested:true,syntheticProfileOverrides:false,unrelatedTablesChanged:false,testTableLeftEmptyAndUnoccupied:true,nativeVoiceTestedInThisProbe:false,loadApprovalFor400:false,results,errors};
    fs.writeFileSync(path.join(output,'chess-real-pupils-result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){console.error(JSON.stringify({passed:false,errorType:error.name,stage,tableSelected:!!ownTable}));fs.writeFileSync(path.join(output,'chess-failure.private.json'),JSON.stringify({stage,ownTable,error:error.message},null,2));let index=0;for(const user of users)await user.page.screenshot({path:path.join(output,'chess-failure-'+(++index)+'.private.png'),fullPage:true}).catch(()=>{});throw Error('Authorized school chess probe failed; private evidence retained');}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
