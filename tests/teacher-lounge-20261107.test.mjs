import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TeacherLounge, parseLoungeMap, SEAT_KEY } from '../assets/teacher-lounge-20261107/room.js';

const map = JSON.parse(fs.readFileSync(new URL('../teachersmeetingground.tmj', import.meta.url)));
const layout = parseLoungeMap(map);
const collisions = map.layers.find((l) => l.name === 'collisions').data;
const free = (x, y) => x >= 0 && y >= 0 && x < 768 && y < 512 && !collisions[Math.floor(y / 32) * 24 + Math.floor(x / 32)];
const bodyFree = (x, y) => [x - 6, x + 6].every((px) => [y - 6, y + 6].every((py) => free(px, py)));

function observable() {
  const listeners = new Set();
  return { subscribe: (listener) => { listeners.add(listener); return { unsubscribe: () => listeners.delete(listener) }; },
    emit: (value) => { for (const listener of listeners) listener(value); } };
}

function fixture(id = 1) {
  const state = {}, remotes = [], moved = observable(), changed = observable(), enters = observable(), leaves = observable();
  const calls = { disabled: false, proximity: true, buttons: new Set(), published: [], spaceLeaves: 0, joined: [], teleports: [], moves: [] };
  let position = { x: 360, y: 176 };
  const wa = {
    player: { playerId: id, state: { saveVariable: async (key, value, options) => { state[key] = value; calls.published.push({ key, value, options }); } },
      getPosition: async () => ({ ...position }),
      teleport: async (x, y) => { calls.teleports.push({x,y}); position = { x, y }; moved.emit(position); },
      moveTo: async (x, y) => { calls.moves.push({x,y}); position = { x, y }; moved.emit(position); return { x, y, cancelled: false }; },
      onPlayerMove: (listener) => moved.subscribe(listener) },
    players: { configureTracking: async () => {}, list: () => remotes.values(), onVariableChange: () => changed,
      onPlayerEnters: enters, onPlayerLeaves: leaves },
    controls: { disablePlayerControls: () => { calls.disabled = true; }, restorePlayerControls: () => { calls.disabled = false; },
      disablePlayerProximityMeeting: () => { calls.proximity = false; }, restorePlayerProximityMeeting: () => { calls.proximity = true; } },
    ui: { displayActionMessage: (data) => { calls.prompt = data; return { remove: () => {} }; },
      actionBar: { addButton: (data) => calls.buttons.add(data.id), removeButton: (id) => calls.buttons.delete(id) } },
    spaces: { joinSpace: async (name, filter, props) => {
      calls.joined.push({ name, filter, props }); return { startStreaming: () => {}, leave: () => { calls.spaceLeaves++; } };
    } },
  };
  const controller = new TeacherLounge(wa, layout, { delay: async () => {} });
  return { wa, controller, calls, state, remotes, moved, changed };
}

