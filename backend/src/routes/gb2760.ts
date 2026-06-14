import { Hono, type Context } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import type { AuthenticatedUser, AuthService } from '../services/authService.js';
import { editableGb2760StagingReviewStatuses, Gb2760StagingReviewError, validGb2760StagingReviewStatuses, type EditableGb2760StagingReviewStatus, type Gb2760Service, type Gb2760StagingReviewStatus, type StagingReviewAudit } from '../services/gb2760Service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_REVIEW_NOTE_LENGTH = 500;

type Gb2760RouteOptions = {
  internalReviewers?: string[];
};

type Gb2760RouteContext = Context<{ Variables: AuthVariables }>;

export function createGb2760Route(authService: AuthService, gb2760Service: Gb2760Service, options: Gb2760RouteOptions = {}) {
  const route = new Hono<{ Variables: AuthVariables }>();
  const requireAuth = createAuthMiddleware(authService);
  const internalReviewers = normalizeInternalReviewers(options.internalReviewers);
  route.use('/gb2760/*', requireAuth);

  route.get('/gb2760/import-runs', async (context) => {
    const parsed = parseListQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await gb2760Service.listImportRuns(parsed.value);
    return context.json(result);
  });

  route.get('/gb2760/import-runs/:id/errors', async (context) => {
    const result = await gb2760Service.getImportRunErrors(context.req.param('id'));
    if (!result) {
      return context.json({ error: 'not_found' }, 404);
    }

    return context.json(result);
  });

  route.get('/gb2760/reference-rows', async (context) => {
    const parsed = parseReferenceRowsQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await gb2760Service.listReferenceRows(parsed.value);
    return context.json(result);
  });

  route.get('/gb2760/staging-rows', async (context) => {
    const parsed = parseStagingRowsQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await gb2760Service.listStagingRows(parsed.value);
    return context.json(result);
  });

  route.put('/gb2760/staging-rows/review', async (context) => {
    const parsed = await parseBatchReviewStatusBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const reviewer = requireInternalReviewer(context, internalReviewers, parsed.value.reviewNote);
    if (!reviewer.ok) return reviewer.response;

    const result = await gb2760Service.updateStagingRowsReviewStatus(parsed.value.ids, parsed.value.reviewStatus, reviewer.audit);
    return context.json(result);
  });

  route.put('/gb2760/staging-rows/:id/mapping', async (context) => {
    const parsed = await parseMappingBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    try {
      const reviewer = requireInternalReviewer(context, internalReviewers, parsed.value.reviewNote);
      if (!reviewer.ok) return reviewer.response;

      const result = await gb2760Service.updateStagingRowMapping(
        context.req.param('id'),
        parsed.value.ingredientId,
        parsed.value.reviewStatus,
        reviewer.audit
      );
      if (!result) {
        return context.json({ error: 'not_found' }, 404);
      }
      return context.json(result);
    } catch (error) {
      if (error instanceof Gb2760StagingReviewError) {
        return context.json({
          error: error.code,
          message: error.message,
          reasons: error.reasons
        }, error.code === 'locked_review_status' ? 409 : 422);
      }

      throw error;
    }
  });

  route.put('/gb2760/staging-rows/:id/review', async (context) => {
    const parsed = await parseReviewStatusBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    try {
      const reviewer = requireInternalReviewer(context, internalReviewers, parsed.value.reviewNote);
      if (!reviewer.ok) return reviewer.response;

      const result = await gb2760Service.updateStagingRowReviewStatus(context.req.param('id'), parsed.value.reviewStatus, reviewer.audit);
      if (!result) {
        return context.json({ error: 'not_found' }, 404);
      }
      return context.json(result);
    } catch (error) {
      if (error instanceof Gb2760StagingReviewError) {
        return context.json({
          error: error.code,
          message: error.message,
          reasons: error.reasons
        }, error.code === 'locked_review_status' ? 409 : 422);
      }

      throw error;
    }
  });

  return route;
}

function requireInternalReviewer(context: Gb2760RouteContext, internalReviewers: Set<string>, reviewNote?: string) {
  const user = context.get('authUser');
  if (!isInternalReviewer(user, internalReviewers)) {
    return {
      ok: false as const,
      response: context.json({
        error: 'forbidden',
        message: 'GB 2760 review writes require an internal reviewer account'
      }, 403)
    };
  }

  return {
    ok: true as const,
    audit: toStagingReviewAudit(user, reviewNote)
  };
}

