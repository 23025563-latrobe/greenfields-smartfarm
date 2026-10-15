import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';
import { readSensorReadings } from '../sensor-data.js';

test('readings HTTP route rereads fixtures, returns raw invalid data and recovers', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'smartfarm-feed-'));
  const fixture = join(directory, 'readings.json');
  const original = await readFile(new URL('../data/sensor-readings.json', import.meta.url), 'utf8');
  const database = openDatabase(':memory:');
  const server = createApp(database, () => readSensorReadings(fixture)).listen(0);
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    database.close();
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  await writeFile(fixture, original);

  const first = await fetch(`${base}/api/readings`);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), JSON.parse(original));

  const changed = JSON.parse(original);
  changed[0].notes = 'Replacement feed read without restarting';
  await writeFile(fixture, JSON.stringify(changed));
  const replacement = await fetch(`${base}/api/readings`);
  assert.equal(replacement.status, 200);
  assert.deepEqual(await replacement.json(), changed);

  const missingField = structuredClone(changed);
  delete missingField[0].notes;
  const duplicate = structuredClone(changed);
  duplicate[0].timestamp = duplicate.find((r, i) => i > 0 && r.crop_name === duplicate[0].crop_name).timestamp;
  for (const content of ['{', '{}', JSON.stringify(changed.slice(1)), JSON.stringify(missingField), JSON.stringify(duplicate)]) {
    await writeFile(fixture, content);
    const response = await fetch(`${base}/api/readings`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Sensor data file is invalid' });
  }

  // Create must validate against the current file, even when the crop name is allowed.
  const create = await fetch(`${base}/api/crops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crop_name: 'Maize', location: 'South Field', target_min: 50, target_max: 70, normal_water: 600 })
  });
  assert.equal(create.status, 500);
  assert.deepEqual(await create.json(), { error: 'Sensor data file is invalid' });
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM crops').get().count, 3);

  await rm(fixture);
  const missing = await fetch(`${base}/api/readings`);
  assert.equal(missing.status, 500);
  assert.deepEqual(await missing.json(), { error: 'Sensor data file is invalid' });
  await writeFile(fixture, original);
  assert.deepEqual(await (await fetch(`${base}/api/readings`)).json(), JSON.parse(original));
  assert.equal(await readFile(new URL('../data/sensor-readings.json', import.meta.url), 'utf8'), original);
});

test('database reopen preserves edits and deletions without reseeding a nonempty table', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'smartfarm-db-'));
  const path = join(directory, 'test.db');
  let database;
  try {
    database = openDatabase(path);
    assert.deepEqual(database.prepare('SELECT crop_name FROM crops ORDER BY id').all().map(row => row.crop_name), ['Tomato', 'Lettuce', 'Wheat']);
    database.prepare("UPDATE crops SET location = 'Updated greenhouse' WHERE crop_name = 'Tomato'").run();
    database.prepare("DELETE FROM crops WHERE crop_name = 'Wheat'").run();
    const saved = database.prepare('SELECT * FROM crops ORDER BY id').all();
    database.close();
    database = openDatabase(path);
    assert.deepEqual(database.prepare('SELECT * FROM crops ORDER BY id').all(), saved);
    database.exec('DELETE FROM crops');
    database.close();
    database = openDatabase(path);
    assert.deepEqual(database.prepare('SELECT crop_name FROM crops ORDER BY id').all().map(row => row.crop_name), ['Tomato', 'Lettuce', 'Wheat']);
  } finally {
    database?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('Express process restart preserves a created card without duplicate seeds', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'smartfarm-restart-'));
  const path = join(directory, 'test.db');
  let child;
  const code = `
    import { createApp } from ${JSON.stringify(new URL('../app.js', import.meta.url).href)};
    import { openDatabase } from ${JSON.stringify(new URL('../db.js', import.meta.url).href)};
    const db = openDatabase(process.argv[1]);
    const server = createApp(db).listen(0, '127.0.0.1', () => console.log(server.address().port));
    process.once('SIGTERM', () => server.close(() => { db.close(); process.exit(0); }));
  `;
  async function start() {
    child = spawn(process.execPath, ['--input-type=module', '-e', code, path], { stdio: ['ignore', 'pipe', 'inherit'] });
    const [output] = await once(child.stdout, 'data');
    const port = Number(output.toString().trim());
    assert.ok(Number.isInteger(port) && port > 0);
    return `http://127.0.0.1:${port}`;
  }
  async function stop() {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const [code] = await exited;
    assert.equal(code, 0);
    child = null;
  }
  try {
    let base = await start();
    const response = await fetch(`${base}/api/crops`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_name: 'Maize', location: 'South Field', target_min: 50, target_max: 70, normal_water: 600 })
    });
    assert.equal(response.status, 201);
    const maize = await response.json();
    await stop();
    base = await start();
    const crops = await (await fetch(`${base}/api/crops`)).json();
    assert.equal(crops.length, 4);
    assert.deepEqual(crops.find(crop => crop.crop_name === 'Maize'), maize);
    assert.equal(new Set(crops.map(crop => crop.crop_name)).size, 4);
    await stop();
  } finally {
    if (child) await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
