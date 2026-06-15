import { and, asc, eq } from 'drizzle-orm';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import {
  labelScanImages,
  labelScanSessions,
  type LabelScanImageRow,
  type LabelScanSessionRow,
  type NewLabelScanImageRow,
  type NewLabelScanSessionRow
} from '../db/schema.js';
import { isLabelType, type LabelType } from './labelService.js';

export type LabelScanImageStatus = 'ocr_input' | 'ocr_success' | 'ocr_failed' | 'manual_entry';

export type LabelScanImageInput = {
  assetId: string;
  labelType?: LabelType;
  mimeType?: string;
  ocrResultId?: string;
  status?: LabelScanImageStatus;
};

export type LabelScanSessionInput = {
  sessionId?: string;
  labelTypeHint?: LabelType;
  images?: LabelScanImageInput[];
};

export type LabelScanImageOutput = {
  assetId: string;
  labelType: LabelType;
  ocrResultId?: string;
  status: LabelScanImageStatus;
};

export type LabelScanSessionResult = {
  sessionId: string;
  images: LabelScanImageOutput[];
  nextSuggestedCapture: LabelType[];
};

export type LabelScanService = {
  upsertScanSession(input: LabelScanSessionInput): Promise<LabelScanSessionResult>;
};

const MAX_IMAGES_PER_SESSION = 3;

let defaultClient: DatabaseClient | null = null;
let defaultService: LabelScanService | null = null;

