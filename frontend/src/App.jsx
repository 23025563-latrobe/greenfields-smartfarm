import { useEffect, useRef, useState } from 'react';
import CropCard from './components/CropCard';
import CropForm from './components/CropForm';
import SensorHistory from './components/SensorHistory';
import {
  getCrops,
  getReadings,
  createCrop,
  updateCrop,
  deleteCrop
} from './services/api';
import {
  getAvailableCropNames,
  getLatestReading,
  analyseCrop,
  calculateFarmStatus
} from './utils/analysis';
import { statusClass } from './utils/format';
import './App.css';

const farmStatusDescriptions = {
  Normal: 'All crop readings are within their configured targets.',
  Watch: 'Review moisture conditions and high-temperature alerts.',
  Critical: 'A sensor problem or invalid reading needs your attention.',
  'No Crops': 'Add a crop card to start monitoring your farm.',
  'Sensor Feed Unavailable': 'Load the sensor feed to calculate crop conditions.'
};

const cropConditions = ['Healthy', 'Dry', 'Too Wet', 'Sensor Problem', 'Invalid Data'];

function App() {
  const [crops, setCrops] = useState(null);
  const [readings, setReadings] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cropError, setCropError] = useState('');
  const [sensorError, setSensorError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [historyId, setHistoryId] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [conditionFilter, setConditionFilter] = useState('all');
  const [cropSearch, setCropSearch] = useState('');
  const addButtonRef = useRef(null);
  const dashboardRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const conditionFilterRef = useRef(null);
  const cropSearchRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      const [cropResponse, sensorResponse] = await Promise.allSettled([
        getCrops(controller.signal),
        getReadings(controller.signal)
      ]);

      if (controller.signal.aborted) {
        return;
      }

      if (cropResponse.status === 'fulfilled') {
        setCrops(cropResponse.value);
        setCropError('');
      } else {
        setCropError(cropResponse.reason.message);
      }

      if (sensorResponse.status === 'fulfilled') {
        setReadings(sensorResponse.value);
        setLastRefresh(new Date());
        setSensorError('');
      } else {
        setSensorError(sensorResponse.reason.message);
      }

      setIsLoading(false);
    }

    loadDashboard();

    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    if (pendingDelete) {
      deleteButtonRef.current?.focus();
    }
  }, [pendingDelete]);

  const currentCrops = crops ?? [];
  const hasSensorData = readings !== null;
  const currentReadings = readings ?? [];
  const results = currentCrops.map(crop =>
    analyseCrop(crop, getLatestReading(crop.crop_name, currentReadings))
  );
  const farmStatus = calculateFarmStatus(results, hasSensorData);
  const searchTerm = cropSearch.trim().toLowerCase();
  const visibleResults = results.filter(result => {
    const matchesCondition = conditionFilter === 'all' || result.condition === conditionFilter;
    const matchesSearch = result.crop.crop_name.toLowerCase().includes(searchTerm) ||
      result.crop.location.toLowerCase().includes(searchTerm);
    return matchesCondition && matchesSearch;
  });
  const availableNames = getAvailableCropNames(currentReadings, currentCrops);
  const historyCrop = currentCrops.find(crop => crop.id === historyId);
  const isBusy = isSaving || isRefreshing;
  const attentionCount = results.filter(result =>
    result.condition === 'Dry' ||
    result.condition === 'Too Wet' ||
    result.condition === 'Sensor Problem' ||
    result.condition === 'Invalid Data' ||
    result.alerts.includes('High temperature')
  ).length;

  function focusDashboard() {
    dashboardRef.current?.focus();
  }

  function retryDashboard() {
    setIsLoading(true);
    setCropError('');
    setLoadAttempt(attempt => attempt + 1);
  }

  function openForm(crop = null) {
    setForm({ crop });
    setHistoryId(null);
    setPendingDelete(null);
    setNotice('');
    setOperationError('');
  }

  function closeForm() {
    const wasEditing = Boolean(form?.crop);
    setForm(null);

    if (wasEditing) {
      focusDashboard();
    } else {
      addButtonRef.current?.focus();
    }
  }

  async function handleSave(settings) {
    setIsSaving(true);
    setNotice('');

    try {
      if (form.crop) {
        const saved = await updateCrop(form.crop.id, settings);
        setCrops(current =>
          current.map(crop => crop.id === saved.id ? saved : crop)
        );
        setNotice(`${saved.crop_name} crop card updated.`);
      } else {
        const saved = await createCrop(settings);
        setCrops(current => [...current, saved]);
        setNotice(`${saved.crop_name} crop card created.`);
      }

      setForm(null);
      focusDashboard();
    } finally {
      setIsSaving(false);
    }
  }

  function requestDelete(crop) {
    setPendingDelete(crop);
    setForm(null);
    setHistoryId(null);
    setNotice('');
    setOperationError('');
  }

  async function confirmDelete() {
    const crop = pendingDelete;
    setIsSaving(true);
    setOperationError('');

    try {
      await deleteCrop(crop.id);
      setCrops(current => current.filter(item => item.id !== crop.id));
      setPendingDelete(null);
      setNotice(`${crop.crop_name} crop card deleted. Sensor readings are unchanged.`);
      focusDashboard();
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshSensors() {
    setIsRefreshing(true);
    setNotice('');
    setSensorError('');

    try {
      const updatedReadings = await getReadings();
      setReadings(updatedReadings);
      setLastRefresh(new Date());
      setNotice('Sensor data refreshed.');
    } catch (error) {
      setSensorError(error.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function openHistory(id) {
    setHistoryId(id);
    setForm(null);
    setPendingDelete(null);
    setOperationError('');
  }

  return (
    <main className="app">
      {!isLoading && !cropError && (
        <a className="skip-link" href="#dashboard-heading">Skip to Crop Cards</a>
      )}
      <header className="app-header">
        <div>
          <p className="eyebrow brand"><span className="brand-mark" aria-hidden="true">GF</span> GreenFields Farm</p>
          <h1>SmartFarm Crop Dashboard</h1>
          <p className="intro">
            Manage crop settings and turn sensor readings into clear watering decisions.
          </p>
        </div>
        <span className="header-label">Simulated sensor feed</span>
      </header>

      {isLoading ? (
        <section className="empty-state" role="status">
          <h2>Loading your farm dashboard…</h2>
          <p>Retrieving crop cards and sensor readings.</p>
        </section>
      ) : cropError ? (
        <section className="empty-state">
          <h2>Crop cards could not be loaded</h2>
          <p className="feedback error" role="alert">{cropError}</p>
          <button className="primary-button" onClick={retryDashboard}>
            Retry
          </button>
        </section>
      ) : (
        <>
          <section className="summary" aria-label="Farm overview">
            <div className="summary-item status-summary">
              <span className="detail-label">Overall Farm Status</span>
              <strong className={`farm-status ${statusClass(farmStatus)}`}>
                {farmStatus}
              </strong>
              <p className="summary-description">{farmStatusDescriptions[farmStatus]}</p>
            </div>
            <div className="summary-item">
              <span className="detail-label">Crop Cards</span>
              <strong>{currentCrops.length}</strong>
              <span className="summary-caption">Configured crops</span>
            </div>
            <div className="summary-item">
              <span className="detail-label">Need attention</span>
              <strong>{hasSensorData ? attentionCount : 'N/A'}</strong>
              <span className="summary-caption">Conditions or temperature</span>
            </div>
            <div className="summary-item">
              <span className="detail-label">Last sensor refresh</span>
              <strong className="refresh-time">
                {lastRefresh
                  ? lastRefresh.toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : 'Never'}
              </strong>
              <span className="summary-caption">Last successful request</span>
            </div>
          </section>

          <div className="toolbar">
            <div className="toolbar-actions">
              <button
                ref={addButtonRef}
                type="button"
                className="primary-button"
                disabled={
                  isBusy || Boolean(form) || Boolean(pendingDelete) ||
                  !hasSensorData || availableNames.length === 0
                }
                onClick={() => openForm()}
              >
                Add Crop Card
              </button>
              <button
                type="button"
                disabled={isBusy || Boolean(form) || Boolean(pendingDelete)}
                onClick={refreshSensors}
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh Sensor Data'}
              </button>
            </div>

            <p className="muted toolbar-help">
              {!hasSensorData
                ? 'Load the sensor feed to enable new crop cards.'
                : availableNames.length === 0
                  ? 'Every crop in the sensor feed already has a card.'
                  : `${availableNames.length} unused crop ${
                      availableNames.length === 1 ? 'name' : 'names'
                    } available.`}
            </p>
          </div>

          <div className="notifications">
            {sensorError && (
              <p className="feedback error" role="alert">
                <strong>
                  {hasSensorData ? 'Sensor refresh failed. ' : 'Sensor feed unavailable. '}
                </strong>
                {sensorError}
                {hasSensorData && ' The last successful readings remain displayed.'}
              </p>
            )}
            {operationError && (
              <p className="feedback error" role="alert">{operationError}</p>
            )}
            <div role="status" aria-live="polite">
              {notice && <p className="feedback success">{notice}</p>}
            </div>
          </div>

          {form && (
            <CropForm
              key={form.crop?.id ?? 'create'}
              crop={form.crop}
              availableNames={availableNames}
              isSaving={isSaving}
              onSave={handleSave}
              onCancel={closeForm}
            />
          )}

          {pendingDelete && (
            <section className="panel delete-panel" aria-labelledby="delete-heading">
              <h2 id="delete-heading" ref={deleteButtonRef} tabIndex={-1}>
                Delete {pendingDelete.crop_name}?
              </h2>
              <p>
                This removes the crop card and its settings. Its sensor readings remain
                available, and you can create the card again.
              </p>
              <div className="panel-actions">
                <button
                  type="button"
                  className="danger-solid"
                  disabled={isSaving}
                  onClick={confirmDelete}
                >
                  {isSaving ? 'Deleting…' : 'Delete Crop Card'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setPendingDelete(null);
                    setOperationError('');
                    focusDashboard();
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {historyCrop && (
            <SensorHistory
              key={historyCrop.id}
              crop={historyCrop}
              readings={currentReadings}
              onClose={() => {
                setHistoryId(null);
                focusDashboard();
              }}
            />
          )}

          <section aria-labelledby="dashboard-heading" aria-busy={isBusy}>
            <div className="section-heading">
              <h2 id="dashboard-heading" ref={dashboardRef} tabIndex={-1}>
                Crop Cards
              </h2>
              <p className="muted">Latest readings matched by crop name</p>
            </div>

            {currentCrops.length > 0 && (
              <div className="condition-filter">
                <div className="crop-search-field">
                  <label htmlFor="crop-search">Search crops</label>
                  <input
                    id="crop-search"
                    ref={cropSearchRef}
                    type="search"
                    placeholder="Crop name or location"
                    value={cropSearch}
                    onChange={event => setCropSearch(event.target.value)}
                    aria-describedby="filter-count"
                  />
                </div>
                <div className="condition-filter-field">
                  <label htmlFor="condition-filter">Filter by condition</label>
                  <select
                    id="condition-filter"
                    ref={conditionFilterRef}
                    value={conditionFilter}
                    onChange={event => setConditionFilter(event.target.value)}
                    aria-describedby="filter-count"
                  >
                    <option value="all">All conditions</option>
                    {cropConditions.map(condition => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>
                <p id="filter-count" className="filter-count" role="status" aria-atomic="true">
                  Showing {visibleResults.length} of {currentCrops.length} {currentCrops.length === 1 ? 'crop' : 'crops'}
                </p>
              </div>
            )}

            {currentCrops.length === 0 ? (
              <div className="empty-state">
                <h3>No crop cards yet</h3>
                <p>Add a crop card to configure its moisture range and watering amount.</p>
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="empty-state">
                <h3>{searchTerm ? 'No crops match your search' : 'No crops match this condition'}</h3>
                <p>Try another search or condition to view your crop cards.</p>
                <button
                  type="button"
                  onClick={() => {
                    setConditionFilter('all');
                    setCropSearch('');
                    if (searchTerm) cropSearchRef.current?.focus();
                    else conditionFilterRef.current?.focus();
                  }}
                >
                  {searchTerm ? 'Reset search and filter' : 'Reset filter'}
                </button>
              </div>
            ) : (
              <div className="crop-grid">
                {visibleResults.map(result => (
                  <CropCard
                    key={result.crop.id}
                    result={result}
                    disabled={isBusy || Boolean(form) || Boolean(pendingDelete)}
                    onEdit={openForm}
                    onDelete={requestDelete}
                    onHistory={openHistory}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="app-footer">
        GreenFields Farm · Simulated sensor readings · Water recommendations are in litres
      </footer>
    </main>
  );
}

export default App;
