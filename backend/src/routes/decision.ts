import { Hono } from 'hono';
import type { DecisionAgentService, DecisionUserProfile, ProductDecisionInput } from '../services/decisionAgentService.js';

type AnalyzeBody = {
  labelText?: unknown;
  productName?: unknown;
  userProfile?: unknown;
  options?: unknown;
};

type CompareBody = {
  left?: unknown;
  right?: unknown;
  userProfile?: unknown;
};

export function createDecisionRoute(decisionAgentService: DecisionAgentService) {
  const route = new Hono();

  route.post('/decision/analyze', async (context) => {
    const parsed = await parseAnalyzeBody(context);
    if (!parsed.ok) return context.json(parsed.error, 400);
    return context.json(await decisionAgentService.analyzeProduct(parsed.value));
  });

  route.post('/decision/compare', async (context) => {
    const parsed = await parseCompareBody(context);
    if (!parsed.ok) return context.json(parsed.error, 400);
    return context.json(await decisionAgentService.compareProducts(parsed.value));
  });

  return route;
}

async function parseAnalyzeBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!isPlainObject(body)) return invalidParameter('body', 'request body must be an object');
    return parseProductInput(body as AnalyzeBody, 'body');
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

async function parseCompareBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!isPlainObject(body)) return invalidParameter('body', 'request body must be an object');
    const input = body as CompareBody;
    const left = parseProductInput(input.left, 'left');
    if (!left.ok) return left;
    const right = parseProductInput(input.right, 'right');
    if (!right.ok) return right;
    return {
      ok: true as const,
      value: {
        left: left.value,
        right: right.value,
        userProfile: parseUserProfile(input.userProfile)
      }
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseProductInput(value: unknown, field: string) {
  if (!isPlainObject(value)) return invalidParameter(field, `${field} must be an object`);
  const input = value as AnalyzeBody;
  const labelText = parseRequiredString(input.labelText, `${field}.labelText`, 20000);
  if (!labelText.ok) return labelText;
  const productName = parseOptionalString(input.productName, `${field}.productName`, 120);
  if (!productName.ok) return productName;
  return {
    ok: true as const,
    value: {
      labelText: labelText.value,
      productName: productName.value,
      userProfile: parseUserProfile(input.userProfile),
      options: parseOptions(input.options)
    } satisfies ProductDecisionInput
  };
}

function parseUserProfile(value: unknown): DecisionUserProfile | undefined {
  if (!isPlainObject(value)) return undefined;
  const input = value as Record<string, unknown>;
  return {
    goals: stringArray(input.goals),
    allergens: stringArray(input.allergens),
    forChild: Boolean(input.forChild),
    lactoseIntolerant: Boolean(input.lactoseIntolerant)
  };
}

function parseOptions(value: unknown): ProductDecisionInput['options'] {
  if (!isPlainObject(value)) return undefined;
  const input = value as Record<string, unknown>;
  return {
    enableAi: input.enableAi === undefined ? undefined : Boolean(input.enableAi)
  };
}

function parseRequiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') return invalidParameter(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return invalidParameter(field, `${field} is required`);
  if (trimmed.length > maxLength) return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  return { ok: true as const, value: trimmed };
}

function parseOptionalString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) return { ok: true as const, value: undefined };
  if (typeof value !== 'string') return invalidParameter(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  return { ok: true as const, value: trimmed || undefined };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20) : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
