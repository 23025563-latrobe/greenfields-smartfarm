import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';

async function startApi(t) {
  const database = openDatabase(':memory:');
  const server = createApp(database).listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    database.close();
  });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    assert.match(response.headers.get('content-type'), /application\/json/);
    return { status: response.status, body: await response.json() };
  }
  return { database, base, request };
}

const settings = { location: 'South Field', target_min: 50, target_max: 70, normal_water: 600, notes: '' };

test('POST and PUT reject wrong types and limits and accept exact field boundaries', async t => {
  const { request } = await startApi(t);
  const invalid = [];
  for (const field of ['target_min', 'target_max', 'normal_water']) {
    for (const value of ['50', null, true, [], {}, undefined]) invalid.push({ ...settings, [field]: value });
  }
  for (const location of ['', '   ', 'x'.repeat(101), null, 12, true, [], {}, undefined]) invalid.push({ ...settings, location });
  for (const notes of [null, 12, true, [], {}, 'x'.repeat(501)]) invalid.push({ ...settings, notes });
  invalid.push(
    { ...settings, target_min: -0.1 }, { ...settings, target_min: 100.1 },
    { ...settings, target_max: -0.1 }, { ...settings, target_max: 100.1 },
    { ...settings, target_min: 70 }, { ...settings, target_min: 71 },
    { ...settings, normal_water: 0 }, { ...settings, normal_water: -1 },
    { ...settings, normal_water: 10000.1 }
  );
  for (const body of invalid) {
    for (const [path, method, payload] of [
      ['/api/crops', 'POST', { ...body, crop_name: 'Maize' }],
      ['/api/crops/1', 'PUT', body]
    ]) {
      const response = await request(path, method, payload);
      assert.equal(response.status, 400, `${method}: ${JSON.stringify(payload)}`);
      assert.equal(typeof response.body.error, 'string');
      assert.ok(response.body.error.length > 0);
    }
  }
  const boundaries = { location: 'x'.repeat(100), target_min: 0, target_max: 100, normal_water: 10000, notes: 'x'.repeat(500) };
  const created = await request('/api/crops', 'POST', { ...boundaries, crop_name: 'Maize' });
  assert.equal(created.status, 201);
  for (const [field, value] of Object.entries(boundaries)) assert.equal(created.body[field], value);
  const updated = await request('/api/crops/1', 'PUT', { ...boundaries, crop_name: 'Tomato', normal_water: 0.01 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.normal_water, 0.01);
  const withoutNotes = { ...settings };
  delete withoutNotes.notes;
  const omitted = await request('/api/crops/1', 'PUT', withoutNotes);
  assert.equal(omitted.status, 200);
  assert.equal(omitted.body.notes, '');
});

test('API keeps names exact, IDs valid, sensor routes read-only and all errors JSON', async t => {
  const { request, base, database } = await startApi(t);
  for (const crop_name of ['tomato', 'maize', ' Tomato', 'Tomato ', 'Rice']) {
    assert.deepEqual(await request('/api/crops', 'POST', { ...settings, crop_name }), {
      status: 400, body: { error: 'crop_name does not exist in sensor data' }
    });
  }
  for (const id of ['0', '-1', '1.5', 'abc', '9007199254740992']) {
    assert.equal((await request(`/api/crops/${id}`)).status, 400);
  }
  for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.deepEqual(await request('/api/readings', method), { status: 404, body: { error: 'Route not found' } });
  }
  const malformed = await fetch(`${base}/api/crops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid JSON request body' });
  for (const body of [null, [], 'text', 42]) {
    assert.equal((await request('/api/crops', 'POST', body)).status, 400);
  }
  const columns = database.prepare('PRAGMA table_info(crops)').all().map(column => column.name);
  assert.deepEqual(columns, ['id', 'crop_name', 'location', 'target_min', 'target_max', 'normal_water', 'notes', 'created_at']);
  // This deliberate failure is confined to the disposable in-memory database.
  database.exec('DROP TABLE crops');
  assert.deepEqual(await request('/api/crops'), { status: 500, body: { error: 'Internal server error' } });
});
