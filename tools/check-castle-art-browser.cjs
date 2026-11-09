'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {createFixture}=require('./castle-art-fixture.cjs');
const output=path.resolve(__dirname,'../../output/castle-art-browser');
async function main(){
  fs.mkdirSync(output,{recursive:true});let fixture=await createFixture();const errors=[],requests=[],results=[];let browser;
  async function participant(id,kind='student',width=1200){
    const token=await fixture.identity(id,kind),context=await browser.newContext({viewport:{width,height:900},...(width<700?{isMobile:true,hasTouch:true}:{})});
    await context.addInitScript(value=>localStorage.setItem('authToken',value),token);await context.route('**/castle-content/vendor/lucide.min.js',route=>route.fulfill({path:path.resolve(__dirname,'../castle/vendor/lucide.min.js'),contentType:'text/javascript'}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security|Refused to|Uncaught/.test(message.text()))errors.push(message.text());});
    page.on('request',request=>requests.push(request.url()));await page.goto(fixture.config.origin+'/castle-art/');
    if(kind==='unknown'||kind==='parent'){await page.locator('#message').filter({hasText:'kein Schulzugang'}).waitFor();return {id,token,page,context};}
    await page.getByText('Verbunden',{exact:true}).waitFor();const board=await frame(page);return {id,token,page,context,board};
  }
  async function frame(page){
    await page.locator('iframe').waitFor();for(let n=0;n<60;n++){
      const handle=await page.locator('iframe').elementHandle(),child=await handle?.contentFrame();
      if(child?.url().includes('/castle-art/wbo/boards/')){
        try{await child.waitForFunction(()=>window.WBOApp?.connection?.state==='connected'&&window.WBOApp?.access?.boardState?.canWrite===true,undefined,{timeout:1000});return child;}catch(error){if(n===59)throw error;}
      }
      await page.waitForTimeout(100);
    }throw Error('No real WBO board');
  }
  async function draw(user,x=240,y=220){
    const child=await frame(user.page),before=await child.evaluate(()=>({count:document.querySelector('#drawingArea').children.length,seq:WBOApp.replay.authoritativeSeq}));await child.locator('#toolID-pencil').click();const board=await user.page.locator('iframe').boundingBox();
    await user.page.mouse.move(board.x+x,board.y+y);await user.page.mouse.down();await user.page.mouse.move(board.x+x+70,board.y+y+50,{steps:10});await user.page.mouse.up();
    await child.waitForFunction(before=>document.querySelector('#drawingArea')?.children.length>before.count&&WBOApp.replay.authoritativeSeq>before.seq&&WBOApp.writes.bufferedWrites.length===0,before);return child;
  }
  async function peers(board,count){
    await board.waitForFunction(count=>[...WBOApp.presence.users.values()].filter(user=>!user.disconnectedAt).length===count,count);
  }
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const a=await participant('art-browser-a@invalid.local'),b=await participant('art-browser-b@invalid.local');
    await draw(a);await b.board.waitForFunction(()=>document.querySelector('#drawingArea').children.length>0);
    await b.board.waitForFunction(()=>WBOApp.connection.socket.io.engine.transport.name==='websocket');
    const original=await b.board.locator('#drawingArea').innerHTML();
    const rejection=await b.board.evaluate(async()=>{
      const {SocketEvents}=await import('/castle-art/wbo/js/socket_events.js'),{MutationType}=await import('/castle-art/wbo/js/mutation_type.js');
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No clear rejection')),4000);WBOApp.connection.socket.once(SocketEvents.MUTATION_REJECTED,value=>{clearTimeout(timer);resolve(value);});
        WBOApp.connection.socket.emit(SocketEvents.BROADCAST,{tool:11,type:MutationType.CLEAR,id:'',token:'client-cannot-grant-moderation',clientMutationId:crypto.randomUUID()});});
    });
    assert.ok(rejection.reason);assert.equal(await b.board.locator('#drawingArea').innerHTML(),original);assert.equal(await b.board.locator('#toolID-clear').isVisible(),false);
    await b.board.locator('#toolID-text').click();const bBox=await b.page.locator('iframe').boundingBox();await b.page.mouse.click(bBox.x+300,bBox.y+340);
    await b.board.locator('#textToolInput').fill('Unser gemeinsames Schloss');await b.board.locator('#toolID-hand').click();await a.board.getByText('Unser gemeinsames Schloss',{exact:true}).waitFor();
    await a.page.screenshot({path:path.join(output,'shared-desktop.png'),fullPage:true});
    results.push({label:'shared-drawing',actualWboVersion:'2.18.33',isolatedBrowsers:2,otherParticipantReceivesStrokeAndText:true,actualWebSocketUpgrade:true,forgedClearRejectedByWbo:true});
    const pixels=await a.page.locator('iframe').screenshot();assert.ok((await sharp(pixels).stats()).channels.slice(0,3).every(channel=>channel.stdev>8));
    const unknown=await participant('art-browser-unknown@invalid.local','unknown');assert.equal(await unknown.page.locator('iframe').count(),0);await unknown.context.close();
    const c=await participant('art-browser-late@invalid.local');await c.board.getByText('Unser gemeinsames Schloss',{exact:true}).waitFor();
    await peers(b.board,3);await a.context.close();await peers(b.board,2);await draw(c,450,240);await b.board.waitForFunction(()=>document.querySelector('#drawingArea').children.length>=3);
    await b.page.reload();b.board=await frame(b.page);await b.board.getByText('Unser gemeinsames Schloss',{exact:true}).waitFor();
    results.push({label:'late-join-and-reentry',lateJoinGetsExistingDrawing:true,creatorCanLeave:true,remainingParticipantCanContinue:true,reloadRetainsServerDrawing:true});
    const second=await b.context.newPage();await second.goto(fixture.config.origin+'/castle-art/');await second.getByText('Verbunden',{exact:true}).waitFor();await frame(second);await second.close();
    await b.board.waitForFunction(()=>WBOApp.connection.state==='connected');
    results.push({label:'same-account-tabs',secondTabSharesAuthorizedLease:true,closingOneTabDoesNotLogOutTheOther:true});
    const lease=[...fixture.sessions.leases.values()].find(lease=>lease.actor===fixture.sessions.opaque('account:'+b.id));assert.ok(lease);lease.expiresAt=Date.now()-1;fixture.sessions.sweep();
    await b.board.waitForFunction(()=>WBOApp.connection.state==='disconnected');await peers(c.board,1);
    await b.page.locator('#reconnect').click();b.board=await frame(b.page);await b.board.getByText('Unser gemeinsames Schloss',{exact:true}).waitFor();
    results.push({label:'lease-expiry',serverClosesUnrenewedWebSocket:true,noPhantomPeerRemainsUpstream:true,explicitReconnectRestoresSavedBoard:true});
    const staff=await participant('art-browser-staff@invalid.local','staff');await staff.board.locator('#toolID-clear').waitFor({state:'visible'});await staff.board.locator('#toolID-clear').click();
    await staff.board.locator('.wbo-dialog-button-danger').click();await b.board.waitForFunction(()=>document.querySelector('#drawingArea').children.length===0);await c.board.waitForFunction(()=>document.querySelector('#drawingArea').children.length===0);
    fixture.profiles.set(staff.id,{kind:'student',eligible:true,age:9,gradeLevel:3,classId:17});await staff.page.locator('#reconnect').click();staff.board=await frame(staff.page);assert.equal(await staff.board.locator('#toolID-clear').isVisible(),false);
    results.push({label:'fresh-role-moderation',staffClearAffectsAllPeers:true,declassifiedStaffLosesClearTool:true});
    await b.page.locator('#board-select').selectOption('schlossatelier-ideenwand');b.board=await frame(b.page);await draw(b,250,230);assert.equal(await c.board.locator('#drawingArea>*').count(),0);
    const changer=await b.context.newPage();await changer.goto(fixture.config.origin+'/castle-art/health');await changer.evaluate(token=>localStorage.setItem('authToken',token),await fixture.identity('art-browser-switched@invalid.local','unknown'));
    await b.page.locator('#message').filter({hasText:'kein Schulzugang'}).waitFor();assert.equal(await b.page.locator('iframe').count(),0);await changer.close();
    results.push({label:'isolation-and-account-switch',boardsHaveIndependentDrawings:true,accountSwitchClearsBoardImmediately:true});
    for(const width of [390,320]){
      const mobile=await participant('art-browser-mobile-'+width+'@invalid.local','student',width);const child=mobile.board;
      await child.locator('#toolID-pencil').click();const box=await mobile.page.locator('iframe').boundingBox(),count=await child.locator('#drawingArea>*').count();
      const touch=await mobile.context.newCDPSession(mobile.page),before=await c.board.locator('#drawingArea>*').count();
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+160,y:box.y+210}]});
      for(let step=1;step<=10;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+160+step*7,y:box.y+210+step*5}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
      await child.waitForFunction(count=>document.querySelector('#drawingArea').children.length>count&&WBOApp.writes.bufferedWrites.length===0,count);
      await c.board.waitForFunction(count=>document.querySelector('#drawingArea').children.length>count,before);
      assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      // WBO intentionally has a pannable SVG workspace larger than the viewport.
      assert.deepEqual(await child.locator('.tool:visible').evaluateAll(tools=>tools.filter(tool=>{const box=tool.getBoundingClientRect();return box.left<0||box.right>innerWidth+1;}).map(tool=>tool.id)),[]);
      await mobile.page.screenshot({path:path.join(output,'touch-'+width+'.png'),fullPage:true});results.push({label:'touch-'+width,realTouchStrokeReceivedByOtherBrowser:true,outerHasNoOverflow:true,innerToolbarFitsScrollableWorkspace:true});await mobile.context.close();
    }
    const savedDirectory=fixture.directory;await browser.close();browser=null;await fixture.close();
    fixture=await createFixture({directory:savedDirectory});browser=await chromium.launch({channel:'chrome',headless:true});
    const restored=await participant('art-browser-restored@invalid.local');await restored.board.locator('#drawingArea>path').first().waitFor();
    await restored.page.locator('#board-select').selectOption('schlossatelier-ideenwand');restored.board=await frame(restored.page);await restored.board.locator('#drawingArea>path').first().waitFor();
    const exported=await restored.page.request.get(fixture.config.origin+'/castle-art/wbo/download/schlossatelier-ideenwand');assert.equal(exported.status(),200);assert.match(await exported.text(),/<path/);
    results.push({label:'server-restart',realWboGracefulRestartRestoresBothBoards:true,authorizedSvgDownloadWorks:true});
    assert.ok(requests.every(url=>!/[?&]token=/.test(url)));assert.deepEqual(errors,[]);
    const evidence={passed:true,syntheticProfilesOnly:true,productionServerTested:false,actualWboEngineUsed:true,results,errors};fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){console.error(JSON.stringify({browserErrors:[...new Set(errors)]}));let index=0;if(browser)for(const context of browser.contexts())for(const page of context.pages()){
    await page.screenshot({path:path.join(output,'failure-'+(++index)+'.png'),fullPage:true}).catch(()=>{});
    for(const child of page.frames())if(child.url().includes('/castle-art/wbo/boards/'))console.error(JSON.stringify(await child.evaluate(()=>({connection:window.WBOApp?.connection?.state,users:[...(window.WBOApp?.presence?.users?.values()||[])].map(user=>({disconnected:!!user.disconnectedAt})),items:document.querySelector('#drawingArea')?.children.length})).catch(()=>({detached:true}))));
  }throw error;}
  finally{if(browser)await browser.close();await fixture.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
