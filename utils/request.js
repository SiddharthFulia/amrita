const BASE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://72.61.236.205';

export async function get(endpoint, params = {}, options = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    ...options,
  });

  if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function post(endpoint, body = {}, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    ...options,
  });

  if (!response.ok) throw new Error(`POST ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function put(endpoint, body = {}, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) throw new Error(`PUT ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function del(endpoint, body = {}, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) throw new Error(`DELETE ${endpoint} failed: ${response.status}`);
  return response.json();
}
