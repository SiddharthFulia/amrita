const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://72.61.236.205';
const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';

export async function get(endpoint, params = {}, options = {}) {
  if (isProduction) {
    const proxyUrl = new URL('/api/proxy', window.location.origin);
    proxyUrl.searchParams.set('endpoint', endpoint);
    Object.entries(params).forEach(([key, value]) => proxyUrl.searchParams.set(key, value));

    const response = await fetch(proxyUrl.toString(), {
      method: 'GET',
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    });
    if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status}`);
    return response.json();
  }

  const url = new URL(endpoint, BE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
  });
  if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function post(endpoint, body = {}, options = {}) {
  if (isProduction) {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, ...body }),
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    });
    if (!response.ok) throw new Error(`POST ${endpoint} failed: ${response.status}`);
    return response.json();
  }

  const response = await fetch(`${BE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
  });
  if (!response.ok) throw new Error(`POST ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function put(endpoint, body = {}, options = {}) {
  const response = await fetch(`${BE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`PUT ${endpoint} failed: ${response.status}`);
  return response.json();
}

export async function del(endpoint, body = {}, options = {}) {
  const response = await fetch(`${BE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`DELETE ${endpoint} failed: ${response.status}`);
  return response.json();
}
