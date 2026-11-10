'use strict';
const {chromium}=require('./castle-deps.cjs')('playwright');
async function main(){
  const browser=await chromium.launch({...(process.argv.includes('--bundled')?{}:{channel:'chrome'}),headless:true});
  try{
    const context=await browser.newContext();let routed=0;const seen=[],errors=[];
    context.on('request',request=>seen.push(new URL(request.url()).hostname));
    await context.route('https://castle-script.invalid/**',async route=>{routed++;await route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:'parent.postMessage({castleScriptProbe: true}, "*");'});});
    await context.route('https://castle-page.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><script>onmessage=e=>{if(e.data.castleScriptProbe)document.body.dataset.loaded="yes"}</script><iframe sandbox="allow-scripts" srcdoc="<script type=module src=https://castle-script.invalid/entry.js></script>"></iframe>'}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('https://castle-page.invalid/');
    let loaded=false;try{await page.waitForFunction(()=>document.body.dataset.loaded==='yes',undefined,{timeout:5000});loaded=true;}catch{}
    console.log(JSON.stringify({browser:await browser.version(),opaqueScriptRouted:routed,loaded,requestHosts:seen,errors}));if(!loaded||routed!==1)process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.name);process.exitCode=1;});
