const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('./castle-deps.cjs')('playwright');
const offers = [
  ['shared-piano', 'https://musiclab.chromeexperiments.com/Shared-Piano/'],
  ['codenames', 'https://codenames.game/'],
  ['connect4', 'https://buddyboardgames.com/connect4'],
  ['deutsches-museum', 'https://virtualtour.deutsches-museum.de/'],
  ['smithsonian', 'https://naturalhistory2.si.edu/vt3/NMNH/'],
  ['nasa-eyes', 'https://eyes.nasa.gov/apps/solar-system/'],
  ['puzzle-party', 'https://artsexperiments.withgoogle.com/puzzle-party-n90x9rb2/'],
  ['gartic-phone', 'https://garticphone.com/de'],
];
const out = path.resolve(__dirname, '../../output/castle-offer-embeds-20261108');

async function main() {
  fs.mkdirSync(out, {recursive:true});
  const server = http.createServer((req, res) => {
    const index = Number(new URL(req.url, 'http://localhost').searchParams.get('offer'));
    if (!Number.isInteger(index) || !offers[index]) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><title>Offer frame check</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe allow="autoplay; fullscreen" src="'+offers[index][1]+'"></iframe>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const results = [];
  try {
    for (const [i, [id, url]] of offers.entries()) {
      const page = await browser.newPage({viewport:{width:780,height:900}});
      const errors = [], documents = [];
      page.on('console', message => {
        if (/refused|frame-ancestors|x-frame-options|blocked.*fram/i.test(message.text())) errors.push(message.text().slice(0,600));
      });
      page.on('response', response => {
        if (response.request().resourceType() !== 'document') return;
        const headers = response.headers();
        documents.push({url:response.url().split('#')[0],status:response.status(),
          xFrameOptions:headers['x-frame-options']||null,csp:headers['content-security-policy']||null});
      });
      try {
        await page.goto('http://127.0.0.1:'+server.address().port+'/?offer='+i, {waitUntil:'domcontentloaded',timeout:40000});
        await page.waitForTimeout(14000);
        const frames = [];
        for (const frame of page.frames().slice(1)) {
          if (!/^https?:/.test(frame.url())) continue;
          const content = await frame.evaluate(() => ({title:document.title,
            text:(document.body?.innerText||'').slice(0,4000),canvases:document.querySelectorAll('canvas').length,
            images:[...document.images].filter(image=>image.complete&&image.naturalWidth>0).length,
            inputs:document.querySelectorAll('input,button').length})).catch(()=>null);
          if (content) frames.push({origin:new URL(frame.url()).origin,...content});
        }
        await page.screenshot({path:path.join(out,id+'.png')});
        const result = {id,url,documents,framePolicyErrors:errors,frames,
          scope:'Initial rendering in local cross-origin iframe only; not multiplayer or school approval'};
        results.push(result);
        console.log(JSON.stringify({id,frames:frames.map(f=>({origin:f.origin,title:f.title,text:f.text.slice(0,170),canvases:f.canvases,images:f.images})),framePolicyErrors:errors.length}));
      } catch (error) {
        results.push({id,url,error:error.message,documents,framePolicyErrors:errors});
        console.log(JSON.stringify({id,error:error.message}));
      } finally {await page.close();}
    }
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),noSchoolAccountsUsed:true,results},null,2)+'\n');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
