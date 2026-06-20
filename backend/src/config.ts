import 'dotenv/config';

export type AppConfig = {
  ai?: {
    enabled: boolean;
    defaultProvider: 'mock' | 'deepseek' | 'openai-compatible' | 'claude' | 'gemini';
    fallbackProvider: 'mock' | 'deepseek' | 'openai-compatible' | 'claude' | 'gemini';
    timeoutMs: number;
    maxRetry: number;
    deepseek: {
      apiKey: string;
      baseUrl: string;
      model: string;
    };
    openaiCompatible: {
      apiKey: string;
      baseUrl: string;
      model: string;
      requestPath: string;
    };
    claude: {
      apiKey: string;
      model: string;
    };
    gemini: {
      apiKey: string;
      model: string;
    };
  };
  corsOrigin: string;
  databaseUrl: string;
  gb2760InternalReviewers?: string[];
  jwtSecret: string;
  ocrApiKey: string;
  ocrApiSecret?: string;
  aliyunOcrAction?: string;
  aliyunOcrEndpoint?: string;
  ocrProvider: string;
  ocrServiceUrl?: string;
  port: number;
};

export type ServerConfig = AppConfig & {
  host: string;
};

export function getConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number.parseInt(env.PORT || '3000', 10);
  const aiTimeoutMs = parsePositiveInteger(env.AI_TIMEOUT_MS, 20000);
  return {
    ai: {
      enabled: parseBoolean(env.AI_ENABLED, false),
      defaultProvider: normalizeAiProvider(env.AI_DEFAULT_PROVIDER, 'mock'),
      fallbackProvider: normalizeAiProvider(env.AI_FALLBACK_PROVIDER, 'mock'),
      timeoutMs: aiTimeoutMs,
      maxRetry: parsePositiveInteger(env.AI_MAX_RETRY, 1),
      deepseek: {
        apiKey: env.DEEPSEEK_API_KEY || '',
        baseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
      },
      openaiCompatible: {
        apiKey: env.OPENAI_COMPATIBLE_API_KEY || '',
        baseUrl: env.OPENAI_COMPATIBLE_BASE_URL || '',
        model: env.OPENAI_COMPATIBLE_MODEL || '',
        requestPath: env.OPENAI_COMPATIBLE_REQUEST_PATH || '/v1/chat/completions'
      },
      claude: {
        apiKey: env.CLAUDE_API_KEY || '',
        model: env.CLAUDE_MODEL || ''
      },
      gemini: {
        apiKey: env.GEMINI_API_KEY || '',
        model: env.GEMINI_MODEL || ''
      }
    },
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL || 'postgres://postgres:password@localhost:15432/compcheck',
    gb2760InternalReviewers: parseList(env.GB2760_INTERNAL_REVIEWERS),
    host: env.HOST || '127.0.0.1',
    jwtSecret: env.JWT_SECRET || 'dev-only-change-me-compcheck-jwt-secret',
    ocrApiKey: env.ALIYUN_ACCESS_KEY_ID || env.OCR_API_KEY || '',
    ocrApiSecret: env.ALIYUN_ACCESS_KEY_SECRET || env.OCR_API_SECRET || '',
    aliyunOcrAction: env.ALIYUN_OCR_ACTION || 'RecognizeAdvanced',
    aliyunOcrEndpoint: env.ALIYUN_OCR_ENDPOINT || 'https://ocr-api.cn-hangzhou.aliyuncs.com',
    ocrProvider: env.OCR_PROVIDER || '',
    ocrServiceUrl: env.OCR_LOCAL_URL || env.OCR_SERVICE_URL || '',
    port: Number.isFinite(port) && port > 0 ? port : 3000
  };
}

function parseList(value: string | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAiProvider(value: string | undefined, fallback: NonNullable<AppConfig['ai']>['defaultProvider']) {
  const normalized = String(value || '').trim();
  if (normalized === 'mock' || normalized === 'deepseek' || normalized === 'openai-compatible' || normalized === 'claude' || normalized === 'gemini') {
    return normalized;
  }
  return fallback;
}
