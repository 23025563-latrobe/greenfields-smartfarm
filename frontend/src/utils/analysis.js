export function getAvailableCropNames(readings, crops) {
  const usedNames = new Set(crops.map(crop => crop.crop_name));
  const sensorNames = new Set(readings.map(reading => reading.crop_name));

  return [...sensorNames]
    .filter(name => !usedNames.has(name))
    .sort();
}

export function getLatestReading(cropName, readings) {
  let latest = null;

  for (const reading of readings) {
    if (
      reading.crop_name === cropName &&
      (latest === null || reading.timestamp > latest.timestamp)
    ) {
      latest = reading;
    }
  }

  return latest;
}

export function analyseCrop(crop, reading) {
  const result = {
    crop,
    reading,
    condition: null,
    recommendedWater: null,
    alerts: [],
    action: null,
    invalidFields: []
  };

  if (!reading) {
    return result;
  }

  if (
    reading.sensor_status === 'Offline' ||
    reading.sensor_status === 'Faulty'
  ) {
    return {
      ...result,
      condition: 'Sensor Problem',
      alerts: ['Check sensor'],
      action: 'Check sensor'
    };
  }

  const ranges = [
    ['soil_moisture', 0, 100],
    ['temperature', 0, 50],
    ['rainfall', 0, 50]
  ];

  const invalidFields = ranges
    .filter(([field, minimum, maximum]) => {
      const value = reading[field];

      return (
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum
      );
    })
    .map(([field]) => field);

  if (invalidFields.length > 0) {
    return {
      ...result,
      condition: 'Invalid Data',
      alerts: invalidFields.map(field => `Invalid ${field}`),
      action: 'Check reading',
      invalidFields
    };
  }

  let condition;
  let recommendedWater;
  let action;

  if (reading.soil_moisture < crop.target_min) {
    condition = 'Dry';
    recommendedWater = crop.normal_water;
    action = 'Water crop';
  } else if (reading.soil_moisture <= crop.target_max) {
    condition = 'Healthy';
    recommendedWater = 0;
    action = 'Monitor';
  } else {
    condition = 'Too Wet';
    recommendedWater = 0;
    action = 'Stop watering';
  }

  const alerts = [];

  if (reading.temperature > 35) {
    alerts.push('High temperature');
  }

  if (reading.rainfall >= 5) {
    alerts.push('Rain detected');
  }

  return {
    ...result,
    condition,
    recommendedWater,
    alerts,
    action
  };
}

export function calculateFarmStatus(results, hasSensorData = true) {
  if (results.length === 0) {
    return 'No Crops';
  }

  if (!hasSensorData) {
    return 'Sensor Feed Unavailable';
  }

  if (
    results.some(result =>
      result.condition === 'Sensor Problem' ||
      result.condition === 'Invalid Data'
    )
  ) {
    return 'Critical';
  }

  if (
    results.some(result =>
      result.condition === 'Dry' ||
      result.condition === 'Too Wet' ||
      result.alerts.includes('High temperature')
    )
  ) {
    return 'Watch';
  }

  return 'Normal';
}
