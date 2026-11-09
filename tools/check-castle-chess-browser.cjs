'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setTimeout:sleep}=require('node:timers/promises');
const {chromium}=require('./castle-deps.cjs')('playwright');
const {createChessServer}=require('../ops/castle-chess/server.cjs');
const {ChessRooms}=require('../ops/castle-chess/rooms.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const output=path.resolve(__dirname,'../../output/castle-chess-browser');
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const secret='synthetic-chess-browser-secret-not-a-school-key',profiles=new Map(),config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]},errors=[],results=[],contexts=[];
  const rooms=new ChessRooms(),lookup=async id=>({version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:Date.now()});
  const server=createChessServer({config,lookup,rooms});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
  const student={kind:'student',eligible:true,age:9,gradeLevel:4,classId:17};let browser;
  async function token(id,profile=student){profiles.set(id,profile);return new SignJWT({identifier:id,username:'Synthetic participant',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode(secret));}
  async function participant(id,profile=student,width=1100){
    const auth=await token(id,profile),context=await browser.newContext({viewport:{width,height:940}});contexts.push(context);
    await context.addInitScript(value=>localStorage.setItem('authToken',value),auth);
    await context.route('**/castle-content/vendor/lucide.min.js',route=>route.fulfill({path:path.resolve(__dirname,'../castle/vendor/lucide.min.js'),contentType:'text/javascript'}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error'&&/Content Security|Refused to|Uncaught/.test(msg.text()))errors.push(msg.text());});
    await page.goto(config.origin+'/castle-chess/');await page.getByText('Verbunden',{exact:true}).waitFor();await page.locator('#board .pieces g[data-square]').first().waitFor();
    return {id,auth,context,page};
  }
  async function waitMove(page,text){await page.locator('#moves').getByText(text,{exact:true}).waitFor();}
  async function square(page,name){await page.locator('#board').scrollIntoViewIfNeeded();const rect=await page.locator(`#board rect.square[data-square="${name}"]`).boundingBox();assert.ok(rect);await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);}
  async function move(page,from,to,san){await square(page,from);await square(page,to);await waitMove(page,san);}
  async function action(page,id){await page.locator('#'+id).click();if(await page.locator('#confirm').isVisible()){await page.locator('#confirm-yes').click();}}
  async function layout(page,label){
    const data=await page.evaluate(()=>{const board=document.getElementById('board').getBoundingClientRect();return {
      overflow:document.documentElement.scrollWidth>innerWidth+1,squares:document.querySelectorAll('#board rect.square[data-square]').length,
      pieces:document.querySelectorAll('#board .pieces g[data-square]').length,boardWidth:board.width,boardHeight:board.height,
      clipped:[...document.querySelectorAll('h1,h2,button,label,#position-status,#your-color')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim()),
      spriteLoaded:Boolean(document.querySelector('#wp')&&document.querySelector('#bk')),icons:document.querySelectorAll('svg.lucide').length};});
    assert.equal(data.overflow,false,label);assert.equal(data.squares,64,label);assert.ok(Math.abs(data.boardWidth-data.boardHeight)<1,label);assert.deepEqual(data.clipped,[],label);assert.equal(data.spriteLoaded,true,label);assert.ok(data.icons>=4,label);
    results.push({label,...data});await page.screenshot({path:path.join(output,label+'.png'),fullPage:true});
  }
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const a=await participant('chess-browser-a@invalid.local'),b=await participant('chess-browser-b@invalid.local'),watch=await participant('chess-browser-watch@invalid.local');
    await a.page.locator('#white').click();await b.page.locator('#black').click();await a.page.getByText('Weiß am Zug',{exact:true}).waitFor();
    await a.page.evaluate(()=>{window.originalBoard=document.querySelector('#board svg.cm-chessboard');window.originalSquares=[...document.querySelectorAll('#board rect.square')];});
    const before=await a.page.locator('#board').boundingBox();await square(a.page,'e2');
    assert.ok(await a.page.locator('#board .marker-dot').count()>=2);assert.equal(await a.page.locator('#board .pieces g[data-square]').count(),32);assert.deepEqual(await a.page.locator('#board').boundingBox(),before);
    assert.equal(await a.page.evaluate(()=>originalBoard===document.querySelector('#board svg.cm-chessboard')&&originalSquares.every((square,i)=>square===document.querySelectorAll('#board rect.square')[i])),true);
    await square(a.page,'e4');for(const actor of [a,b,watch])await waitMove(actor.page,'e4');
    assert.equal(await watch.page.locator('#white').isDisabled(),true);assert.equal(await watch.page.locator('#submit-move').isDisabled(),true);
    await move(b.page,'e7','e5','e5');await move(a.page,'g1','f3','Nf3');await waitMove(watch.page,'Nf3');await layout(a.page,'two-players-desktop');
    results.push({label:'live-shared-board',isolatedBrowsers:3,sameMoveList:true,spectatorCannotMove:true,selectionRetains64SquaresAnd32Pieces:true,boardAndSquaresNotRecreatedOnClick:true});
    // No browser is a host: explicit departure preserves the game, and a third player can take the vacant seat.
    await action(a.page,'leave-seat');await watch.page.locator('#white:not(:disabled)').waitFor();await watch.page.locator('#white').click();await move(b.page,'b8','c6','Nc6');await move(watch.page,'f1','c4','Bc4');
    await waitMove(a.page,'Bc4');await watch.page.reload();await watch.page.locator('#resume').waitFor({state:'visible'});await watch.page.locator('#resume').click();await watch.page.getByText('Du spielst Weiß',{exact:true}).waitFor();
    await b.page.locator('#offer-draw').click();await watch.page.locator('#draw-offer').waitFor({state:'visible'});await watch.page.locator('#accept-draw').click();await a.page.getByText('1/2-1/2 · Remis vereinbart',{exact:true}).waitFor();
    await watch.page.locator('#rematch').click();await b.page.locator('#rematch').click();await b.page.getByText('Du spielst Weiß',{exact:true}).waitFor();await watch.page.getByText('Du spielst Schwarz',{exact:true}).waitFor();assert.equal(await a.page.locator('#moves li').count(),0);
    results.push({label:'seat-lifecycle',creatorCanLeave:true,replacementContinuesSameGame:true,reloadExplicitResume:true,drawNeedsOtherPlayer:true,rematchSwapsColors:true});
    const staff=await participant('chess-browser-staff@invalid.local',{kind:'staff',eligible:true,age:null,gradeLevel:null,classId:null});await action(staff.page,'reset');await b.page.locator('#white:not(:disabled)').waitFor();assert.equal(await b.page.locator('#leave-seat').isVisible(),false);
    await a.page.locator('[data-mode=practice]').click();await move(a.page,'e2','e4','e4');await move(a.page,'e7','e5','e5');await a.page.locator('#undo').click();assert.equal(await a.page.locator('#moves').getByText('e5',{exact:true}).count(),0);
    await action(a.page,'restart');await a.page.waitForFunction(()=>document.querySelectorAll('#moves li').length===0);
    for(const [from,to,san]of [['a2','a4','a4'],['h7','h5','h5'],['a4','a5','a5'],['h5','h4','h4'],['a5','a6','a6'],['h4','h3','h3'],['a6','b7','axb7'],['h3','g2','hxg2']])await move(a.page,from,to,san);
    await square(a.page,'b7');await square(a.page,'a8');await a.page.getByRole('dialog',{name:'Bauernumwandlung wählen'}).waitFor();
    await a.page.getByRole('button',{name:'Springer',exact:true}).click();await waitMove(a.page,'bxa8=N');await a.page.waitForFunction(()=>{const pieces=document.querySelectorAll('#board .pieces g[data-square=a8]');return pieces.length===1&&pieces[0].dataset.piece==='wn';});
    await a.page.locator('[data-mode=puzzle]').click();await move(a.page,'e1','e8','Re8#');await a.page.getByText('Gelöst!',{exact:true}).waitFor();
    await a.page.locator('#puzzle').selectOption('queen-team');await square(a.page,'g6');await square(a.page,'g7');await a.page.getByText('Gelöst!',{exact:true}).waitFor();
    await layout(a.page,'puzzle-desktop');results.push({label:'practice',bothSidesLegalMoves:true,undoAndRestart:true,explicitUnderpromotionDialog:true,actualMatePuzzles:true});
    // An actual storage event from a second document must revoke every local mode immediately.
    const unknown=await token('chess-browser-unknown@invalid.local',{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});
    const changer=await a.context.newPage();await changer.goto(config.origin+'/castle-chess/health');await changer.evaluate(value=>localStorage.setItem('authToken',value),unknown);
    await a.page.locator('#message').filter({hasText:'Für dieses Konto besteht kein Schulzugang.'}).waitFor();assert.equal(await a.page.locator('[data-mode=practice]').isDisabled(),true);assert.equal(await a.page.locator('#submit-move').isDisabled(),true);await changer.close();
    profiles.set(staff.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});await staff.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await staff.page.locator('#message').filter({hasText:'Für dieses Konto besteht kein Schulzugang.'}).waitFor({timeout:22000});assert.equal(await staff.page.locator('#reset').isVisible(),false);
    results.push({label:'access',unknownAccountCannotUsePracticeOrSchoolBoard:true,accountChangeClearsBoard:true,freshServerRevocationClosesAccess:true});
    for(const width of [390,320]){
      const mobile=await participant('chess-browser-mobile-'+width+'@invalid.local',student,width);await layout(mobile.page,'mobile-lobby-'+width);await mobile.page.locator('[data-mode=practice]').click();
      await square(mobile.page,'e2');const box=await mobile.page.locator('#board').boundingBox();assert.equal(await mobile.page.locator('#board rect.square').count(),64);assert.equal(await mobile.page.locator('#board .pieces g[data-square]').count(),32);assert.ok(box.width<=width);
      await square(mobile.page,'e4');await waitMove(mobile.page,'e4');await layout(mobile.page,'mobile-moved-'+width);
      await mobile.page.locator('#move-from').selectOption('e7');await mobile.page.locator('#move-to').selectOption('e5');await mobile.page.locator('#submit-move').click();await waitMove(mobile.page,'e5');await mobile.context.close();
    }
    assert.deepEqual(errors,[]);const evidence={passed:true,syntheticProfilesOnly:true,realPupilAccountsUsed:false,productionServerTested:false,results,errors};fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
  }catch(error){console.error(JSON.stringify({browserErrors:[...new Set(errors)]}));for(const [index,context]of contexts.entries())for(const page of context.pages())if(!page.isClosed())await page.screenshot({path:path.join(output,'failure-'+index+'.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
