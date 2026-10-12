async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
        'Cannot connect to the server. Check that the backend is running.',
        { cause: error }
    );
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
        'The server returned an unreadable response.',
        { cause: error }
    );
  }

  if (!response.ok) {
    throw new Error(
        typeof data?.error === 'string'
            ? data.error
            : `The request failed (${response.status}).`
    );
  }

  return data;
}

export function getCrops(signal) {
  return request('/crops', { signal });
}

export function getReadings(signal) {
  return request('/readings', { signal });
}

export function createCrop(crop) {
  return request('/crops', {
    method: 'POST',
    body: JSON.stringify(crop)
  });
}

export function updateCrop(id, settings) {
  return request(`/crops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export function deleteCrop(id) {
  return request(`/crops/${id}`, {
    method: 'DELETE'
  });
}