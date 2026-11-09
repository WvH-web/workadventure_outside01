'use strict';

const {GatewayError} = require('../hall-audio/errors.cjs');
const {IDS,validateOffers,target} = require('./offers.cjs');
const CATALOG = 'https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_castle_offers.php';
const LOBBY = 'https://deutsche-online-schule.com/schooltools/verwaltung/api/workadventure_museum_open.php';

function boundedJson({fetcher=fetch,timeout=3500,concurrency=16,maxBytes=32768}={}) {
  let active=0;
  return async (url,options) => {
    if (active>=concurrency) throw new GatewayError(503,'unavailable');
    active++;const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);
    try {
      const response=await fetcher(url,{...options,redirect:'error',signal:abort.signal});
      if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')) throw Error('upstream');
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes){abort.abort();throw Error('size');}chunks.push(chunk);}
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw new GatewayError(503,'unavailable'); }
    finally {clearTimeout(timer);active--;}
  };
}
function createOfferLookup({key,fetcher=fetch,clock=Date.now,timeout,concurrency}={}) {
  if (typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key)) throw Error('Invalid catalog configuration');
  const request=boundedJson({fetcher,timeout,concurrency});
  let cached,until=0,pending,generation=0;
  const load=async()=>validateOffers(await request(CATALOG,{method:'POST',headers:{'Content-Type':'application/json','X-Castle-School-Key':key},body:'{}'}),clock());
  async function lookup({fresh=true}={}) {
    if(fresh)return load();
    if(cached&&clock()<until)return cached;
    if(!pending){const started=clock(),revision=generation;
      const job=load().then(value=>{if(revision===generation){cached=value;until=started+1000;}return value;}).finally(()=>{if(pending===job)pending=null;});pending=job;}
    return pending;
  }
  lookup.invalidate=()=>{generation++;cached=null;until=0;pending=null;};
  return lookup;
}
function createRoomLinkUpdater({fetcher=fetch,timeout,concurrency}={}) {
  const request=boundedJson({fetcher,timeout,concurrency,maxBytes:8192});
  return async ({resourceId,targetUrl,pin}) => {
    const url=target(targetUrl);
    if(!IDS.includes(resourceId)||!url||typeof pin!=='string'||!/^\d{4,12}$/.test(pin))throw new GatewayError(400,'invalid_request');
    const result=await request(LOBBY+'?board='+resourceId+'&format=json',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({target_url:url.href,pin}).toString()});
    if(result.board!==resourceId||!['success','error'].includes(result.message_type))throw new GatewayError(503,'unavailable');
    if(result.message_type==='error')throw new GatewayError(403,'wrong_pin');
    if(target(result.target_url)?.href!==url.href)throw new GatewayError(503,'unavailable');
    return {updated:true};
  };
}
module.exports={createOfferLookup,createRoomLinkUpdater};
