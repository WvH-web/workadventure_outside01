import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TeacherLounge, parseLoungeMap, spaceAt, SEAT_KEY } from '../assets/teacher-lounge-20261107/room.js';

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
  const calls = { disabled: false, proximity: true, buttons: new Set(), published: [], spaceLeaves: 0, joined: [] };
  let position = { x: 360, y: 176 };
  const wa = {
    player: { playerId: id, state: { saveVariable: async (key, value, options) => { state[key] = value; calls.published.push({ key, value, options }); } },
      getPosition: async () => ({ ...position }),
      teleport: async (x, y) => { position = { x, y }; moved.emit(position); },
      moveTo: async (x, y) => { position = { x, y }; moved.emit(position); return { x, y, cancelled: false }; },
      onPlayerMove: (listener) => moved.subscribe(listener) },
    players: { configureTracking: async () => {}, list: () => remotes.values(), onVariableChange: () => changed,
      onPlayerEnters: enters, onPlayerLeaves: leaves },
    controls: { disablePlayerControls: () => { calls.disabled = true; }, restorePlayerControls: () => { calls.disabled = false; },
      disablePlayerProximityMeeting: () => { calls.proximity = false; }, restorePlayerProximityMeeting: () => { calls.proximity = true; } },
    ui: { displayActionMessage: (data) => { calls.prompt = data; return { remove: () => {} }; },
      actionBar: { addButton: (data) => calls.buttons.add(data.id), removeButton: (id) => calls.buttons.delete(id) } },
    spaces: { joinSpace: async (name, filter, props) => {
      calls.joined.push({ name, filter, props }); return { leave: () => { calls.spaceLeaves++; } };
    } },
  };
  const controller = new TeacherLounge(wa, layout, { delay: async () => {} });
  return { wa, controller, calls, state, remotes, moved, changed };
}

test('native tile dimensions, gids and empty entry markers are consistent', () => {
  assert.equal(map.width, 24); assert.equal(map.height, 16); assert.equal(map.tilewidth, 32);
  for (const l of map.layers.filter((l) => l.type === 'tilelayer')) {
    assert.equal(l.data.length, 384); assert.ok(l.data.every((id) => Number.isInteger(id) && id >= 0 && id <= 386));
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

test('every seat and standing position is reachable from the doorway', () => {
  const visited = new Set(), queue = [[11, 13]];
  while (queue.length) {
    const [x, y] = queue.shift(), id = y * 24 + x;
    if (visited.has(id) || x < 0 || x >= 24 || y < 0 || y >= 16 || collisions[id]) continue;
    visited.add(id); queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (const s of layout.seats) {
    assert.ok(visited.has(Math.floor(s.y / 32) * 24 + Math.floor(s.x / 32)), `seat route: ${s.id}`);
    assert.ok(visited.has(Math.floor(s.standY / 32) * 24 + Math.floor(s.standX / 32)), `standing route: ${s.id}`);
  }
});

test('conversation regions do not overlap and leave ordinary proximity outside', () => {
  assert.equal(spaceAt({ x: 100, y: 220 }, layout.spaces), 'fireplace');
  assert.equal(spaceAt({ x: 430, y: 280 }, layout.spaces), 'council');
  assert.equal(spaceAt({ x: 384, y: 432 }, layout.spaces), null);
  const [a, b] = layout.spaces;
  assert.ok(a.x + a.width <= b.x);
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

test('late audio joins are left and proximity is restored after exiting a region', async () => {
  const f = fixture(); let resolve;
  f.wa.spaces.joinSpace = () => new Promise((r) => { resolve = r; });
  f.controller.desiredSpaceId = 'council';
  const joining = f.controller.syncAudio();
  f.controller.desiredSpaceId = null;
  resolve({ leave: () => { f.calls.spaceLeaves++; } });
  await joining;
  assert.equal(f.calls.spaceLeaves, 1); assert.equal(f.calls.proximity, true);
});

test('dispose is idempotent and restores both controls and proximity', async () => {
  const f = fixture(); await f.controller.start();
  await f.controller.sit('table-north-1');
  f.controller.dispose(); f.controller.dispose();
  assert.equal(f.calls.disabled, false); assert.equal(f.calls.proximity, true); assert.equal(f.calls.buttons.size, 0);
});
