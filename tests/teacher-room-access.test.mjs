import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const patch = fs.readFileSync(new URL('../ops/teacher-room-access/role-lookup-admin.patch', import.meta.url), 'utf8');

test('staff access includes only active administrators and teachers', () => {
  const query = patch.split('\n').find(line => line.startsWith('+') && line.includes("'teacher' =>"));
  assert.match(query, /LOWER\(email\) = LOWER\(\?\)/);
  assert.match(query, /is_active = 1 AND role_id IN \(1, 3\)/);
  assert.match(query, /LIMIT 1/);
});

test('the reviewed patch leaves parent and student queries unchanged', () => {
  const removed = patch.split('\n').filter(line => line.startsWith('-') && !line.startsWith('---'));
  const added = patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
  assert.equal(removed.length, 1);
  assert.equal(added.length, 2);
  assert.ok([...removed, ...added].every(line => !/guardians|students|Token|dbPass|dsn/.test(line)));
});
