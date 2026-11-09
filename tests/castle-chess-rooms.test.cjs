'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ChessRooms,outcome}=require('../ops/castle-chess/rooms.cjs');
const {ChessJournal}=require('../ops/castle-chess/journal.cjs');
const {Chess}=require('../ops/castle-chess/vendor/chess.cjs');
function setup(options={}){
  let time=1000000;const clock=()=>time,rooms=new ChessRooms({clock,...options});
  const actor=(id,staff=false)=>({id,staff,expiresAt:time+3600000});
  const add=(id,staff=false)=>{const who=actor(id,staff),session=rooms.create(who).sessionId;rooms.connect(session,who);return {who,session};};
  const a=add('synthetic-a'),b=add('synthetic-b');
  const command=(person,action,extra={})=>rooms.command(person.session,person.who,{id:crypto.randomUUID(),action,...(action==='watch'?{}:{revision:rooms.snapshot(person.session).board.revision}),...extra});
  const claim=()=>{command(a,'claim',{color:'w'});command(b,'claim',{color:'b'});};
  const move=(person,from,to,promotion=null)=>command(person,'move',{from,to,promotion});
  return {rooms,a,b,add,actor,command,claim,move,clock,advance:ms=>{time+=ms;rooms.sweep();}};
}
const code=expected=>error=>error.code===expected;
test('three real tables start empty and counts never fabricate players or spectators',()=>{
  const f=setup();const snapshot=f.rooms.snapshot(f.a.session);assert.equal(snapshot.tables.length,3);assert.equal(snapshot.tables[0].players,0);assert.equal(snapshot.tables[0].watchers,2);
  assert.ok(snapshot.tables.every(table=>table.status==='free'));
  f.claim();assert.equal(f.rooms.snapshot(f.a.session).tables[0].players,2);assert.equal(f.rooms.snapshot(f.a.session).tables[0].watchers,0);
});
test('the same verified account cannot play both colors or two simultaneous tables',()=>{
  const f=setup();f.command(f.a,'claim',{color:'w'});const tab=f.add(f.a.who.id);
  assert.throws(()=>f.command(tab,'claim',{color:'b'}),code('already_seated'));f.command(tab,'watch',{tableId:'tisch-2'});
  assert.throws(()=>f.command(tab,'claim',{color:'w'}),code('already_seated'));assert.equal(f.rooms.snapshot(f.a.session).tables[0].watchers,1);
});
test('reentry finds the account seat at the third table but never silently takes it over',()=>{
  const f=setup();for(const user of [f.a,f.b])f.command(user,'watch',{tableId:'tisch-3'});f.claim();f.move(f.a,'e2','e4');f.move(f.b,'e7','e5');
  f.rooms.disconnect(f.a.session);const returning=f.add(f.a.who.id),snapshot=f.rooms.snapshot(returning.session);
  assert.equal(snapshot.board.id,'tisch-3');assert.equal(snapshot.self.color,null);assert.equal(snapshot.self.resumeColor,'w');assert.deepEqual(snapshot.board.moves,['e4','e5']);
  assert.throws(()=>f.move(returning,'g1','f3'),code('not_a_player'));f.command(returning,'resume',{color:'w'});f.move(returning,'g1','f3');
  assert.equal(f.rooms.snapshot(f.b.session).board.moves.at(-1),'Nf3');assert.throws(()=>f.move(f.a,'f1','c4'),code('connection_required'));
});
test('only a current seat owner may move, in turn, from the current server position',()=>{
  const f=setup();f.claim();const watcher=f.add('synthetic-watcher');
  assert.throws(()=>f.move(watcher,'e2','e4'),code('not_a_player'));assert.throws(()=>f.move(f.b,'e7','e5'),code('not_your_turn'));
  assert.throws(()=>f.move(f.a,'e2','e5'),code('illegal_move'));const first=f.move(f.a,'e2','e4');assert.equal(first.board.turn,'b');assert.deepEqual(first.board.moves,['e4']);
  const second=f.move(f.b,'e7','e5');assert.equal(second.board.turn,'w');assert.deepEqual(second.board.moves,['e4','e5']);
});
test('stale positions, arbitrary FEN, identity fields and unknown command shapes are rejected',()=>{
  const f=setup();f.claim();const revision=f.rooms.snapshot(f.a.session).board.revision;f.move(f.a,'e2','e4');
  assert.throws(()=>f.command(f.b,'move',{from:'e7',to:'e5',promotion:null,revision}),code('stale_position'));
  for(const extra of [{fen:new Chess().fen()},{age:99},{classId:17},{identity:'other'},{promotion:'k'}])
    assert.throws(()=>f.command(f.b,'move',{from:'e7',to:'e5',promotion:null,...extra}),error=>['invalid_request'].includes(error.code));
});
test('idempotent retries do not replay a move after its acknowledgement was lost',()=>{
  const f=setup();f.claim();const command={id:crypto.randomUUID(),action:'move',revision:1,from:'e2',to:'e4',promotion:null};
  f.rooms.command(f.a.session,f.a.who,command);f.move(f.b,'e7','e5');const retry=f.rooms.command(f.a.session,f.a.who,command);
  assert.deepEqual(retry.board.moves,['e4','e5']);assert.throws(()=>f.rooms.command(f.a.session,f.a.who,{...command,to:'e3'}),code('command_conflict'));
});
test('castling updates king and rook atomically using chess.js rules',()=>{
  const f=setup();f.claim();for(const [who,from,to]of [[f.a,'e2','e4'],[f.b,'e7','e5'],[f.a,'g1','f3'],[f.b,'b8','c6'],[f.a,'f1','c4'],[f.b,'g8','f6'],[f.a,'e1','g1']])f.move(who,from,to);
  const game=new Chess(f.rooms.snapshot(f.a.session).board.fen);assert.equal(game.get('g1').type,'k');assert.equal(game.get('f1').type,'r');assert.equal(game.get('h1'),undefined);
});
test('en passant removes the captured pawn from its actual square',()=>{
  const f=setup();f.claim();for(const [who,from,to]of [[f.a,'e2','e4'],[f.b,'a7','a6'],[f.a,'e4','e5'],[f.b,'d7','d5'],[f.a,'e5','d6']])f.move(who,from,to);
  const game=new Chess(f.rooms.snapshot(f.a.session).board.fen);assert.equal(game.get('d5'),undefined);assert.equal(game.get('d6').color,'w');
});
test('underpromotion is explicit and never silently forced to a queen',()=>{
  const f=setup();f.claim();f.rooms.tables.get('tisch-1').game=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
  assert.throws(()=>f.move(f.a,'a7','a8'),code('illegal_move'));const snapshot=f.move(f.a,'a7','a8','n');
  assert.equal(new Chess(snapshot.board.fen).get('a8').type,'n');assert.equal(snapshot.board.result.reason,'material');
});
test('checkmate is authoritative and a completed game cannot accept another move',()=>{
  const f=setup();f.claim();f.move(f.a,'f2','f3');f.move(f.b,'e7','e5');f.move(f.a,'g2','g4');const mate=f.move(f.b,'d8','h4');
  assert.deepEqual(mate.board.result,{score:'0-1',reason:'checkmate'});assert.equal(mate.tables[0].status,'finished');assert.throws(()=>f.move(f.a,'e2','e4'),code('game_finished'));
});
test('draw offers require the other player consent and disappear when declined by a move',()=>{
  const f=setup();f.claim();f.command(f.a,'offer_draw');assert.throws(()=>f.command(f.a,'accept_draw'),code('no_draw_offer'));
  const draw=f.command(f.b,'accept_draw');assert.deepEqual(draw.board.result,{score:'1/2-1/2',reason:'agreement'});
  f.command(f.a,'rematch');f.command(f.b,'rematch');f.command(f.b,'offer_draw');f.move(f.b,'e2','e4');assert.equal(f.rooms.snapshot(f.a.session).board.drawOffer,'w');
  f.move(f.a,'e7','e5');assert.equal(f.rooms.snapshot(f.a.session).board.drawOffer,null);
});
test('a rematch needs both players and swaps colors without creating a new host dependency',()=>{
  const f=setup();f.claim();f.command(f.a,'resign');const first=f.command(f.a,'rematch');assert.equal(first.board.result.score,'0-1');
  const second=f.command(f.b,'rematch');assert.equal(second.board.fen,new Chess().fen());assert.equal(second.self.color,'w');assert.equal(f.rooms.snapshot(f.a.session).self.color,'b');
});
test('a spectator or former teacher cannot reset a game',()=>{
  const f=setup();f.claim();const teacher=f.add('synthetic-teacher',true);assert.throws(()=>f.command(f.a,'reset'),code('staff_required'));
  const request={id:crypto.randomUUID(),action:'reset',revision:1};f.rooms.command(teacher.session,teacher.who,request);
  const demoted={...teacher.who,staff:false};const cached=f.rooms.command(teacher.session,demoted,request);assert.equal(cached.self.staff,false);
  assert.throws(()=>f.rooms.command(teacher.session,demoted,{...request,id:crypto.randomUUID(),revision:2}),code('staff_required'));
});
test('disconnect pauses the game, holds a seat briefly and permits explicit same-account resume',()=>{
  const f=setup();f.claim();f.rooms.disconnect(f.a.session);assert.throws(()=>f.move(f.b,'e7','e5'),code('waiting_for_player'));
  const replacement=f.add(f.a.who.id);assert.equal(f.rooms.snapshot(replacement.session).self.resumeColor,'w');
  assert.throws(()=>f.command(replacement,'claim',{color:'w'}),code('resume_required'));f.command(replacement,'resume',{color:'w'});f.move(replacement,'e2','e4');
  assert.throws(()=>f.move(f.a,'g1','f3'),code('connection_required'));
});
test('only an explicit resume transfers an existing seat from another tab',()=>{
  const f=setup();f.claim();const tab=f.add(f.a.who.id);assert.equal(f.rooms.snapshot(tab.session).self.color,null);
  f.command(tab,'resume',{color:'w'});assert.equal(f.rooms.snapshot(f.a.session).self.color,null);assert.throws(()=>f.move(f.a,'e2','e4'),code('not_a_player'));f.move(tab,'e2','e4');
});
test('leaving a seat retains the board for another student rather than deleting the host room',()=>{
  const f=setup();f.claim();f.move(f.a,'e2','e4');f.rooms.leave(f.a.session,f.a.who);const newcomer=f.add('synthetic-newcomer');
  f.command(newcomer,'claim',{color:'w'});assert.deepEqual(f.rooms.snapshot(newcomer.session).board.moves,['e4']);f.move(f.b,'e7','e5');
});
test('two-minute reconnect grace eventually releases abandoned seats without stealing a connected seat',()=>{
  const f=setup();f.claim();f.rooms.disconnect(f.a.session);
  for(let n=0;n<9;n++){f.advance(15000);f.rooms.ping(f.b.session,f.b.who);}
  assert.equal(f.rooms.snapshot(f.b.session).board.seats.w.occupied,false);assert.equal(f.rooms.snapshot(f.b.session).board.seats.b.occupied,true);
});
test('fresh school revocation clears every tab and reservation for that account immediately',()=>{
  const f=setup();f.claim();const tab=f.add(f.a.who.id);f.rooms.revoke(f.a.who.id);
  assert.throws(()=>f.rooms.snapshot(f.a.session),code('session_expired'));assert.throws(()=>f.rooms.snapshot(tab.session),code('session_expired'));assert.equal(f.rooms.snapshot(f.b.session).board.seats.w.occupied,false);
});
test('session ids are account-bound, bounded and cannot be renewed beyond verified JWT expiry',()=>{
  const f=setup();assert.throws(()=>f.rooms.ping(f.a.session,f.b.who),code('not_allowed'));
  f.add(f.a.who.id);f.add(f.a.who.id);f.add(f.a.who.id);assert.throws(()=>f.add(f.a.who.id),code('session_limit'));
  const short={id:'short',staff:false,expiresAt:f.clock()+1000},id=f.rooms.create(short).sessionId;f.rooms.connect(id,short);f.advance(1001);assert.throws(()=>f.rooms.snapshot(id),code('session_expired'));
});
test('journal stores only game data and restores moves after a service restart with no fake occupancy',()=>{
  let stored=null;const journal={read:()=>stored,write:value=>{stored=structuredClone(value);}};const f=setup({journal});f.claim();f.move(f.a,'e2','e4');f.move(f.b,'e7','e5');
  const serialized=JSON.stringify(stored);for(const value of [f.a.who.id,f.b.who.id,f.a.session,f.b.session,'staff','classId','birthdate'])assert.ok(!serialized.includes(value));
  const restored=new ChessRooms({journal,clock:f.clock}),id=restored.create(f.actor('another')).sessionId,snapshot=restored.snapshot(id);
  assert.deepEqual(snapshot.board.moves,['e4','e5']);assert.equal(snapshot.tables[0].status,'paused');assert.equal(snapshot.tables[0].players,0);assert.equal(snapshot.self.color,null);
});
test('a failed durable move never becomes an acknowledged or broadcast position',()=>{
  let failed=false;const f=setup({journal:{read:()=>null,write:()=>{if(failed)throw Error('disk full');}}});f.claim();let notifications=0;f.rooms.subscribe(()=>notifications++);
  failed=true;assert.throws(()=>f.move(f.a,'e2','e4'),code('storage_unavailable'));assert.equal(f.rooms.snapshot(f.a.session).board.fen,new Chess().fen());assert.equal(notifications,0);
});
test('a failed rematch save retains only the first consent and the finished position',()=>{
  let failed=false;const f=setup({journal:{read:()=>null,write:()=>{if(failed)throw Error('disk full');}}});f.claim();f.command(f.a,'resign');f.command(f.a,'rematch');failed=true;
  assert.throws(()=>f.command(f.b,'rematch'),code('storage_unavailable'));const state=f.rooms.snapshot(f.a.session);assert.deepEqual(state.board.rematch,['w']);assert.equal(state.board.result.score,'0-1');
});
test('corrupt or unsupported journals are rejected instead of silently resetting a position',()=>{
  const values=[{version:2,tables:[]},{version:1,tables:[]},{version:1,tables:[{id:'tisch-1'}]}];
  for(const value of values)assert.throws(()=>new ChessRooms({journal:{read:()=>value,write:()=>{throw Error('must not overwrite');}}}));
});
test('an idle board expires only after twelve hours with no connected participants',()=>{
  const f=setup();f.claim();f.move(f.a,'e2','e4');f.rooms.leave(f.a.session,f.a.who);f.rooms.leave(f.b.session,f.b.who);f.advance(12*3600000+1);
  const fresh=f.add('new-after-idle');assert.equal(f.rooms.snapshot(fresh.session).board.fen,new Chess().fen());
});
test('PGN contains the real move list and result, never school names or account identifiers',()=>{
  const f=setup();f.claim();f.move(f.a,'e2','e4');f.command(f.b,'resign');const pgn=f.rooms.pgn(f.a.session,f.a.who);
  assert.match(pgn,/1\. e4/);assert.match(pgn,/1-0/);assert.ok(!pgn.includes(f.a.who.id));assert.ok(!pgn.includes(f.a.session));
});
test('atomic file journal can replace its own file and leaves no staging files',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'castle-chess-journal-'));
  try{const journal=new ChessJournal(path.join(directory,'state.json'));assert.equal(journal.read(),null);journal.write({version:1,tables:[]});journal.write({version:1,tables:[1]});assert.deepEqual(journal.read(),{version:1,tables:[1]});assert.deepEqual(fs.readdirSync(directory),['state.json']);}
  finally{const file=path.join(directory,'state.json');if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(directory);}
});
