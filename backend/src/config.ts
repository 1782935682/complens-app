import 'dotenv/config';

export type AppConfig = {
  corsOrigin: string;
  databaseUrl: string;
  gb2760InternalReviewers?: string[];
  jwtSecret: string;
  ocrApiKey: string;
  ocrProvider: string;
  port: number;
};

export type ServerConfig = AppConfig & {
  host: string;
};

export function getConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number.parseInt(env.PORT || '3000', 10);
  return {
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL || 'postgres://postgres:password@localhost:15432/compcheck',
    gb2760InternalReviewers: parseList(env.GB2760_INTERNAL_REVIEWERS),
    host: env.HOST || '127.0.0.1',
    jwtSecret: env.JWT_SECRET || 'dev-only-change-me-compcheck-jwt-secret',
    ocrApiKey: env.OCR_API_KEY || '',
    ocrProvider: env.OCR_PROVIDER || '',
    port: Number.isFinite(port) && port > 0 ? port : 3000
  };
}

function parseList(value: string | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
