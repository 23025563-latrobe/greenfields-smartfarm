import {
  formatMeasurement,
  formatSensorTime,
  statusClass
} from '../utils/format';

function CropCard({ result, disabled, onEdit, onDelete, onHistory }) {
  const {
    crop,
    reading,
    condition,
    recommendedWater,
    alerts,
    action
  } = result;

  return (
    <article className={`crop-card ${condition ? statusClass(condition) : 'unavailable'}`} aria-labelledby={`crop-${crop.id}`}>
      <header className="card-header">
        <div className="crop-identity">
          <span className="crop-initial" aria-hidden="true">{crop.crop_name[0]}</span>
          <div>
            <h3 id={`crop-${crop.id}`}>{crop.crop_name}</h3>
            <p className="location">{crop.location}</p>
          </div>
        </div>

        <span className={`badge ${condition ? statusClass(condition) : 'unavailable'}`}>
          {condition ?? 'Unavailable'}
        </span>
      </header>

      <p className="reading-time">
        Latest reading: {formatSensorTime(reading?.timestamp)}
      </p>

      <dl className="measurements">
        <div>
          <dt>Soil moisture</dt>
          <dd>{formatMeasurement(reading?.soil_moisture, '%')}</dd>
        </div>
        <div>
          <dt>Temperature</dt>
          <dd>{formatMeasurement(reading?.temperature, '°C')}</dd>
        </div>
        <div>
          <dt>Rainfall</dt>
          <dd>{formatMeasurement(reading?.rainfall, 'mm')}</dd>
        </div>
      </dl>

      <div className="recommendation">
        <div className="water-recommendation">
          <span className="detail-label">Recommended water</span>
          <strong>{formatMeasurement(recommendedWater, 'L')}</strong>
        </div>
        <div>
          <span className="detail-label">Action</span>
          <strong>{action ?? 'N/A'}</strong>
        </div>
      </div>

      <dl className="settings">
        <div>
          <dt>Target moisture</dt>
          <dd>{crop.target_min}–{crop.target_max}%</dd>
        </div>
        <div>
          <dt>Normal water</dt>
          <dd>{formatMeasurement(crop.normal_water, 'L')}</dd>
        </div>
        <div>
          <dt>Sensor status</dt>
          <dd>{reading?.sensor_status ?? 'N/A'}</dd>
        </div>
      </dl>

      <div className="card-alerts">
        <span className="detail-label">Alerts</span>
        {reading ? (
          alerts.length > 0 ? (
            <ul>
              {alerts.map(alert => <li key={alert}>{alert}</li>)}
            </ul>
          ) : (
            <p>No alerts</p>
          )
        ) : (
          <p>Sensor feed unavailable</p>
        )}
      </div>

      {crop.notes && (
        <p className="card-note">
          <span className="detail-label">Card notes</span>
          {crop.notes}
        </p>
      )}

      {reading?.notes && (
        <p className="card-note">
          <span className="detail-label">Sensor notes</span>
          {reading.notes}
        </p>
      )}

      <footer className="card-actions">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit(crop)}
          aria-label={`Edit ${crop.crop_name}`}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={disabled || !reading}
          onClick={() => onHistory(crop.id)}
          aria-label={`View sensor history for ${crop.crop_name}`}
        >
          View Sensor History
        </button>
        <button
          type="button"
          className="danger-button"
          disabled={disabled}
          onClick={() => onDelete(crop)}
          aria-label={`Delete ${crop.crop_name}`}
        >
          Delete
        </button>
      </footer>
    </article>
  );
}

export default CropCard;
