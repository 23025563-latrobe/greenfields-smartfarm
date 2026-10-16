// Isolated browser-test server. Never imported by the application server.
import express from 'express';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';
import { readSensorReadings } from '../sensor-data.js';

const directory = await mkdtemp(join(tmpdir(), 'smartfarm-browser-'));
const sensorPath = join(directory, 'sensor-readings.json');
const controlPath = join(directory, 'control.json');
await writeFile(sensorPath, await readFile(new URL('../data/sensor-readings.json', import.meta.url)));
await writeFile(controlPath, '{}');
const database = openDatabase(join(directory, 'test.db'));
const app = express();

app.use(async (request, response, next) => {
  try {
    const control = JSON.parse(await readFile(controlPath, 'utf8'));
    if (control.delay) {
      await new Promise(resolve => setTimeout(resolve, control.delay));
    }
    if (control.cropFailure && request.path === '/api/crops') {
      return response.status(500).json({ error: 'Internal server error' });
    }
    next();
  } catch (error) {
    next(error);
  }
});
app.use(createApp(database, () => readSensorReadings(sensorPath)));

const server = app.listen(3102, '127.0.0.1', () => {
  console.log(`Isolated API: http://127.0.0.1:3102\nFixtures: ${directory}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    // Keep disposable fixtures for evidence until explicitly removed by the tester.
    process.exit(0);
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
