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
