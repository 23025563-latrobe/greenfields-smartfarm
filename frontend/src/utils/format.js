const numberFormatter = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 2
});

export function formatMeasurement(value, unit) {
  return value === null || value === undefined
    ? 'N/A'
    : `${numberFormatter.format(value)} ${unit}`;
}

export function formatSensorTime(timestamp) {
  return timestamp ? timestamp.replace('T', ' · ') : 'N/A';
}

export function statusClass(value) {
  return value.toLowerCase().replaceAll(' ', '-');
}
