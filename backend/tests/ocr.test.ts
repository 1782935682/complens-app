import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/authService.js';
import { recognizeWithOcrProvider } from '../src/services/ocrProviders/index.js';

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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('POST /api/ocr', () => {
  it('allows anonymous MVP OCR requests and returns provider configuration errors', async () => {
    const app = createTestApp();
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ocr_not_configured', provider: 'aliyun' });
  });

  it('returns 503 when a real OCR provider key is not configured', async () => {
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
    expect(await response.json()).toEqual({ error: 'ocr_not_configured', provider: 'aliyun' });
  });

  it('returns 503 when aliyun access secret is not configured', async () => {
    const app = createTestApp({ ocrApiKey: 'test-access-key', ocrProvider: 'aliyun' });
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ocr_not_configured', provider: 'aliyun' });
  });

  it('calls aliyun OCR with a signed request and maps text blocks', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      Data: JSON.stringify({
        content: '配料：水、柠檬酸\n营养成分表 能量 120kJ',
        prism_wordsInfo: [
          {
            word: '配料：水、柠檬酸',
            prob: 98,
            pos: [{ x: 1, y: 2 }, { x: 100, y: 2 }, { x: 100, y: 22 }, { x: 1, y: 22 }]
          },
          {
            word: '营养成分表 能量 120kJ',
            prob: 92,
            pos: [{ x: 1, y: 34 }, { x: 160, y: 34 }, { x: 160, y: 54 }, { x: 1, y: 54 }]
          }
        ]
      })
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = createTestApp({
      ocrApiKey: 'test-access-key',
      ocrApiSecret: 'test-access-secret',
      ocrProvider: 'aliyun'
    });

    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', category: 'food' })
    });
    const body = await response.json();
    const [requestInput, requestInit] = fetchMock.mock.calls[0] as unknown as [string | URL, RequestInit];
    const requestUrl = String(requestInput);
    const headers = requestInit.headers as Record<string, string>;

    expect(response.status).toBe(200);
    expect(requestUrl).toContain('https://ocr-api.cn-hangzhou.aliyuncs.com/');
    expect(requestUrl).toContain('OutputTable=true');
    expect(requestUrl).toContain('NeedRotate=true');
    expect(headers['x-acs-action']).toBe('RecognizeAdvanced');
    expect(headers['x-acs-version']).toBe('2021-07-07');
    expect(headers.Authorization).toContain('ACS3-HMAC-SHA256 Credential=test-access-key');
    expect(headers.Authorization).not.toContain('test-access-secret');
    expect(body).toMatchObject({
      text: '配料：水、柠檬酸\n营养成分表 能量 120kJ',
      provider: 'aliyun',
      blocks: [
        {
          text: '配料：水、柠檬酸',
          confidence: 0.98,
          bounds: { points: [{ x: 1, y: 2 }, { x: 100, y: 2 }, { x: 100, y: 22 }, { x: 1, y: 22 }] }
        },
        {
          text: '营养成分表 能量 120kJ',
          confidence: 0.92
        }
      ]
    });
  });

  it('returns explicit mock OCR output without a real provider key', async () => {
    const app = createTestApp({ ocrProvider: 'mock' });
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg', category: 'food' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      text: '水，柠檬酸，山梨酸钾',
      confidence: 0.92,
      provider: 'mock'
    });
    expect(body.blocks).toEqual([{ text: '水，柠檬酸，山梨酸钾', confidence: 0.92 }]);
  });

  it('maps product-review fixture PNG hashes to deterministic label text', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'compcheck-fixture-ocr-'));
    const samplePath = join(tempRoot, 'reports/product-review/fixtures/unit-round/samples/sample.png');
    mkdirSync(join(tempRoot, 'reports/product-review/fixtures/unit-round/samples'), { recursive: true });
    writeFileSync(samplePath, Buffer.from('unit png bytes'));
    writeFileSync(join(tempRoot, 'reports/product-review/fixtures/unit-round/sample-manifest.json'), JSON.stringify({
      samples: [{
        path: 'reports/product-review/fixtures/unit-round/samples/sample.png',
        publicId: 'sample-01',
        expectedVisibleText: [
          '测试酸奶',
          '配料表：生牛乳、乳酸菌。',
          '营养成分表 每100g：糖4.8g 钠55mg。'
        ]
      }]
    }));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempRoot);

    try {
      const result = await recognizeWithOcrProvider('fixture', {
        imageBase64: Buffer.from('unit png bytes').toString('base64'),
        mimeType: 'image/png',
        category: 'food'
      });

      expect(result).toMatchObject({
        provider: 'fixture',
        confidence: 0.98,
        text: '测试酸奶\n配料表：生牛乳、乳酸菌。\n营养成分表 每100g：糖4.8g 钠55mg。'
      });
      expect(result?.blocks).toHaveLength(3);
    } finally {
      cwdSpy.mockRestore();
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('requires a local service URL for rapidocr instead of an OCR API key', async () => {
    const app = createTestApp({ ocrProvider: 'rapidocr' });
    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/jpeg' })
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ocr_not_configured', provider: 'rapidocr' });
  });

  it('proxies rapidocr requests to the configured local OCR service', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      provider: 'rapidocr-onnxruntime',
      rawText: '配料：水，柠檬酸',
      confidence: 0.88,
      elapsed: 0.42,
      blocks: [
        {
          text: '配料：水，柠檬酸',
          confidence: 0.88,
          box: [[1, 2], [3, 2], [3, 4], [1, 4]]
        }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = createTestApp({
      ocrProvider: 'rapidocr',
      ocrServiceUrl: 'http://127.0.0.1:8000/'
    });

    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', category: 'food' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/ocr', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData)
    }));
    expect(body).toMatchObject({
      text: '配料：水，柠檬酸',
      confidence: 0.88,
      provider: 'rapidocr',
      blocks: [
        {
          text: '配料：水，柠檬酸',
          confidence: 0.88,
          bounds: { points: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 4 }, { x: 1, y: 4 }] }
        }
      ]
    });
  });

  it('times out stalled rapidocr provider calls', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      signal.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const recognition = recognizeWithOcrProvider('rapidocr', {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      category: 'food'
    }, {
      serviceUrl: 'http://127.0.0.1:8000',
      timeoutMs: 5
    });
    const expectation = expect(recognition).rejects.toMatchObject({
      code: 'ocr_provider_timeout',
      status: 504
    });
    await vi.advanceTimersByTimeAsync(5);

    await expectation;
  });

  it('rejects malformed rapidocr responses instead of returning an empty real OCR result', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      provider: 'rapidocr-onnxruntime',
      raw_text: '',
      text: '',
      blocks: {}
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = createTestApp({
      ocrProvider: 'rapidocr',
      ocrServiceUrl: 'http://127.0.0.1:8000'
    });

    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', category: 'food' })
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      error: 'ocr_provider_invalid_response',
      provider: 'rapidocr'
    });
  });

  it('accepts common RapidOCR text field aliases', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      provider: 'rapidocr-onnxruntime',
      text: '品 名 小麻花\n配 料 小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙',
      confidence: 0.82,
      blocks: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = createTestApp({
      ocrProvider: 'rapidocr',
      ocrServiceUrl: 'http://127.0.0.1:8000'
    });

    const response = await app.request('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', category: 'food' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      text: '品 名 小麻花\n配 料 小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙',
      provider: 'rapidocr'
    });
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
    const app = createTestApp({ ocrApiKey: 'test-key', ocrProvider: 'paddleocr' });
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
      provider: 'paddleocr'
    });
  });
});