function isInternalReviewer(user: AuthenticatedUser, internalReviewers: Set<string>) {
  if (internalReviewers.has('*')) return true;
  return internalReviewers.has(user.email.trim().toLowerCase()) || internalReviewers.has(user.id.trim().toLowerCase());
}

function toStagingReviewAudit(user: AuthenticatedUser, reviewNote?: string): StagingReviewAudit {
  return {
    reviewedBy: user.email,
    reviewedByUserId: user.id,
    reviewNote
  };
}

function normalizeInternalReviewers(values: string[] | undefined) {
  return new Set((values || []).map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function parseListQuery(query: Record<string, string>) {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, 'page');
  if (!page.ok) return page;

  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit', MAX_LIMIT);
  if (!limit.ok) return limit;

  return {
    ok: true as const,
    value: {
      page: page.value,
      limit: limit.value
    }
  };
}

function parseReferenceRowsQuery(query: Record<string, string>) {
  const parsed = parseListQuery(query);
  if (!parsed.ok) return parsed;

  return {
    ok: true as const,
    value: {
      ...parsed.value,
      tableName: normalizeOptionalQuery(query.table),
      q: normalizeOptionalQuery(query.q)
    }
  };
}

function parseStagingRowsQuery(query: Record<string, string>) {
  const parsed = parseListQuery(query);
  if (!parsed.ok) return parsed;

  const status = normalizeOptionalQuery(query.status);
  if (status && !validGb2760StagingReviewStatuses.includes(status as Gb2760StagingReviewStatus)) {
    return invalidParameter('status', `status must be one of ${validGb2760StagingReviewStatuses.join(', ')}`);
  }

  return {
    ok: true as const,
    value: {
      ...parsed.value,
      reviewStatus: status as Gb2760StagingReviewStatus | undefined,
      q: normalizeOptionalQuery(query.q),
      readyOnly: query.ready === '1'
    }
  };
}

async function parseBatchReviewStatusBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const parsed = parseReviewStatusValue(body);
    if (!parsed.ok) return parsed;

    const ids = (body as { ids?: unknown }).ids;
    if (!Array.isArray(ids)) {
      return invalidParameter('ids', 'ids must be an array');
    }

    const normalizedIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
    if (normalizedIds.length === 0) {
      return invalidParameter('ids', 'ids must include at least one staging row id');
    }
    if (normalizedIds.length > 100) {
      return invalidParameter('ids', 'ids must include no more than 100 staging row ids');
    }

    return {
      ok: true as const,
      value: {
        ...parsed.value,
        ids: normalizedIds
      }
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

async function parseMappingBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const ingredientId = String((body as { ingredientId?: unknown }).ingredientId || '').trim();
    if (!ingredientId) {
      return invalidParameter('ingredientId', 'ingredientId is required');
    }

    const parsed = parseReviewStatusValue(body);
    if (!parsed.ok) return parsed;

    return {
      ok: true as const,
      value: {
        ...parsed.value,
        ingredientId
      }
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

async function parseReviewStatusBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    return parseReviewStatusValue(body);
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseReviewStatusValue(body: object) {
  const reviewStatus = String((body as { reviewStatus?: unknown }).reviewStatus || '').trim();
  if (!editableGb2760StagingReviewStatuses.includes(reviewStatus as EditableGb2760StagingReviewStatus)) {
    return invalidParameter('reviewStatus', `reviewStatus must be one of ${editableGb2760StagingReviewStatuses.join(', ')}`);
  }
  const reviewNote = String((body as { reviewNote?: unknown }).reviewNote || '').trim();
  if (reviewNote.length > MAX_REVIEW_NOTE_LENGTH) {
    return invalidParameter('reviewNote', `reviewNote must be ${MAX_REVIEW_NOTE_LENGTH} characters or fewer`);
  }

  return {
    ok: true as const,
    value: {
      reviewStatus: reviewStatus as EditableGb2760StagingReviewStatus,
      reviewNote
    }
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number, field: string, max?: number) {
  if (!value) {
    return { ok: true as const, value: fallback };
  }

  if (!/^\d+$/.test(value)) {
    return invalidParameter(field, `${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || (max && parsed > max)) {
    return invalidParameter(field, max ? `${field} must be between 1 and ${max}` : `${field} must be a positive integer`);
  }

  return { ok: true as const, value: parsed };
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

function normalizeOptionalQuery(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
