'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('./castle-deps.cjs')('playwright');
const normalize=url=>{const parsed=new URL(url);return parsed.pathname.replace(/\/view\/[a-f0-9-]{36}\//,'/view/[view]/');};
const label=process.argv.includes('--progressive')?'progressive':process.argv.includes('--optimized')?'optimized':'baseline';
async function main(){
 const root=path.join(process.env.USERPROFILE,'.codex/private/workadventure-school-test-accounts'),output=path.join(root,'qa/homes-loading');await fs.mkdir(output,{recursive:true});
 const handoff=JSON.parse(await fs.readFile(path.join(root,'handoff.json'),'utf8'));assert.equal(handoff.contains_real_pupil_data,false);
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{
  for(const [account,viewport]of [['A',{width:1000,height:900}],['B',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,storageState:path.join(root,'qa/sso-'+account+'.private.json')}),started=Date.now(),rows=[],errors=[];
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.name));
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');let phase='cold';const cached={cold:[],warm:[]};
   cdp.on('Network.responseReceived',event=>{const image=event.response;if(new URL(image.url).pathname.startsWith('/castle-homes/media/'))cached[phase].push({path:normalize(image.url),fromDiskCache:!!image.fromDiskCache,fromServiceWorker:!!image.fromServiceWorker});});
   page.on('requestfinished',async request=>{const response=await request.response();rows.push({path:normalize(request.url()),type:request.resourceType(),status:response?.status(),
    bytes:Number(response?.headers()['content-length']||0),timing:request.timing()});});
   page.on('requestfailed',request=>rows.push({path:normalize(request.url()),type:request.resourceType(),failure:request.failure()?.errorText}));
   await page.goto('https://together.deine-schule.com/castle-homes/',{waitUntil:'domcontentloaded'});
   const frame=page.frameLocator('iframe[title="Dein Schlosszimmer"]');let ready=false;
   try{await frame.locator('#loading').waitFor({state:'attached',timeout:20000});await frame.locator('#loading').waitFor({state:'hidden',timeout:65000});ready=true;}catch{}
   const frameHandle=await page.locator('iframe[title="Dein Schlosszimmer"]').elementHandle(),content=await frameHandle?.contentFrame();
   const details=content?await content.evaluate(()=>({loading:document.querySelector('#loading')?.textContent,
    resources:performance.getEntriesByType('resource').map(row=>({path:new URL(row.name).pathname.replace(/\/view\/[a-f0-9-]{36}\//,'/view/[view]/'),
     type:row.initiatorType,duration:Math.round(row.duration),encodedBytes:row.encodedBodySize,transferBytes:row.transferSize})),
    canvas:document.querySelector('#room')?{width:document.querySelector('#room').width,height:document.querySelector('#room').height}:null})):null;
   await page.screenshot({path:path.join(output,label+'-'+account+'-measured.private.png')});
   const value={account,viewport,ready,elapsedMs:Date.now()-started,errors,requests:rows,details,cached};results.push(value);
   console.log(JSON.stringify({account,ready,elapsedMs:value.elapsedMs,loading:details?.loading,errors,imageRequests:rows.filter(row=>row.type==='image').length,
    imageBytes:rows.filter(row=>row.type==='image').reduce((n,row)=>n+row.bytes,0),failedRequests:rows.filter(row=>row.failure).length}));
   if(label!=='baseline'&&ready){
    const previous=await page.locator('iframe').getAttribute('src');await page.locator('#leave').click();phase='warm';const warmStarted=Date.now();let warmReady=false;
    await page.goto('https://together.deine-schule.com/castle-homes/',{waitUntil:'domcontentloaded'});
    const next=page.frameLocator('iframe[title="Dein Schlosszimmer"]');try{await next.locator('#loading').waitFor({state:'attached',timeout:20000});await next.locator('#loading').waitFor({state:'hidden',timeout:30000});warmReady=true;}catch{}
    const current=await page.locator('iframe').getAttribute('src');let canvasPixels=null;
    if(warmReady)canvasPixels=await next.locator('#room').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let visible=0;for(let n=0;n<data.length;n+=4*47){if(data[n+3])visible++;colors.add(data[n]+','+data[n+1]+','+data[n+2]);}return {visible,colors:colors.size};});
    value.warm={ready:warmReady,elapsedMs:Date.now()-warmStarted,newProtectedView:current!==previous,canvasPixels,
     cachedMediaResponses:cached.warm.filter(row=>row.fromDiskCache&&!row.fromServiceWorker).length};
    await page.screenshot({path:path.join(output,label+'-'+account+'-warm.private.png')});console.log(JSON.stringify({account,warm:value.warm}));
   }
   await page.locator('#leave').click({timeout:1000}).catch(()=>{});await context.close();
  }
  await fs.writeFile(path.join(output,label+'.private.json'),JSON.stringify({observationalOnly:true,normalMicrosoftStates:true,networkInterception:false,results},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(error=>{console.error('Room loading observation stopped: '+error.name);process.exitCode=1;});
