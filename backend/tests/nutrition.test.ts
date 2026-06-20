import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/authService.js';

function createAuthService(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUserForToken: vi.fn(),
    deleteAccount: vi.fn()
  };
}

function createTestApp() {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'manual',
    port: 3000
  }, {
    authService: createAuthService()
  });
}

describe('POST /api/nutrition/parse', () => {
  it('parses nutrition text from OCR output', async () => {
    const app = createTestApp();
    const response = await app.request('/api/nutrition/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '营养成分表 每100g 能量 350kJ 蛋白质 6g 脂肪 3.5g 碳水化合物 15g 糖 8g 钠 210mg NRV 6%',
        perUnit: '每100g',
        servingSize: '20g'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      nutrition: expect.arrayContaining([
        expect.objectContaining({ key: 'energy', value: '350', unit: 'kJ' }),
        expect.objectContaining({ key: 'protein', value: '6', unit: 'g' }),
        expect.objectContaining({ key: 'fat', value: '3.5', unit: 'g' }),
        expect.objectContaining({ key: 'perUnit', value: '每100g' }),
        expect.objectContaining({ key: 'servingSize', value: '20g' })
      ]),
      warnings: expect.any(Array)
    }));
  });

  it('uses explicit overrides when per-unit fields are unavailable', async () => {
    const app = createTestApp();
    const response = await app.request('/api/nutrition/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '热量 2100kJ 蛋白质 7.5g 糖 5g',
        perUnit: '每100ml',
        servingSize: '1杯'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nutrition).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'perUnit', value: '每100ml' }),
      expect.objectContaining({ key: 'servingSize', value: '1杯' }),
      expect.objectContaining({ key: 'energy', value: '2100' }),
      expect.objectContaining({ key: 'protein', value: '7.5' }),
      expect.objectContaining({ key: 'sugar', value: '5' })
    ]));
  });

  it('returns 422 when no nutrition fields can be parsed', async () => {
    const app = createTestApp();
    const response = await app.request('/api/nutrition/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '配料：小麦粉、白砂糖、食用油' })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'parse_failed',
      message: 'Unable to parse nutrition fields from text.'
    });
  });

  it('does not treat unit-only text as parsed nutrition', async () => {
    const app = createTestApp();
    const response = await app.request('/api/nutrition/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '营养成分表 每100g NRV%' })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'parse_failed',
      message: 'Unable to parse nutrition fields from text.'
    });
  });

  it('rejects invalid body', async () => {
    const app = createTestApp();
    const response = await app.request('/api/nutrition/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 100 })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'text',
      message: 'text must be a string'
    });
  });
});
