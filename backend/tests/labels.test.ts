import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/authService.js';
import { type LabelScanService, type LabelScanSessionInput, type LabelScanSessionResult } from '../src/services/labelScanService.js';
import { createLabelService } from '../src/services/labelService.js';

function createAuthService(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUserForToken: vi.fn(),
    deleteAccount: vi.fn()
  };
}

function createTestApp(options: { labelScanService?: LabelScanService } = {}) {
  return createApp({
    corsOrigin: 'http://localhost:5173',
    databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
    jwtSecret: 'test-only-compcheck-jwt-secret',
    ocrApiKey: '',
    ocrProvider: 'manual',
    port: 3000
  }, {
    authService: createAuthService(),
    labelService: createLabelService(),
    labelScanService: options.labelScanService
  });
}

function createLabelScanService(overrides: Partial<LabelScanService> = {}): LabelScanService {
  const defaultService = {
    upsertScanSession: vi.fn(async (input: LabelScanSessionInput): Promise<LabelScanSessionResult> => {
      return {
        sessionId: input.sessionId ?? 'scan-session-001',
        images: (input.images || []).map((image) => ({
          assetId: image.assetId,
          labelType: image.labelType ?? 'unknown_label',
          ocrResultId: image.ocrResultId,
          status: image.status ?? 'ocr_input'
        })),
        nextSuggestedCapture: ['nutrition_facts', 'front_claims', 'barcode_or_product']
      };
    }),
    ...overrides
  };

  return defaultService;
}

describe('POST /api/labels/classify', () => {
  it('allows anonymous label classification and detects ingredient lists', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '配料：水、白砂糖、食品添加剂（柠檬酸、食用香精）' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      labelType: 'ingredient_list',
      requiresUserSelection: false
    });
    expect(body.confidence).toBeGreaterThanOrEqual(0.55);
    expect(body.reasons).toContain('文本中出现配料或食品添加剂相关词。');
  });

  it('detects nutrition facts text', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '营养成分表 每100克 能量 蛋白质 脂肪 碳水化合物 钠 NRV%' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      labelType: 'nutrition_facts',
      requiresUserSelection: false
    });
  });

  it('keeps low evidence text as user selection required', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '欢迎品尝' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      labelType: 'unknown_label',
      requiresUserSelection: true,
      reasons: ['当前文本特征不足，需要用户手动选择。']
    });
  });

  it('detects product and barcode label text', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '商品名称：全麦饼干 净含量 200g 条形码 6901234567890' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      labelType: 'barcode_or_product',
      requiresUserSelection: false
    });
  });

  it('honors explicit user selected label type', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '低脂 高蛋白', userSelectedType: 'front_claims' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      labelType: 'front_claims',
      confidence: 1,
      requiresUserSelection: false,
      reasons: ['已按用户选择设置为包装正面。']
    });
  });

  it('honors explicit unknown label selections', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '配料：水、白砂糖、食品添加剂', userSelectedType: 'unknown_label' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      labelType: 'unknown_label',
      confidence: 1,
      requiresUserSelection: false,
      reasons: ['已按用户选择设置为未知标签。']
    });
  });

  it('rejects invalid user selected label types', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '配料：水', userSelectedType: 'drug_label' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'userSelectedType',
      message: 'userSelectedType must be one of ingredient_list, nutrition_facts, front_claims, barcode_or_product, unknown_label'
    });
  });
});

describe('POST /api/labels/scan', () => {
  it('creates scan session and returns session metadata', async () => {
    const service = createLabelScanService();
    const app = createTestApp({ labelScanService: service });
    const response = await app.request('/api/labels/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'scan-session-001',
        labelTypeHint: 'nutrition_facts',
        images: [{
          assetId: 'asset-001',
          labelType: 'nutrition_facts',
          mimeType: 'image/png',
          status: 'ocr_success',
          ocrResultId: 'ocr-001'
        }]
      })
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: 'scan-session-001',
      images: [{
        assetId: 'asset-001',
        labelType: 'nutrition_facts',
        ocrResultId: 'ocr-001',
        status: 'ocr_success'
      }],
      nextSuggestedCapture: ['nutrition_facts', 'front_claims', 'barcode_or_product']
    });
    expect(service.upsertScanSession).toHaveBeenCalledOnce();
    expect(service.upsertScanSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'scan-session-001',
      labelTypeHint: 'nutrition_facts',
      images: [{
        assetId: 'asset-001',
        labelType: 'nutrition_facts',
        mimeType: 'image/png',
        ocrResultId: 'ocr-001',
        status: 'ocr_success'
      }]
    }));
  });

  it('dedupes duplicate image assets before persistence', async () => {
    const service = createLabelScanService({
      upsertScanSession: vi.fn(async (input: LabelScanSessionInput): Promise<LabelScanSessionResult> => {
        const images = (input.images || []);
        return {
          sessionId: input.sessionId ?? 'scan-session-002',
          images,
          nextSuggestedCapture: ['ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product'].slice(4 - images.length)
        } as LabelScanSessionResult;
      })
    });
    const app = createTestApp({ labelScanService: service });
    const response = await app.request('/api/labels/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [
          { assetId: 'asset-dup' },
          { assetId: 'asset-dup', status: 'ocr_failed' },
          { assetId: 'asset-other', status: 'manual_entry' }
        ]
      })
    });

    const call = vi.mocked(service.upsertScanSession).mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(call?.images?.map((image) => image.assetId)).toEqual(['asset-dup', 'asset-other']);
  });

  it('rejects invalid label scan payloads', async () => {
    const app = createTestApp();
    const response = await app.request('/api/labels/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [{ assetId: '' }]
      })
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_parameter',
      field: 'images[0].assetId',
      message: 'images[0].assetId is required'
    });
  });
});
