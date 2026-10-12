import express from 'express';
import { readSensorReadings, SensorDataError } from './sensor-data.js';

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readId(value) {
  const id = Number(value);

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new RequestError(400, 'id must be a positive integer');
  }

  return id;
}

function validateCrop(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError(400, 'Request body must be a JSON object');
  }

  if (
    typeof body.location !== 'string' ||
    body.location.trim().length === 0
  ) {
    throw new RequestError(400, 'location is required');
  }

  if (body.location.length > 100) {
    throw new RequestError(400, 'location must be at most 100 characters');
  }

  for (const field of ['target_min', 'target_max', 'normal_water']) {
    if (typeof body[field] !== 'number' || !Number.isFinite(body[field])) {
      throw new RequestError(400, `${field} must be a finite number`);
    }
  }

  if (body.target_min < 0 || body.target_min > 100) {
    throw new RequestError(400, 'target_min must be between 0 and 100');
  }

  if (body.target_max < 0 || body.target_max > 100) {
    throw new RequestError(400, 'target_max must be between 0 and 100');
  }

  if (body.target_min >= body.target_max) {
    throw new RequestError(400, 'target_min must be less than target_max');
  }

  if (body.normal_water <= 0 || body.normal_water > 10000) {
    throw new RequestError(400, 'normal_water must be greater than 0 and at most 10000');
  }

  const notes = body.notes === undefined ? '' : body.notes;

  if (typeof notes !== 'string' || notes.length > 500) {
    throw new RequestError(400, 'notes must be a string of at most 500 characters');
  }

  return {
    location: body.location.trim(),
    target_min: body.target_min,
    target_max: body.target_max,
    normal_water: body.normal_water,
    notes
  };
}

export function createApp(database, loadReadings = readSensorReadings) {
  const app = express();

  const findCrop = database.prepare('SELECT * FROM crops WHERE id = ?');
  const findName = database.prepare('SELECT id FROM crops WHERE crop_name = ?');

  function requireCrop(id) {
    const crop = findCrop.get(id);

    if (!crop) {
      throw new RequestError(404, 'Crop card not found');
    }

    return crop;
  }

  app.use(express.json());

  app.get('/api/health', (request, response) => {
    response.json({
      status: 'ok',
      service: 'GreenFields SmartFarm API'
    });
  });

  app.get('/api/crops', (request, response) => {
    response.json(
      database.prepare('SELECT * FROM crops ORDER BY id').all()
    );
  });

  app.get('/api/crops/:id', (request, response) => {
    response.json(requireCrop(readId(request.params.id)));
  });

  app.post('/api/crops', async (request, response) => {
    const settings = validateCrop(request.body);
    const { crop_name: cropName } = request.body;

    if (typeof cropName !== 'string' || cropName.length === 0) {
      throw new RequestError(400, 'crop_name is required');
    }

    const readings = await loadReadings();

    if (!readings.some(reading => reading.crop_name === cropName)) {
      throw new RequestError(400, 'crop_name does not exist in sensor data');
    }

    if (findName.get(cropName)) {
      throw new RequestError(409, 'crop_name already exists');
    }

    const result = database.prepare(`
      INSERT INTO crops (
        crop_name, location, target_min, target_max, normal_water, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      cropName,
      settings.location,
      settings.target_min,
      settings.target_max,
      settings.normal_water,
      settings.notes
    );

    response.status(201).json(findCrop.get(Number(result.lastInsertRowid)));
  });

  app.put('/api/crops/:id', (request, response) => {
    const id = readId(request.params.id);
    const crop = requireCrop(id);
    const settings = validateCrop(request.body);

    if (
      Object.hasOwn(request.body, 'crop_name') &&
      request.body.crop_name !== crop.crop_name
    ) {
      throw new RequestError(400, 'crop_name cannot be changed');
    }

    database.prepare(`
      UPDATE crops
      SET location = ?, target_min = ?, target_max = ?,
          normal_water = ?, notes = ?
      WHERE id = ?
    `).run(
      settings.location,
      settings.target_min,
      settings.target_max,
      settings.normal_water,
      settings.notes,
      id
    );

    response.json(findCrop.get(id));
  });

  app.delete('/api/crops/:id', (request, response) => {
    const id = readId(request.params.id);
    requireCrop(id);

    database.prepare('DELETE FROM crops WHERE id = ?').run(id);
    response.json({ deleted: true, id });
  });

  app.get('/api/readings', async (request, response) => {
    response.json(await loadReadings());
  });

  app.use((request, response) => {
    response.status(404).json({ error: 'Route not found' });
  });

  app.use((error, request, response, next) => {
    if (error instanceof RequestError) {
      return response.status(error.status).json({ error: error.message });
    }

    if (error instanceof SensorDataError) {
      return response.status(500).json({ error: error.message });
    }

    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Invalid JSON request body' });
    }

    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Request body is too large' });
    }

    if (error.code === 'ERR_SQLITE_ERROR' && error.errcode === 2067) {
      return response.status(409).json({ error: 'crop_name already exists' });
    }

    console.error(error);
    response.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
