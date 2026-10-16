import { useEffect, useRef, useState } from 'react';

function CropForm({ crop, availableNames, isSaving, onSave, onCancel }) {
  const isEditing = Boolean(crop);
  const headingRef = useRef(null);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    crop_name: crop?.crop_name ?? availableNames[0] ?? '',
    location: crop?.location ?? '',
    target_min: crop?.target_min ?? '',
    target_max: crop?.target_max ?? '',
    normal_water: crop?.normal_water ?? '',
    notes: crop?.notes ?? ''
  });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!values.location.trim()) {
      setError('Enter a location containing at least one non-space character.');
      return;
    }

    const settings = {
      location: values.location.trim(),
      target_min: Number(values.target_min),
      target_max: Number(values.target_max),
      normal_water: Number(values.normal_water),
      notes: values.notes
    };

    if (settings.target_min >= settings.target_max) {
      setError('Minimum moisture must be less than maximum moisture.');
      return;
    }

    if (settings.normal_water <= 0) {
      setError('Normal water must be greater than zero.');
      return;
    }

    try {
      await onSave(
        isEditing
          ? settings
          : { crop_name: values.crop_name, ...settings }
      );
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <section className="panel" aria-labelledby="form-heading">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Crop settings</p>
          <h2 id="form-heading" ref={headingRef} tabIndex={-1}>
            {isEditing ? `Edit ${crop.crop_name}` : 'Add Crop Card'}
          </h2>
          <p className="muted">
            {isEditing
              ? 'Update the card settings. The crop name remains unchanged.'
              : 'Choose an unused crop from the sensor feed and enter its settings.'}
          </p>
        </div>
      </header>

      <p className="form-guidance">All fields are required except notes. Water amounts are in litres.</p>
      <form onSubmit={handleSubmit} aria-busy={isSaving}>
        <fieldset disabled={isSaving}>
          <legend className="sr-only">Crop card settings</legend>

          <div className="form-grid">
            <label>
              Crop name
              {isEditing ? (
                <input value={values.crop_name} readOnly />
              ) : (
                <select
                  name="crop_name"
                  value={values.crop_name}
                  onChange={handleChange}
                  required
                >
                  {availableNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </label>

            <label>
              Location
              <input
                name="location"
                value={values.location}
                onChange={handleChange}
                maxLength={100}
                required
                placeholder="For example, South Field"
                autoComplete="off"
              />
            </label>

            <label>
              Minimum moisture (%)
              <input
                name="target_min"
                type="number"
                min="0"
                max="100"
                step="any"
                value={values.target_min}
                aria-describedby="moisture-help"
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Maximum moisture (%)
              <input
                name="target_max"
                type="number"
                min="0"
                max="100"
                step="any"
                value={values.target_max}
                aria-describedby="moisture-help"
                onChange={handleChange}
                required
              />
            </label>

            <p id="moisture-help" className="full-width field-guidance">
              Moisture targets must be between 0 and 100%. Minimum must be lower than maximum.
              Values exactly on either target are Healthy.
            </p>

            <div className="form-field">
              <label>
                Normal water (L)
                <input
                  name="normal_water"
                  type="number"
                  min="0"
                  max="10000"
                  step="any"
                  value={values.normal_water}
                  aria-describedby="water-help"
                  onChange={handleChange}
                  required
                />
              </label>
              <span id="water-help" className="field-guidance">Greater than 0, up to 10,000 L.</span>
            </div>

            <label className="full-width">
              Notes <span className="muted">(optional)</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={500}
                value={values.notes}
                aria-describedby="notes-help"
                onChange={handleChange}
              />
            </label>
          </div>
          <p id="notes-help" className="field-help">Notes: {values.notes.length}/500 characters</p>

          {error && <p className="feedback error" role="alert">{error}</p>}

          <div className="panel-actions">
            <button type="submit" className="primary-button">
              {isSaving
                ? 'Saving…'
                : isEditing
                  ? 'Save changes'
                  : 'Create Crop Card'}
            </button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

export default CropForm;
