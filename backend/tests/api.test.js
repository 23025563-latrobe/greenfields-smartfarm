import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';
import {
  readSensorReadings,
  validateSensorReadings
} from '../sensor-data.js';

const sensorFile = new URL('../data/sensor-readings.json', import.meta.url);

test('crop CRUD enforces validation and leaves sensor data unchanged', async () => {
  const database = openDatabase(':memory:');
  const server = createApp(database).listen(0);
  await once(server, 'listening');

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, method = 'GET', body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return { status: response.status, body: await response.json() };
  }

  const maize = {
    crop_name: 'Maize',
    location: 'South Field',
    target_min: 50,
    target_max: 70,
    normal_water: 600
  };

  try {
    const originalFile = await readFile(sensorFile, 'utf8');
    const initial = await request('/api/crops');

    assert.equal(initial.status, 200);
    assert.deepEqual(
      initial.body.map(crop => crop.crop_name),
      ['Tomato', 'Lettuce', 'Wheat']
    );

    const created = await request('/api/crops', 'POST', maize);
    assert.equal(created.status, 201);
    assert.equal(created.body.notes, '');
    assert.ok(created.body.created_at);

    const id = created.body.id;
    assert.equal((await request(`/api/crops/${id}`)).body.crop_name, 'Maize');

    const duplicate = await request('/api/crops', 'POST', maize);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error, 'crop_name already exists');

    const invalidBodies = [
      { ...maize, crop_name: 'maize' },
      { ...maize, location: '' },
      { ...maize, location: 'x'.repeat(101) },
      { ...maize, target_min: '50' },
      { ...maize, target_min: -1 },
      { ...maize, target_max: 101 },
      { ...maize, target_min: 70 },
      { ...maize, normal_water: 0 },
      { ...maize, normal_water: 10001 },
      { ...maize, notes: null },
      { ...maize, notes: 'x'.repeat(501) }
    ];

    for (const body of invalidBodies) {
      const result = await request('/api/crops', 'POST', body);
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.error, 'string');
    }

    const renamed = await request(`/api/crops/${id}`, 'PUT', {
      ...maize,
      crop_name: 'Tomato'
    });
    assert.equal(renamed.status, 400);
    assert.equal(renamed.body.error, 'crop_name cannot be changed');

    const { crop_name, ...settings } = maize;
    const updated = await request(`/api/crops/${id}`, 'PUT', {
      ...settings,
      location: 'South Field B',
      target_min: 45
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.location, 'South Field B');
    assert.equal(updated.body.crop_name, crop_name);
    assert.equal(updated.body.created_at, created.body.created_at);

    const deleted = await request(`/api/crops/${id}`, 'DELETE');
    assert.deepEqual(deleted.body, { deleted: true, id });
    assert.equal((await request(`/api/crops/${id}`)).status, 404);
    assert.equal((await request(`/api/crops/${id}`, 'PUT', maize)).status, 404);
    assert.equal((await request(`/api/crops/${id}`, 'DELETE')).status, 404);

    assert.equal((await request('/api/crops', 'POST', maize)).status, 201);
    assert.equal(await readFile(sensorFile, 'utf8'), originalFile);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
    database.close();
  }
});

test('sensor dataset has the required latest cases and one older invalid value', async () => {
  const readings = await readSensorReadings();
  assert.equal(readings.length, 20);

  const latest = {};

  for (const cropName of ['Tomato', 'Lettuce', 'Wheat', 'Maize']) {
    const matches = readings.filter(reading => reading.crop_name === cropName);
    assert.equal(matches.length, 5);

    latest[cropName] = [...matches].sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp)
    )[0];

    assert.notEqual(matches.at(-1).timestamp, latest[cropName].timestamp);
  }

  assert.equal(latest.Tomato.sensor_status, 'Online');
  assert.ok(latest.Tomato.soil_moisture < 55);
  assert.ok(latest.Tomato.temperature > 35);

  assert.equal(latest.Lettuce.sensor_status, 'Online');
  assert.ok(latest.Lettuce.soil_moisture >= 60);
  assert.ok(latest.Lettuce.soil_moisture <= 80);

  assert.equal(latest.Wheat.sensor_status, 'Online');
  assert.ok(latest.Wheat.soil_moisture > 55);
  assert.ok(latest.Wheat.rainfall >= 5);
  assert.equal(latest.Maize.sensor_status, 'Faulty');

  const invalid = readings.filter(reading =>
    reading.soil_moisture < 0 || reading.soil_moisture > 100 ||
    reading.temperature < 0 || reading.temperature > 50 ||
    reading.rainfall < 0 || reading.rainfall > 50
  );

  assert.equal(invalid.length, 1);
  assert.ok(invalid[0].timestamp < latest[invalid[0].crop_name].timestamp);
});

test('sensor validator rejects structural errors', async () => {
  const readings = await readSensorReadings();

  const mutations = [
    data => data.pop(),
    data => { delete data[0].notes; },
    data => { data[0].extra = true; },
    data => { data[0].soil_moisture = '42'; },
    data => { data[0].timestamp = '2026-02-30T09:00:00'; },
    data => { data[0].sensor_status = 'online'; },
    data => { data[0].crop_name = 'tomato'; },
    data => {
      data[0].timestamp = data.find(
        (reading, index) => index > 0 && reading.crop_name === data[0].crop_name
      ).timestamp;
    },
    data => { data[0].crop_name = 'Lettuce'; }
  ];

  for (const mutate of mutations) {
    const data = structuredClone(readings);
    mutate(data);
    assert.throws(() => validateSensorReadings(data), {
      message: 'Sensor data file is invalid'
    });
  }

  assert.throws(() => validateSensorReadings({}), {
    message: 'Sensor data file is invalid'
  });
});
