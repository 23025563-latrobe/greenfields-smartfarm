import { useEffect, useRef } from 'react';
import { analyseCrop } from '../utils/analysis';
import {
  formatMeasurement,
  formatSensorTime,
  statusClass
} from '../utils/format';

function SensorHistory({ crop, readings, onClose }) {
  const headingRef = useRef(null);
  const history = readings
    .filter(reading => reading.crop_name === crop.crop_name)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="panel" aria-labelledby="history-heading">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Read-only sensor feed</p>
          <h2 id="history-heading" ref={headingRef} tabIndex={-1}>
            {crop.crop_name} Sensor History
          </h2>
          <p className="muted">
            Newest readings first. Analysis uses the current crop card settings.
          </p>
        </div>
        <button type="button" onClick={onClose}>Close history</button>
      </header>

      <div
        className="table-scroll"
        role="region"
        aria-label={`${crop.crop_name} sensor readings`}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            All {history.length} readings for {crop.crop_name}
          </caption>
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              <th scope="col">Moisture</th>
              <th scope="col">Temperature</th>
              <th scope="col">Rainfall</th>
              <th scope="col">Sensor</th>
              <th scope="col">Condition</th>
              <th scope="col">Water</th>
              <th scope="col">Alerts / action</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map(reading => {
              const result = analyseCrop(crop, reading);

              return (
                <tr key={reading.timestamp}>
                  <th scope="row">{formatSensorTime(reading.timestamp)}</th>
                  <td>{formatMeasurement(reading.soil_moisture, '%')}</td>
                  <td>{formatMeasurement(reading.temperature, '°C')}</td>
                  <td>{formatMeasurement(reading.rainfall, 'mm')}</td>
                  <td>{reading.sensor_status}</td>
                  <td>
                    <span className={`badge ${statusClass(result.condition)}`}>
                      {result.condition}
                    </span>
                  </td>
                  <td>{formatMeasurement(result.recommendedWater, 'L')}</td>
                  <td>
                    <span>{result.alerts.join(', ') || 'No alerts'}</span>
                    <span className="table-action">{result.action}</span>
                  </td>
                  <td>{reading.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SensorHistory;
