'use strict';
const http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('./castle-deps.cjs')('playwright');
const {writeAudio,audioFixture}=require('./check-cinema-live.cjs');
async function main(){
  writeAudio();const server=http.createServer((_,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><button>Start</button>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({...(process.argv.includes('--bundled')?{}:{channel:'chrome'}),headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+audioFixture]});
    const context=await browser.newContext({permissions:['microphone']}),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('button').click();
    const result=await page.evaluate(async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true}),context=new AudioContext();await context.resume();const meter=context.createAnalyser();meter.fftSize=2048;context.createMediaStreamSource(stream).connect(meter);
      const samples=[];for(let n=0;n<30;n++){await new Promise(resolve=>setTimeout(resolve,100));const values=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(values);samples.push(Math.sqrt(values.reduce((sum,n)=>sum+n*n,0)/values.length));}
      const track=stream.getAudioTracks()[0],value={maximum:Math.max(...samples),running:context.state==='running',enabled:track.enabled,muted:track.muted,readyState:track.readyState};for(const track of stream.getTracks())track.stop();await context.close();return value;});
    console.log(JSON.stringify({browser:await browser.version(),syntheticOnly:true,...result}));assert.ok(result.maximum>.001);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.name);process.exitCode=1;});
