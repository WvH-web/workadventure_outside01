'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {output}=require('./castle-portal-ftp.cjs');
async function main(){
 const origin='https://deutsche-online-schule.com/schooltools/verwaltung';
 const key=fs.readFileSync(path.join(output,'workadventure_castle_secret.php'),'utf8').match(/'key'=>'([a-f0-9]{64})'/)?.[1];
 assert.ok(key,'Protected catalog configuration missing');
 const catalog=await fetch(origin+'/api/workadventure_castle_offers.php',{method:'POST',headers:{'Content-Type':'application/json','X-Castle-School-Key':key},body:'{}',signal:AbortSignal.timeout(15000)});
 assert.equal(catalog.status,200);assert.equal(catalog.headers.get('set-cookie'),null);
 const data=await catalog.json();assert.equal(data.offers.length,7);assert.ok(data.offers.every(o=>!o.rule.published));
 const lobby=origin+'/api/workadventure_museum_open.php?board=haxballarea01&format=json';
 const before=await (await fetch(lobby,{signal:AbortSignal.timeout(15000)})).json();
 assert.deepEqual(Object.keys(before).sort(),['board','content_type','content_url','target_url','title','updated_at']);
 const post=await (await fetch(lobby,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({target_url:before.target_url,pin:'invalid-synthetic-pin'}),signal:AbortSignal.timeout(15000)})).json();
 assert.equal(post.message_type,'error');assert.ok(post.message);assert.equal(post.target_url,before.target_url);assert.equal(post.updated_at,before.updated_at);
 const after=await (await fetch(lobby,{signal:AbortSignal.timeout(15000)})).json();assert.deepEqual(after,before);
 const result={draftOffers:7,privateCatalogHttp:200,createsNoSession:true,legacyGetShapeUnchanged:true,wrongPinExplicitlyRejected:true,existingRoomUrlAndTimestampUnchanged:true};
 fs.writeFileSync(path.join(output,'live-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(()=>{console.error('Live offer checks failed; private catalog and link values are not printed.');process.exitCode=1});
