'use strict';
const fs=require('node:fs'),path=require('node:path');
const {GatewayError}=require('../hall-audio/errors.cjs');
const {BOARDS}=require('./sessions.cjs');
const PREFIX='/castle-art/',UPSTREAM=PREFIX+'wbo';
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'upstream-manifest.json'),'utf8'));
const assets=new Set(manifest.clientAssets.filter(file=>/\.(?:js|css|svg|png|ico|woff2?|json|webmanifest)$/.test(file)).map(file=>'/'+file));
assets.add('/socket.io/socket.io.js');assets.add('/socket.io/socket.io.min.js');assets.add('/manifest.json');
function deny(status=404,code='not_found'){throw new GatewayError(status,code);}
function query(url,allowed){
  const seen=new Set();for(const [key,value]of url.searchParams){if(seen.has(key)||!Object.hasOwn(allowed,key)||!allowed[key](value))deny(400,'invalid_request');seen.add(key);}
}
function artRoute(raw,origin,{upgrade=false}={}){
  if(typeof raw!=='string'||raw.length>2048||!raw.startsWith(PREFIX)||/%|\\|\0|#/.test(raw.split('?')[0]))deny();
  const url=new URL(raw,origin);if(url.origin!==origin||!url.pathname.startsWith(PREFIX))deny();
  const route=url.pathname.slice(PREFIX.length);
  if(!upgrade&&['','index.html','art.js','art.css','credits.html','rules.html','source/wbo-2.18.33.tar.gz','source/WBO-LICENSE','source/httpxy-LICENSE'].includes(route)){
    if(url.search)deny();return {kind:'static',file:route||'index.html'};
  }
  if(!upgrade&&['health','session','leave'].includes(route)){if(url.search)deny();return {kind:route};}
  if(!url.pathname.startsWith(UPSTREAM+'/'))deny();
  const pathname=url.pathname.slice(UPSTREAM.length),boardNames=BOARDS.map(board=>board.id);
  if(pathname==='/socket.io/'||pathname==='/socket.io'){
    query(url,{EIO:value=>value==='4',transport:value=>['polling','websocket'].includes(value),sid:value=>/^[a-zA-Z0-9_-]{1,64}$/.test(value),t:value=>/^[a-zA-Z0-9_-]{1,40}$/.test(value),
      board:value=>boardNames.includes(value),baselineSeq:value=>/^\d{1,12}$/.test(value),b64:value=>value==='1',
      tool:value=>/^[a-z-]{1,32}$/.test(value),color:value=>/^#[0-9a-f]{6}$/i.test(value),size:value=>/^\d{1,5}(?:\.\d{1,3})?$/.test(value)&&Number(value)>0&&Number(value)<=10000});
    if(url.searchParams.get('EIO')!=='4'||!url.searchParams.get('transport')||!boardNames.includes(url.searchParams.get('board'))||upgrade&&url.searchParams.get('transport')!=='websocket')deny(400,'invalid_request');
    return {kind:'proxy',socket:true,pathname,search:url.search};
  }
  if(upgrade)deny();
  const board=/^\/(?:boards|preview|download|export)\/([^/]+?)(?:\.svg)?$/.exec(pathname);
  if(board&&boardNames.includes(board[1])){
    query(url,{lang:value=>value==='de'});return {kind:'proxy',socket:false,pathname,search:url.search};
  }
  if(pathname==='/rules'){
    query(url,{lang:value=>/^[a-z]{2}$/.test(value)});return {kind:'static',file:'rules.html'};
  }
  if(assets.has(pathname)){query(url,{v:value=>/^[a-zA-Z0-9_.-]{1,80}$/.test(value)});return {kind:'asset',pathname,search:url.search};}
  deny();
}
module.exports={artRoute,PREFIX,UPSTREAM,manifest};
