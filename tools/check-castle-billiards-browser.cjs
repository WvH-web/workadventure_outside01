'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('./castle-local-storage.cjs');storage.configure();
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {createBilliardsServer}=require('../ops/castle-billiards/server.cjs'),{BilliardsRooms}=require('../ops/castle-billiards/rooms.cjs'),{PhysicsPool}=require('../ops/castle-billiards/physics-pool.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const output=storage.outputPath('billiards-browser/'+new Date().toISOString().replace(/[:.]/g,'-')),sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function main(){
 const secret=crypto.randomBytes(32).toString('hex'),profiles=new Map(),pool=new PhysicsPool(),rooms=new BilliardsRooms({pool}),config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]};
 const lookup=async id=>({version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:Date.now()});
 const server=createBilliardsServer({config,lookup,rooms});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
 let browser,phase='launch';const pages=[],errors=[],foreign=[],cases=[],screens=[];
 const mark=value=>{phase=value;console.log('Billard browser: '+value);};
 async function open(label,viewport,mobile=false){
  const id='billiards-'+label+'@invalid.local';profiles.set(id,{kind:'student',eligible:true,age:12,gradeLevel:6,classId:17});
  const token=await new SignJWT({identifier:id,username:'Isolated billiards test',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(Date.now()/1000)+3600).sign(new TextEncoder().encode(secret));
  const context=await browser.newContext({viewport,...(mobile?{isMobile:true,hasTouch:true}:{})});
  await context.addInitScript(({origin,token})=>{if(location.origin===origin)localStorage.setItem('authToken',token);},{origin:config.origin,token});
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const url=new URL(request.url());if(url.origin!==config.origin)foreign.push(url.origin+url.pathname);assert.equal(url.searchParams.has('authToken'),false);assert.equal(url.searchParams.has('access_token'),false);});
  await page.goto(config.origin+'/castle-billiards/#table=tisch-1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.castleBilliards?.connected);
  return {id,page,context};
 }
 const wait=(page,fn,arg)=>page.waitForFunction(fn,arg,{polling:100,timeout:30000});
 async function view(user,name){
  await user.page.waitForTimeout(400);const result=await user.page.evaluate(()=>{
   const app=castleBilliards,r=app.renderer,rect=r.canvas.getBoundingClientRect(),g=r.geometry;
   const corners=[[-r.tableBounds.x,-r.tableBounds.y],[r.tableBounds.x,r.tableBounds.y]];
   return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,
    canvas:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},visibleBalls:r.meshes.filter(mesh=>mesh.visible).length,drawCalls:r.renderer.info.render.calls,
    statusBottom:document.getElementById('shoot').getBoundingClientRect().bottom,
    corners:corners.map(([x,y])=>{const point=r.point.clone().set(x,y,0).applyMatrix4(r.group.matrixWorld).project(r.camera);return {x:(point.x+1)*rect.width/2,y:(1-point.y)*rect.height/2};})};
  });
  assert.equal(result.overflow,false);assert.ok(result.canvas.height>=120&&result.canvas.width>=280);assert.ok(result.visibleBalls>=10&&result.drawCalls>10);assert.ok(result.statusBottom<=result.height+1);
  for(const point of result.corners)assert.ok(point.x>=0&&point.x<=result.canvas.width&&point.y>=0&&point.y<=result.canvas.height,'The actual table must fit: '+name);
  const pixels=await user.page.locator('canvas#table').screenshot();assert.ok((await sharp(pixels).stats()).channels.slice(0,3).every(c=>c.stdev>12));
  await user.page.screenshot({path:path.join(output,name+'.png')});screens.push({name,...result,pixelSha256:crypto.createHash('sha256').update(pixels).digest('hex')});return pixels;
 }
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  mark('desktop-and-touch-entry');const a=await open('a',{width:1440,height:900}),b=await open('b',{width:390,height:844},true),watch=await open('watch',{width:320,height:469},true);
  for(const user of [a,b,watch])assert.equal(await user.page.evaluate(()=>castleBilliards.state.self.staff),false,'Token teacher tags must not grant staff rights');
  await a.page.getByRole('button',{name:'Platz 1',exact:true}).click();await b.page.getByRole('button',{name:'Platz 2',exact:true}).tap();
  await wait(a.page,()=>castleBilliards.state.board.seats.every(seat=>seat.connected));await wait(b.page,()=>castleBilliards.state.board.seats.every(seat=>seat.connected));
  assert.equal(await watch.page.locator('#shoot').isDisabled(),true);await view(a,'desktop-before');await view(b,'touch-before');await view(watch,'compact-spectator');
  cases.push('two occupied places and a real read-only spectator; no staff grant from token tags');
  mark('actual-authoritative-break');const before=await a.page.evaluate(()=>castleBilliards.renderer.meshes.map(mesh=>mesh.position.toArray()));
  await a.page.getByRole('button',{name:'Sto\u00dfen',exact:true}).click();for(const user of [a,b,watch])await wait(user.page,()=>castleBilliards.state.board.state.shots===1);
  const states=[];for(const user of [a,b,watch])states.push(await user.page.evaluate(()=>castleBilliards.state.board.state));assert.deepEqual(states[0],states[1]);assert.deepEqual(states[0],states[2]);
  const trajectories=[];for(const user of [a,b,watch])trajectories.push(await user.page.evaluate(()=>castleBilliards.renderer.animation.frames));assert.deepEqual(trajectories[0],trajectories[1]);assert.deepEqual(trajectories[0],trajectories[2]);
  await a.page.waitForTimeout(600);const middle=await a.page.evaluate(()=>castleBilliards.renderer.meshes.map(mesh=>mesh.position.toArray()));assert.notDeepEqual(before,middle);
  await view(a,'desktop-moving');await view(b,'touch-moving');cases.push('one server-calculated break, identical complete positions and trajectory in all three browsers; moving nonblank 3D canvas');
  await wait(a.page,()=>!castleBilliards.state.board.animation||castleBilliards.state.board.animation.endsAt<Date.now()+castleBilliards.renderer.clockOffset);
  mark('explicit-rejoin');await a.page.reload({waitUntil:'domcontentloaded'});await wait(a.page,()=>castleBilliards.connected);
  await a.page.getByRole('button',{name:'Platz \u00fcbernehmen',exact:true}).waitFor();assert.equal(await a.page.evaluate(()=>castleBilliards.state.self.seat),null);
  await a.page.getByRole('button',{name:'Platz \u00fcbernehmen',exact:true}).click();await wait(a.page,()=>castleBilliards.state.self.seat===0);assert.equal(await a.page.evaluate(()=>castleBilliards.state.board.state.shots),1);
  cases.push('actual reload reserves the same place and requires explicit takeover; authoritative positions survive');
  mark('mutual-rematch-and-opponent-stroke');await a.page.getByRole('button',{name:'Partie aufgeben',exact:true}).click();
  await a.page.getByRole('button',{name:'Best\u00e4tigen',exact:true}).click();await wait(b.page,()=>castleBilliards.state.board.state.winner===1);
  await a.page.getByRole('button',{name:'Neue Partie',exact:true}).click();await b.page.getByRole('button',{name:'Neue Partie',exact:true}).tap();
  await wait(b.page,()=>castleBilliards.state.self.seat===0&&castleBilliards.state.board.state.shots===0&&castleBilliards.canAct());
  await b.page.getByRole('button',{name:'Effet einstellen',exact:true}).tap();const spin=b.page.locator('#spin-x'),spinBox=await spin.boundingBox();
  await spin.tap({position:{x:spinBox.width*.7,y:spinBox.height/2}});await b.page.waitForFunction(()=>Number(document.getElementById('spin-x').value)>0);
  await b.page.getByRole('button',{name:'\u00dcbernehmen',exact:true}).tap();await b.page.waitForFunction(()=>castleBilliards.offset.x>0);
  const version=await b.page.evaluate(()=>castleBilliards.state.board.state.version);await b.page.getByRole('button',{name:'Sto\u00dfen',exact:true}).tap();
  for(const user of [a,b,watch])await wait(user.page,version=>castleBilliards.state.board.state.version===version+1&&castleBilliards.state.board.state.shots===1,version);
  const secondState=await b.page.evaluate(()=>castleBilliards.state.board.state),secondFrames=await b.page.evaluate(()=>castleBilliards.renderer.animation.frames);
  assert.deepEqual(await a.page.evaluate(()=>castleBilliards.state.board.state),secondState);assert.deepEqual(await a.page.evaluate(()=>castleBilliards.renderer.animation.frames),secondFrames);
  await view(b,'touch-opponent-stroke');cases.push('real resignation and mutual rematch; places swap; the other participant executes an actual touch stroke with spin');
  await wait(b.page,()=>!castleBilliards.state.board.animation||castleBilliards.state.board.animation.endsAt<Date.now()+castleBilliards.renderer.clockOffset);
  mark('late-wide-spectator-and-camera');const wide=await open('late',{width:2400,height:1000});assert.deepEqual(await wide.page.evaluate(()=>castleBilliards.state.board.state),secondState);await view(wide,'wide-spectator');
  await wide.page.getByRole('button',{name:'Ansicht wechseln',exact:true}).click();assert.equal(await wide.page.evaluate(()=>castleBilliards.renderer.mode),'angle');await view(wide,'wide-3d-angle');
  cases.push('late spectator receives the current table; full table framing at 1440, 2400, 390 and 320 pixels and real 3D view change');
  mark('explicitly-simulated-graphics-loss');const preserved=await wide.page.evaluate(()=>castleBilliards.state.board.state);
  await wide.page.evaluate(()=>{const r=castleBilliards.renderer,extension=r.renderer.getContext().getExtension('WEBGL_lose_context');if(!extension)throw Error('Graphics-loss test unavailable');window.__billiardsGraphics=extension;extension.loseContext();});
  await wait(wide.page,()=>!castleBilliards.renderer.ready);assert.equal(await wide.page.locator('#shoot').isDisabled(),true);
  await wide.page.waitForTimeout(700);await wide.page.evaluate(()=>window.__billiardsGraphics.restoreContext());await wait(wide.page,()=>castleBilliards.renderer.ready);
  assert.deepEqual(await wide.page.evaluate(()=>castleBilliards.state.board.state),preserved);await view(wide,'wide-after-graphics-restore');
  cases.push('explicitly simulated loss and restoration of only the own WebGL context; controls stop and the unchanged table renders again');
  mark('fresh-revocation');const revokedSeat=await b.page.evaluate(()=>castleBilliards.state.self.seat);profiles.set(b.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});await b.page.evaluate(()=>castleBilliards.ping());
  await wait(b.page,()=>!castleBilliards.allowed&&!castleBilliards.renderer.group.visible);assert.equal(await b.page.locator('#shoot').isDisabled(),true);
  await wait(a.page,seat=>castleBilliards.state.board.seats[seat].occupied===false,revokedSeat);cases.push('fresh revoked school status clears the old 3D table and frees its place, without pretending offline access');
  assert.deepEqual(errors,[]);assert.deepEqual(foreign,[]);
  const result={passed:true,isolatedLoopback:true,syntheticAccountsOnly:true,normalMicrosoftAccountsUsed:false,normalPublishedPreview:false,liveServicesChanged:false,
   networkResponsesSubstituted:false,schoolLookup:'isolated synthetic fixture only',cases,screens,canonicalStateSha256:sha(states[0]),trajectorySha256:sha(trajectories[0]),frames:trajectories[0].length,
   opponentCanonicalStateSha256:sha(secondState),opponentTrajectorySha256:sha(secondFrames),bothBrowsersExecutedActualStrokes:true,mutualRematchAndSeatSwap:true,errors,foreignRequests:foreign,fullCastleApprovalFor400:false};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,output,cases:cases.length,screens:screens.length,frames:result.frames}));
 }catch(error){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({phase,error:error.message,errors,foreign},null,2));for(const [i,page]of pages.entries())await page.screenshot({path:path.join(output,'failure-'+i+'.png')}).catch(()=>{});throw error;}
 finally{if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
main().catch(error=>{console.error('Billard browser probe stopped: '+error.message);process.exitCode=1;});
