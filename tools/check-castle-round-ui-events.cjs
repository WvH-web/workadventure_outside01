'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
async function main(){
  const source=fs.readFileSync(path.resolve(__dirname,'../ops/castle-school/public/unowned-ui.js'));
  const server=http.createServer((req,response)=>{
    response.setHeader('Content-Type',req.url==='/unowned-ui.js'?'text/javascript':'text/html');
    if(req.url==='/unowned-ui.js')return response.end(source);
    if(['/child','/control'].includes(req.url))return response.end('<!doctype html>'+(req.url==='/child'?'<script defer src="/unowned-ui.js"></script>':'')+'<script defer src="https://together.deine-schule.com/iframe_api.js"></script><script>window.probeMessages=0;addEventListener("message",e=>{if(e.data?.type==="messageTriggered")window.probeMessages++});window.probeReady=true;</script>');
    response.end('<!doctype html><iframe src="/child"></iframe>');
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);const frame=page.frames().find(frame=>frame.url().endsWith('/child'));assert.ok(frame);
    await frame.waitForFunction(()=>window.probeReady&&window.WA?.ui);
    const send=type=>page.evaluate(type=>document.querySelector('iframe').contentWindow.postMessage({type,data:type==='buttonClickedEvent'?{popupId:17,buttonId:0}:{uuid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}},location.origin),type);
    await send('buttonClickedEvent');await send('messageTriggered');await frame.waitForFunction(()=>window.probeMessages===1);await page.waitForTimeout(200);assert.deepEqual(errors,[]);
    await page.locator('iframe').evaluate(element=>{element.src='/control';});await frame.waitForURL('**/control');await frame.waitForFunction(()=>window.probeReady&&window.WA?.ui);await send('buttonClickedEvent');
    await page.waitForTimeout(300);assert.deepEqual(errors,['Could not find popup with ID "17"']);
    console.log(JSON.stringify({passed:true,actualPublishedIframeApiUsed:true,trustedUnownedPopupIgnored:true,otherMessagesDelivered:true,unguardedControlReproducesNativeError:true,normalSchoolRequestsChanged:false}));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
