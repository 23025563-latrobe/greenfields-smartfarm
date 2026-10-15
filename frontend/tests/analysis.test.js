import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableCropNames,
  getLatestReading,
  analyseCrop,
  calculateFarmStatus
} from '../src/utils/analysis.js';

const crop = {
  id: 1,
  crop_name: 'Tomato',
  location: 'Greenhouse A',
  target_min: 55,
  target_max: 75,
  normal_water: 500,
  notes: ''
};

function reading(overrides = {}) {
  return {
    crop_name: 'Tomato',
    timestamp: '2026-08-05T09:00:00',
    soil_moisture: 65,
    temperature: 25,
    rainfall: 0,
    sensor_status: 'Online',
    notes: '',
    ...overrides
  };
}

test('available names are unique and matching is case-sensitive', () => {
  const readings = [
    reading(),
    reading({ crop_name: 'Maize' }),
    reading({ crop_name: 'Maize' })
  ];

  assert.deepEqual(getAvailableCropNames(readings, [crop]), ['Maize']);
  assert.deepEqual(getAvailableCropNames(readings, []), ['Maize', 'Tomato']);
  assert.equal(getLatestReading('tomato', readings), null);
});

test('latest selection uses the greatest timestamp without changing array order', () => {
  const latest = reading();
  const older = reading({ timestamp: '2026-08-01T09:00:00' });
  const readings = [latest, older];
  const original = structuredClone(readings);

  assert.equal(getLatestReading('Tomato', readings), latest);
  assert.deepEqual(readings, original);
});

test('sensor problems take priority over invalid numeric values', () => {
  for (const status of ['Offline', 'Faulty']) {
    const result = analyseCrop(crop, reading({
      sensor_status: status,
      soil_moisture: 120,
      temperature: 38,
      rainfall: 5
    }));

    assert.equal(result.condition, 'Sensor Problem');
    assert.equal(result.recommendedWater, null);
    assert.equal(result.action, 'Check sensor');
    assert.deepEqual(result.alerts, ['Check sensor']);
  }
});

test('invalid Online readings identify the field and stop watering analysis', () => {
  for (const [field, value] of [
    ['soil_moisture', 120],
    ['temperature', -1],
    ['rainfall', 51]
  ]) {
    const result = analyseCrop(crop, reading({ [field]: value }));

    assert.equal(result.condition, 'Invalid Data');
    assert.equal(result.recommendedWater, null);
    assert.equal(result.action, 'Check reading');
    assert.deepEqual(result.invalidFields, [field]);
  }
});

test('moisture boundaries are Healthy and recommendations follow the card', () => {
  const cases = [
    [54, 'Dry', 500, 'Water crop'],
    [55, 'Healthy', 0, 'Monitor'],
    [75, 'Healthy', 0, 'Monitor'],
    [76, 'Too Wet', 0, 'Stop watering']
  ];

  for (const [moisture, condition, water, action] of cases) {
    const result = analyseCrop(crop, reading({ soil_moisture: moisture }));

    assert.equal(result.condition, condition);
    assert.equal(result.recommendedWater, water);
    assert.equal(result.action, action);
  }

  const edited = analyseCrop(
    { ...crop, target_min: 40, normal_water: 600 },
    reading({ soil_moisture: 42 })
  );

  assert.equal(edited.condition, 'Healthy');
  assert.equal(edited.recommendedWater, 0);
});

test('temperature and rain alerts respect their boundaries', () => {
  assert.deepEqual(
    analyseCrop(crop, reading({ temperature: 35, rainfall: 4.9 })).alerts,
    []
  );

  const result = analyseCrop(crop, reading({
    soil_moisture: 42,
    temperature: 35.1,
    rainfall: 5
  }));

  assert.deepEqual(result.alerts, ['High temperature', 'Rain detected']);
  assert.equal(result.recommendedWater, 500);
});

test('farm status respects priority and rain alone remains Normal', () => {
  const healthy = analyseCrop(crop, reading());
  const dry = analyseCrop(crop, reading({ soil_moisture: 42 }));
  const faulty = analyseCrop(crop, reading({ sensor_status: 'Faulty' }));
  const invalid = analyseCrop(crop, reading({ soil_moisture: 120 }));
  const hot = analyseCrop(crop, reading({ temperature: 38 }));
  const rainy = analyseCrop(crop, reading({ rainfall: 5 }));

  assert.equal(calculateFarmStatus([], false), 'No Crops');
  assert.equal(
    calculateFarmStatus([analyseCrop(crop, null)], false),
    'Sensor Feed Unavailable'
  );
  assert.equal(calculateFarmStatus([healthy]), 'Normal');
  assert.equal(calculateFarmStatus([rainy]), 'Normal');
  assert.equal(calculateFarmStatus([dry]), 'Watch');
  assert.equal(calculateFarmStatus([hot]), 'Watch');
  assert.equal(calculateFarmStatus([dry, faulty]), 'Critical');
  assert.equal(calculateFarmStatus([invalid]), 'Critical');
});

test('all Online numeric bounds are inclusive and each out-of-range field stops alerts', () => {
  for (const [field, maximum] of [['soil_moisture', 100], ['temperature', 50], ['rainfall', 50]]) {
    for (const value of [0, maximum]) {
      assert.notEqual(analyseCrop(crop, reading({ [field]: value })).condition, 'Invalid Data');
    }
    for (const value of [-0.01, maximum + 0.01]) {
      const result = analyseCrop(crop, reading({ temperature: 38, rainfall: 5, [field]: value }));
      assert.equal(result.condition, 'Invalid Data');
      assert.deepEqual(result.alerts, [`Invalid ${field}`]);
      assert.equal(result.recommendedWater, null);
      assert.equal(result.action, 'Check reading');
    }
  }
});
