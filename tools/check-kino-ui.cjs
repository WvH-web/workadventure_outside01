const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('./castle-deps.cjs')('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../output/kino-ui-20261108');
const assets=path.join(root,'ops/kino-ui'),candidate=path.join(out,'candidate-kino.php');
const modes=['live','age','countdown','idle','paused','ended','chat','webcam'],templates=new Map();
for(const mode of modes){
  const r=cp.spawnSync('C:/xampp/php/php.exe',[path.join(assets,'render-fixture.php'),candidate,mode],{encoding:'utf8',windowsHide:true});
  if(r.status!==0||r.stderr||/Fatal error:|Warning:|Parse error:/.test(r.stdout))throw Error('UI fixture '+mode+': '+r.stderr+r.stdout.slice(-2000));
  templates.set(mode,r.stdout);
}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/frame'){
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe id="sample" src="http://127.0.0.1:'+server.address().port+'/view?mode='+encodeURIComponent(u.searchParams.get('mode')||'live')+'"></iframe>');return;
  }
  if(u.pathname==='/view'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-src 'self' about:; font-src 'self'");
    res.end(templates.get(u.searchParams.get('mode'))||templates.get('live'));return;
  }
  let file,type;
  if(u.pathname==='/room.png'){file=path.join(root,'castle/art/kino-20261108/floor-signs-20261108.png');type='image/png';}
  if(u.pathname==='/poster.png'){file=path.join(root,'castle/art/portrait.gif');type='image/gif';}
  const name=u.pathname.slice('/assets/'.length);
  if(u.pathname.startsWith('/assets/')&&/^[a-z0-9.-]+$/.test(name)){
    if(['foyer.css','foyer.js'].includes(name))file=path.join(out,'before',name);
    else if(name.startsWith('castle-')&&['.css','.js','.svg'].includes(path.extname(name)))file=path.join(assets,name);
    type={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[path.extname(name)];
  }
  if(!file||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',type);res.end(fs.readFileSync(file));
});
async function check(frame,mode,viewport){
  const failures=await frame.evaluate(()=>{
    const failures=[],visible=e=>e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
    if(document.documentElement.scrollWidth>innerWidth+1)failures.push('horizontal overflow');
    for(const e of document.querySelectorAll('button,input,textarea,select,h1,h2,h3,.programHighlight strong,.programFilm strong')){
      if(!visible(e))continue;
      const r=e.getBoundingClientRect();
      if(r.left<0||r.right>innerWidth+1)failures.push('outside viewport: '+(e.id||e.className||e.tagName));
      if(e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+1)failures.push('clipped button: '+e.id);
    }
    const poster=document.querySelector('.foyerPosterWrap');
    if(visible(poster))for(const e of document.querySelectorAll('.foyerTitle,.foyerCountdown,.foyerSub'))if(visible(e)){
      const a=poster.getBoundingClientRect(),b=e.getBoundingClientRect();
      if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)failures.push('poster overlaps '+e.className);
    }
    return failures;
  });
  assert.deepEqual(failures,[],mode+' '+viewport.width);
  if(mode==='countdown')assert.equal(await frame.locator('.kino-waiting-meta').isVisible(),false,'The embedded foyer does not repeat its heading');
  if(mode==='age'){
    assert.equal(await frame.locator('#playerHost').count(),0,'Age gate cannot expose the player');
    assert.ok(await frame.locator('#viewerMicrosoftLogin').isVisible());
  }else if(['live','paused','ended'].includes(mode)){
    const r=await frame.locator('#playerShell').boundingBox();assert.ok(r.width>viewport.width-45,'Player uses the narrow panel width');
    assert.ok(r.height>100&&r.height<viewport.height,'Player fits vertically');
    if(mode==='live')assert.ok(await frame.locator('#startBtn').isVisible());
  }
}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const viewport of [{width:320,height:740},{width:390,height:844},{width:680,height:900},{width:1280,height:900}]){
      const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
      try{
        for(const mode of modes){
          await page.goto(base+'/view?mode='+mode+'&embed=castle',{waitUntil:'networkidle'});
          await page.waitForFunction(()=>document.documentElement.dataset.kinoEmbedded==='true');
          if(['paused','ended'].includes(mode))await page.evaluate(mode=>{
            document.getElementById(mode==='paused'?'playerPauseShield':'playerEndShield').hidden=false;
            document.getElementById('startBtn').hidden=true;
          },mode);
          if(mode==='countdown')await page.locator('#cd').evaluate(e=>{e.textContent='2 Tage 03:12:07'});
          if(mode==='chat')await page.evaluate(()=>{
            document.getElementById('chatPanel').hidden=false;
            document.getElementById('chatAuthGate').hidden=false;
          });
          await check(page,mode,viewport);
          await page.screenshot({path:path.join(out,'ui-'+mode+'-'+viewport.width+'.png'),fullPage:true});
          results.push({mode,viewport,passed:true});
        }
        await page.goto(base.replace('127.0.0.1','localhost')+'/frame?mode=live',{waitUntil:'networkidle'});
        const child=page.frames().find(f=>f.url().includes('/view?'));
        assert.ok(child);await child.waitForFunction(()=>document.documentElement.dataset.kinoEmbedded==='true');
        await check(child,'live',viewport);
        results.push({mode:'cross-origin iframe',viewport,passed:true});
      }finally{await page.close();}
    }
    const report={cases:results.length,results,errors,realMovieOrStudentDataUsed:false,
      phpTemplate:'current production presentation, rendered with synthetic variables and no application bootstrap',
      scripts:'existing inline playback/auth scripts blocked only in this local visual fixture; unchanged in production'};
    fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify(report,null,2)+'\n');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({cases:results.length,errors,passed:true}));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
