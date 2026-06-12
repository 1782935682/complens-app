import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/authService.js';

const user = {
  id: 'user-1',
  email: 'scan@example.com',
  createdAt: new Date('2026-06-12T00:00:00.000Z')
};

function createAuthService(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUserForToken: vi.fn(async (token) => (token === 'valid-token' ? user : null)),
    deleteAccount: vi.fn()
  };
}

function createTestApp(config = {}) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'aliyun',
    port: 3000,
    ...config
  }, {
    authService: createAuthService()
  });
}

describe('POST /api/ocr', () => {
  it('requires auth before OCR access', async () => {
    const app = createTestApp();
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(401);
  });

  it('returns 503 when OCR key is not configured', async () => {
    const app = createTestApp();
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ocr_not_configured' });
  });

  it('rejects oversized OCR payloads before provider access', async () => {
    const app = createTestApp();
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'a'.repeat(14 * 1024 * 1024), mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'imageBase64',
      message: 'imageBase64 must be no larger than 10 MB'
    });
  });

  it('does not return fake OCR text when provider implementation is pending', async () => {
    const app = createTestApp({ ocrApiKey: 'test-key' });
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      error: 'ocr_provider_pending',
      provider: 'aliyun'
    });
  });
});
