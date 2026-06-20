import { describe, expect, it } from 'vitest';
import { getConfig } from '../src/config.js';

describe('getConfig', () => {
  it('uses OCR_LOCAL_URL before the legacy OCR_SERVICE_URL', () => {
    const config = getConfig({
      OCR_LOCAL_URL: 'http://127.0.0.1:18080/ocr',
      OCR_SERVICE_URL: 'http://127.0.0.1:8000',
      JWT_SECRET: 'test-only-compcheck-jwt-secret'
    } as NodeJS.ProcessEnv);

    expect(config.ocrServiceUrl).toBe('http://127.0.0.1:18080/ocr');
  });

  it('keeps OCR_SERVICE_URL as a backward-compatible fallback', () => {
    const config = getConfig({
      OCR_SERVICE_URL: 'http://127.0.0.1:8000',
      JWT_SECRET: 'test-only-compcheck-jwt-secret'
    } as NodeJS.ProcessEnv);

    expect(config.ocrServiceUrl).toBe('http://127.0.0.1:8000');
  });
});
