import { Hono } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import type { AppConfig } from '../config.js';
import type { AuthService } from '../services/authService.js';

type OcrJsonBody = {
  imageBase64?: unknown;
  mimeType?: unknown;
  category?: unknown;
};

export function createOcrRoute(authService: AuthService, config: Pick<AppConfig, 'ocrApiKey' | 'ocrProvider'>) {
  const route = new Hono<{ Variables: AuthVariables }>();
  const requireAuth = createAuthMiddleware(authService);

  route.post('/ocr', requireAuth, async (context) => {
    const body = await readOcrBody(context);
    const validation = validateOcrBody(body);
    if (!validation.ok) {
      return context.json(validation.error, 400);
    }

    if (!config.ocrApiKey) {
      return context.json({ error: 'ocr_not_configured' }, 503);
    }

    return context.json({
      error: 'ocr_provider_pending',
      provider: config.ocrProvider || 'pending'
    }, 501);
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
