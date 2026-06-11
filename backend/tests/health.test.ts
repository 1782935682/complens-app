import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function createTestApp() {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    port: 3000
  });
}

const app = createTestApp();

describe('app middleware', () => {
  it('sets CORS headers for configured frontend origin', async () => {
    const response = await app.request('/health', {
      headers: { Origin: 'http://localhost:5173' }
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});

describe('GET /health', () => {
  it('returns service status and version', async () => {
    const response = await app.request('/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('error handling', () => {
  it('returns JSON for missing routes', async () => {
    const response = await app.request('/not-found');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'not_found' });
  });

  it('returns JSON for unhandled exceptions without leaking stack traces', async () => {
    const errorApp = createTestApp();
    errorApp.get('/boom', () => {
      throw new Error('database password should not leak');
    });

    const response = await errorApp.request('/boom');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'internal_server_error' });
    expect(JSON.stringify(body)).not.toContain('database password');
  });
});
