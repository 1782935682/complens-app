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

  it('maps aliyun OCR access key and secret from backend environment variables', () => {
    const config = getConfig({
      ALIYUN_ACCESS_KEY_ID: 'aliyun-key-id',
      ALIYUN_ACCESS_KEY_SECRET: 'aliyun-key-secret',
      ALIYUN_OCR_ACTION: 'RecognizeGeneral',
      ALIYUN_OCR_ENDPOINT: 'https://ocr-api.cn-shanghai.aliyuncs.com',
      OCR_API_KEY: 'legacy-key',
      OCR_API_SECRET: 'legacy-secret',
      JWT_SECRET: 'test-only-compcheck-jwt-secret'
    } as NodeJS.ProcessEnv);

    expect(config.ocrApiKey).toBe('aliyun-key-id');
    expect(config.ocrApiSecret).toBe('aliyun-key-secret');
    expect(config.aliyunOcrAction).toBe('RecognizeGeneral');
    expect(config.aliyunOcrEndpoint).toBe('https://ocr-api.cn-shanghai.aliyuncs.com');
  });
});
