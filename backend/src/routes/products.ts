import { Hono } from 'hono';
import type { ProductLookupService } from '../services/productLookupService.js';

export function createProductsRoute(productLookupService: ProductLookupService) {
  const route = new Hono();

  route.post('/products/lookup', async (context) => {
    const body = await context.req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return context.json({ error: 'invalid_body', message: 'JSON body is required.' }, 400);
    }
    const result = await productLookupService.lookup({
      normalizedCode: normalizeString(body.normalizedCode),
      qrContent: normalizeString(body.qrContent),
      rawContent: normalizeString(body.rawContent),
      productName: normalizeString(body.productName)
    });
    if (!result.usedAiSearch && result.errorCode) {
      return context.json(result, result.errorCode === 'missing_query' ? 400 : 503);
    }
    return context.json(result);
  });

  return route;
}

function normalizeString(value: unknown): string {
  return String(value || '').trim();
}
