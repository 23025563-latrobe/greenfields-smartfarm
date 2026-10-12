import { readFile } from 'node:fs/promises';

const sensorFile = new URL('./data/sensor-readings.json', import.meta.url);

const cropNames = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const statuses = ['Online', 'Offline', 'Faulty'];
const fields = [
  'crop_name',
  'timestamp',
  'soil_moisture',
  'temperature',
  'rainfall',
  'sensor_status',
  'notes'
];

export class SensorDataError extends Error {
  constructor() {
    super('Sensor data file is invalid');
    this.name = 'SensorDataError';
  }
}

function isValidTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19) === value
  );
}

export function validateSensorReadings(readings) {
  if (!Array.isArray(readings) || readings.length !== 20) {
    throw new SensorDataError();
  }

  const counts = new Map(cropNames.map(name => [name, 0]));
  const timestamps = new Set();
  let invalidValueCount = 0;

  for (const reading of readings) {
    if (
      reading === null ||
      typeof reading !== 'object' ||
      Array.isArray(reading) ||
      Object.keys(reading).length !== fields.length ||
      !fields.every(field => Object.hasOwn(reading, field))
    ) {
      throw new SensorDataError();
    }

    if (
      !cropNames.includes(reading.crop_name) ||
      !statuses.includes(reading.sensor_status) ||
      typeof reading.notes !== 'string' ||
      !isValidTimestamp(reading.timestamp)
    ) {
      throw new SensorDataError();
    }

    for (const field of ['soil_moisture', 'temperature', 'rainfall']) {
      if (
        typeof reading[field] !== 'number' ||
        !Number.isFinite(reading[field])
      ) {
        throw new SensorDataError();
      }

      const maximum = field === 'soil_moisture' ? 100 : 50;

      if (reading[field] < 0 || reading[field] > maximum) {
        invalidValueCount += 1;
      }
    }

    const timestampKey = `${reading.crop_name}:${reading.timestamp}`;

    if (timestamps.has(timestampKey)) {
      throw new SensorDataError();
    }

    timestamps.add(timestampKey);
    counts.set(reading.crop_name, counts.get(reading.crop_name) + 1);
  }

  if (
    [...counts.values()].some(count => count !== 5) ||
    invalidValueCount > 1
  ) {
    throw new SensorDataError();
  }

  return readings;
}

export async function readSensorReadings(path = sensorFile) {
  try {
    const content = await readFile(path, 'utf8');
    return validateSensorReadings(JSON.parse(content));
  } catch {
    throw new SensorDataError();
  }
}
