import { Hono } from 'hono';
import type { AppConfig } from '../config.js';
import type { AuthService } from '../services/authService.js';
import { OcrProviderError, normalizeOcrProvider, recognizeWithOcrProvider, requiresOcrApiKey, requiresOcrServiceUrl } from '../services/ocrProviders/index.js';

type OcrJsonBody = {
  imageBase64?: unknown;
  mimeType?: unknown;
  category?: unknown;
};

const MAX_OCR_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OCR_IMAGE_BASE64_LENGTH = Math.ceil(MAX_OCR_IMAGE_BYTES / 3) * 4;

export function createOcrRoute(_authService: AuthService, config: Pick<AppConfig, 'ocrApiKey' | 'ocrProvider' | 'ocrServiceUrl'>) {
  const route = new Hono();

  route.post('/ocr', async (context) => {
    const body = await readOcrBody(context);
    const validation = validateOcrBody(body);
    if (!validation.ok) {
      return context.json(validation.error, 400);
    }

    const provider = normalizeOcrProvider(config.ocrProvider);
    if (provider === 'manual') {
      return context.json({ error: 'ocr_not_configured', provider }, 503);
    }

    if (requiresOcrApiKey(provider) && !config.ocrApiKey) {
      return context.json({ error: 'ocr_not_configured', provider }, 503);
    }

    if (requiresOcrServiceUrl(provider) && !config.ocrServiceUrl) {
      return context.json({ error: 'ocr_not_configured', provider }, 503);
    }

    const result = await recognizeWithOcrProvider(provider, validation.value, {
      apiKey: config.ocrApiKey,
      serviceUrl: config.ocrServiceUrl
    }).catch((error) => {
      if (error instanceof OcrProviderError) return error;
      throw error;
    });
    if (result instanceof OcrProviderError) {
      return context.json({ error: result.code, provider, message: result.message }, result.status);
    }
    if (result) return context.json(result);

    return context.json({ error: 'ocr_provider_pending', provider }, 501);
  });

  return route;
}

async function readOcrBody(context: { req: { json(): Promise<unknown> } }): Promise<OcrJsonBody | null> {
  try {
    const body = await context.req.json();
    return body && typeof body === 'object' ? body as OcrJsonBody : null;
  } catch {
    return null;
  }
}

function validateOcrBody(body: OcrJsonBody | null) {
  if (!body) return invalidParameter('body', 'request body must be valid JSON');
  if (typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) {
    return invalidParameter('imageBase64', 'imageBase64 is required');
  }
  if (body.imageBase64.trim().length > MAX_OCR_IMAGE_BASE64_LENGTH) {
    return invalidParameter('imageBase64', 'imageBase64 must be no larger than 10 MB');
  }
  if (typeof body.mimeType !== 'string' || !/^image\/[a-z0-9.+-]+$/i.test(body.mimeType)) {
    return invalidParameter('mimeType', 'mimeType must be an image MIME type');
  }
  return {
    ok: true as const,
    value: {
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      category: typeof body.category === 'string' ? body.category : 'food'
    }
  };
}

function invalidParameter(field: string, message: string) {
  return {
    ok: false as const,
    error: {
      error: 'invalid_parameter',
      field,
      message
    }
  };
}