export function createLabelScanService(db: Database): LabelScanService {
  const normalizeLabelType = (value: string | null | undefined): LabelType => {
    return isLabelType(value) ? value : 'unknown_label';
  };

  return {
    async upsertScanSession(input) {
      const normalized = normalizeScanInput(input);
      const sessionId = normalized.sessionId ?? createScanSessionId();
      const session = await upsertSession(db, sessionId, normalized.labelTypeHint ?? 'unknown_label');

      const existingImages = await getSessionImages(db, sessionId);
      const existingImageIds = new Set(existingImages.map((image) => image.assetId));

      const requestedImages = dedupeImagesByAssetId(normalized.images);
      const newImages = requestedImages.filter((image) => !existingImageIds.has(image.assetId));
      if (existingImages.length + newImages.length > MAX_IMAGES_PER_SESSION) {
        throw invalidParameter('images', 'images count cannot exceed 3 per session');
      }

      for (const image of requestedImages) {
        const row = toStoredImageRow(sessionId, image);
        await upsertImage(db, row, image.status);
      }

      const images = await getSessionImages(db, sessionId);
      const nextSuggestedCapture = computeNextSuggestions(images, normalized.labelTypeHint ?? session.labelTypeHint);

      await db
        .update(labelScanSessions)
        .set({
          status: images.length >= MAX_IMAGES_PER_SESSION ? 'completed' : 'in_progress',
          imagesRequested: images.length,
          updatedAt: new Date(),
          labelTypeHint: normalized.labelTypeHint || session.labelTypeHint
        })
        .where(eq(labelScanSessions.id, session.id));

      return {
        sessionId,
        images: images.map(normalizeImageRow),
        nextSuggestedCapture
      };
    }
  };

  function toStoredImageRow(_sessionId: string, input: LabelScanImageInput): NewLabelScanImageRow {
    return {
      id: createScanImageId(),
      sessionId: _sessionId,
      assetId: input.assetId,
      labelType: input.labelType || 'unknown_label',
      mimeType: input.mimeType || 'image/jpeg',
      ocrResultId: input.ocrResultId,
      status: input.status || 'ocr_input',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async function upsertSession(
    db: Database,
    sessionId: string,
    labelTypeHint: LabelType
  ): Promise<{ id: string; labelTypeHint: LabelType; status: LabelScanSessionRow['status']; imagesRequested: number; updatedAt: Date; createdAt: Date }> {
    const [existing] = await db.select().from(labelScanSessions).where(eq(labelScanSessions.id, sessionId)).limit(1);
    if (!existing) {
      const now = new Date();
      const nextSession: NewLabelScanSessionRow = {
        id: sessionId,
        labelTypeHint,
        status: 'draft',
        imagesRequested: 0,
        createdAt: now,
        updatedAt: now
      };
      await db.insert(labelScanSessions).values(nextSession);
      return {
        id: sessionId,
        labelTypeHint,
        status: 'draft',
        imagesRequested: 0,
        createdAt: now,
        updatedAt: now
      };
    }

    const safeSession: { id: string; labelTypeHint: LabelType; status: LabelScanSessionRow['status']; imagesRequested: number; createdAt: Date; updatedAt: Date } = {
      id: existing.id,
      labelTypeHint: normalizeLabelType(existing.labelTypeHint),
      status: existing.status,
      imagesRequested: existing.imagesRequested,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt
    };

    if (safeSession.labelTypeHint !== labelTypeHint && labelTypeHint !== 'unknown_label') {
      await db
        .update(labelScanSessions)
        .set({
          labelTypeHint,
          updatedAt: new Date()
        })
        .where(eq(labelScanSessions.id, sessionId));
      safeSession.labelTypeHint = labelTypeHint;
      safeSession.updatedAt = new Date();
    }

    return safeSession;
  }

  async function upsertImage(db: Database, image: NewLabelScanImageRow, explicitStatus?: LabelScanImageStatus) {
    const existing = await db
      .select()
      .from(labelScanImages)
      .where(and(eq(labelScanImages.sessionId, image.sessionId), eq(labelScanImages.assetId, image.assetId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(labelScanImages)
        .set({
          labelType: image.labelType,
          mimeType: image.mimeType,
          ocrResultId: image.ocrResultId || existing[0].ocrResultId,
          status: explicitStatus || image.status,
          updatedAt: new Date()
        })
        .where(and(eq(labelScanImages.sessionId, image.sessionId), eq(labelScanImages.assetId, image.assetId)));
      return;
    }

    await db.insert(labelScanImages).values(image);
  }

  function normalizeImageRow(row: LabelScanImageRow): LabelScanImageOutput {
    return {
      assetId: row.assetId,
      labelType: normalizeLabelType(row.labelType),
      ocrResultId: row.ocrResultId || undefined,
      status: row.status as LabelScanImageStatus
    };
  }

  function computeNextSuggestions(rows: LabelScanImageRow[], typeHint: LabelType): LabelType[] {
    const candidates: LabelType[] = ['ingredient_list', 'nutrition_facts', 'front_claims', 'barcode_or_product'];
    const captured = new Set<LabelType>(rows.map((row) => normalizeLabelType(row.labelType)));
    if (typeHint && typeHint !== 'unknown_label') {
      captured.add(typeHint);
    }
    return candidates
      .filter((type) => !captured.has(type))
      .slice(0, Math.max(0, MAX_IMAGES_PER_SESSION - rows.length));
  }
}

function normalizeScanInput(input: LabelScanSessionInput): { sessionId?: string; labelTypeHint?: LabelType; images: LabelScanImageInput[] } {
  const images = input.images || [];
  const labelTypeHint = input.labelTypeHint && isLabelType(input.labelTypeHint) ? input.labelTypeHint : undefined;
  return {
    sessionId: normalizeOptionalString(input.sessionId),
    labelTypeHint,
    images: images.map((image) => ({
      assetId: image.assetId,
      labelType: image.labelType && isLabelType(image.labelType) ? image.labelType : 'unknown_label',
      mimeType: normalizeOptionalString(image.mimeType) || 'image/jpeg',
      ocrResultId: normalizeOptionalString(image.ocrResultId),
      status: normalizeImageStatus(image.status) || 'ocr_input'
    }))
  };
}

function normalizeImageStatus(status: unknown): LabelScanImageStatus | undefined {
  if (status === 'ocr_input' || status === 'ocr_success' || status === 'ocr_failed' || status === 'manual_entry') {
    return status;
  }
  return undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function createScanSessionId(): string {
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createScanImageId(): string {
  return `scan-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getSessionImages(db: Database, sessionId: string): Promise<LabelScanImageRow[]> {
  return db
    .select()
    .from(labelScanImages)
    .where(eq(labelScanImages.sessionId, sessionId))
    .orderBy(asc(labelScanImages.createdAt));
}

function dedupeImagesByAssetId(images: LabelScanImageInput[]): LabelScanImageInput[] {
  const existing = new Set<string>();
  const deduped: LabelScanImageInput[] = [];

  for (const image of images) {
    if (existing.has(image.assetId)) continue;
    existing.add(image.assetId);
    deduped.push(image);
  }

  return deduped;
}

function invalidParameter(field: string, message: string) {
  const error = new Error(message) as Error & { code: string; field: string };
  error.code = 'invalid_parameter';
  error.field = field;
  return error;
}

export function createDefaultLabelScanService(): LabelScanService {
  if (!defaultClient) {
    defaultClient = createDatabaseClient();
    defaultService = createLabelScanService(defaultClient.db);
  }
  return defaultService as LabelScanService;
}

export function createLazyLabelScanService(databaseUrl?: string): LabelScanService {
  let lazyClient: DatabaseClient | null = null;
  let lazyService: LabelScanService | null = null;

  function getService() {
    if (!lazyClient) {
      lazyClient = createDatabaseClient(databaseUrl);
      lazyService = createLabelScanService(lazyClient.db);
    }
    return lazyService as LabelScanService;
  }

  return {
    upsertScanSession(input) {
      return getService().upsertScanSession(input);
    }
  };
}
