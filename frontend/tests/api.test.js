import test from 'node:test';
import assert from 'node:assert/strict';
import { getCrops, getReadings, createCrop, updateCrop, deleteCrop } from '../src/services/api.js';

test('API client sends JSON numbers and propagates the server error contract', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    calls.push({ path, options });
    return new Response(JSON.stringify({ error: 'crop_name already exists' }), { status: 409 });
  });
  const settings = { crop_name: 'Maize', location: 'South Field', target_min: 50, target_max: 70, normal_water: 600, notes: '' };
  await assert.rejects(createCrop(settings), { message: 'crop_name already exists' });
  assert.equal(calls[0].path, '/api/crops');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].options.body), settings);
  await assert.rejects(updateCrop(4, settings), { message: 'crop_name already exists' });
  assert.equal(calls[1].path, '/api/crops/4');
  assert.equal(calls[1].options.method, 'PUT');
  await assert.rejects(deleteCrop(4), { message: 'crop_name already exists' });
  assert.equal(calls[2].options.method, 'DELETE');
});

test('API client distinguishes connection, unreadable response, and abort failures', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Connection refused'); });
  await assert.rejects(getReadings(), { message: 'Cannot connect to the server. Check that the backend is running.' });
  fetchMock.mock.mockImplementation(async () => new Response('<html>Proxy error</html>', { status: 502 }));
  await assert.rejects(getCrops(), { message: 'The server returned an unreadable response.' });
  fetchMock.mock.mockImplementation(async () => new Response('{}', { status: 503 }));
  await assert.rejects(getCrops(), { message: 'The request failed (503).' });
  const controller = new AbortController();
  controller.abort();
  const abort = new DOMException('Aborted', 'AbortError');
  fetchMock.mock.mockImplementation(async (path, options) => {
    assert.equal(options.signal, controller.signal);
    throw abort;
  });
  await assert.rejects(getCrops(controller.signal), error => error === abort);
});
