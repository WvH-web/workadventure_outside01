'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createChessServer,createChessVerifier}=require('../ops/castle-chess/server.cjs');
const {ChessRooms}=require('../ops/castle-chess/rooms.cjs');
const {SignJWT}=require('../ops/hall-audio/node_modules/jose');
const secret='synthetic-chess-test-secret-not-a-school-key';
test('pinned vendor bytes retain exact upstream integrity and include no unused noncommercial set',()=>{
  const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../ops/castle-chess');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'vendor-manifest.json'),'utf8'));assert.equal(manifest.files.length,26);
  for(const file of manifest.files){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.path))).digest('hex'),file.sha256);assert.doesNotMatch(file.path,/staunty/);}
  assert.deepEqual(manifest.packages.map(item=>[item.name,item.version]),[['chess.js','1.4.0'],['cm-chessboard','8.15.4'],['eventsource-parser','4.1.3']]);
});
async function fixture(t,{sessionMs=45000}={}){
  let now=Date.now(),calls=0;const clock=()=>now,profiles=new Map(),config={origin:'http://127.0.0.1',secret,trustedProxyIps:[]};
  const lookup=async id=>{calls++;return {version:1,kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null,...profiles.get(id),checkedAt:now};};
  const rooms=new ChessRooms({clock,sessionMs}),server=createChessServer({config,lookup,rooms,clock,verify:createChessVerifier(secret,{clock})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));config.origin+=':'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});});
  async function actor(id,kind='student',expiry=now+600000){
    profiles.set(id,kind==='student'?{kind,eligible:true,age:8,gradeLevel:3,classId:17}:{kind,eligible:kind==='staff'||kind==='parent',age:null,gradeLevel:null,classId:null});
    const token=await new SignJWT({identifier:id,username:'Synthetic player',tags:['teacher']}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(expiry/1000)).sign(new TextEncoder().encode(secret));
    return {id,token};
  }
  async function api(actor,route,body,headers={}){
    const response=await fetch(config.origin+'/castle-chess/'+route,{method:body===undefined?'GET':'POST',headers:{...(actor?.token?{Authorization:'Bearer '+actor.token}:{}),...(actor?.session?{'X-Chess-Session':actor.session}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await response.text();return {status:response.status,headers:response.headers,value:response.headers.get('content-type')?.includes('json')?JSON.parse(text):text};
  }
  async function join(actor){const result=await api(actor,'session',{});assert.equal(result.status,200);actor.session=result.value.sessionId;return result.value;}
  async function stream(actor){
    const controller=new AbortController(),response=await fetch(config.origin+'/castle-chess/events',{signal:controller.signal,headers:{Authorization:'Bearer '+actor.token,'X-Chess-Session':actor.session}});assert.equal(response.status,200);
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    const next=async()=>{for(;;){const boundary=buffer.indexOf('\n\n');if(boundary>=0){const event=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const line=event.split('\n').find(line=>line.startsWith('data: '));if(line)return {expired:event.includes('event: expired'),value:JSON.parse(line.slice(6))};continue;}
      const part=await reader.read();if(part.done)return null;buffer+=decoder.decode(part.value,{stream:true});}};
    t.after(()=>{controller.abort();});return {controller,next,response};
  }
  const cmd=(actor,action,revision,fields={})=>api(actor,'command',{id:crypto.randomUUID(),action,...fields,...(action==='watch'?{}:{revision})});
  return {rooms,profiles,actor,api,join,stream,cmd,config,advance:ms=>{now+=ms;rooms.sweep();},get calls(){return calls;}};
}
test('HTTP shell is self-contained, licenses available and private backend files never served',async t=>{
  const f=await fixture(t);for(const route of ['', 'chess.js','training.js','credits.html','vendor/chess/LICENSE','vendor/cm-chessboard/assets/pieces/standard.svg'])assert.equal((await f.api(null,route)).status,200);
  for(const route of ['server.cjs','../vendor/chess.cjs','state.json','vendor-manifest.json','?token=x','health?x=1'])assert.equal((await f.api(null,route)).status,404);
  const page=await f.api(null,'');assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'self'/);assert.equal(page.headers.get('permissions-policy'),'microphone=(), camera=(), display-capture=()');
  assert.equal((await f.api(null,'health')).value.ready,true);assert.equal((await f.api(null,'session',{})).status,401);
});
test('fresh active pupil/staff profiles, not token tags, authorize every API call',async t=>{
  const f=await fixture(t),pupil=await f.actor('chess-test-pupil@invalid.local'),staff=await f.actor('chess-test-staff@invalid.local','staff');
  for(const kind of ['unknown','parent','ambiguous']){const actor=await f.actor('chess-test-'+kind+'@invalid.local',kind);assert.deepEqual((await f.api(actor,'session',{})).value,{error:'school_required'});}
  const start=await f.join(pupil);assert.equal(start.self.staff,false);await f.join(staff);assert.equal((await f.api(staff,'state')).value.self.staff,true);
  const before=f.calls;await f.api(pupil,'state');await f.api(pupil,'ping',{});assert.equal(f.calls,before+2);
  f.profiles.set(pupil.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});assert.equal((await f.api(pupil,'state')).status,403);assert.equal(f.rooms.sessions.has(pupil.session),false);
  f.profiles.set(staff.id,{kind:'student',eligible:true,age:18,gradeLevel:12,classId:17});assert.equal((await f.api(staff,'state')).value.self.staff,false);
});
test('strict requests reject foreign origins, profile injection, session theft and wrong methods',async t=>{
  const f=await fixture(t),a=await f.actor('chess-a@invalid.local'),b=await f.actor('chess-b@invalid.local');await f.join(a);await f.join(b);
  assert.equal((await f.api(a,'session',{}, {Origin:'https://foreign.invalid'})).status,403);
  assert.equal((await f.api(a,'session',{}, {'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await f.api(a,'session',{classId:17})).status,400);assert.equal((await f.api(a,'state',{})).status,405);
  assert.equal((await f.api({...b,session:a.session},'state')).status,403);
  assert.equal((await f.api({...a,token:a.token.slice(0,-2)+'xx'},'state')).status,401);
  assert.equal((await f.api(a,'session',{}, {'Content-Type':'text/plain'})).status,415);
  assert.equal((await f.api(a,'session',{text:'x'.repeat(5000)})).status,413);
});
test('real HTTP/SSE synchronizes two players and spectator with authoritative legal turns',async t=>{
  const f=await fixture(t),a=await f.actor('chess-a@invalid.local'),b=await f.actor('chess-b@invalid.local'),c=await f.actor('chess-watch@invalid.local');
  for(const actor of [a,b,c])await f.join(actor);const sa=await f.stream(a),sb=await f.stream(b),sc=await f.stream(c);
  await sa.next();await sb.next();await sc.next();
  assert.equal((await f.cmd(a,'claim',1,{color:'w'})).status,200);assert.equal((await f.cmd(b,'claim',1,{color:'b'})).status,200);
  assert.equal((await f.cmd(c,'move',1,{from:'e2',to:'e4',promotion:null})).value.error,'not_a_player');
  const response=await f.cmd(a,'move',1,{from:'e2',to:'e4',promotion:null});assert.equal(response.status,200);assert.equal(response.value.board.revision,2);
  let received;for(let i=0;i<10;i++){received=await sc.next();if(received.value.board.revision===2)break;}assert.equal(received.value.board.moves[0],'e4');
  assert.doesNotMatch(JSON.stringify(received.value),/@invalid|identifier|classId|gradeLevel|checkedAt|age|token|actor/);
  assert.equal((await f.cmd(a,'move',2,{from:'d2',to:'d4',promotion:null})).value.error,'not_your_turn');
  assert.equal((await f.cmd(b,'move',2,{from:'e7',to:'e5',promotion:null})).status,200);
  assert.deepEqual((await f.api(c,'state')).value.board.moves,['e4','e5']);
  const pgn=await f.api(c,'pgn');assert.match(pgn.value,/1\. e4 e5/);assert.doesNotMatch(pgn.value,/@invalid|Synthetic player/);
  assert.equal(pgn.headers.get('content-disposition'),'attachment; filename="schloss-schach.pgn"');
});
test('SSE replacement keeps the same seat connected and fresh revocation ends all account streams',async t=>{
  const f=await fixture(t),a=await f.actor('chess-a@invalid.local');await f.join(a);const first=await f.stream(a);await first.next();await f.cmd(a,'claim',1,{color:'w'});
  const second=await f.stream(a);await second.next();assert.equal(f.rooms.snapshot(a.session).board.seats.w.connected,true);
  f.profiles.set(a.id,{kind:'unknown',eligible:false,age:null,gradeLevel:null,classId:null});assert.equal((await f.api(a,'ping',{})).status,403);
  let revoked;for(let i=0;i<5;i++){revoked=await second.next();if(revoked?.expired)break;}assert.equal(revoked.expired,true);assert.equal(f.rooms.sessions.size,0);
});
test('verified JWT expiry caps leases even while otherwise valid school profile remains active',async t=>{
  const f=await fixture(t),a=await f.actor('chess-short@invalid.local','student',Date.now()+10000);const state=await f.join(a);assert.ok(state.leaseMs<=10000);
  f.advance(11000);assert.equal((await f.api(a,'ping',{})).status,401);assert.equal(f.rooms.sessions.size,0);
});
test('training puzzles each have a genuine legal mate in one and no already-finished position',async()=>{
  const {puzzles,mateMoves}=await import('../ops/castle-chess/public/training.js');const {Chess}=require('../ops/castle-chess/vendor/chess.cjs');
  assert.equal(new Set(puzzles.map(p=>p.id)).size,puzzles.length);
  for(const puzzle of puzzles){const game=new Chess(puzzle.fen);assert.equal(game.isGameOver(),false);const moves=mateMoves(puzzle.fen);assert.ok(moves.length>0);for(const move of moves){game.move({...move,...(move.promotion?{promotion:move.promotion}:{})});assert.equal(game.isCheckmate(),true);game.undo();}}
});
