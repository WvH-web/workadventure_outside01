'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright'),sharp=require('./castle-deps.cjs')('sharp');
const {join}=require('./check-cinema-live.cjs'),root=path.resolve(__dirname,'..');
const privateRoot=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts');
const output=path.join(privateRoot,'qa/rounds-all-rooms-live'),base='https://together.deine-schule.com/~/castle-preview/';
async function main(){
  fs.mkdirSync(output,{recursive:true});const {readLayout}=await import('../castle/room.js');
  const ids=['grosse-halle',...require('./castle-map-ids.cjs').filter(id=>id!=='grosse-halle')],results=[];let user,stage='entry',roundRequests=0;
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const map=JSON.parse(fs.readFileSync(path.join(root,'castle/grosse-halle.tmj'),'utf8')),layout=readLayout(map);
    user=await join(browser,1,{roomId:'grosse-halle',roomUrl:base+'grosse-halle.wam#start',outputDir:output,label:'Raumpruefung',
      seats:layout.seats.length,groups:layout.groups.length,revision:map.properties.find(p=>p.name==='castleRevision').value,
      schoolStorageState:path.join(privateRoot,'qa/sso-A.private.json'),characterTextureId:'wvh-event-mira-v1',
      configureContext:async context=>context.on('request',request=>{if(/^\/castle-school\/round-(?:context|create|join|visit|heartbeat|leave|close)$/.test(new URL(request.url()).pathname))roundRequests++;})});
    for(const id of ids){
      stage=id;const started=Date.now();
      if(id!=='grosse-halle')await user.script.evaluate(url=>castleRoom.travelTo(url),base+id+'.wam#start').catch(error=>{
        if(!/Execution context was destroyed|Frame was detached/.test(error.message))throw error;
      });
      let script;
      for(let n=0;n<120&&!script;n++){
        for(const frame of user.page.frames())if(await frame.evaluate(id=>window.castleRoom?.layout.id===id&&!castleRoom.disposed,id).catch(()=>false))script=frame;
        if(!script)await user.page.waitForTimeout(250);
      }assert.ok(script,'Room controller missing: '+id);user.script=script;
      await script.waitForFunction(()=>castleRoom.community?.bridge&&!castleRoom.community.closed,undefined,{polling:200,timeout:20000});
      const state=await script.evaluate(async()=>{
        const map=await WA.room.getTiledMap(),props=Object.fromEntries(map.properties.map(property=>[property.name,property.value]));
        return {id:castleRoom.layout.id,runtime:props.castleRuntimeRevision,enabled:props.castleCommunity,
          seats:castleRoom.layout.seats.length,groups:castleRoom.layout.groups.length};
      });
      const expected=readLayout(JSON.parse(fs.readFileSync(path.join(root,'castle',id+'.tmj'),'utf8')));
      assert.equal(state.id,id);assert.equal(state.runtime,'20261109-rounds1');assert.equal(state.enabled,true);
      assert.equal(state.seats,expected.seats.length);assert.equal(state.groups,expected.groups.length);
      await user.page.waitForTimeout(250);
      assert.equal(user.page.frames().filter(frame=>frame.url()==='https://together.deine-schule.com/castle-school/presence').length,1,'Only the current room keeps a bridge');
      const pixels=await sharp(await user.page.locator('canvas:visible').first().screenshot()).stats();
      assert.ok(pixels.channels.slice(0,3).every(channel=>channel.stdev>12),'Blank native canvas: '+id);
      if(['grosse-halle','kino','grundschule','park'].includes(id))await user.page.screenshot({path:path.join(output,id+'.private.png')});
      results.push({...state,milliseconds:Date.now()-started,nonblankCanvas:true});
      console.log(JSON.stringify({id,passed:true}));
    }
    assert.equal(roundRequests,0,'An idle visitor must not generate new school lookups from the round feature');assert.deepEqual(user.errors,[]);
    const proof={passed:true,realMicrosoftPupil:true,publishedMaps:results.length,results,errors:user.errors,
      idleRoundApiRequests:roundRequests,mapsOrSchoolDataChanged:false,cinemaEndpointStubbedWithoutFilmStart:true,loadApprovalFor400:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({passed:true,publishedMaps:results.length,idleRoundApiRequests:roundRequests,errors:user.errors}));
  }catch(error){
    fs.writeFileSync(path.join(output,'failure.private.json'),JSON.stringify({stage,errorType:error.name,error:error.message,diagnostics:user?.diagnostics},null,2)+'\n');
    if(user)await user.page.screenshot({path:path.join(output,'failure.private.png')}).catch(()=>{});
    console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error('Published room probe stopped: '+error.name);process.exitCode=1;});