test('voluntary hall return stands up first and keeps the original castle exit', async () => {
  const f = fixture();
  const destinations = [];
  f.wa.nav = {goToRoom: async url => destinations.push(url)};
  await f.controller.start();
  try {
    assert.ok(f.calls.buttons.has('teacher-lounge-hall'));
    const seat = layout.seats[0];
    f.moved.emit({x:seat.standX,y:seat.standY});
    await f.controller.sit(seat.id);
    assert.equal(await f.controller.returnToHall(),true);
    assert.equal(f.calls.disabled,false);
    assert.equal(f.state[SEAT_KEY],null);
    assert.deepEqual(destinations,[layout.hallUrl]);
    assert.match(layout.hallUrl,/~\/castle-preview\/grosse-halle\.wam#vom-lehrerzimmer$/);
    assert.equal(map.layers.find(l=>l.name==='exitSouth').properties[0].value,'Schloss01.tmj');
  } finally {f.controller.dispose();}
  assert.equal(f.calls.buttons.size,0);
});

test('native tile dimensions, gids and empty entry markers are consistent', () => {
  assert.equal(map.width, 24); assert.equal(map.height, 16); assert.equal(map.tilewidth, 32);
  for (const l of map.layers.filter((l) => l.type === 'tilelayer')) {
    const last = map.tilesets.at(-1);
    assert.equal(l.data.length, 384); assert.ok(l.data.every((id) => Number.isInteger(id) && id >= 0 && id < last.firstgid + last.tilecount));
  }
  const start = map.layers.find((l) => l.name === 'start');
  assert.ok(start.data.some(Boolean));
  for (const [n, id] of start.data.entries()) if (id) assert.ok(bodyFree((n % 24) * 32 + 16, Math.floor(n / 24) * 32 + 16));
  assert.equal(map.layers.find((l) => l.name === 'exitSouth').properties[0].value, 'Schloss01.tmj');
});

test('all twelve seat sockets and standing positions fit an avatar body', () => {
  assert.equal(layout.seats.length, 12); assert.equal(new Set(layout.seats.map((s) => s.id)).size, 12);
  for (const s of layout.seats) {
    assert.ok(bodyFree(s.x, s.y), `seat body: ${s.id}`);
    assert.ok(bodyFree(s.standX, s.standY), `standing body: ${s.id}`);
  }
});

test('every chair approach is reachable without walking through furniture', () => {
  const visited = new Set(), queue = [[11, 13]];
  while (queue.length) {
    const [x, y] = queue.shift(), id = y * 24 + x;
    if (visited.has(id) || x < 0 || x >= 24 || y < 0 || y >= 16 || collisions[id]) continue;
    visited.add(id); queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (const s of layout.seats) {
    assert.ok(visited.has(Math.floor(s.standY / 32) * 24 + Math.floor(s.standX / 32)), `standing route: ${s.id}`);
  }
});

test('eight table seats and three armchairs have separate conversation groups', () => {
  assert.equal(layout.seats.filter(s => s.audioGroup === 'council').length, 8);
  assert.equal(layout.seats.filter(s => s.audioGroup === 'fireplace').length, 3);
  assert.equal(layout.seats.find(s => s.id === 'desk').audioGroup, null);
  assert.ok(!map.layers.some(l => l.name === 'conversationAreas'));
});

test('fire uses native tile animations and quiet local looping audio', () => {
  const fire = map.tilesets.find(t => t.name === 'fire');
  assert.ok(fire);
  assert.equal(fire.tiles.length, 6);
  for (const tile of fire.tiles) {
    assert.equal(tile.animation.length, 7);
    assert.ok(tile.animation.every(f => f.tileid < fire.tilecount && f.duration >= 100));
  }
  assert.equal(map.layers.filter(l => l.name.startsWith('hearth-flames-')).length, 3);
  const sound = map.layers.find(l => l.name === 'ambience').objects[0];
  const props = Object.fromEntries(sound.properties.map(p => [p.name,p.value]));
  assert.equal(props.audioLoop, true); assert.equal(props.playAudio, 'village/fire.mp3');
  assert.ok(props.audioVolume <= 0.15);
  assert.ok(sound.x + sound.width < 320);
});

test('sitting publishes transient public state and keeps the native avatar', async () => {
  const f = fixture(); await f.controller.start();
  try {
    assert.equal(await f.controller.sit('table-north-1'), true);
    assert.equal(f.calls.disabled, true); assert.ok(f.calls.buttons.has('teacher-lounge-stand'));
    assert.deepEqual(f.state[SEAT_KEY], { id: 'table-north-1', stage: 'seated' });
    assert.ok(f.calls.published.every((p) => p.options.public && p.options.persist === false));
  } finally { f.controller.dispose(); }
});

test('standing restores movement and clears the seat even if the state save fails', async () => {
  const f = fixture(); await f.controller.start();
  try {
    await f.controller.sit('table-north-1');
    f.wa.player.state.saveVariable = async () => { throw Error('synthetic disconnect'); };
    await f.controller.stand();
    assert.equal(f.calls.disabled, false); assert.equal(f.calls.buttons.size, 0); assert.equal(f.controller.seat, null);
    assert.deepEqual(await f.wa.player.getPosition(), { x: 360, y: 176 });
  } finally { f.controller.dispose(); }
});

test('an occupied seat cannot be taken by another participant', async () => {
  const f = fixture(2); await f.controller.start();
  try {
    f.remotes.push({ playerId: 1, state: { [SEAT_KEY]: { id: 'table-north-1', stage: 'seated' } } });
    assert.equal(await f.controller.sit('table-north-1'), false);
    assert.equal(f.calls.disabled, false);
  } finally { f.controller.dispose(); }
});

test('simultaneous claims release the higher player id', async () => {
  const f = fixture(2); await f.controller.start();
  try {
    f.controller.delay = async () => { f.remotes.push({ playerId: 1, state: { [SEAT_KEY]: { id: 'table-north-1', stage: 'claiming' } } }); };
    assert.equal(await f.controller.sit('table-north-1'), false);
    assert.equal(f.calls.disabled, false); assert.equal(f.state[SEAT_KEY], null);
  } finally { f.controller.dispose(); }
});

test('a failed seating movement cannot trap player controls', async () => {
  const f = fixture(); await f.controller.start();
  try {
    f.wa.player.moveTo = async () => { throw Error('synthetic movement error'); };
    await assert.rejects(f.controller.sit('table-north-1'));
    assert.equal(f.calls.disabled, false); assert.equal(f.calls.buttons.size, 0);
  } finally { f.controller.dispose(); }
});

test('standing during a pending sitting movement cannot teleport back to the chair', async () => {
  const f = fixture(); await f.controller.start();
  let finishMove, enteredMove;
  const moving = new Promise((resolve) => { enteredMove = resolve; });
  f.wa.player.moveTo = () => { enteredMove(); return new Promise((resolve) => { finishMove = resolve; }); };
  try {
    const sitting = f.controller.sit('table-north-1');
    await moving;
    await f.controller.stand();
    finishMove({ cancelled: true });
    assert.equal(await sitting, false);
    assert.deepEqual(await f.wa.player.getPosition(), { x: 360, y: 176 });
    assert.equal(f.calls.disabled, false);
  } finally { f.controller.dispose(); }
});

test('only seated participants join their native table meeting', async () => {
  const f = fixture(); await f.controller.start();
  try {
    await f.controller.audioTask;
    assert.equal(f.calls.joined.length, 0);
    await f.controller.sit('table-north-1'); await f.controller.audioTask;
    assert.equal(f.calls.joined[0].filter, 'everyone');
    assert.ok(f.calls.joined[0].name.endsWith('-council'));
    assert.ok(!f.calls.joined[0].props.includes('megaphoneState'));
    await f.controller.stand(); await f.controller.audioTask;
    assert.equal(f.calls.spaceLeaves, 1); assert.equal(f.controller.activeSpaceId, null);
    assert.equal(f.calls.proximity, true);
  } finally { f.controller.dispose(); }
});

test('facing alignment accounts for the native sixteen pixel foot offset', async () => {
  for (const seat of layout.seats) {
    const f=fixture(); await f.controller.start();
    try {
      await f.wa.player.teleport(seat.standX,seat.standY);
      await f.controller.sit(seat.id);
      const from=f.calls.teleports.at(-2),to=f.calls.moves.at(-1);
      const dx=to.x-from.x,dy=to.y-16-from.y;
      assert.equal(dx, {left:-32,right:32,up:0,down:0}[seat.facing], seat.id);
      assert.equal(dy, {left:0,right:0,up:-32,down:32}[seat.facing], seat.id);
      assert.ok(Math.floor(from.x/32)!==Math.floor(to.x/32)||Math.floor(from.y/32)!==Math.floor(to.y/32));
    } finally {f.controller.dispose();}
  }
});

test('late audio joins are left after exiting a region', async () => {
  const f = fixture(); let resolve;
  f.wa.spaces.joinSpace = () => new Promise((r) => { resolve = r; });
  f.controller.desiredSpaceId = 'council';
  const joining = f.controller.syncAudio();
  f.controller.desiredSpaceId = null;
  resolve({ leave: () => { f.calls.spaceLeaves++; } });
  await joining;
  assert.equal(f.calls.spaceLeaves, 1); assert.equal(f.calls.proximity, true);
});

test('dispose is idempotent and restores controls without changing microphone settings', async () => {
  const f = fixture(); await f.controller.start();
  await f.controller.sit('table-north-1');
  f.controller.dispose(); f.controller.dispose();
  assert.equal(f.calls.disabled, false); assert.equal(f.calls.proximity, true); assert.equal(f.calls.buttons.size, 0);
});
