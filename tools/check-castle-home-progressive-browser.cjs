'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url');
const {chromium}=require('./castle-deps.cjs')('playwright'),{createRehearsal}=require('./castle-home-rehearsal.cjs'),{client}=require('./castle-home-test-client.cjs');
const {PINNED}=require('../ops/castle-homes/progressive-adapter.cjs');
async function main(){
 const fixture=await createRehearsal(),output=path.resolve(__dirname,'../../output/castle-homes/progressive-browser');await fs.mkdir(output,{recursive:true});
 const {ITEMS,ATLAS,W,H,spriteSize}=await import(pathToFileURL(path.join(fixture.source,'planung/zimmer-editor/definitions.js'))),{FINISHES}=await import(pathToFileURL(path.join(fixture.source,'planung/zimmer-editor/finishes.js')));
 const {position}=await import(pathToFileURL(path.join(fixture.source,'planung/zimmer-editor/model.js'))),sharp=require('./castle-deps.cjs')('sharp');
 const atlasItems=[...Object.keys(ATLAS)].map(key=>ITEMS.find(item=>item.atlas===key)),floor=FINISHES.find(row=>row.image);
 const browser=await chromium.launch({channel:'chrome',headless:true}),clients=[],contexts=[],errors=[],checks=[];let stage='seed';
 const ready=async frame=>{await frame.locator('#loading').waitFor({state:'attached'});await frame.locator('#loading').waitFor({state:'hidden',timeout:20000});};
 async function open(who,viewport,fallback=false){
  const context=await browser.newContext({viewport});contexts.push(context);await context.addInitScript(({token,fallback})=>{localStorage.setItem('authToken',token);if(fallback)window.IntersectionObserver=undefined;},{token:fixture.tokens[who],fallback});
  const page=await context.newPage(),images=[];page.on('pageerror',error=>errors.push(error.name));page.on('response',response=>{if(response.request().resourceType()==='image'&&response.status()===200)images.push(new URL(response.url()).pathname.replace(/\/view\/[a-f0-9-]{36}\//,'/view/[view]/'));});
  await page.goto(fixture.gateway.url);const frame=page.frameLocator('iframe[title="Dein Schlosszimmer"]');await ready(frame);await frame.locator('.social-status').filter({hasText:/Dein Zimmer.*1 von 8/}).waitFor();
  const value={context,page,frame,images,who,viewport};clients.push(value);return value;
 }
 const floorPixels=frame=>frame.locator('#room').evaluate(async canvas=>{const c=canvas.getContext('2d');let previous,stable=0;const until=performance.now()+3000;
  do{await new Promise(resolve=>requestAnimationFrame(resolve));const values=[];for(let y=.82;y<=.94;y+=.04)for(let x=.77;x<=.93;x+=.04)values.push(...c.getImageData(Math.floor(canvas.width*x),Math.floor(canvas.height*y),1,1).data);
   const key=JSON.stringify(values);stable=key===previous?stable+1:0;previous=key;if(stable>=3)return values;
  }while(performance.now()<until);throw Error('Floor pixels never settled');
 });
 const thumbnailReady=async canvas=>{await canvas.scrollIntoViewIfNeeded();await canvas.evaluate(async node=>{const until=performance.now()+7000;while(performance.now()<until){const data=node.getContext('2d').getImageData(0,0,node.width,node.height).data;let visible=0;for(let n=3;n<data.length;n+=4)if(data[n])visible++;if(visible>20)return;await new Promise(resolve=>setTimeout(resolve,40));}throw Error('Thumbnail stayed blank');});};
 try{
  const api={};for(const who of ['a','b']){const account=client(fixture.gateway.url,fixture.tokens[who]);await account.open();const profile=(await account.api('guest',{})).value;
   assert.equal(profile.account.role,'student');assert.equal(fixture.game.localProbe,undefined);fixture.game.db.prepare('UPDATE guests SET stars=5000 WHERE id=?').run(profile.me.id);
   const person=fixture.game.people.get(profile.me.id);assert.ok(person&&person.g.id===profile.me.id);person.g.stars=5000;api[who]=account;}
  stage='first-entry';const a=await open('a',{width:1000,height:900}),b=await open('b',{width:390,height:844},true);
  for(const current of [a,b]){assert.equal(new Set(current.images).size,4);assert.equal(current.images.some(row=>row.includes('boden-')),false);checks.push({account:current.who,initialImageCount:4,viewport:current.viewport,noUnusedAtlasOrFloor:true});}
  stage='catalog';for(const current of [a,b]){
   await current.page.bringToFront();if(await current.frame.locator('.room-social-panel').isVisible())await current.frame.locator('.social-tab').click();
   for(const item of atlasItems){await current.frame.locator('#search').fill(item.label);const card=current.frame.locator('.item[data-item="'+item.id+'"]');await thumbnailReady(card.locator('canvas'));}
   checks.find(row=>row.account===current.who).allCatalogAtlasesRendered=atlasItems.length;
   assert.equal(await current.frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false);
  }
  stage='purchase';await a.page.bringToFront();const plant=ITEMS.find(item=>item.id==='pflanze');await a.frame.locator('#search').fill(plant.label);const plantCard=a.frame.locator('.item[data-item="pflanze"]');await thumbnailReady(plantCard.locator('canvas'));
  const [buying]=await Promise.all([a.page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/api/bedroom')&&response.request().method()==='POST'),plantCard.locator('button.gold').first().click()]);assert.equal(buying.status(),200);await ready(a.frame);
  const purchased=(await api.a.api('bedroom')).value;assert.ok(purchased.room.placed.some(row=>row.id==='pflanze'));assert.equal(purchased.room.owned.includes('pflanze'),true);
  stage='alpha-hit-test';const bed=ITEMS.find(item=>item.id==='bett_einfach'),placed=purchased.room.placed.find(row=>row.id===bed.id),at=position(purchased.room,placed),size=spriteSize(bed,at.groundY??at.y);
  const original=await sharp(path.join(fixture.source,'planung/zimmer-editor',ATLAS[bed.atlas])).extract({left:bed.rect[0],top:bed.rect[1],width:bed.rect[2],height:bed.rect[3]}).ensureAlpha().raw().toBuffer();
  const alpha=(u,v)=>original[(Math.floor(v*bed.rect[3])*bed.rect[2]+Math.floor(u*bed.rect[2]))*4+3];assert.ok(alpha(.5,.5)>200);assert.equal(alpha(.03,.03),0);
  const roomCanvas=a.frame.locator('#room');await roomCanvas.scrollIntoViewIfNeeded();const box=await roomCanvas.boundingBox();
  const clickBed=(u,v)=>roomCanvas.click({position:{x:(at.x-size.w*bed.pivot[0]+u*size.w)/W*box.width,y:(at.y-size.h*bed.pivot[1]+v*size.h)/H*box.height}});
  await clickBed(.5,.5);await a.frame.locator('#selected-name').getByText(bed.label,{exact:true}).waitFor();
  await a.frame.locator('.item[data-item="pflanze"] canvas').click();await a.frame.locator('#selected-name').getByText(plant.label,{exact:true}).waitFor();await clickBed(.03,.03);
  await a.frame.locator('#selected-name').getByText(plant.label,{exact:true}).waitFor();assert.deepEqual((await api.a.api('bedroom')).value.room,purchased.room);
  stage='floor-preview';for(const current of [a,b]){
   await current.page.bringToFront();await current.frame.locator('#finishes-tab').click();const card=current.frame.locator('[data-finish="'+floor.id+'"]');await card.scrollIntoViewIfNeeded();const before=await floorPixels(current.frame);
   await card.locator('.finish-swatch').click();await ready(current.frame);await current.page.waitForTimeout(100);const preview=await floorPixels(current.frame);assert.notDeepEqual(preview,before);
   await current.frame.locator('#preview-cancel').click();await ready(current.frame);await current.page.waitForTimeout(80);assert.deepEqual(await floorPixels(current.frame),before);
   checks.find(row=>row.account===current.who).floorPreviewAndExactCancellation=true;
  }
  stage='saved-floor';await a.page.bringToFront();const floorCard=a.frame.locator('[data-finish="'+floor.id+'"]');await floorCard.locator('.finish-swatch').click();await ready(a.frame);
  const [finishing]=await Promise.all([a.page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/api/bedroom')&&response.request().method()==='POST'),a.frame.locator('#preview-apply').click()]);assert.equal(finishing.status(),200);await ready(a.frame);
  const saved=(await api.a.api('bedroom')).value;assert.equal(saved.room.finishes.floor,floor.id);assert.ok(saved.room.finishesOwned.includes(floor.id));
  stage='fresh-device';const second=await open('a',{width:1000,height:900});assert.equal(new Set(second.images).size,6);assert.equal(second.images.filter(row=>row.includes(floor.image)).length,1);
  assert.deepEqual((await api.a.api('bedroom')).value.room,saved.room);await second.page.screenshot({path:path.join(output,'saved-room.png')});await second.page.locator('#leave').click();await second.context.close();
  stage='shared-visit';if(!await a.frame.locator('.room-social-panel').isVisible())await a.frame.locator('.social-tab').click();await a.frame.getByRole('button',{name:'Für Besuch öffnen',exact:true}).click();
  await a.frame.locator('body').evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__progressiveInvitation=value}}));
  await a.frame.getByRole('button',{name:'Einladung kopieren',exact:true}).click();const invitation=await a.frame.locator('body').evaluate(()=>window.__progressiveInvitation);
  await b.page.goto(invitation);await ready(b.frame);await b.frame.locator('.social-status').filter({hasText:/2 von 8/}).waitFor();await b.frame.getByRole('button',{name:'Hallo zusammen!',exact:true}).click();await a.frame.locator('.social-log').getByText('Hallo zusammen!',{exact:true}).waitFor();
  await b.page.screenshot({path:path.join(output,'mobile-visit.png')});assert.deepEqual(errors,[]);
  stage='interrupted-image';const faultContext=await browser.newContext({viewport:{width:390,height:844}});contexts.push(faultContext);
  await faultContext.addInitScript(token=>localStorage.setItem('authToken',token),fixture.tokens.a);const pattern='**/zimmer/'+floor.image;await faultContext.route(pattern,route=>route.abort('failed'));
  const faultPage=await faultContext.newPage();await faultPage.goto(fixture.gateway.url);const faultFrame=faultPage.frameLocator('iframe[title="Dein Schlosszimmer"]');
  await faultFrame.getByRole('button',{name:'Erneut versuchen',exact:true}).waitFor();await faultContext.unroute(pattern);
  await Promise.all([faultPage.waitForEvent('framenavigated',frame=>frame.url().includes('/zimmer/')),faultFrame.getByRole('button',{name:'Erneut versuchen',exact:true}).click()]);await ready(faultFrame);
  assert.deepEqual((await api.a.api('bedroom')).value.room,saved.room);await faultPage.locator('#leave').click();await faultContext.close();
  const proof={passed:true,browserVersion:browser.version(),sourcePins:PINNED,checks,syntheticDatabaseOnly:true,syntheticPointsSeededOnlyInPrivateFixture:true,
   mediaDecodeAndAlphaMasksUnchanged:true,realOpaqueAndTransparentHitTesting:true,realCatalogAndPurchaseHandlers:true,savedFloorAndFurnitureOnFreshDevice:true,freshDeviceRequiredImages:6,
   sharedVisitAndReceivedPhrase:true,interruptedImageRetryAndSavedRoomRecovery:true,normalMicrosoftLoginTested:false,publicDeploymentTested:false,nativeWorkAdventureTested:false,
   positiveNetworkInterception:false,negativeImageFaultInjectionOnly:true,errors};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({stage,name:error.name,message:error.message,checks,errors},null,2)+'\n');console.error(JSON.stringify({passed:false,stage,name:error.name}));process.exitCode=1;}
 finally{for(const current of clients)if(!current.page.isClosed())await current.page.locator('#leave').click({timeout:1000}).catch(()=>{});for(const context of contexts)await context.close().catch(()=>{});await browser.close();await fixture.close();}
}
main().catch(error=>{console.error('Progressive-room browser check stopped: '+error.name);process.exitCode=1;});
